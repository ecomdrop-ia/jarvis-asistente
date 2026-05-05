"use client";

import { useEffect, useState } from "react";

/**
 * Decorative background layer that signals "AI builder workstation".
 *
 * Three sub-layers, all behind the HUD (z-0 to z-1, while the HUD is z-10+):
 *   1. Code rain   — slow streams of pseudo-code in the corners
 *   2. Tag cluster — small floating chips with stack/role labels
 *   3. Build feed  — terminal-style log lines that scroll up at the bottom
 *
 * Everything is heavily desaturated and low-opacity so the arc reactor and
 * panels remain the focal point.  The goal is "lab atmosphere", not "splash
 * screen for an IDE".
 */
import { CircuitTraces } from "./CircuitTraces";

export function DevBackground() {
  // Pure atmosphere: code rain on the sides, circuit traces in the
  // corners, blueprint marks (workstation labels) in the very corners.
  // Real content lives elsewhere (StackChips, BuildActivity, AiEngine).
  return (
    <>
      <CircuitTraces />
      <CodeRain side="left" />
      <CodeRain side="right" />
      <BlueprintMarks />
    </>
  );
}

/* ─── Code rain — vertical streams of code on each side ──────────────── */

const CODE_LINES = [
  "async def yarbis():",
  "  while alive:",
  "    text = await stt.recv()",
  "    reply = await llm(text)",
  "    await tts.send(reply)",
  "",
  "from livekit.agents import Agent",
  "agent = Agent(tools=ALL_TOOLS)",
  "await session.start(agent)",
  "",
  "@function_tool()",
  "async def open_app(name):",
  "  subprocess.Popen(['open',",
  "    '-a', name])",
  "  return f'opening {name}'",
  "",
  "// hermes.gateway.boot",
  "router.post('/v1/chat',",
  "  authMiddleware,",
  "  rateLimit(60),",
  "  inferenceHandler);",
  "",
  "[INFO] gpt-4o-mini · ready",
  "[INFO] deepgram · stt-es-nova-3",
  "[INFO] elevenlabs · cristian",
  "[INFO] webrtc · 48kHz · stereo",
  "[OK]  voice-bridge · listening",
];

function CodeRain({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`pointer-events-none absolute top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} w-40 overflow-hidden z-0`}
      style={{
        // Tighter mask — fades out earlier, less visible at edges.
        maskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 25%, rgba(0,0,0,0.5) 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 25%, rgba(0,0,0,0.5) 75%, transparent 100%)",
      }}
    >
      <div
        className="font-[var(--font-display)] text-[10px] leading-[1.5] text-cyan-500/15 px-4 whitespace-nowrap"
        style={{
          animation: `code-scroll-${side} 90s linear infinite`,
        }}
      >
        {/* Repeat the lines so the loop has no visible seam */}
        {[...CODE_LINES, ...CODE_LINES, ...CODE_LINES].map((line, i) => (
          <div key={i} style={{ opacity: line.startsWith("[OK]") ? 0.30 : line.startsWith("//") ? 0.20 : 0.15 }}>
            {line || "\u00a0"}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes code-scroll-left {
          from { transform: translateY(0); }
          to   { transform: translateY(-66.66%); }
        }
        @keyframes code-scroll-right {
          from { transform: translateY(-66.66%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Tag cluster — small chips spread around the screen ───────────── */

// Inline positioning gives us pixel-precise control vs Tailwind's class
// constraints — important so tags don't pile up in vertical clusters.
// Tags only render at >=xl breakpoint; below that, screen real estate
// is too tight.
const TAGS: { text: string; style: React.CSSProperties }[] = [
  // Top row — well above the panels, aligned with header
  { text: "AI BUILDER",        style: { top: "8rem",  left: "24rem"  } },
  { text: "FOUNDER MODE",      style: { top: "8rem",  right: "27rem" } },
  // Bottom row — below the panels, above the footer
  { text: "LATAM · ECOMMERCE", style: { bottom: "8rem", left: "24rem"  } },
  { text: "BUILDING · CORE",   style: { bottom: "8rem", right: "27rem" } },
];

function TagCluster() {
  return (
    <>
      {TAGS.map((t) => (
        <div
          key={t.text}
          className="pointer-events-none absolute z-0 hidden xl:flex items-center gap-1.5"
          style={t.style}
        >
          <span className="h-1 w-1 rounded-full bg-cyan-400/25" />
          <span className="font-[var(--font-display)] text-[9px] tracking-[0.4em] text-cyan-500/18 uppercase whitespace-nowrap">
            {t.text}
          </span>
        </div>
      ))}
    </>
  );
}

/* ─── Build feed — terminal log lines streaming at the bottom ────────── */

const FEED_TEMPLATES = [
  "[BUILD] ecomdrop_connector · turbo build · OK",
  "[DEPLOY] railway · production · 12.3s",
  "[GIT]   yarbis-asistente · main · clean",
  "[AGENT] tools registered: 14",
  "[LLM]   gpt-4o-mini · 0.27s · 1.2k tok",
  "[STT]   deepgram · es-nova-3 · 380ms",
  "[TTS]   elevenlabs · cristian · stream",
  "[MCP]   gmail · calendar · supabase",
  "[INFO]  hermes-agent · skills: 89",
  "[INFO]  livekit · room=yarbis-lab · 2 peers",
  "[OK]    voice loop · listening",
];

function BuildFeed() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    setLines(FEED_TEMPLATES.slice(0, 4));
    const id = setInterval(() => {
      setLines((prev) => {
        const next = FEED_TEMPLATES[(prev.length + Math.floor(Math.random() * 7)) % FEED_TEMPLATES.length];
        return [...prev.slice(-3), next];
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Bottom-center, narrow and short — just enough to feel "live" without
  // crowding the telemetry that lives in the SVG corners.
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-0 w-[380px] hidden 2xl:block">
      <div className="font-[var(--font-display)] text-[8px] leading-[1.7] tracking-[0.04em] text-cyan-500/15 text-center">
        {lines.map((l, i) => (
          <div
            key={i + l}
            style={{ opacity: 0.10 + (i / lines.length) * 0.20 }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Blueprint marks — corner labels and reference lines ──────────── */

function BlueprintMarks() {
  return (
    <>
      {/* Top-left build label */}
      <div className="pointer-events-none absolute top-24 left-6 z-0 font-[var(--font-display)] text-[9px] tracking-[0.4em] text-cyan-500/18 uppercase">
        <div>◇ workstation.elkin</div>
        <div className="mt-1">build.{new Date().toISOString().slice(0, 10)}</div>
      </div>

      {/* Top-right system info */}
      <div className="pointer-events-none absolute top-24 right-6 z-0 font-[var(--font-display)] text-[9px] tracking-[0.4em] text-cyan-500/18 uppercase text-right">
        <div>spec / mac.mini</div>
        <div className="mt-1">stack.ai/full</div>
      </div>

      {/* Bottom-left engineering tag */}
      <div className="pointer-events-none absolute bottom-24 left-6 z-0 font-[var(--font-display)] text-[9px] tracking-[0.4em] text-cyan-500/18 uppercase">
        <div>// engineered by</div>
        <div className="mt-0.5 text-cyan-300/55">elkin.garcia</div>
      </div>

      {/* Bottom-right copyright */}
      <div className="pointer-events-none absolute bottom-24 right-6 z-0 font-[var(--font-display)] text-[9px] tracking-[0.4em] text-cyan-500/18 uppercase text-right">
        <div>ecomdrop ia · 2026</div>
        <div className="mt-0.5">project.yarbis</div>
      </div>
    </>
  );
}
