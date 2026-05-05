"""Cross-agent report aggregator.

Reads activity from multiple agent sources and produces a unified summary
that YARBIS can speak.  Three layers:

  1. **Native sources** — git logs, Claude Code project directories,
     Hermes session JSONs.  Always available, no setup required.

  2. **Manual reports** — markdown files in ~/.yarbis/reports/<date>/.
     Any agent (n8n workflow, cron job, GitHub Action, Claude Code hook)
     can drop a report here and YARBIS will read it.

  3. **Aggregation** — `build_daily_briefing()` combines everything into
     a Spanish-language briefing the LLM can read aloud.

Schema for manual reports (~/.yarbis/reports/YYYY-MM-DD/<agent>__<topic>.md):

    ---
    agent: claude-code
    project: ecomdrop_connector
    timestamp: 2026-05-05T14:30:00
    type: development
    priority: high
    ---

    # Resumen del trabajo

    Hoy implementé:
    - X
    - Y
"""

import json
import os
import re
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

REPORTS_DIR = Path(os.path.expanduser("~/.yarbis/reports"))
PROJECTS_DIR = Path(os.path.expanduser("~/projects/ecomdrop"))
CLAUDE_PROJECTS_DIR = Path(os.path.expanduser("~/.claude/projects"))
HERMES_SESSIONS_DIR = Path(os.path.expanduser("~/.hermes/sessions"))
HERMES_MEMORY_PATH = Path(os.path.expanduser("~/.hermes/MEMORY.md"))


# ─── Source 1: Git activity ────────────────────────────────────────────


def git_activity(days: int = 1) -> list[dict]:
    """Latest commits across all Ecomdrop projects in the last N days."""
    if not PROJECTS_DIR.is_dir():
        return []

    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    activity = []

    for project_dir in sorted(PROJECTS_DIR.iterdir()):
        if not project_dir.is_dir() or not (project_dir / ".git").exists():
            continue
        try:
            result = subprocess.run(
                [
                    "git", "log",
                    f"--since={since}",
                    "--pretty=format:%h|%cr|%s",
                    "--no-merges",
                    "-10",
                ],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=5,
            )
            commits = [
                line.split("|", 2)
                for line in result.stdout.strip().splitlines()
                if line.strip()
            ]
            if commits:
                activity.append({
                    "project": project_dir.name,
                    "commits": [
                        {"sha": c[0], "ago": c[1], "message": c[2][:80]}
                        for c in commits if len(c) == 3
                    ],
                })
        except Exception:
            continue

    return activity


# ─── Source 2: Claude Code recent projects ────────────────────────────


def claude_code_recent_projects(days: int = 1) -> list[dict]:
    """Claude Code project directories with file activity in the last N days.

    Claude Code persists session data per project at ~/.claude/projects/.
    We use the directory's mtime as a proxy for "you worked on this with
    Claude Code recently."  Returns the top projects sorted by recency.
    """
    if not CLAUDE_PROJECTS_DIR.is_dir():
        return []

    cutoff = datetime.now() - timedelta(days=days)
    recent = []

    for proj_dir in CLAUDE_PROJECTS_DIR.iterdir():
        if not proj_dir.is_dir():
            continue
        try:
            mtime = datetime.fromtimestamp(proj_dir.stat().st_mtime)
            if mtime < cutoff:
                continue
            # Project name is encoded in the dir: replace dashes back to slashes
            name = proj_dir.name.lstrip("-").rsplit("-", 1)[-1] or proj_dir.name
            display = proj_dir.name.replace("-Users-ecomdropsolutions-", "")
            recent.append({
                "project": display[:80],
                "last_active": mtime.isoformat(timespec="minutes"),
                "ago": _humanize_ago(mtime),
            })
        except Exception:
            continue

    recent.sort(key=lambda x: x["last_active"], reverse=True)
    return recent[:8]


# ─── Source 3: Hermes recent activity ──────────────────────────────────


def hermes_recent_sessions(limit: int = 5) -> list[dict]:
    """Most recent Hermes sessions with the user's first message extracted."""
    if not HERMES_SESSIONS_DIR.is_dir():
        return []

    sessions = []
    for path in HERMES_SESSIONS_DIR.glob("session_*.json"):
        try:
            mtime = datetime.fromtimestamp(path.stat().st_mtime)
            with open(path, "r") as f:
                data = json.load(f)
            messages = data.get("messages") or data.get("history") or []
            first_user_msg = None
            for m in messages:
                if m.get("role") == "user":
                    content = m.get("content", "")
                    if isinstance(content, list):
                        content = " ".join(
                            c.get("text", "") if isinstance(c, dict) else str(c)
                            for c in content
                        )
                    first_user_msg = str(content)[:120]
                    break
            sessions.append({
                "id": path.stem,
                "ago": _humanize_ago(mtime),
                "timestamp": mtime.isoformat(timespec="minutes"),
                "first_message": first_user_msg or "(sin mensaje del usuario)",
                "n_messages": len(messages),
            })
        except Exception:
            continue

    sessions.sort(key=lambda x: x["timestamp"], reverse=True)
    return sessions[:limit]


def hermes_memory() -> Optional[str]:
    """Bounded curated memory Hermes accumulates across sessions, if any."""
    if HERMES_MEMORY_PATH.is_file():
        try:
            return HERMES_MEMORY_PATH.read_text()[:1500]
        except Exception:
            return None
    return None


