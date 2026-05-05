# YARBIS — Project guide for Claude Code

This file is loaded automatically when Claude Code opens this project. It tells Claude (or any AI coding agent) what's important about the codebase, the conventions, and how things connect.

## What this project is

YARBIS is a **JARVIS-style voice assistant** running locally on a Mac. Three main runtime components:

1. **`voice-bridge/`** — Python LiveKit Agents worker. Handles STT (Deepgram) → LLM (OpenAI gpt-4o-mini) → TTS (ElevenLabs). The voice loop.
2. **`ui/`** — Next.js 16 + Tailwind v4 + Three.js HUD. Visual state of the assistant.
3. **`electron/`** — Native shell that loads the Next.js UI in Chromium without browser autoplay restrictions, with mic auto-grant and a local HTTP command server (port 9871) for window control.

Optional fourth: **Hermes Agent** (Nous Research) installed at `~/.hermes/`, exposing a Gateway API on port 8642 — used by the `ask_hermes` voice tool to delegate complex tasks (Gmail, Calendar, Notion, etc.).

## Project layout

```
yarbis-asistente/
├── ui/                            # Next.js 16 (App Router)
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Mounts <VoiceRoom>
│       │   ├── layout.tsx         # Fonts: JetBrains Mono, Inter, Orbitron
│       │   ├── globals.css        # Design tokens (colors, type scale, glow)
│       │   └── api/token/route.ts # LiveKit JWT generator (server-only)
│       └── components/            # All HUD pieces (see "UI components" below)
├── voice-bridge/
│   ├── main.py                    # Entrypoint, agent setup, system prompt
│   ├── tools.py                   # Core voice tools + Electron command client
│   ├── tools_advanced.py          # Web/project/system/Hermes tools
│   ├── hermes_bridge.py           # (legacy, not used in current flow)
│   └── assets/                    # Welcome music (gitignored)
├── electron/
│   ├── main.js                    # BrowserWindow + permissions + cmd server
│   └── preload.js                 # (placeholder — empty)
├── hermes/                        # Hermes Agent personality + context
│   ├── personality.md             # Copied to ~/.hermes/SOUL.md by install.sh
│   └── context.md
├── scripts/
│   ├── dev_all.sh                 # Boots all 5 services (Terminal panes via osascript)
│   ├── stop_yarbis.sh             # Kills everything
│   ├── healthcheck.sh             # Status check (returns non-zero if any service is down)
│   ├── install.sh                 # First-time setup
│   ├── start_yarbis.sh            # Production-style boot for launchd
│   ├── dev_voice.sh               # Voice-bridge with watchfiles auto-reload
│   ├── dev_ui.sh                  # Next.js dev server
│   └── launchd/
│       └── com.ecomdrop.yarbis.plist
├── docs/
│   ├── SETUP.md                   # Step-by-step install
│   ├── VOICE_COMMANDS.md          # All 17 tools + triggers
│   ├── TROUBLESHOOTING.md         # Common issues
│   ├── jarvis-reference.md        # JARVIS movie lore
│   ├── mcp-tools-guide.md
│   └── roadmap.md
├── ARCHITECTURE.md                # System diagrams + data flow
├── README.md                      # Public-facing intro
├── LICENSE                        # MIT
├── .env.example                   # Template (no real keys)
└── livekit.yaml                   # LiveKit Server config
```

## Key conventions

### 1. The voice loop is OpenAI direct, NOT Hermes-via-voice

We tried routing voice through Hermes's Gateway. Hermes inflates the prompt with SOUL.md + memory + 89 skills (~13k tokens), making first-token latency 10–25 seconds — unusable for real-time voice.

So the voice-bridge uses **OpenAI gpt-4o-mini directly** with a minimal Spanish system prompt (`YARBIS_INSTRUCTIONS` in `main.py`). Hermes is reachable via the `ask_hermes` voice tool when YARBIS needs heavy tasks (delegated explicitly, with a 5–15s warning).

**Don't try to route voice through Hermes again.** It's been tested. It doesn't work.

### 2. Function tools live in two files

- `voice-bridge/tools.py` — small, daily-use tools (welcome ritual, music, open app, open URL)
- `voice-bridge/tools_advanced.py` — research, project ops, system, Hermes delegation

Each tool is `@function_tool()`-decorated. The **docstring is what the LLM reads** to decide when to call it — write them as **Spanish prompt instructions**, not API docs.

When you add a new tool:
1. Define the function with a clear Spanish docstring
2. Append it to the matching `ALL_TOOLS` or `ADVANCED_TOOLS` list
3. Update `YARBIS_INSTRUCTIONS` in `main.py` with the trigger phrases (so the LLM has explicit examples)
4. Save — `watchfiles` auto-reloads the worker

### 3. Electron command server for window control

`electron/main.js` runs a local HTTP server on `127.0.0.1:9871`. Voice tools POST to it instead of using AppleScript:

| Endpoint | Effect |
|---|---|
| `POST /show` | Bring window to front |
| `POST /show-fullscreen` | Show + fullscreen (used by `welcome_ritual`) |
| `POST /hide` | Hide window (mic stays active!) |
| `POST /exit-fullscreen` | Leave fullscreen |

Window close is intercepted in `electron/main.js`: instead of destroying webContents (which kills the mic), `event.preventDefault()` + `win.hide()`. The renderer keeps running with `backgroundThrottling: false`.

### 4. UI components and z-index hierarchy

