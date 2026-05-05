"use client";

import { useEffect, useState } from "react";

import type { AgentState } from "./Particles";

/* ─── Subsystem status (left panel) ──────────────────────────────────── */

interface Subsystem {
  label: string;
  status: "ok" | "warn" | "err";
  detail?: string;
}

export function StatusPanel({
  state,
  audioLevel: _audioLevel,
  micActive,
}: {
  state: AgentState;
  audioLevel: number;
  micActive: boolean;
}) {
  const subsystems: Subsystem[] = [
    { label: "VOICE BRIDGE",  status: "ok",                     detail: state === "idle" ? "STBY" : "LIVE" },
    { label: "LLM CORE",       status: "ok",                     detail: "GPT-4o-MINI" },
    { label: "STT · DEEPGRAM", status: "ok",                     detail: "ES-NOVA-3" },
    { label: "TTS · ELEVEN",   status: "ok",                     detail: "CRISTIAN" },
    { label: "MICROPHONE",     status: micActive ? "ok" : "warn", detail: micActive ? "OPEN" : "MUTED" },
    { label: "MUSIC ENGINE",   status: "ok",                     detail: "AC/DC LOAD" },
    { label: "SAFETY LAYER",   status: "ok",                     detail: "ACTIVE" },
  ];

  return (
    <aside
      className="hud-panel pointer-events-none absolute left-6 z-20 w-80 rounded-[2px] p-6"
      style={{ top: "10.5rem" }}
    >
      {/* Decorative top stripe */}
      <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

      <SectionHeader title="SUBSISTEMAS" code="P-01" />

      <ul className="mt-5 space-y-3 font-[var(--font-body)] text-[13px] tracking-[0.10em]">
        {subsystems.map((s, i) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 border-b border-cyan-500/10 pb-2.5 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-[var(--font-mono)] text-[11px] text-cyan-500/55 tabular-nums w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`hud-led ${
                  s.status === "ok"
                    ? "text-emerald-500/85"
                    : s.status === "warn"
                      ? "text-amber-500/85"
                      : "text-red-500/85"
                }`}
              />
              <span className="text-cyan-100/90 truncate">{s.label}</span>
            </div>
            <span className="font-[var(--font-display)] text-[12px] tracking-[0.18em] text-cyan-300/70 whitespace-nowrap">
              {s.detail}
            </span>
          </li>
        ))}
      </ul>

    </aside>
  );
}

/* ─── Stoic quote of the day (right panel) ─────────────────────────── */

const QUOTES: { text: string; author: string }[] = [
  { text: "Lo que no avanza, retrocede.", author: "Marco Aurelio" },
  { text: "El obstáculo es el camino.", author: "Marco Aurelio" },
  { text: "No es que las cosas sean difíciles porque no nos atrevemos; no nos atrevemos porque son difíciles.", author: "Séneca" },
  { text: "No son las cosas las que perturban al hombre, sino sus juicios sobre ellas.", author: "Epicteto" },
  { text: "Tu mente se convertirá en aquello que ocupe la mayor parte del tiempo.", author: "Marco Aurelio" },
  { text: "La disciplina es la libertad.", author: "Aristóteles" },
  { text: "El ladrillo se pone uno por uno; los imperios se construyen así.", author: "Builder Code" },
  { text: "La constancia te hará invencible.", author: "Builder Code" },
  { text: "Despierta. La acción es la antesala de los logros.", author: "Marco Aurelio" },
];

export function QuotePanel() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() / 86400000) % QUOTES.length);
    setIdx(dayOfYear);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 500);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const q = QUOTES[idx];

  return (
    <aside
      className="hud-panel pointer-events-none absolute right-6 z-20 rounded-[2px] p-6"
      style={{ top: "10.5rem", width: "26rem" }}
    >
      <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

      <SectionHeader title="FRASE DEL DÍA" code="Q-DAY" />

      <div
        className={`mt-6 relative transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {/* Big decorative quote mark - absolute positioned so it doesn't push the text */}
        <div
          aria-hidden
          className="absolute -top-4 -left-2 font-[var(--font-display)] text-cyan-400/30 hud-glow-soft pointer-events-none select-none leading-none"
          style={{ fontSize: "4rem" }}
        >
          &ldquo;
        </div>
        <blockquote className="relative pl-5 pr-2 font-[var(--font-body)] text-[18px] leading-[1.55] text-cyan-50 italic font-light">
          {q.text}
        </blockquote>
        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/60 to-transparent" />
          <span className="font-[var(--font-display)] text-[12px] uppercase tracking-[0.4em] text-cyan-100">
            {q.author}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-cyan-500/20 pt-3 font-[var(--font-mono)] text-[11px] tracking-[0.3em] text-cyan-500/65 tabular-nums">
        <span>Q.{String(idx + 1).padStart(2, "0")} / {String(QUOTES.length).padStart(2, "0")}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          AUTO 30s
        </span>
      </div>
    </aside>
  );
}

/* ─── Footer — telemetry stats only ─────────────────────────────────
 * The audio meter is gone — it's been replaced by the AudioOrbit ring
 * around the Arc Reactor.  One unified visualiser instead of three
 * (panel + footer + reactor), all where the eye already is.
 */

export function HudFooter({ state: _state, audioLevel: _audioLevel }: { audioLevel: number; state: AgentState }) {
  const uptime = useUptime();
  return (
    <footer className="absolute bottom-4 left-0 right-0 z-20 px-8">
      <div className="flex items-end justify-between gap-6 font-[var(--font-body)] text-[12px] tracking-[0.25em] text-cyan-400/75">
        <div className="flex items-center gap-3 text-cyan-500/65">
          <span className="hud-led text-cyan-400/80" />
          <span className="font-[var(--font-display)] text-[11px] tracking-[0.4em] text-cyan-400/75">
            AUDIO STREAM ACTIVE
          </span>
          <span className="h-px w-12 bg-cyan-500/30" />
        </div>

        <div className="flex gap-8 text-cyan-300/70">
          <Stat label="ROOM"     value="YARBIS-LAB" />
          <Stat label="STREAM"   value="48kHz · STEREO" />
          <Stat label="CODEC"    value="OPUS · 64kbps" />
          <Stat label="LATENCIA" value="< 2.0 s" />
          <Stat label="UPTIME"   value={uptime} />
        </div>
      </div>
    </footer>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function SectionHeader({ title, code }: { title: string; code: string }) {
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 leading-none">
      <span className="font-[var(--font-display)] text-[11px] tracking-[0.4em] text-cyan-500/65">{label}</span>
      <span className="font-[var(--font-mono)] text-[13px] text-cyan-100 tabular-nums">{value}</span>
    </div>
  );
}

// `AudioBars` was removed — audio is now visualised by AudioOrbit (radial
// ring around the Arc Reactor). Single source of truth for audio.

function useUptime() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
