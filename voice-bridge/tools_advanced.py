"""Advanced YARBIS tools — research, project ops, system control, Hermes delegation.

These are layered on top of the basic tools in `tools.py`.  Naming convention:
the tool's docstring is a *prompt* the LLM reads to decide when to invoke it,
so write each one in Spanish describing concrete trigger phrases.

Three categories live here:
  1. Web research      → Brave Search, URL fetch
  2. Project ops       → list/open/git for ~/projects/ecomdrop/
  3. System control    → screenshot, volume, time
  4. Hermes delegation → routes deep queries to the Hermes Gateway, which
                         has 89 skills + MCPs (Gmail, Calendar, Notion, etc.)
"""

import asyncio
import logging
import os
import subprocess
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from livekit.agents import function_tool

from tools import _send_electron_command

logger = logging.getLogger("yarbis-tools-adv")

# ─── Config from env ──────────────────────────────────────────────────────
PROJECTS_DIR = Path(os.path.expanduser("~/projects/ecomdrop"))
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "")
HERMES_API_URL = os.environ.get("HERMES_API_URL", "http://127.0.0.1:8642/v1")
HERMES_API_KEY = os.environ.get("HERMES_API_KEY", "yarbis-local-secret")
HERMES_MODEL = os.environ.get("HERMES_MODEL", "gpt-5-mini")


# ═══ 1. WEB RESEARCH ═══════════════════════════════════════════════════════


@function_tool()
async def search_web(query: str, num_results: int = 3) -> str:
    """Busca en internet usando Brave Search. Llama cuando Elkin diga \
'busca X en Google', 'qué dice internet de Y', 'búscame X', 'qué es Z', \
o cualquier pregunta factual que necesite información actualizada. \
El parámetro num_results limita los resultados (default 3, max 10)."""
    if not BRAVE_API_KEY:
        return "Error: no tengo Brave API key configurada."

    num_results = max(1, min(10, num_results))
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": BRAVE_API_KEY, "Accept": "application/json"},
                params={"q": query, "count": num_results, "country": "co"},
            )
        if r.status_code != 200:
            logger.warning("Brave search %s: %s", r.status_code, r.text[:200])
            return f"La búsqueda falló (código {r.status_code})."
        results = r.json().get("web", {}).get("results", []) or []
        if not results:
            return f"No encontré resultados para '{query}'."
        lines = []
        for i, item in enumerate(results[:num_results], 1):
            title = item.get("title", "—")
            desc = (item.get("description") or "").strip()
            lines.append(f"{i}. {title}. {desc}")
        return f"Resultados sobre '{query}':\n" + "\n".join(lines)
    except Exception as e:
        logger.exception("search_web error")
        return f"Error en la búsqueda: {e}"


@function_tool()
async def fetch_url(url: str) -> str:
    """Lee el contenido principal de una URL. Llama cuando Elkin diga \
'qué dice este link', 'resumime X URL', 'lee este artículo', o cuando \
necesites el contenido textual de una página específica. Devuelve los \
primeros ~2000 caracteres del texto sin HTML."""
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "YARBIS/1.0"})
        if r.status_code != 200:
            return f"No pude leer {url} (código {r.status_code})."
        # Stripped-down text extraction — no full HTML parser to keep it light.
        import re
        text = re.sub(r"<script.*?</script>", "", r.text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:2000] + ("…" if len(text) > 2000 else "")
    except Exception as e:
        logger.exception("fetch_url error")
        return f"Error leyendo URL: {e}"


# ═══ 2. PROJECT OPS ════════════════════════════════════════════════════════


@function_tool()
async def list_projects() -> str:
    """Lista todos los proyectos en ~/projects/ecomdrop/. Llama cuando Elkin \
diga 'qué proyectos tengo', 'lístame los proyectos', 'cuáles son mis repos'."""
    if not PROJECTS_DIR.is_dir():
        return f"No existe el directorio {PROJECTS_DIR}."
    projects = sorted(
        [p.name for p in PROJECTS_DIR.iterdir() if p.is_dir() and not p.name.startswith(".")]
    )
    if not projects:
        return "No hay proyectos en ~/projects/ecomdrop/."
    return "Proyectos disponibles: " + ", ".join(projects)


