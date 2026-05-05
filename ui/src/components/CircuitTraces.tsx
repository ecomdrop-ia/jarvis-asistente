"use client";

/**
 * Decorative circuit traces in the 4 corners of the viewport — give the
 * background that "lab control panel" feel without adding noise.
 * Each corner has a different trace pattern so the layout doesn't read
 * as repetitive.
 *
 * SVG so they scale crisply. Pure decoration: pointer-events:none, no
 * state, no animation — just static geometry that reads "engineered".
 */
export function CircuitTraces() {
  return (
    <>
      <Corner pos="top-left" />
      <Corner pos="top-right" />
      <Corner pos="bottom-left" />
      <Corner pos="bottom-right" />
    </>
  );
}

interface CornerProps {
  pos: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

function Corner({ pos }: CornerProps) {
  const transforms: Record<CornerProps["pos"], string> = {
    "top-left":     "scale(1, 1)",
    "top-right":    "scale(-1, 1)",
    "bottom-left":  "scale(1, -1)",
    "bottom-right": "scale(-1, -1)",
  };
  const positions: Record<CornerProps["pos"], string> = {
    "top-left":     "top-0 left-0",
    "top-right":    "top-0 right-0",
    "bottom-left":  "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
  };

  return (
    <div
      className={`pointer-events-none absolute ${positions[pos]} z-0 w-[300px] h-[300px]`}
      style={{ transform: transforms[pos] }}
    >
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 0 4px rgba(7, 226, 254, 0.25))" }}
      >
        {/* Main angular trace — a path that hugs the corner */}
        <path
          d="M 0 60 L 80 60 L 100 80 L 100 140 L 130 170 L 200 170"
          fill="none"
          stroke="rgb(7, 226, 254)"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          strokeLinecap="square"
        />
        {/* Secondary parallel trace */}
        <path
          d="M 0 90 L 65 90 L 80 105 L 80 200"
          fill="none"
          stroke="rgb(7, 226, 254)"
          strokeOpacity="0.14"
          strokeWidth="1"
          strokeLinecap="square"
        />
        {/* Solder pads — small circles at trace junctions */}
        <circle cx="100" cy="80" r="2.5" fill="rgb(7, 226, 254)" fillOpacity="0.45" />
        <circle cx="100" cy="80" r="5" fill="none" stroke="rgb(7, 226, 254)" strokeOpacity="0.20" strokeWidth="0.8" />
        <circle cx="130" cy="170" r="2" fill="rgb(7, 226, 254)" fillOpacity="0.40" />
        <circle cx="80" cy="105" r="1.5" fill="rgb(7, 226, 254)" fillOpacity="0.35" />

        {/* Small dashed sub-trace */}
        <line
          x1="0"
          y1="30"
          x2="50"
          y2="30"
          stroke="rgb(7, 226, 254)"
          strokeOpacity="0.18"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
        {/* Tiny via marker */}
        <rect x="48" y="27" width="6" height="6" fill="none" stroke="rgb(7, 226, 254)" strokeOpacity="0.25" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
