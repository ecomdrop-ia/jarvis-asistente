"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

interface ParticlesProps {
  /** RMS amplitude 0..1 — drives the radial pulse on the speaking state. */
  audioLevel: number;
  state: AgentState;
}

// Subtle particle halo around the arc reactor — NOT the focal element.
// We keep the count small so it reads as "atmosphere" rather than as a blob,
// and clamp the audio-driven bulge so it never spills past the inner HUD ring.
const PARTICLE_COUNT = 1400;
const BASE_RADIUS = 0.85;
const MAX_BULGE = 0.18;     // keeps the halo contained inside the inner ring
const MAX_PARTICLE_SIZE_MUL = 1.0;

// Color per state, in HSL — the shader smoothly interpolates between the
// previous and current target each frame.
const STATE_COLORS: Record<AgentState, THREE.Color> = {
  idle: new THREE.Color("#3b82f6"),       // calm blue
  listening: new THREE.Color("#06b6d4"),  // cyan
  thinking: new THREE.Color("#a855f7"),   // violet
  speaking: new THREE.Color("#f97316"),   // orange (Iron Man arc reactor vibe)
};

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uAudio;
  uniform float uPulse;
  uniform float uRadius;
  attribute float aPhase;
  attribute float aSize;

  varying float vDistance;
  varying float vPhase;

  // Cheap pseudo-noise: combines a few sines so the sphere shimmers.
  float noise(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(position);

    // Slow swirl + audio-driven radial bulge.  Bulge is hard-clamped so the
    // halo never crosses the SVG inner ring at the front of the HUD.
    float swirl = sin(uTime * 0.25 + aPhase * 6.2831) * 0.025;
    float bulge = clamp(uAudio * 0.18 + uPulse * 0.04, 0.0, 0.22);
    float radius = uRadius + swirl + bulge;

    vec3 displaced = dir * radius;

    // Tiny random jitter so particles don't sit on a perfect shell.
    displaced += dir * (noise(aPhase + uTime * 0.1) - 0.5) * 0.02;

    vDistance = radius;
    vPhase = aPhase;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    // Size attenuation — closer particles are bigger.  We don't grow on
    // audio anymore (the arc reactor reacts instead) so the halo stays calm.
    gl_PointSize = aSize * (260.0 / -mv.z);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAudio;
  varying float vDistance;
  varying float vPhase;

  void main() {
    // Soft circular sprite — discard pixels outside a radius.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    // Brighter core, falloff at the edge.
    float alpha = smoothstep(0.5, 0.0, d);

    // Highlight pulses with audio so the sphere "breathes" on speech.
    vec3 col = uColor * (0.7 + 0.6 * vPhase + uAudio * 0.8);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function ParticleSphere({ audioLevel, state }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Build the geometry once — particles randomized on a unit sphere via the
  // standard "spherical coordinates from uniform random" trick.
  const geometry = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      positions[i * 3] = Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = Math.cos(phi);

      phases[i] = Math.random();
      // Smaller, less varied sizes — these are atmospheric "stars",
      // not the focal element of the HUD.
      sizes[i] = 0.4 + Math.random() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uPulse: { value: 0 },
      uRadius: { value: BASE_RADIUS },
      uColor: { value: STATE_COLORS.idle.clone() },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!materialRef.current || !pointsRef.current) return;

    uniforms.uTime.value += delta;

    // Smooth audio level toward target so we don't stutter on jittery RMS.
    uniforms.uAudio.value += (audioLevel - uniforms.uAudio.value) * 0.18;

    // Heartbeat: slow sine, slightly faster when listening.
    const heartbeatSpeed = state === "listening" ? 1.4 : state === "thinking" ? 2.2 : 0.9;
    uniforms.uPulse.value = Math.sin(uniforms.uTime.value * heartbeatSpeed);

    // Color tween toward the current state color.
    const target = STATE_COLORS[state];
    uniforms.uColor.value.lerp(target, 0.05);

    // Slow rotation of the whole sphere — gives it life when idle.
    pointsRef.current.rotation.y += delta * 0.08;
    pointsRef.current.rotation.x += delta * 0.02;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
