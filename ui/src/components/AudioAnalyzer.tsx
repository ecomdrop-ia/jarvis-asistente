"use client";

import { useEffect, useRef } from "react";

/**
 * Pulls audio energy from a MediaStreamTrack (the agent's TTS stream).
 *
 * Web Audio API: AnalyserNode → frequency data → average RMS → onLevel.
 * Runs at ~30fps via rAF; cleans up the AudioContext on unmount or stream change.
 */
export function useAudioLevel(
  track: MediaStreamTrack | null,
  onLevel: (level: number) => void,
) {
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!track) {
      onLevel(0);
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length) / 255;
      // Mild non-linear curve so quiet speech registers but doesn't
      // saturate the visual on loud bursts.
      onLevel(Math.min(1, Math.pow(rms, 0.7) * 1.6));
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [track, onLevel]);
}
