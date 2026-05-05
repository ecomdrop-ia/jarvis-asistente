# YARBIS — Troubleshooting

The most common issues, ordered by frequency.

## 🎙️ YARBIS doesn't hear me

**Symptom**: you talk, nothing happens. No transcription, no reply.

### Diagnosis

```bash
bash scripts/healthcheck.sh
```

Check:
- ✅ Voice-bridge worker running?
- ✅ Electron app process alive?
- ✅ Are there 2 participants in the room (client + agent)?

### Most common causes

**1. Music drowning your voice (VAD confused).**
The AC/DC track at 55% volume + your voice can confuse the VAD. Try:
- *"Yarbis, apaga la música"* (loud and clear)
- Or wait until the welcome speech finishes

**2. Microphone permission not granted.**
Electron asks once on first launch. If you denied it:
- macOS Settings → Privacy & Security → Microphone → enable Electron
- Restart Electron: `bash scripts/stop_yarbis.sh && bash scripts/dev_all.sh`

**3. Wrong mic selected.**
macOS may pick the internal mic when you have an external one plugged in:
- macOS Settings → Sound → Input → check the meter when you talk, should bounce
- If wrong, set the right device

**4. Multiple voice-bridges running (job dispatch chaos).**
After multiple restarts, you may have stale processes:
```bash
pgrep -af "voice-bridge.*main.py" | head -5  # should be ONE
```
If more than one, run `bash scripts/stop_yarbis.sh` and restart with `dev_all.sh`.

**5. AEC (Acoustic Echo Cancellation) warmup.**
At startup, AEC silences interruptions for the first 3 seconds. **Wait 3-5 seconds after the welcome speech ends before talking.**

## 🔥 Cache stuck — UI changes don't reflect

**Symptom**: you (or the AI) edits a UI component, save it, but the browser doesn't show the change. Even after `Cmd+Shift+R`.

