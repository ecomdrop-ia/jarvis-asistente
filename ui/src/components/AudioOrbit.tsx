"use client";

import { useEffect, useRef, useState } from "react";

import type { AgentState } from "./Particles";

interface AudioOrbitProps {
  audioLevel: number;       // 0..1 normalised RMS
  state: AgentState;
}

/**
 * Radial audio visualiser orbiting the Arc Reactor.
 *
 * 64 SVG bars arranged in a circle around the reactor.  Each bar's
 * outward extension is derived from the global audio level multiplied
 * by a per-bar phase factor — gives the illusion of an FFT spectrum
 * even though we only have RMS.  Bars are state-coloured (cyan idle,
 * orange speaking, violet thinking) so the entire ring breathes with
 * YARBIS's voice or yours.
 *
 * Replaces the two flat audio meters (left panel + footer) — one
 * unified visualisation that lives where the eye is already looking.
 */
const BAR_COUNT   = 72;
const INNER_R     = 105;   // just outside the arc reactor visual extent
const BAR_MIN     = 4;     // bar length when silent
const BAR_MAX     = 38;    // bar length at peak audio
const SVG_VIEWBOX = "-200 -200 400 400";  // matches HudFrame for alignment

export function AudioOrbit({ audioLevel, state }: AudioOrbitProps) {
  const accent =
    state === "speaking"
      ? "#fb923c"
      : state === "thinking"
        ? "#a78bfa"
        : state === "listening"
          ? "#67e8f9"
          : "#07e2fe";

  // Per-bar phase factors — pre-computed so each bar feels distinct
  // (some short, some tall) while sharing the same audio source.
  const phases = useRef<number[] | null>(null);
  if (!phases.current) {
    const arr = new Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      // Mix two sines + a tiny random for organic variance.
      arr[i] =
        0.55 +
        Math.abs(Math.sin(i * 0.41) * 0.25 + Math.cos(i * 0.27) * 0.15) +
        (Math.random() - 0.5) * 0.10;
    }
    phases.current = arr;
  }

  // Smooth audio level so the visualiser doesn't jitter on noisy RMS.
  const [smoothLevel, setSmoothLevel] = useState(0);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setSmoothLevel((prev) => prev + (audioLevel - prev) * 0.22);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioLevel]);

  const baseLevel = state === "idle" ? 0.04 : 0.08;
  const liveLevel = Math.max(baseLevel, smoothLevel);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox={SVG_VIEWBOX}
        className="h-[min(82vh,82vw)] w-[min(82vh,82vw)] overflow-visible"
        style={{
          filter: `drop-shadow(0 0 6px ${accent}55)`,
        }}
      >
        {phases.current.map((phase, i) => {
          const angle = (i / BAR_COUNT) * 360;
          const length = BAR_MIN + liveLevel * (BAR_MAX - BAR_MIN) * phase;
          const outerR = INNER_R + length;

          // Brighter on the bars that "peak" higher — adds depth.
          const intensity = Math.min(1, length / (BAR_MAX * 0.7));
          const opacity   = 0.35 + intensity * 0.55;

          return (
            <line
              key={i}
              x1={0}
              y1={-INNER_R}
              x2={0}
              y2={-outerR}
              stroke={accent}
              strokeOpacity={opacity}
              strokeWidth={1.6}
              strokeLinecap="round"
              transform={`rotate(${angle})`}
            />
          );
        })}
      </svg>
    </div>
  );
}
