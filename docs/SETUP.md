# YARBIS — Detailed Setup Guide

Step-by-step installation for users who want full control. For the TL;DR, see the main [README](../README.md#-quick-start).

## Table of contents

1. [System requirements](#1-system-requirements)
2. [Prerequisites](#2-prerequisites)
3. [API keys you need](#3-api-keys-you-need)
4. [Installation](#4-installation)
5. [Welcome music (AC/DC)](#5-welcome-music)
6. [First boot](#6-first-boot)
7. [Verify everything works](#7-verify-everything-works)
8. [Optional: Hermes Gateway](#8-optional-hermes-gateway)
9. [Optional: auto-launch on login](#9-optional-auto-launch-on-login)
10. [Customization](#10-customization)

---

## 1. System requirements

- **macOS 13+** (tested on Sonoma & Sequoia, Apple Silicon recommended)
- **8 GB RAM** minimum, 16 GB recommended
- **5 GB disk space** (Electron + Hermes + LiveKit + Node modules)
- **Microphone + speakers** (built-in works fine)
- **Internet** (for STT/TTS/LLM API calls)

> ⚠️ Linux/Windows are not officially supported yet. The voice-bridge is cross-platform Python but the Electron auto-launch + macOS-specific commands (`open`, `osascript`) need adapters.

## 2. Prerequisites

Install these once:

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 20+ and pnpm
brew install node
npm install -g pnpm

# yt-dlp (for downloading the welcome music)
brew install yt-dlp ffmpeg

# Verify versions
node --version  # should be 20+
pnpm --version  # should be 8+
python3 --version  # 3.11+ recommended (uv will install if missing)
```

## 3. API keys you need

YARBIS needs 3 keys to run, plus 1 optional:

### Required

| Service | Purpose | Free tier | Get key |
|---|---|---|---|
| **OpenAI** | Voice conversation brain | $5 free credit on signup | https://platform.openai.com/api-keys |
| **Deepgram** | Speech-to-text (your voice → text) | ~45,000 minutes free | https://console.deepgram.com/signup |
| **ElevenLabs** | Text-to-speech (YARBIS's voice) | ~10,000 chars/month free | https://elevenlabs.io/app/settings/api-keys |

### Optional

| Service | Purpose | Without it… |
|---|---|---|
| **Brave Search** | Web search via voice | The `search_web` voice command won't work |
| **Hermes** | Email/calendar/Notion access via voice | The `ask_hermes` voice command won't work; everything else works |

## 4. Installation

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/yarbis-asistente.git
cd yarbis-asistente

# 2. Run the master installer
bash scripts/install.sh
```

What `install.sh` does:

- ✅ Verifies Node, pnpm, Homebrew are installed
- ✅ Installs **Hermes Agent** (Nous Research) at `~/.hermes/`
- ✅ Installs **LiveKit Server** via Homebrew
- ✅ Creates `livekit.yaml` if missing
- ✅ Sets up the **Python 3.11 venv** at `voice-bridge/.venv` (using Hermes's bundled `uv`)
- ✅ Installs `livekit-agents` + plugins
- ✅ Copies the YARBIS personality (`hermes/personality.md`) into Hermes's `SOUL.md`

After it finishes, you'll see:

```
╔══════════════════════════════════════════════╗
║          YARBIS Installation Complete!        ║
╚══════════════════════════════════════════════╝
```

### Configure environment

```bash
# 3. Copy the env template
cp .env.example .env

# 4. Open it and paste your API keys
nano .env
```

At minimum, fill in:

```bash
OPENAI_API_KEY=sk-proj-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=sk_...
```

### Install UI + Electron deps

```bash
# 5. UI dependencies
cd ui
pnpm install
cd ..

# 6. Electron dependencies
cd electron
npm install
cd ..
```

## 5. Welcome music

The morning ritual (`"Yarbis, buenos días"`) plays **AC/DC's "Shoot to Thrill"** — the same track used in Iron Man 2's workshop scene. We don't ship the audio (copyright). You download it locally:

```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "voice-bridge/assets/welcome_shoot_to_thrill.%(ext)s" \
  "https://www.youtube.com/watch?v=wLoWd2KyUro"
```

This is **for personal, non-commercial use only**. If you'd rather use a different song, just save it as `voice-bridge/assets/welcome_shoot_to_thrill.mp3` — the filename is what matters.

> Want to disable the music entirely? Edit `voice-bridge/main.py` and remove the `play_welcome_music(player)` call inside `entrypoint()`.

## 6. First boot

```bash
bash scripts/dev_all.sh
```

This opens 5 terminal panes. The order matters:

1. **LiveKit Server** boots first (port 7880)
2. **Hermes Gateway** boots if available (port 8642)
3. **Voice-bridge worker** registers with LiveKit
4. **Next.js UI** compiles (~10s on first run)
5. **Electron** waits for the UI, then opens the JARVIS window

### macOS will ask for microphone permission

When Electron opens the window the first time:

> *"Electron would like to access the microphone."*

**Click Allow.** It only asks once. After that, YARBIS just works.

### Expected behavior on first launch

1. The Electron window opens with the YARBIS HUD
2. After ~2 seconds, AC/DC starts playing
3. YARBIS delivers a 15-second stoic welcome speech in Colombian Spanish
4. The "ESTADO ACTUAL" badge changes to **● ESCUCHANDO**
5. You can now talk to it

## 7. Verify everything works

Run the health check:

```bash
bash scripts/healthcheck.sh
```

You should see:

```
═══════════════════════════════════════════════════════════════
  YARBIS — Health Check  17:25:11
═══════════════════════════════════════════════════════════════
✅  LiveKit Server             :7880   PID 41412   HTTP 200
✅  Hermes Gateway             :8642   PID 29527   HTTP 200
✅  Next.js UI                 :3000   PID 89846   HTTP 200
✅  Electron cmd server        :9871   PID 89879   HTTP 200
✅  Voice-bridge worker                PID 59864
✅  Electron app                       PID 59929
  ✅  Todo OK.
```

If any service is missing, check the [TROUBLESHOOTING guide](TROUBLESHOOTING.md).

### Test a voice command

Say:

> *"Yarbis, qué hora es"*

YARBIS should respond with the current time in Colombian Spanish.

If you don't get a reply, see [TROUBLESHOOTING — YARBIS no escucha](TROUBLESHOOTING.md#yarbis-doesnt-hear-me).

## 8. Optional: Hermes Gateway

If you want to use the `ask_hermes` voice command (delegate to Hermes for emails/calendar/Notion/etc.), Hermes is already installed by `install.sh`. Just enable its API server:

```bash
# Hermes config is at ~/.hermes/.env — open it
nano ~/.hermes/.env

# Make sure these lines are set:
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=yarbis-local-secret
```

The `dev_all.sh` script auto-starts Hermes Gateway if it's installed. To configure Hermes itself (set up Gmail, Calendar, etc.), see Hermes's docs: https://hermes-agent.nousresearch.com/docs/

## 9. Optional: auto-launch on login

Once the manual flow works for you, automate it:

```bash
mkdir -p ~/Library/LaunchAgents ~/Library/Logs/yarbis
cp scripts/launchd/com.ecomdrop.yarbis.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

After this, **YARBIS will auto-start whenever you log into your Mac**. The full stack lives in:

- Logs: `~/Library/Logs/yarbis/{livekit,voice-bridge,ui,electron}.log`
- Process management: `launchctl list | grep yarbis`

To uninstall:

```bash
launchctl unload ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
rm ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

> ⚠️ The plist contains absolute paths. If you move the project, edit `scripts/launchd/com.ecomdrop.yarbis.plist` to update them and reinstall.

## 10. Customization

### Change YARBIS's name

The voice trigger word "Yarbis" is just a system prompt convention — change it in `voice-bridge/main.py` (search for `YARBIS_INSTRUCTIONS`).

### Change the voice

The default voice is **Cristian** (Colombian Spanish male). Pick another from [ElevenLabs voice library](https://elevenlabs.io/app/voice-library), copy the voice ID, and update `.env`:

```bash
ELEVENLABS_VOICE_ID=<new-voice-id>
```

### Change the LLM model

In `.env`:

```bash
HERMES_MODEL=gpt-5-mini   # (default) reasoning, balanced
# Other options: gpt-4o-mini (fastest, cheapest), gpt-5 (smartest, slowest), o3-mini
```

For voice (in `voice-bridge/main.py`), the model is hardcoded at `gpt-4o-mini` for low latency. Change it on the `openai.LLM(model=...)` line if needed.

### Add your own voice command (tool)

Open `voice-bridge/tools_advanced.py` and add a new function decorated with `@function_tool()`. Example:

```python
@function_tool()
async def lock_screen() -> str:
    """Bloquea la pantalla del Mac. Usa cuando Elkin diga \
'bloquea la pantalla', 'me voy un momento', 'lockea'."""
    subprocess.Popen(["pmset", "displaysleepnow"])
    return "Pantalla bloqueada."
```

Then register it in `ADVANCED_TOOLS = [..., lock_screen]`. Save the file. The voice-bridge auto-reloads via `watchfiles`. Done.

### Customize the HUD

The whole HUD is in `ui/src/components/`. The components are:

- `HudHeader.tsx` — top bar with time, "BIENVENIDO SEÑOR" wordmark, state badge
- `HudFrame.tsx` — concentric rotating SVG rings
- `ArcReactor.tsx` — central focal element (audio-reactive)
- `AudioOrbit.tsx` — radial bars around the reactor
- `HudPanels.tsx` — Status panel (left), Quote panel (right), Footer
- `AiEngine.tsx` — AI telemetry (model, tokens, cost, latency)
- `BuildActivity.tsx` — project build feed
- `StackChips.tsx` — tech stack indicators below the header
- `DevBackground.tsx` — code rain, blueprint marks, ambient layers
- `CircuitTraces.tsx` — corner PCB traces

Design tokens live in `ui/src/app/globals.css`. The font setup is in `ui/src/app/layout.tsx`.

## What's next?

- See [VOICE_COMMANDS.md](VOICE_COMMANDS.md) for the full command reference
- See [ARCHITECTURE.md](../ARCHITECTURE.md) for system design
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- See [roadmap.md](roadmap.md) for future features
