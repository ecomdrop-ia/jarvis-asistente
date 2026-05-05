"use client";

import type { AgentState } from "./Particles";

interface ArcReactorProps {
  state: AgentState;
  audioLevel: number;
}

/**
 * The arc reactor at the center of the HUD — replaces the previous "blue
 * blob" particle focal element.  Inspired by Tony Stark's chest reactor:
 *
 *   1. A central hexagonal core (the iconic Mk-II shape).
 *   2. Six triangular "ray" segments radiating outward.
 *   3. An inner ring with notches and a pulsing glow.
 *   4. Tiny orbiting markers that rotate gently.
 *
 * The reactor itself doesn't rotate — only the surrounding HUD rings do.
 * It pulses with audio level so the scene reacts when YARBIS speaks,
 * but stays anchored at the geometric center of the screen.
 */
export function ArcReactor({ state, audioLevel }: ArcReactorProps) {
  const accent =
    state === "speaking"
      ? "#fb923c"
      : state === "thinking"
        ? "#a78bfa"
        : state === "listening"
          ? "#67e8f9"
          : "#22d3ee";

  // Audio drives a subtle scale + glow pulse on the core.
  const corePulse = 1 + audioLevel * 0.06;
  const glowAmount = 6 + audioLevel * 24;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="-100 -100 200 200"
        className="h-[min(38vh,38vw)] w-[min(38vh,38vw)] overflow-visible"
        style={{
          // Stronger glow than anything else on screen — establishes the
          // reactor as the single focal element of the HUD.
          filter: `drop-shadow(0 0 ${glowAmount + 6}px ${accent}dd) drop-shadow(0 0 ${(glowAmount + 6) * 2.4}px ${accent}66)`,
          transform: `scale(${corePulse})`,
          transition: "transform 80ms linear",
        }}
      >
        <defs>
          {/* Radial gradient for the core glow */}
          <radialGradient id="reactor-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%"  stopColor={accent}   stopOpacity="0.95" />
            <stop offset="60%"  stopColor={accent}   stopOpacity="0.45" />
            <stop offset="100%" stopColor={accent}   stopOpacity="0" />
          </radialGradient>
          {/* Thin radial for the ray segments */}
          <radialGradient id="reactor-ray" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* ─── Outer halo glow (largest, softest) ───────────────────────── */}
        <circle r="92" fill="url(#reactor-core)" opacity="0.25" />

        {/* ─── Outer ring with notches ──────────────────────────────────── */}
        <circle r="78" fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.85" />
        {Array.from({ length: 36 }).map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={-78}
            x2={0}
            y2={i % 3 === 0 ? -70 : -74}
            stroke={accent}
            strokeOpacity={i % 3 === 0 ? 1 : 0.4}
            strokeWidth={i % 3 === 0 ? 1.2 : 0.6}
            transform={`rotate(${i * 10})`}
          />
        ))}

        {/* ─── Six triangular "rays" (Mk-II reactor signature) ──────────── */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = i * 60;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <polygon
                points="-9,-65 9,-65 4,-30 -4,-30"
                fill="url(#reactor-ray)"
                opacity="0.8"
              />
              <polygon
                points="-9,-65 9,-65 4,-30 -4,-30"
                fill="none"
                stroke={accent}
                strokeOpacity="0.95"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* ─── Inner ring (between rays and hex) ────────────────────────── */}
        <circle r="32" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.7" />
        <circle
          r="28"
          fill="none"
          stroke={accent}
          strokeWidth="0.6"
          strokeOpacity="0.4"
          strokeDasharray="2 3"
        />

        {/* ─── Central hexagonal core (the iconic Mk-II shape) ──────────── */}
        <g>
          {/* Bright halo around the hexagon */}
          <circle r="22" fill="url(#reactor-core)" />
          {/* The hexagon itself */}
          <polygon
            points={hexagonPoints(20)}
            fill="rgba(255,255,255,0.06)"
            stroke={accent}
            strokeWidth="1.6"
            strokeOpacity="1"
          />
          {/* Inner hexagon for depth */}
          <polygon
            points={hexagonPoints(13)}
            fill="none"
            stroke={accent}
            strokeWidth="0.8"
            strokeOpacity="0.85"
          />
          {/* Brightest core dot */}
          <circle r="4" fill="#ffffff" opacity="0.95" />
          <circle r="7" fill={accent} opacity="0.6" />
        </g>

        {/* ─── Three slow-orbiting "satellite" markers ──────────────────── */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="-360 0 0"
            dur="20s"
            repeatCount="indefinite"
          />
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <circle cx={0} cy={-50} r={1.6} fill={accent} opacity="0.95" />
              <circle cx={0} cy={-50} r={3.2} fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="0.6" />
            </g>
          ))}
        </g>

        {/* ─── Tick segments at the cardinals on the inner ring ─────────── */}
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <line x1={-3} y1={-32} x2={3} y2={-32} stroke={accent} strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Pointy-top regular hexagon, returns "x1,y1 x2,y2 …" for a polygon. */
function hexagonPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2; // start at top
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}