The `<VoiceRoom>` mounts everything in this z-order:

```
z-0   DevBackground (code rain, blueprint marks, circuit traces)
z-5   HudFrame (3 rotating SVG rings — SMIL animateTransform)
z-7   AudioOrbit (72 radial bars, audio-reactive)
z-10  ArcReactor (focal element — biggest glow)
z-20  HudHeader, StatusPanel, AiEngine, QuotePanel, BuildActivity, HudFooter
```

**Critical**: HudFrame must be BELOW ArcReactor (z-5 < z-10). If you put it above, the rings float over the focal point and break the visual hierarchy.

### 5. Rotations use SMIL, not CSS

Ring rotations (`HudFrame.tsx`) use SVG `<animateTransform>`, not CSS keyframes. CSS `transform-box: view-box` is unreliable across browsers and the rings drift off-center. SMIL rotates around `0,0` of the parent SVG coordinate system (which is the viewBox center). Stick with SMIL for any new rotating SVG element.

### 6. Audio ducking is client-side

The Python `BackgroundAudioPlayer` does NOT have ducking — verified by reading its source. The agent publishes 2 separate tracks:
- `roomio_audio` — the voice (TTS)
- `background_audio` — the music

Ducking is implemented in the React client (`useDuckBackgroundMusic` hook in `VoiceRoom.tsx`):
1. Find the `background_audio` track in the room
2. Get its `<audio>` element
3. Animate `.volume` based on `AgentState`:
   - `speaking` → 0.10
   - `thinking` → 0.55
   - else → 0.85
4. Linear ramp 250ms via `requestAnimationFrame`
5. **Always clamp** the value to `[0, 1]` — float math drifts past 1 and `audioElement.volume` rejects with IndexSizeError

### 7. Design tokens

All in `ui/src/app/globals.css`. Don't hardcode colors or font sizes in components. Use CSS variables:

```css
--accent: #07E2FE                   /* HUD ambient cyan */
--accent-build: #22C55E             /* "AI running" green */
--accent-warning: #F59E0B           /* amber */
--accent-error: #EF4444             /* red */
--speaking: #FB923C                 /* orange (Iron Man) */
--thinking: #A78BFA                 /* violet */

--fs-display: 30px                  /* "BIENVENIDO, SEÑOR" */
--fs-h2: 16px                       /* section labels */
--fs-body: 15px                     /* content */
--fs-label: 13px                    /* secondary */
--fs-micro: 11px                    /* codes, telemetry */
```

Glow utilities: `.hud-glow-ambient` (everything except reactor) and `.hud-glow-focus` (only the reactor).

### 8. Fonts

| Variable | Font | Used for |
|---|---|---|
| `--font-display` | JetBrains Mono | Section labels, codes, technical data |
| `--font-body` | Inter | Long-form (quotes, descriptions) |
| `--font-wordmark` | Orbitron | **ONLY** the "BIENVENIDO, SEÑOR" hero — sci-fi feel |

Orbitron is used SPARINGLY — overusing it makes the UI cartoonish. Just the hero.

## Common workflows

### Add a new voice tool
See [docs/VOICE_COMMANDS.md — tool reference](docs/VOICE_COMMANDS.md#-tool-reference-for-developers).

### Boot the dev stack
```bash
bash scripts/dev_all.sh         # opens 5 Terminal panes
bash scripts/healthcheck.sh     # verify
bash scripts/stop_yarbis.sh     # kill all
```

### Force HMR after edits not reflecting
```bash
cd ui && rm -rf .next && pnpm dev
```
Then `Cmd+Shift+R` in Electron.

### Verify a UI change made it to the browser
```bash
# Look in the bundle for a string from your change
for chunk in $(curl -s http://localhost:3000 | grep -oE '/_next/static/chunks/[^"]+\.js' | head -10); do
  if curl -s "http://localhost:3000$chunk" 2>/dev/null | grep -q "MY_STRING_FROM_THE_EDIT"; then
    echo "✅ $chunk"
    break
  fi
done
```

## Things to avoid

- ❌ **Don't add hud-pulse animations to panels.** It was the single biggest source of visual competition with the Arc Reactor. Removed.
- ❌ **Don't make HudFrame `z-10`.** It must be `z-5`, below the Arc Reactor.
- ❌ **Don't use Orbitron everywhere.** Just the hero wordmark.
- ❌ **Don't try to route voice through Hermes's `/v1/chat/completions`.** Tested; latency makes it unusable. Voice → OpenAI direct, Hermes is for `ask_hermes` only.
- ❌ **Don't mix `style` inline + Tailwind position classes.** Pick one. Tailwind v4 has cascade conflicts with inline `transform`.
- ❌ **Don't commit `.env`** — it has API keys. `.gitignore` covers it but always double check.
- ❌ **Don't kill `Cmd+W` to close Electron.** That's intercepted to hide. To actually quit, use `Cmd+Q` (menu YARBIS → Cerrar) or `kill <PID>`.

## State of the world

The roadmap is in [`docs/roadmap.md`](docs/roadmap.md). Phase 1 (voice + HUD + tools) is **done**. Phase 2 (Telegram, deeper Hermes integration) is **not started**. Phase 3 (wake-word, hardware) is **not started**.

## Questions while editing?

- **System architecture** → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **How to add a feature** → [`docs/SETUP.md`](docs/SETUP.md#10-customization)
- **Why something looks the way it does** → look at the **Things to avoid** section above; it's documenting design decisions that took several iterations to settle.
