"use client";

import { useEffect, useState } from "react";

/**
 * AI Engine widget — the signature piece that turns "generic JARVIS HUD"
 * into "AI builder workstation".  Displays the actual stack signals an
 * AI engineer cares about: active model, token throughput, cost so far,
 * end-to-end latency, Hermes skill count.
 *
 * Numbers are simulated for now (slow drift over time so it feels live)
 * but the contract is structured so we can wire them to real telemetry
 * later — a /api/metrics endpoint or websocket from the voice-bridge.
 */
export function AiEnginePanel() {
  const [tokens, setTokens] = useState({ in: 12_400, out: 8_700 });
  const [cost, setCost] = useState(0.04);
  const [latency, setLatency] = useState(247);
  const [reqCount, setReqCount] = useState(0);

  // Slow drift so the widget feels alive without being noisy.
  useEffect(() => {
    const id = setInterval(() => {
      setTokens((t) => ({
        in: t.in + Math.floor(Math.random() * 80),
        out: t.out + Math.floor(Math.random() * 60),
      }));
      setCost((c) => c + Math.random() * 0.0008);
      setLatency(220 + Math.floor(Math.random() * 120));
      setReqCount((c) => c + 1);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="hud-panel pointer-events-none absolute left-6 z-20 w-80 rounded-[2px] p-6"
      style={{ bottom: "5.5rem" }}
    >
      <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

      <Header title="AI ENGINE" code="E-01" />

      <ul className="mt-5 space-y-3 font-[var(--font-body)] text-[14px] tracking-[0.05em]">
        <Row
          label="MODEL"
          value="gpt-4o-mini"
          tone="brand"
        />
        <Row
          label="TOKENS"
          value={
            <>
              <span className="text-cyan-100">{fmt(tokens.in)}</span>
              <span className="text-cyan-500/50 mx-1">/</span>
              <span className="text-cyan-300/85">{fmt(tokens.out)}</span>
            </>
          }
          tone="data"
        />
        <Row
          label="COST"
          value={`$${cost.toFixed(3)} today`}
          tone="data"
        />
        <Row
          label="LATENCY"
          value={`${latency}ms avg`}
          tone={latency < 300 ? "ok" : "warn"}
        />
        <Row
          label="HERMES"
          value="89 skills · ready"
          tone="ok"
        />
      </ul>

      <div className="mt-5 border-t border-cyan-500/15 pt-3.5 flex items-center justify-between font-[var(--font-display)] text-[11px] tracking-[0.3em] text-cyan-500/70 tabular-nums">
        <span>REQ {String(reqCount).padStart(4, "0")}</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgb(34,197,94)]" />
          OPERATIONAL
        </span>
      </div>
    </aside>
  );
}

/* ─── Internals ─────────────────────────────────────────────────── */

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

function Row({
  label,
  value,
  tone = "data",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "data" | "ok" | "warn" | "brand";
}) {
  const dotColor = {
    data: "text-cyan-400/60",
    ok: "text-emerald-500/80",
    warn: "text-amber-500/80",
    brand: "text-cyan-300",
  }[tone];

  return (
    <li className="flex items-center justify-between gap-3 leading-tight">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`hud-led ${dotColor}`} />
        <span className="font-[var(--font-display)] text-[12px] tracking-[0.22em] text-cyan-100/75 uppercase">
          {label}
        </span>
      </div>
      <span className="font-[var(--font-mono)] text-[13px] tracking-[0.04em] text-cyan-100 tabular-nums whitespace-nowrap">
        {value}
      </span>
    </li>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
