"use client";

/**
 * Stack chips — replaces the previous decorative tags ("AI BUILDER",
 * "FOUNDER MODE") with the actual tech stack Elkin uses every day.
 * Each chip carries a tiny status LED so the row reads as instrumentation,
 * not branding.
 *
 * Sits centered just below the header, between the title and the HUD.
 */

interface StackChip {
  label: string;
  status: "online" | "ready" | "idle";
}

const STACK: StackChip[] = [
  { label: "CLAUDE-OPUS-4.6", status: "ready" },
  { label: "GPT-4o-MINI",     status: "online" },
  { label: "HERMES · 89",     status: "online" },
  { label: "DEEPGRAM",        status: "online" },
  { label: "ELEVENLABS",      status: "online" },
  { label: "SUPABASE",        status: "ready" },
  { label: "RAILWAY",         status: "ready" },
];

export function StackChips() {
  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[7rem] z-20 flex items-center gap-2.5 flex-wrap justify-center max-w-[820px]">
      {STACK.map((chip) => (
        <Chip key={chip.label} chip={chip} />
      ))}
    </div>
  );
}

function Chip({ chip }: { chip: StackChip }) {
  const dotColor = {
    online: "text-emerald-500/85",
    ready:  "text-cyan-400/80",
    idle:   "text-cyan-700/60",
  }[chip.status];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-cyan-500/20 bg-cyan-950/30 backdrop-blur-sm rounded-sm">
      <span className={`hud-led ${dotColor}`} style={{ width: "6px", height: "6px" }} />
      <span className="font-[var(--font-display)] text-[11px] tracking-[0.22em] text-cyan-100/85 uppercase whitespace-nowrap">
        {chip.label}
      </span>
    </div>
  );
}
