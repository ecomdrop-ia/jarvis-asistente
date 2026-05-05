"use client";

import { useEffect, useState } from "react";

import type { AgentState } from "./Particles";

interface HudFrameProps {
  state: AgentState;
}

/**
 * Concentric SVG ring system that wraps the arc reactor.
 *
 * IMPORTANT: rotations are done via SMIL `<animateTransform>` instead of CSS
 * keyframes.  CSS `transform-box: view-box` proved unreliable across browsers,
 * making the rings drift off-center.  SMIL rotates around the parent SVG
 * coordinate system's origin (`0,0`), which here *is* the geometric center
 * of the viewBox `-200 -200 400 400` — guaranteed alignment, no drift.
 */
export function HudFrame({ state }: HudFrameProps) {
  // Anillos siempre cyan — son ambiente, no señalizador.  Solo el Arc
  // Reactor cambia de color según state, así el ojo sabe dónde mirar.
  const accent = "#07e2fe";

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const stateCode = state.toUpperCase().slice(0, 4);
  const cycleCount = (1247 + tick * 3).toString().padStart(5, "0");
  const variance = (47 + (tick % 9)).toString().padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="-200 -200 400 400"
        className="h-[min(82vh,82vw)] w-[min(82vh,82vw)] overflow-visible"
        style={{
          // Tenue: el HUD es ambiente, el reactor es el foco.
          filter: `drop-shadow(0 0 4px ${accent}55) drop-shadow(0 0 12px ${accent}22)`,
        }}
      >
        {/* ─── Outermost ring — slow CW rotation ─────────────────────── */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="60s"
            repeatCount="indefinite"
          />
          <circle r="195" fill="none" stroke={accent} strokeOpacity="0.10" strokeWidth="1" />
          <Arc r={195} from={18} to={78}   color={accent} width={1.5} opacity={0.55} />
          <Arc r={195} from={108} to={168} color={accent} width={1.5} opacity={0.55} />
          <Arc r={195} from={198} to={258} color={accent} width={1.5} opacity={0.55} />
          <Arc r={195} from={288} to={348} color={accent} width={1.5} opacity={0.55} />
          {Array.from({ length: 60 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={-188}
              x2={0}
              y2={i % 5 === 0 ? -180 : -184}
              stroke={accent}
              strokeOpacity={i % 5 === 0 ? 0.45 : 0.20}
              strokeWidth={i % 5 === 0 ? 1 : 0.6}
              transform={`rotate(${i * 6})`}
            />
          ))}
        </g>

        {/* ─── Mid ring — counter-rotation, dashed + targeting brackets ─ */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="-360 0 0"
            dur="35s"
            repeatCount="indefinite"
          />
          <circle
            r="160"
            fill="none"
            stroke={accent}
            strokeOpacity="0.40"
            strokeWidth="0.8"
            strokeDasharray="3 5"
          />
          {[0, 90, 180, 270].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <line x1={-10} y1={-165} x2={10} y2={-165} stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
              <line x1={-10} y1={-165} x2={-10} y2={-155} stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
              <line x1={10} y1={-165} x2={10} y2={-155} stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
            </g>
          ))}
          <Arc r={155} from={45} to={135} color={accent} width={2} opacity={0.55} />
          {[60, 75, 90, 105, 120].map((deg) => {
            const p = polar(155, deg);
            const inner = polar(149, deg);
            return (
              <line
                key={deg}
                x1={p.x}
                y1={p.y}
                x2={inner.x}
                y2={inner.y}
                stroke={accent}
                strokeWidth="0.8"
                strokeOpacity="0.45"
              />
            );
          })}
        </g>

        {/* ─── Inner ring — fast CW spin, decorative arcs only ──────── */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="14s"
            repeatCount="indefinite"
          />
          <circle r="128" fill="none" stroke={accent} strokeOpacity="0.50" strokeWidth="1" />
          <Arc r={128} from={-5} to={35}    color={accent} width={2} opacity={0.65} />
          <Arc r={128} from={155} to={205}  color={accent} width={2} opacity={0.65} />
        </g>

        {/* ─── Static SYS labels (decorative, very subtle) ──────────── */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const p = polar(116, angle);
          return (
            <text
              key={angle}
              x={p.x}
              y={p.y}
              fill={accent}
              fillOpacity="0.25"
              fontSize="5.5"
              fontFamily="var(--font-display)"
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="0.5"
            >
              {`SYS-${String(i).padStart(2, "0")}`}
            </text>
          );
        })}

        {/* ─── Static guideline ring (no rotation) ────────────────────── */}
        <circle
          r="105"
          fill="none"
          stroke={accent}
          strokeOpacity="0.20"
          strokeWidth="0.6"
          strokeDasharray="1 3"
        />

        {/* ─── Cross-hair (subtle, only inside the inner ring) ────────── */}
        <line x1={-95} y1={0} x2={-105} y2={0} stroke={accent} strokeOpacity="0.30" strokeWidth="0.6" />
        <line x1={95} y1={0} x2={105} y2={0} stroke={accent} strokeOpacity="0.30" strokeWidth="0.6" />
        <line x1={0} y1={-95} x2={0} y2={-105} stroke={accent} strokeOpacity="0.30" strokeWidth="0.6" />
        <line x1={0} y1={95} x2={0} y2={105} stroke={accent} strokeOpacity="0.30" strokeWidth="0.6" />

        {/* ─── Live telemetry — ambient only, not protagonist ─────────── */}
        <text x={-175} y={-130} fill={accent} fillOpacity="0.30" fontSize="6" fontFamily="var(--font-display)" letterSpacing="0.4">
          MODE :: {stateCode}
        </text>
        <text x={120}  y={-130} fill={accent} fillOpacity="0.30" fontSize="6" fontFamily="var(--font-display)" letterSpacing="0.4">
          C/{cycleCount}
        </text>
        <text x={-175} y={140}  fill={accent} fillOpacity="0.30" fontSize="6" fontFamily="var(--font-display)" letterSpacing="0.4">
          ▲ {variance}.3 dB
        </text>
        <text x={130}  y={140}  fill={accent} fillOpacity="0.30" fontSize="6" fontFamily="var(--font-display)" letterSpacing="0.4">
          PWR 100%
        </text>

        {/* ─── Containment frame brackets at SVG corners ──────────────── */}
        {[
          [-180, -180, 1, 1],
          [180, -180, -1, 1],
          [-180, 180, 1, -1],
          [180, 180, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <line x1={0} y1={0} x2={22 * sx} y2={0} stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
            <line x1={0} y1={0} x2={0} y2={22 * sy} stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Arc helper — converts polar degrees into an SVG path. */
function Arc({
  r,
  from,
  to,
  color,
  width,
  opacity = 1,
}: {
  r: number;
  from: number;
  to: number;
  color: string;
  width: number;
  opacity?: number;
}) {
  const start = polar(r, from);
  const end = polar(r, to);
  const largeArc = to - from > 180 ? 1 : 0;
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}
