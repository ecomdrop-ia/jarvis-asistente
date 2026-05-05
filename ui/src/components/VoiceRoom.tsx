"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RemoteAudioTrack, Track } from "livekit-client";
import { useCallback, useEffect, useState } from "react";

import { AiEnginePanel } from "./AiEngine";
import { ArcReactor } from "./ArcReactor";
import { useAudioLevel } from "./AudioAnalyzer";
import { AudioOrbit } from "./AudioOrbit";
import { BuildActivity } from "./BuildActivity";
import { DevBackground } from "./DevBackground";
import { HudFrame } from "./HudFrame";
import { HudFooter, QuotePanel, StatusPanel } from "./HudPanels";
import { HudHeader } from "./HudHeader";
import { StackChips } from "./StackChips";
import type { AgentState } from "./Particles";

interface TokenResponse {
  token: string;
  url: string;
  room: string;
}

/** Top-level entry: auto-fetches a token on mount, then connects to the room.
 *
 * No "INICIAR SISTEMA" button — YARBIS comes online instantly when the UI
 * loads.  This works because we ship inside Electron (autoplay restrictions
 * are disabled there); a vanilla browser would queue the agent's voice until
 * a user gesture, which is why we don't recommend it as a standalone web UI.
 */
export function VoiceRoom() {
  const [creds, setCreds] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const room = process.env.NEXT_PUBLIC_LIVEKIT_ROOM ?? "yarbis-lab";
      const res = await fetch(`/api/token?room=${room}`);
      if (!res.ok) throw new Error(`token endpoint returned ${res.status}`);
      setCreds(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Auto-connect on mount.  Empty dep array ⇒ runs exactly once.
  useEffect(() => {
    connect();
  }, [connect]);

  if (error) return <ErrorScreen error={error} onRetry={connect} />;
  if (!creds) return <BootScreen />;

  return (
    <LiveKitRoom
      serverUrl={creds.url}
      token={creds.token}
      connect
      audio
      video={false}
      className="h-full w-full"
    >
      <RoomAudioRenderer />
      <RoomScene />
    </LiveKitRoom>
  );
}

/* ─── Boot screen — shown for the ~200ms it takes to fetch the token ──── */

function BootScreen() {
  return (
    <div className="hud-grid hud-scanlines relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="font-[var(--font-mono)] text-[11px] tracking-[0.45em] text-cyan-400/70">
          ▌ YARBIS // v3.0.1 ▐
        </div>
        <h1 className="font-[var(--font-display)] text-5xl font-light tracking-[0.4em] text-cyan-200 hud-glow">
          YARBIS
        </h1>
        <p className="font-[var(--font-body)] text-xs tracking-[0.4em] text-cyan-400/70 mt-3">
          INICIANDO SISTEMAS
        </p>
        <div className="mt-2 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-cyan-400 hud-glow-soft"
              style={{
                animation: `hud-flicker 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Error screen — shown if the token endpoint fails ────────────────── */

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="hud-grid hud-scanlines relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-4 max-w-lg text-center">
        <div className="font-[var(--font-display)] text-[11px] tracking-[0.55em] text-red-400 hud-glow-soft">
          ⚠ ERROR DE SISTEMA
        </div>
        <p className="font-[var(--font-body)] text-sm tracking-wide text-red-300/90">
          No se pudo conectar al voice-bridge
        </p>
        <code className="font-[var(--font-mono)] text-[11px] text-red-400/70 px-4 py-2 border border-red-500/30 bg-red-950/20 rounded-sm">
          {error}
        </code>
        <p className="font-[var(--font-body)] text-xs tracking-wide text-cyan-300/50 mt-2">
          Verifica que LiveKit Server (ws://localhost:7880) esté corriendo.
        </p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-3 border border-cyan-400/60 bg-cyan-500/5 px-8 py-2.5 font-[var(--font-display)] text-xs tracking-[0.4em] text-cyan-200 hover:bg-cyan-500/15 hud-glow-soft transition"
        >
          <span className="hud-led text-cyan-300" />
          REINTENTAR
        </button>
      </div>
    </div>
  );
}

/* ─── Connected scene ─────────────────────────────────────────────────── */

/* ─── Hook: client-side audio ducking ─────────────────────────────────
 *
 * BackgroundAudioPlayer (Python) doesn't natively duck the music when
 * the agent speaks — we implement it here on the renderer side.
 *
 * Strategy: find the agent's `background_audio` track in the room,
 * grab its <audio> element via attach(), and set its .volume property
 * based on the current AgentState.  Smooth transition via short CSS-y
 * fade so it doesn't pop.
 */
function useDuckBackgroundMusic(state: AgentState) {
  const room = useRoomContext();
  // useTracks subscribes us to every audio track in the room with reactive
  // updates — so when the agent publishes its two tracks, we re-run.
  const allTracks = useTracks([Track.Source.Unknown], { onlySubscribed: true });

  useEffect(() => {
    if (!room) return;

    // Find the music track. The Python side names it via:
    //   _audio_source = rtc.AudioSource(...) → published as 'background_audio'
    // It's distinct from `roomio_audio` (the voice).
    let musicAudioEl: HTMLAudioElement | null = null;
    for (const trackRef of allTracks) {
      const pub = trackRef.publication;
      const track = pub?.track;
      if (!(track instanceof RemoteAudioTrack)) continue;

      const name = pub?.trackName ?? "";
      if (name.includes("background_audio") || name.includes("background")) {
        // attach() returns a new <audio> element if needed; LiveKit
        // also ensures one exists when the track is being rendered by
        // RoomAudioRenderer.  Reuse the first attached element.
        const attached = track.attachedElements;
        musicAudioEl =
          (attached[0] as HTMLAudioElement | undefined) ?? track.attach();
        break;
      }
    }

    if (!musicAudioEl) return;

    // Target volume: drop hard while speaking, partial drop while
    // thinking (so it doesn't feel dead), full while listening/idle.
    const target =
      state === "speaking" ? 0.10 :
      state === "thinking" ? 0.55 :
      0.85;  // listening / idle

    // Linear ramp to the target so changes don't pop. ~250ms.
    const start    = musicAudioEl.volume;
    const startAt  = performance.now();
    const duration = 250;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      // Clamp to [0,1] — float math can drift past 1 by tiny amounts
      // (e.g. 1.00198) which `audioElement.volume` rejects with
      // IndexSizeError.
      const v = Math.max(0, Math.min(1, start + (target - start) * t));
      musicAudioEl!.volume = v;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [room, allTracks, state]);
}

function RoomScene() {
  const { state: vaState, audioTrack } = useVoiceAssistant();
  const [audioLevel, setAudioLevel] = useState(0);

  const remoteTrack = audioTrack?.publication?.track?.mediaStreamTrack ?? null;
  useAudioLevel(remoteTrack, setAudioLevel);

  const localTracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });
  const localPub = localTracks.find((t) => t.participant.isLocal);
  const micTrack = localPub?.publication?.track?.mediaStreamTrack ?? null;
  const [micLevel, setMicLevel] = useState(0);

  const state: AgentState =
    vaState === "speaking"
      ? "speaking"
      : vaState === "thinking"
        ? "thinking"
        : vaState === "listening"
          ? "listening"
          : "idle";

  useAudioLevel(state === "listening" ? micTrack : null, setMicLevel);

  // ─── Audio ducking: lower the music track when YARBIS speaks ─────
  // The agent publishes two tracks: `roomio_audio` (voice) and
  // `background_audio` (music).  The Python BackgroundAudioPlayer doesn't
  // expose ducking, so we do it client-side: find the music track on the
  // remote agent participant, then set audioElement.volume based on state.
  useDuckBackgroundMusic(state);

  // The level we forward to the visuals — agent voice while speaking, mic
  // while listening, idle gets a faint baseline so the sphere keeps breathing.
  const effectiveLevel =
    state === "speaking" ? audioLevel : state === "listening" ? micLevel : 0;

  return (
    <div className="hud-grid hud-scanlines relative h-full w-full overflow-hidden">
      {/* Visual hierarchy (back → front):
       *   z-0  DevBackground   — ambient noise (10–25% opacity)
       *   z-5  HudFrame        — concentric rings (decorative, behind focus)
       *   z-10 ArcReactor      — PROTAGONIST (focal element)
       *   z-20 UI chrome       — header / panels / footer
       *
       * The previous order had HudFrame at z-10 (above the reactor at z-5),
       * which inverted the natural hierarchy: decoration was floating ON TOP
       * of the focus. Fixed.
       */}
      <DevBackground />

      <div className="absolute inset-0 z-[5] pointer-events-none">
        <HudFrame state={state} />
      </div>

      {/* Audio orbit — radial bars between the reactor and the HUD ring. */}
      <div className="absolute inset-0 z-[7] pointer-events-none">
        <AudioOrbit audioLevel={effectiveLevel} state={state} />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">
        <ArcReactor state={state} audioLevel={effectiveLevel} />
      </div>

      <HudHeader state={state} />
      <StackChips />

      {/* Left column: identity (top) + AI engine telemetry (bottom) */}
      <StatusPanel state={state} audioLevel={micLevel} micActive={!!micTrack} />
      <AiEnginePanel />

      {/* Right column: stoic quote (top) + build activity (bottom) */}
      <QuotePanel />
      <BuildActivity />

      <HudFooter audioLevel={effectiveLevel} state={state} />
    </div>
  );
}