# ─── Source 4: Manual agent reports ────────────────────────────────────


def list_manual_reports(days: int = 1) -> list[dict]:
    """List markdown reports filed by other agents in ~/.yarbis/reports/.

    Returns metadata only (filename, agent, project, type) — call
    `read_manual_report` to get the full text.
    """
    if not REPORTS_DIR.is_dir():
        return []

    cutoff = datetime.now() - timedelta(days=days)
    reports = []

    for date_dir in sorted(REPORTS_DIR.iterdir(), reverse=True):
        if not date_dir.is_dir():
            continue
        try:
            dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
        except ValueError:
            continue
        if dir_date < cutoff:
            break
        for md_path in sorted(date_dir.glob("*.md"), reverse=True):
            meta = _parse_frontmatter(md_path)
            reports.append({
                "filename": md_path.name,
                "date": date_dir.name,
                "path": str(md_path),
                "agent": meta.get("agent", "unknown"),
                "project": meta.get("project", "—"),
                "type": meta.get("type", "—"),
                "priority": meta.get("priority", "normal"),
                "summary": _first_paragraph(md_path),
            })
    return reports


def read_manual_report(filename: str) -> Optional[str]:
    """Read a single manual report by filename.  Returns full markdown or None."""
    if not REPORTS_DIR.is_dir():
        return None
    matches = list(REPORTS_DIR.rglob(filename))
    if not matches:
        return None
    try:
        return matches[0].read_text()
    except Exception:
        return None


def write_manual_report(
    agent: str,
    title: str,
    body: str,
    project: str = "general",
    report_type: str = "update",
    priority: str = "normal",
) -> str:
    """Append a new agent report.  Used by the LLM to record its own
    findings or by external agents calling this module."""
    today = datetime.now()
    date_dir = REPORTS_DIR / today.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_title = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40]
    safe_agent = re.sub(r"[^a-z0-9]+", "-", agent.lower()).strip("-")
    timestamp = today.strftime("%H%M")
    filename = f"{safe_agent}__{safe_title}__{timestamp}.md"
    out = date_dir / filename

    content = (
        f"---\n"
        f"agent: {agent}\n"
        f"project: {project}\n"
        f"timestamp: {today.isoformat(timespec='seconds')}\n"
        f"type: {report_type}\n"
        f"priority: {priority}\n"
        f"---\n\n"
        f"# {title}\n\n"
        f"{body}\n"
    )
    out.write_text(content)
    return str(out)


# ─── Aggregator ─────────────────────────────────────────────────────────


def build_daily_briefing(days: int = 1) -> str:
    """Combine all sources into a single Spanish briefing the LLM reads aloud."""
    parts: list[str] = []

    # 1. Manual reports (the most curated layer)
    manual = list_manual_reports(days=days)
    if manual:
        parts.append(f"📌 REPORTES DE OTROS AGENTES ({len(manual)} en los últimos {days} días):")
        for r in manual[:6]:
            tag = f"[{r['priority'].upper()}] " if r["priority"] in ("high", "urgent") else ""
            parts.append(
                f"  · {tag}{r['agent']} sobre {r['project']}: {r['summary'][:100]}"
            )

    # 2. Git activity
    git = git_activity(days=days)
    if git:
        total = sum(len(g["commits"]) for g in git)
        parts.append(f"\n💻 ACTIVIDAD GIT ({total} commits en {len(git)} proyectos):")
        for g in git[:6]:
            parts.append(f"  · {g['project']}:")
            for c in g["commits"][:3]:
                parts.append(f"      {c['ago']} — {c['message']}")

    # 3. Claude Code projects
    claude = claude_code_recent_projects(days=days)
    if claude:
        parts.append(f"\n🤖 PROYECTOS CON CLAUDE CODE ({len(claude)} activos):")
        for c in claude[:5]:
            short = c["project"].rsplit("-", 1)[-1][:50] or c["project"][:50]
            parts.append(f"  · {short} — {c['ago']}")

    # 4. Hermes sessions
    hermes = hermes_recent_sessions(limit=4)
    if hermes:
        parts.append(f"\n🧠 SESIONES RECIENTES DE HERMES:")
        for h in hermes:
            parts.append(f"  · {h['ago']}: {h['first_message'][:80]}")

    if not parts:
        return "No encontré actividad reciente de tus agentes en los últimos días."

    return "\n".join(parts)


# ─── Helpers ────────────────────────────────────────────────────────────


def _humanize_ago(ts: datetime) -> str:
    delta = datetime.now() - ts
    s = int(delta.total_seconds())
    if s < 60: return f"hace {s}s"
    if s < 3600: return f"hace {s // 60} min"
    if s < 86400: return f"hace {s // 3600} h"
    return f"hace {s // 86400} días"


def _parse_frontmatter(path: Path) -> dict[str, str]:
    """Cheap YAML frontmatter parser — flat key:value only."""
    try:
        text = path.read_text()
    except Exception:
        return {}
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    out = {}
    for line in text[3:end].strip().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip()
    return out


def _first_paragraph(path: Path) -> str:
    """First non-frontmatter paragraph for the report's summary line."""
    try:
        text = path.read_text()
    except Exception:
        return ""
    # Strip frontmatter
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end >= 0:
            text = text[end + 4:]
    # First meaningful line (skip headings, blanks)
    for line in text.strip().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            return line[:200]
    return ""