@function_tool()
async def open_project(name: str) -> str:
    """Abre un proyecto en Cursor (editor). Llama cuando Elkin diga \
'abre el proyecto X', 'lleva-me a X', 'voy a trabajar en X'. \
Use el nombre del directorio dentro de ~/projects/ecomdrop/ \
(p.ej. 'Ecomdrop_connector', 'mission-control', 'yarbis-asistente'). \
Si no existe, sugiere alternativas."""
    target = PROJECTS_DIR / name
    if not target.is_dir():
        # Fuzzy match — match by case-insensitive prefix
        candidates = [
            p.name for p in PROJECTS_DIR.iterdir()
            if p.is_dir() and name.lower() in p.name.lower()
        ]
        if len(candidates) == 1:
            target = PROJECTS_DIR / candidates[0]
        elif candidates:
            return f"Hay varios proyectos que coinciden: {', '.join(candidates)}. Sé más específico."
        else:
            return f"No encontré el proyecto '{name}'. Usa list_projects para ver los disponibles."

    logger.info("open_project: cursor %s", target)
    subprocess.Popen(["cursor", str(target)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return f"Abriendo {target.name} en Cursor."


@function_tool()
async def git_status_project(name: str) -> str:
    """Muestra el git status + branch actual + últimos 3 commits de un proyecto. \
Llama cuando Elkin diga 'cómo va X', 'qué cambios tiene X', 'estado de X', \
o pregunte por el git de un proyecto específico."""
    target = PROJECTS_DIR / name
    if not target.is_dir():
        candidates = [
            p.name for p in PROJECTS_DIR.iterdir()
            if p.is_dir() and name.lower() in p.name.lower()
        ]
        if len(candidates) == 1:
            target = PROJECTS_DIR / candidates[0]
        else:
            return f"No encontré el proyecto '{name}'."

    if not (target / ".git").is_dir():
        return f"{target.name} no es un repo git."

    def _run(args: list[str]) -> str:
        result = subprocess.run(
            args, cwd=target, capture_output=True, text=True, timeout=8
        )
        return result.stdout.strip()

    try:
        branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        status = _run(["git", "status", "--short"])
        log = _run(["git", "log", "--oneline", "-3"])
    except Exception as e:
        return f"Error leyendo git: {e}"

    parts = [f"Proyecto {target.name} en rama '{branch}'."]
    if status:
        n_changes = len(status.splitlines())
        parts.append(f"Tiene {n_changes} cambios sin commit.")
    else:
        parts.append("Sin cambios pendientes.")
    if log:
        parts.append("Últimos commits: " + " · ".join(log.splitlines()))
    return " ".join(parts)


# ═══ 3. SYSTEM CONTROL ═════════════════════════════════════════════════════


# ═══ 3b. WINDOW CONTROL (Electron) ═══════════════════════════════════════


@function_tool()
async def hide_window() -> str:
    """Oculta la ventana de YARBIS sin cerrarla. El asistente sigue \
escuchando en background — el micrófono no se apaga, solo desaparece la \
interfaz. Llama cuando Elkin diga 'ocúltate', 'escóndete', 'desaparece', \
'minimízate', 'no te quiero ver', 'ocúltate un momento', 'oculta la ventana'."""
    if _send_electron_command("hide"):
        return "Listo, me oculto. Sigo escuchándote, jefe."
    return "No pude ocultar la ventana."


@function_tool()
async def cinema_mode() -> str:
    """Activa modo cinema (pantalla completa). Inmersión total, sin barras \
de menú ni dock visible. Llama cuando Elkin diga 'modo cinema', \
'pantalla completa', 'maximízate', 'fullscreen', 'modo inmersivo', \
'modo Iron Man', 'agrándate'."""
    if _send_electron_command("show-fullscreen"):
        return "Modo cinema activado."
    return "No pude entrar en pantalla completa."


@function_tool()
async def exit_cinema_mode() -> str:
    """Sale del modo pantalla completa, vuelve a ventana normal. Llama \
cuando Elkin diga 'sal de pantalla completa', 'sal del fullscreen', \
'modo ventana', 'achícate', 'sal del modo cinema', 'minimiza un poco'."""
    if _send_electron_command("exit-fullscreen"):
        return "Modo ventana."
    return "No pude salir de pantalla completa."


@function_tool()
async def take_screenshot() -> str:
    """Toma un screenshot del Mac y lo guarda en ~/Desktop. Llama cuando \
Elkin diga 'tómame un screenshot', 'captura la pantalla', 'haz captura'."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.expanduser(f"~/Desktop/yarbis_capture_{timestamp}.png")
    subprocess.Popen(
        ["screencapture", "-x", out],  # -x = no shutter sound
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    logger.info("take_screenshot saved to %s", out)
    return f"Captura guardada en el Escritorio: {os.path.basename(out)}"


@function_tool()
async def set_system_volume(level: int) -> str:
    """Ajusta el volumen del Mac (0-100). Llama cuando Elkin diga \
'sube el volumen', 'baja el volumen', 'pon el volumen al X', \
'silencia'. Para silenciar usa level=0."""
    level = max(0, min(100, int(level)))
    script = f"set volume output volume {level}"
    subprocess.Popen(
        ["osascript", "-e", script],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    logger.info("set_system_volume level=%d", level)
    if level == 0:
        return "Volumen silenciado."
    return f"Volumen al {level}%."


@function_tool()
async def current_time() -> str:
    """Da la fecha y hora actual. Llama cuando Elkin diga \
'qué hora es', 'qué día es hoy', 'fecha de hoy'."""
    now = datetime.now()
    locale_es_days = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    locale_es_months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return (
        f"Es {locale_es_days[now.weekday()]} {now.day} de {locale_es_months[now.month - 1]} "
        f"de {now.year}, {now.strftime('%H:%M')} hora colombiana."
    )


# ═══ 4. HERMES DELEGATION (the master tool) ═══════════════════════════════


@function_tool()
async def ask_hermes(query: str) -> str:
    """Delega una tarea compleja al cerebro Hermes. Hermes tiene memoria \
persistente y 89+ skills + MCPs (Gmail, Calendar, Notion, Supabase, GitHub, \
Slack, etc.). Llama cuando Elkin pida:
- 'qué emails tengo' / 'busca un correo de X' (Gmail MCP)
- 'qué reuniones tengo hoy' / 'agenda X para mañana' (Calendar MCP)
- 'busca en Notion X' / 'crea una página en Notion' (Notion MCP)
- 'pedidos de hoy en Ecomdrop' / 'métricas del connector' (Supabase MCP)
- 'PRs abiertos' / 'commits de X repo' (GitHub MCP)
- Cualquier query que requiera memoria de conversaciones pasadas
- Cualquier tarea multi-paso (research + síntesis + ejecución)

LATENCIA: 5-15 segundos. Avisa a Elkin antes de llamar: \
'lo voy mirando…' o 'dame un segundo'.

RETORNA: respuesta de texto que debes leer en voz alta tal cual.
"""
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                f"{HERMES_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {HERMES_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": HERMES_MODEL,
                    "messages": [{"role": "user", "content": query}],
                },
            )
        if r.status_code != 200:
            logger.warning("Hermes %s: %s", r.status_code, r.text[:200])
            return f"Hermes no respondió (código {r.status_code})."
        data = r.json()
        choice = data.get("choices", [{}])[0]
        msg = choice.get("message", {}).get("content", "")
        return msg or "Hermes respondió vacío."
    except httpx.TimeoutException:
        return "Hermes está tardando demasiado, intenta de nuevo."
    except Exception as e:
        logger.exception("ask_hermes error")
        return f"Error consultando a Hermes: {e}"


# ─── Registry ──────────────────────────────────────────────────────────────


ADVANCED_TOOLS = [
    search_web,
    fetch_url,
    list_projects,
    open_project,
    git_status_project,
    hide_window,
    cinema_mode,
    exit_cinema_mode,
    take_screenshot,
    set_system_volume,
    current_time,
    ask_hermes,
]
