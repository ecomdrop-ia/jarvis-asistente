"use client";

import { useEffect, useState } from "react";

/**
 * BuildActivity panel — live-feel feed of the projects in Elkin's lab.
 *
 * Replaces the previous decorative `BuildFeed` with something that
 * actually reads as "this is what's happening in Ecomdrop right now":
 * a list of repos, their state (live / building / deploying / idle),
 * and a tiny progress meter for builds in progress.
 *
 * Numbers/states drift slowly so the panel feels alive without being
 * noisy.  When we wire this to real GitHub/Railway webhooks it'll
 * accept the same shape.
 */

type BuildState = "live" | "deploying" | "building" | "idle";

interface Project {
  name: string;
  state: BuildState;
  detail: string;
  progress?: number; // 0..100 only for building/deploying
}

const INITIAL_PROJECTS: Project[] = [
  { name: "ecomdrop_connector",  state: "deploying", detail: "ETA 18s",     progress: 72 },
  { name: "yarbis-asistente",     state: "live",       detail: "2 min ago" },
  { name: "remotion-studio",      state: "building",   detail: "tests",     progress: 45 },
  { name: "mission-control",      state: "live",       detail: "8 min ago" },
  { name: "contenido-marca",      state: "idle",       detail: "3 hr ago" },
];

export function BuildActivity() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  useEffect(() => {
    const id = setInterval(() => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.state === "building" || p.state === "deploying") {
            const next = (p.progress ?? 0) + 4 + Math.floor(Math.random() * 8);
            if (next >= 100) {
              return { ...p, state: "live", detail: "just now", progress: undefined };
            }
            return { ...p, progress: next };
          }
          return p;
        }),
      );
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <aside
      className="hud-panel pointer-events-none absolute right-6 z-20 rounded-[2px] p-6"
      style={{ bottom: "5.5rem", width: "26rem" }}
    >
      <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

      <Header title="ACTIVE BUILDS" code="B-01" />

      <ul className="mt-5 space-y-3 font-[var(--font-display)] text-[13px] tracking-[0.04em]">
        {projects.map((p) => (
          <BuildRow key={p.name} project={p} />
        ))}
      </ul>

      <div className="mt-5 border-t border-cyan-500/15 pt-3.5 flex items-center justify-between font-[var(--font-display)] text-[11px] tracking-[0.3em] text-cyan-500/70 tabular-nums">
        <span>{projects.length} repos</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgb(34,197,94)]" />
          {projects.filter((p) => p.state === "live").length} live
        </span>
      </div>
    </aside>
  );
}

/* ─── Single project row ────────────────────────────────────────── */

function BuildRow({ project }: { project: Project }) {
  const cfg = STATE_CFG[project.state];
  return (
    <li className="leading-tight">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`hud-led ${cfg.led}`} />
          <span className="font-[var(--font-mono)] text-[13px] text-cyan-100 truncate">
            {project.name}
          </span>
        </div>
        <span className={`font-[var(--font-display)] text-[12px] tracking-[0.18em] uppercase whitespace-nowrap ${cfg.label}`}>
          {cfg.icon} {project.state}
        </span>
      </div>

      {/* Progress bar appears only when building/deploying */}
      {typeof project.progress === "number" && (
        <div className="mt-2 ml-6 flex items-center gap-2.5">
          <div className="flex-1 h-[3px] bg-cyan-900/40 relative overflow-hidden rounded-full">
            <span
              className={`absolute inset-y-0 left-0 ${cfg.bar} rounded-full`}
              style={{ width: `${project.progress}%`, transition: "width 600ms ease" }}
            />
          </div>
          <span className="font-[var(--font-mono)] text-[11px] tabular-nums text-cyan-400/75 w-10 text-right">
            {project.progress}%
          </span>
        </div>
      )}

      {project.progress === undefined && (
        <div className="mt-1 ml-6 font-[var(--font-mono)] text-[11px] text-cyan-500/55 tabular-nums">
          {project.detail}
        </div>
      )}
    </li>
  );
}

/* ─── State-specific styling ────────────────────────────────────── */

const STATE_CFG: Record<BuildState, { led: string; label: string; icon: string; bar: string }> = {
  live: {
    led: "text-emerald-500/85",
    label: "text-emerald-400/85",
    icon: "✓",
    bar: "bg-emerald-500/70 shadow-[0_0_4px_rgb(34,197,94)]",
  },
  deploying: {
    led: "text-amber-400/85",
    label: "text-amber-300/85",
    icon: "⚡",
    bar: "bg-amber-400/80 shadow-[0_0_4px_rgb(245,158,11)]",
  },
  building: {
    led: "text-cyan-400/85",
    label: "text-cyan-300/85",
    icon: "◐",
    bar: "bg-cyan-400/75 shadow-[0_0_4px_rgb(7,226,254)]",
  },
  idle: {
    led: "text-cyan-700/60",
    label: "text-cyan-500/45",
    icon: "—",
    bar: "bg-cyan-700/40",
  },
};

function Header({ title, code }: { title: string; code: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 font-[var(--font-display)] text-[13px] tracking-[0.4em] text-cyan-300 hud-glow-ambient">
        <span className="h-px flex-none w-4 bg-cyan-400/70" />
        <span>{title}</span>
      </div>
      <span className="font-[var(--font-mono)] text-[11px] tracking-[0.3em] text-cyan-500/65 tabular-nums">
        {code}
      </span>
    </div>
  );
}
