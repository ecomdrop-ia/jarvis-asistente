<div align="center">

# YARBIS

### Your AI Real-time Builder Intelligence System

**An open-source JARVIS-style voice assistant for AI builders.**
Real-time voice. Custom HUD. Always listening. 100% local.

![status](https://img.shields.io/badge/status-active-22C55E?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-07E2FE?style=flat-square)
![platform](https://img.shields.io/badge/platform-macOS-000?style=flat-square)
![stack](https://img.shields.io/badge/stack-Next.js%2016%20·%20Python%203.11%20·%20Electron-FB923C?style=flat-square)

[Features](#-features) · [Demo](#-demo) · [Quick Start](#-quick-start) · [Voice Commands](#-voice-commands) · [Architecture](#-architecture)

</div>

---

## ✨ Features

🎙️ **Real-time voice conversation** in Colombian Spanish (or any language) — talk, get answered.
🎬 **Iron Man-style HUD** with rotating rings, audio-reactive arc reactor, live telemetry.
🌅 **Morning ritual** — say *"Yarbis, buenos días"* and YARBIS plays AC/DC + delivers a stoic welcome speech.
🛠️ **17 built-in voice tools** — open apps, browse projects, search the web, control the Mac.
🧠 **Hermes integration** — delegate complex tasks (email, calendar, GitHub, Notion) via 89+ MCP skills.
🪟 **Always listening** — close the window, YARBIS keeps working in background.
⚡ **Auto-launch on login** (optional) — full lab boot via macOS launchd.
🔓 **Fully self-hosted** — your data, your machine, your keys. No SaaS dependencies.

## 🎬 Demo

> See the demo video on [@elkingarcia.ia](https://instagram.com/elkingarcia.ia)

```
═══════════════════════════════════════════════════════════════════
  ▌ SISTEMA ACTIVADO ▐                              ESTADO ACTUAL
       BIENVENIDO,  SEÑOR                          ● ESCUCHANDO
   ⟡  LAB · BUCARAMANGA · COLOMBIA  ⟡

  [● CLAUDE-OPUS-4.6]  [● GPT-4o-MINI]  [● HERMES · 89]  [● SUPABASE]

  ┌─ SUBSISTEMAS ─┐    ╭── ARC REACTOR ──╮    ┌─ FRASE DEL DÍA ─┐
  │ ● VOICE BRIDGE│    │  audio-reactive  │    │  "La disciplina  │
  │ ● LLM CORE    │    │   state-aware    │    │   es la libertad"│
  │ ● STT DEEPGR. │    │   72-bar orbit   │    │   — Aristóteles  │
  │ ● TTS ELEVEN  │    ╰──────────────────╯    └──────────────────┘
  │ ● MICROPHONE  │
  │ ● SAFETY LAYER│
  └───────────────┘

  ┌─ AI ENGINE ────┐                        ┌─ ACTIVE BUILDS ───┐
  │ MODEL gpt-4o   │                        │ ⚡ ecomdrop deploy│
  │ TOKENS 12.4k   │                        │ ✓ yarbis live     │
  │ COST  $0.04    │                        │ ◐ remotion build  │
  │ HERMES 89 ready│                        │ ✓ mission live    │
  └────────────────┘                        └───────────────────┘
═══════════════════════════════════════════════════════════════════
```

## 📦 Stack

| Layer | Technology |
|---|---|
| **UI** | Next.js 16 (App Router) · Tailwind v4 · Three.js · React 19 |
| **Native shell** | Electron 33 (autoplay-enabled, mic auto-grant) |
| **Voice loop** | LiveKit Agents 1.5 · Silero VAD |
| **STT** | Deepgram Nova-3 (multilingual) |
| **TTS** | ElevenLabs (Cristian voice, Colombian Spanish) |
| **LLM (voice)** | OpenAI `gpt-4o-mini` (or `gpt-5-mini` for reasoning) |
| **Brain (delegation)** | [Hermes Agent](https://hermes-agent.nousresearch.com/) by Nous Research — 89+ skills, MCP, persistent memory |
| **Typography** | JetBrains Mono · Inter · Orbitron (sci-fi wordmark) |
| **Auto-launch** | macOS `launchd` |

## 🚀 Quick Start

### Prerequisites

- **macOS** (Apple Silicon recommended; works on Intel)
- **Node 20+** and **pnpm** (`npm i -g pnpm`)
- **Python 3.11** (auto-installed via `uv` when you install Hermes)
- **Homebrew** (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`)
- **API keys**:
  - OpenAI ([get one](https://platform.openai.com/api-keys)) — required
  - Deepgram ([get one](https://console.deepgram.com/signup)) — required, free tier covers ~45k min
  - ElevenLabs ([get one](https://elevenlabs.io/app/settings/api-keys)) — required, free tier covers ~10k chars/month
  - Brave Search ([get one](https://api.search.brave.com/app/keys)) — optional, for the `search_web` tool

### Install (5 commands)

```bash
# 1. Clone
git clone https://github.com/<your-username>/yarbis-asistente.git
cd yarbis-asistente

# 2. Run the installer (installs Hermes, LiveKit, voice-bridge venv)
bash scripts/install.sh

# 3. Copy and fill in your API keys
cp .env.example .env
nano .env   # paste your OPENAI_API_KEY, DEEPGRAM_API_KEY, ELEVENLABS_API_KEY

# 4. Install UI dependencies
cd ui && pnpm install && cd ..

# 5. Install Electron dependencies
cd electron && npm install && cd ..
```

### Boot the stack

```bash
bash scripts/dev_all.sh
```

That's it. This opens **5 terminal panes** in order:

1. **LiveKit Server** (audio infrastructure, port 7880)
2. **Hermes Gateway** (cerebro, port 8642 — only if Hermes is installed)
3. **YARBIS Voice (worker)** — Python agent, auto-reload on edits
4. **YARBIS UI (Next.js)** — port 3000
5. **YARBIS Electron** — waits for the UI, then opens the JARVIS window

**The first time** the Electron window opens, macOS will ask for microphone permission. **Allow it.**

A few seconds later, YARBIS will greet you with AC/DC + a stoic welcome speech (assuming you've downloaded the audio — see [Setup](docs/SETUP.md#welcome-music)).

### Verify everything works

```bash
bash scripts/healthcheck.sh
```

You should see **6 of 6** services OK.

### Stop everything

```bash
bash scripts/stop_yarbis.sh
```

## 🎙️ Voice Commands

YARBIS responds to natural language in Spanish or English. A few examples:

```
"Yarbis, buenos días"           → AC/DC + saludo estoico + fullscreen
"Yarbis, qué hora es"           → Da la fecha y hora
"Yarbis, abre Cursor"           → Lanza Cursor
"Yarbis, qué proyectos tengo"   → Lista repos en ~/projects/ecomdrop/
"Yarbis, cómo va el connector"  → git status del proyecto
"Yarbis, busca X en internet"   → Brave Search
"Yarbis, ocúltate"              → Esconde la ventana (mic sigue activo)
"Yarbis, modo cinema"           → Pantalla completa
"Yarbis, qué emails tengo"      → Delega a Hermes (Gmail MCP)
"Yarbis, apaga la música"       → Detiene AC/DC
```

**[→ Full voice command reference](docs/VOICE_COMMANDS.md)** (17 tools)

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Mac Mini / MacBook                          │
│                                                                │
│   ┌─────────────────────────────────────────────────────┐     │
│   │  Electron Window (autoplay + mic auto-grant)        │     │
│   │  loads → Next.js UI (HUD) → LiveKit client          │     │
│   └────────────────────┬────────────────────────────────┘     │
│                        │ WebRTC (mic up, voice down)          │
│                        ▼                                       │
│   ┌─────────────────────────────────────────────────────┐     │
│   │  LiveKit Server (self-hosted, port 7880)            │     │
│   └────────────────────┬────────────────────────────────┘     │
│                        │                                       │
│                        ▼                                       │
│   ┌─────────────────────────────────────────────────────┐     │
│   │  Voice-bridge (Python, LiveKit Agents 1.5)          │     │
│   │   ┌───────┐  ┌──────────┐  ┌────────┐  ┌─────────┐ │     │
│   │   │Silero │→ │Deepgram  │→ │OpenAI  │→ │Eleven   │ │     │
│   │   │VAD    │  │STT (es)  │  │gpt-4o  │  │Labs TTS │ │     │
│   │   └───────┘  └──────────┘  └────────┘  └─────────┘ │     │
│   │             ┌──────────────────────────────┐        │     │
│   │             │ 17 function tools            │        │     │
│   │             │ (open_app, search, project…) │        │     │
│   │             └──────────────────────────────┘        │     │
│   └────────────────────┬────────────────────────────────┘     │
│                        │ HTTP (when ask_hermes is called)     │
│                        ▼                                       │
│   ┌─────────────────────────────────────────────────────┐     │
│   │  Hermes Gateway API (OpenAI-compatible, port 8642)  │     │
│   │  → 89+ skills · MCPs · persistent memory            │     │
│   │     Gmail · Calendar · Notion · Supabase · GitHub   │     │
│   └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

**[→ Full architecture document](ARCHITECTURE.md)**

## 📂 Project Structure

```
yarbis-asistente/
├── ui/                 # Next.js HUD (the visual)
│   └── src/
│       ├── app/        # Pages, layout, globals.css
│       └── components/ # ArcReactor, HudFrame, AudioOrbit, AiEngine, BuildActivity, …
├── voice-bridge/       # Python LiveKit Agents worker (the voice loop)
│   ├── main.py         # Entrypoint, agent setup, system prompt
│   ├── tools.py        # Core tools (welcome_ritual, music, apps)
│   ├── tools_advanced.py   # Web search, project ops, Hermes delegation
│   └── assets/         # Welcome music (downloaded via yt-dlp, gitignored)
├── electron/           # Native shell (autoplay + mic auto-grant + window control)
│   ├── main.js
│   └── preload.js
├── scripts/            # dev_all.sh, stop_yarbis.sh, healthcheck.sh, install.sh, launchd plist
├── hermes/             # Hermes Agent personality + context
├── docs/               # Detailed guides (SETUP, VOICE_COMMANDS, TROUBLESHOOTING, roadmap, …)
├── .env.example        # Copy to .env, fill in keys
├── livekit.yaml        # LiveKit Server config
├── ARCHITECTURE.md
└── README.md
```

## 🔁 Auto-launch on login (optional)

When you're happy with the setup, you can have the entire stack start automatically when you log into your Mac:

```bash
mkdir -p ~/Library/LaunchAgents ~/Library/Logs/yarbis
cp scripts/launchd/com.ecomdrop.yarbis.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

To uninstall:

```bash
launchctl unload ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
rm ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

## 💰 Cost estimate (hobbyist usage)

For a typical day of voice interactions (50-100 turns):

| Service | Cost |
|---|---|
| OpenAI `gpt-4o-mini` | ~$0.05 / day |
| Deepgram STT | free tier covers it |
| ElevenLabs TTS | free tier covers it (or ~$5/month if heavy) |
| Hermes Gateway | $0 (self-hosted) |
| LiveKit Server | $0 (self-hosted) |
| **Total** | **~$5-15 / month** |

## 🤝 Contributing

PRs welcome. Before submitting:

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md)
2. Test the change with `bash scripts/healthcheck.sh`
3. Make sure the build is clean: `cd ui && pnpm build`

## 🐛 Troubleshooting

**[→ See TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** for common issues:

- "YARBIS doesn't hear me" → mic permissions, AEC warmup, music ducking
- "Stuck cache after edits" → Turbopack cache reset
- "Adaptive interruption 401 errors" → harmless, fallback to VAD works

## 📜 License

[MIT](LICENSE) © 2026 Elkin Garcia · Ecomdrop IA Solutions

The welcome ritual audio (AC/DC) is **NOT** covered by this license — users are expected to download their own copy via `yt-dlp` for personal use only.

## 🙏 Credits

Built with:

- [LiveKit](https://livekit.io/) — real-time audio infrastructure
- [Hermes Agent](https://hermes-agent.nousresearch.com/) by [Nous Research](https://nousresearch.com/)
- [Deepgram](https://deepgram.com/) · [ElevenLabs](https://elevenlabs.io/) · [OpenAI](https://openai.com/)
- [Claude Code](https://claude.ai/code) · [Cursor](https://cursor.com)

Inspired by Tony Stark's JARVIS. Made in Bucaramanga, Colombia 🇨🇴.

---

<div align="center">

**[Instagram](https://instagram.com/elkingarcia.ia)** · **[TikTok](https://tiktok.com/@elkingarcia.ia)**

</div>
