"use client";

import { useEffect, useState } from "react";

import type { AgentState } from "./Particles";

/**
 * Top-of-screen header bar — three regions:
 *   left   — system identity, version, clock & date
 *   center — "SISTEMA ACTIVADO / BIENVENIDO, SEÑOR" plate
 *   right  — current agent state badge
 *
 * Type hierarchy follows UI/UX Pro Max guidance:
 *   • Display title:  Share Tech Mono, big tracking, soft glow
 *   • Section labels: Fira Code 10–11px, uppercase, tracking-widest
 *   • Live numbers:   Geist Mono tabular, no glow (avoid blur on data)
 */
export function HudHeader({ state }: { state: AgentState }) {
  const [now, setNow] = useState<Date | null>(null);

  // Hydration-safe clock: only set after mount, ticks every second.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("es-CO", { hour12: false })
    : "--:--:--";
  const date = now
    ? now
        .toLocaleDateString("es-CO", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
        .toUpperCase()
    : "—";

  const stateLabel: Record<AgentState, string> = {
    idle: "EN ESPERA",
    listening: "ESCUCHANDO",
    thinking: "PROCESANDO",
    speaking: "RESPONDIENDO",
  };
  const stateAccent: Record<AgentState, { text: string; border: string; led: string }> = {
    idle: { text: "text-cyan-200",   border: "border-cyan-400/40", led: "text-cyan-400" },
    listening: { text: "text-cyan-100",  border: "border-cyan-300/70", led: "text-cyan-300" },
    thinking: { text: "text-violet-200", border: "border-violet-400/60", led: "text-violet-300" },
    speaking: { text: "text-orange-200", border: "border-orange-400/70", led: "text-orange-400" },
  };
  const accent = stateAccent[state];

  return (
    <header className="absolute left-0 right-0 top-0 z-20 px-8 pt-6">
      <div className="flex items-start justify-between gap-6">
        {/* ─── Left: identity + clock ─────────────────────────────────── */}
        <div className="font-[var(--font-body)] text-[13px] tracking-[0.22em] text-cyan-300/85 leading-tight">
          <div className="flex items-center gap-2">
            <span className="hud-led text-cyan-400" />
            <span className="text-cyan-100 font-medium">YARBIS</span>
            <span className="text-cyan-500/45">//</span>
            <span className="text-cyan-400/65">v3.0.1</span>
          </div>
          <div className="mt-2 text-cyan-300/55 text-[12px] tracking-[0.3em]">{date}</div>
          <div className="font-[var(--font-mono)] text-cyan-100 text-[19px] tracking-[0.18em] tabular-nums mt-1">
            {time}
          </div>
        </div>

        {/* ─── Center: SISTEMA ACTIVADO + BIENVENIDO, SEÑOR ───────────── */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 font-[var(--font-display)] text-[12px] tracking-[0.4em] text-cyan-400/75">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-400/55" />
            SISTEMA ACTIVADO
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-400/55" />
          </div>

          {/* The hero of the HUD — Orbitron @ 46px, the canonical sci-fi
              wordmark font. Wide tracking + double glow for the JARVIS
              "this is a real lab" feel. */}
          <h1
            className="mt-3 font-[var(--font-wordmark)] leading-[0.95] tracking-[0.36em] text-cyan-100 hud-glow-wordmark"
            style={{ fontSize: "46px", fontWeight: 500 }}
          >
            BIENVENIDO,&nbsp;SEÑOR
          </h1>

          <div className="mt-3 flex items-center gap-3 font-[var(--font-display)] text-[11px] tracking-[0.45em] text-cyan-400/55">
            <span className="h-px w-6 bg-cyan-400/35" />
            <span>LAB · BUCARAMANGA · COLOMBIA</span>
            <span className="h-px w-6 bg-cyan-400/35" />
          </div>
        </div>

        {/* ─── Right: state badge ─────────────────────────────────────── */}
        <div className="flex flex-col items-end gap-2 font-[var(--font-body)] text-[12px] tracking-[0.3em] text-cyan-400/65 leading-tight">
          <div>ESTADO ACTUAL</div>
          <div
            className={`inline-flex items-center gap-2 border px-4 py-2 ${accent.border} bg-black/60 backdrop-blur ${accent.text}`}
          >
            <span className={`hud-led ${accent.led}`} />
            <span className="font-[var(--font-display)] text-[13px] tracking-[0.35em]">
              {stateLabel[state]}
            </span>
          </div>
          <div className="mt-1 text-cyan-500/55 text-[11px] tracking-[0.4em]">
            CH-01 · 48kHz
          </div>
        </div>
      </div>
    </header>
  );
}