### Cause
Turbopack (Next.js 16's bundler) sometimes hangs after multiple file changes.

### Fix
```bash
cd ui
pkill -f "next dev"
rm -rf .next
pnpm dev
```

15 seconds and you're back. Then `Cmd+Shift+R` in Electron.

## 🚫 "401 Adaptive Interruption" errors in voice-bridge logs

```
WSServerHandshakeError: 401, message='Invalid response status'
url='wss://agent-gateway.livekit.cloud/v1/bargein'
APIConnectionError: failed to detect interruption after 3 attempts
```

### This is **NORMAL** and harmless

The Adaptive Interruption Detector tries to call LiveKit's cloud (`agent-gateway.livekit.cloud`), which requires a real LiveKit Cloud API key. We use a self-hosted LiveKit Server with a `devkey`, so the cloud rejects us with 401.

**LiveKit then falls back to local VAD-based interruption** (which works perfectly). You'll see this line in the logs:

```
WARNING adaptive interruption disabled due to unrecoverable error,
        falling back to VAD-based interruption
```

✅ **Voice still works fine.** Just ignore the stack traces. They only appear at startup.

If you want to silence them, you can monkey-patch the logger in `voice-bridge/main.py` (let us know if you want a PR for this).

## ⚠️ Music doesn't lower when YARBIS talks

**Symptom**: AC/DC keeps playing at full volume while YARBIS speaks.

### Cause
The Python `BackgroundAudioPlayer` doesn't expose ducking. We implemented it client-side in `ui/src/components/VoiceRoom.tsx` (the `useDuckBackgroundMusic` hook).

### Verify the fix is live

After updating the code, **`Cmd+Shift+R` in Electron** is required. The hook only loads when:

1. UI is fresh-built (no Turbopack stale cache)
2. Electron has reloaded the page

If still not ducking, check the browser DevTools console (`Cmd+Option+I` in Electron):

```
Failed to set the 'volume' property on 'HTMLMediaElement':
The volume provided (1.00198) is outside the range [0, 1].
```

If you see this, your version is missing the clamp fix. Pull latest or update the hook to clamp `Math.max(0, Math.min(1, value))`.

## 🔇 No audio at all (neither YARBIS nor music)

**Symptom**: Electron window shows the HUD, you see logs of YARBIS speaking, but you hear nothing.

### Causes

**1. Macbook output device is wrong.**
macOS Settings → Sound → Output → ensure the right speaker/headphones are selected.

**2. macOS focus mode silencing.**
If "Do Not Disturb" or "Focus" is on, audio may be muted. Disable temporarily.

**3. Electron audio context not granted.**
Quit Electron (`Cmd+Q` from menu YARBIS), then `bash scripts/dev_all.sh` again. Sometimes the audio context needs a fresh user gesture.

**4. ElevenLabs API quota exhausted.**
Free tier is 10k characters/month. If you exhausted it, no TTS audio is generated. Check at https://elevenlabs.io/app/settings/usage

## 🌀 Rings drift off-center / appear in wrong position

**Symptom**: the HUD's concentric rings rotate around a point that's NOT the screen center.

### Cause
CSS `transform-box: view-box` doesn't always work for SVG `<g>` elements with asymmetric children. The fix uses SMIL `<animateTransform>` instead.

### Verify
The current `HudFrame.tsx` uses SMIL. If you see rings drifting, you likely have a stale build. Force fresh:

```bash
cd ui && rm -rf .next && pnpm dev
```

Then `Cmd+Shift+R`.

## 🔧 Hermes Gateway not responding

**Symptom**: `ask_hermes` voice command returns "Hermes no respondió (código 000)".

### Diagnose

```bash
curl -sf http://localhost:8642/health || echo "Hermes down"
```

### Fix

```bash
~/.local/bin/hermes gateway run --accept-hooks
```

If Hermes was never set up, run:

```bash
bash scripts/install.sh
```

Then enable the API server in `~/.hermes/.env`:

```
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=yarbis-local-secret
```

## 🎧 Audio glitches / robotic voice

**Symptom**: ElevenLabs voice sounds choppy, glitched, or has artifacts.

### Causes

**1. Network latency.**
ElevenLabs streams in real time. On poor wifi, frames arrive late. Try ethernet.

**2. CPU pressure.**
The voice-bridge does VAD (Silero), STT decoding, and audio mixing concurrently. If your Mac is also building a heavy project, audio frames drop.
- Check Activity Monitor → CPU
- Close heavy apps (especially other Electron-based ones)

**3. ElevenLabs streaming latency setting.**
In `voice-bridge/main.py`, the `streaming_latency` param (currently NOT_GIVEN) defaults to "highest quality, slower". You can lower this (1-4 scale) for faster but more glitchy:

```python
elevenlabs.TTS(
    ...,
    streaming_latency=2,  # 1 = best quality, 4 = lowest latency
)
```

## 🪪 Electron asks for microphone permission EVERY time

**Symptom**: each launch, macOS shows the "allow microphone" dialog.

### Cause
Electron's permission cache in your home folder may be corrupted. Reset it:

```bash
rm -rf "$HOME/Library/Application Support/yarbis-electron"
```

Then relaunch. macOS will ask once more, you allow it, and it should remember from then on.

## 🔥 Multiple Electron windows open after restart

**Symptom**: After running `dev_all.sh`, you see 2 or 3 YARBIS windows.

### Cause
Previous Electron processes weren't killed cleanly.

### Fix

```bash
bash scripts/stop_yarbis.sh
sleep 3
bash scripts/dev_all.sh
```

If `stop_yarbis.sh` doesn't kill them all, force:

```bash
pkill -9 -f "yarbis-asistente/electron"
```

## 🐛 Errors I haven't covered

If something else fails:

1. Run `bash scripts/healthcheck.sh` and check which service is down
2. Look at the corresponding log:
   - LiveKit: terminal pane + `~/Library/Logs/yarbis/livekit.log` (if launchd)
   - Voice-bridge: terminal pane (it has tracebacks if something crashes)
   - Next.js: terminal pane + `.next/` for build errors
   - Electron: terminal pane + DevTools console (`Cmd+Option+I`)
3. Open an issue on GitHub with:
   - Your macOS version
   - Output of `bash scripts/healthcheck.sh`
   - Last ~50 lines of the failing log
   - Steps to reproduce
