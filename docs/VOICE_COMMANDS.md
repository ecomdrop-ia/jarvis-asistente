# YARBIS — Voice Command Reference

Complete list of voice commands YARBIS understands. The trigger word **"Yarbis"** is conventional but not strictly required — the LLM understands intent.

All examples are in Spanish (the system prompt is Colombian Spanish), but you can also speak English and YARBIS will understand and respond in Spanish.

> Want to add your own command? See [SETUP.md — Add your own voice command](SETUP.md#add-your-own-voice-command-tool).

## 🌅 Morning ritual

Triggers `welcome_ritual`: opens fullscreen, plays AC/DC, delivers the stoic welcome speech.

| Phrase | Action |
|---|---|
| *"Yarbis, buenos días"* | The full ritual |
| *"Yarbis, llegué"* | Same |
| *"Yarbis, estoy aquí"* | Same |
| *"Yarbis, a trabajar"* | Same |
| *"Yarbis, modo trabajo"* | Same |

## 🎵 Music control

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, apaga la música"* | Stops the welcome track | `stop_music` |
| *"Yarbis, silencio"* | Same | `stop_music` |
| *"Yarbis, pon una de Bad Bunny"* | Opens YouTube search | `play_youtube` |
| *"Yarbis, busca videos de Iron Man"* | Opens YouTube search | `play_youtube` |

## 💻 Mac applications

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, abre Cursor"* | Launches Cursor | `open_app` |
| *"Yarbis, abre Spotify"* | Launches Spotify | `open_app` |
| *"Yarbis, abre Notion"* | Launches Notion | `open_app` |
| *"Yarbis, abre Slack"* | Launches Slack | `open_app` |
| *"Yarbis, abre Terminal"* | Launches Terminal | `open_app` |
| *"Yarbis, lanza Chrome"* | Launches Chrome | `open_app` |

Works with **any installed Mac app**. The LLM resolves the name even with typos or partial matches.

## 🌐 Web

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, abre github"* | Opens github.com in default browser | `open_url` |
| *"Yarbis, abre vercel.com"* | Opens Vercel | `open_url` |
| *"Yarbis, llévame a stripe"* | Opens Stripe | `open_url` |

The LLM auto-resolves bare names → `https://X.com`.

## 🔍 Research

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, busca noticias de OpenAI"* | Brave Search → reads top 3 results | `search_web` |
| *"Yarbis, qué es un MCP server"* | Brave Search | `search_web` |
| *"Yarbis, búscame info sobre Hydrogen"* | Brave Search | `search_web` |
| *"Yarbis, lee el contenido de https://news.ycombinator.com"* | Fetches and summarizes URL | `fetch_url` |

⚠️ Requires `BRAVE_API_KEY` in `.env`. Without it, this returns an error.

## 📁 Project operations (`~/projects/ecomdrop/`)

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, qué proyectos tengo"* | Lists all repos in `~/projects/ecomdrop/` | `list_projects` |
| *"Yarbis, lístame los proyectos"* | Same | `list_projects` |
| *"Yarbis, abre el proyecto Ecomdrop connector"* | Opens in Cursor | `open_project` |
| *"Yarbis, abre yarbis-asistente"* | Opens in Cursor (fuzzy match) | `open_project` |
| *"Yarbis, cómo va el connector"* | Returns git status + branch + last 3 commits | `git_status_project` |
| *"Yarbis, estado de mission control"* | Same | `git_status_project` |

> The projects directory is hardcoded to `~/projects/ecomdrop/` in `tools_advanced.py`. Change `PROJECTS_DIR` constant if your projects live elsewhere.

## 🖥️ Mac system control

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, qué hora es"* | Returns date + time in Colombian Spanish | `current_time` |
| *"Yarbis, qué día es hoy"* | Same | `current_time` |
| *"Yarbis, toma un screenshot"* | Saves to `~/Desktop` | `take_screenshot` |
| *"Yarbis, captura la pantalla"* | Same | `take_screenshot` |
| *"Yarbis, sube el volumen al 80"* | Sets system volume to 80% | `set_system_volume` |
| *"Yarbis, baja el volumen al 30"* | Sets to 30% | `set_system_volume` |
| *"Yarbis, silencia el volumen"* | Sets to 0 | `set_system_volume` |

## 🪟 Window control (Electron)

| Phrase | Action | Tool |
|---|---|---|
| *"Yarbis, ocúltate"* | Hides the window (mic stays active) | `hide_window` |
| *"Yarbis, escóndete"* | Same | `hide_window` |
| *"Yarbis, desaparece"* | Same | `hide_window` |
| *"Yarbis, modo cinema"* | Enters fullscreen | `cinema_mode` |
| *"Yarbis, pantalla completa"* | Same | `cinema_mode` |
| *"Yarbis, modo Iron Man"* | Same | `cinema_mode` |
| *"Yarbis, sal de pantalla completa"* | Exits fullscreen | `exit_cinema_mode` |
| *"Yarbis, modo ventana"* | Same | `exit_cinema_mode` |

## 🧠 Hermes delegation (the heavy lifters)

These commands delegate to Hermes Agent which has 89+ skills + MCPs (Gmail, Calendar, Notion, etc.).

⚠️ Latency: 5–15 seconds. YARBIS will say *"dame un segundo"* before processing.
⚠️ Requires Hermes Gateway running on port 8642 (auto-started by `dev_all.sh`).

| Phrase | Action |
|---|---|
| *"Yarbis, qué emails tengo"* | Reads recent inbox via Gmail MCP |
| *"Yarbis, busca un correo de Shopify"* | Gmail search |
| *"Yarbis, qué reuniones tengo hoy"* | Google Calendar |
| *"Yarbis, agenda una reunión con María mañana a las 3"* | Creates Calendar event |
| *"Yarbis, busca en Notion el plan del Q2"* | Notion search via MCP |
| *"Yarbis, crea una nota en Notion sobre…"* | Creates Notion page |
| *"Yarbis, cuántos pedidos llevamos hoy"* | Supabase query (if configured) |
| *"Yarbis, PRs abiertos en el connector"* | GitHub MCP |
| *"Yarbis, recuerdas cuando…"* | Pulls from Hermes's persistent memory |

## 🎮 Combos (chained tools)

YARBIS handles multiple intents in a single phrase:

| Phrase | Tools triggered |
|---|---|
| *"Yarbis, modo trabajo, abre Cursor y dime qué proyectos tengo"* | `welcome_ritual` + `open_app` + `list_projects` |
| *"Yarbis, qué hora es y cómo va el connector"* | `current_time` + `git_status_project` |
| *"Yarbis, busca info sobre Three.js y abre la documentación"* | `search_web` + `open_url` |

## ⚡ System commands (NOT voice — terminal)

These are bash scripts you run yourself:

```bash
bash scripts/dev_all.sh        # boot all 5 services
bash scripts/stop_yarbis.sh    # kill all
bash scripts/healthcheck.sh    # status of all services
```

Or window control via HTTP:

```bash
curl -X POST http://localhost:9871/show           # show window
curl -X POST http://localhost:9871/hide           # hide
curl -X POST http://localhost:9871/show-fullscreen # fullscreen
curl -X POST http://localhost:9871/exit-fullscreen # exit
```

## 🛠️ Tool reference (for developers)

There are **17 tools** registered in YARBIS. They live in two files:

| File | Tools | Description |
|---|---|---|
| `voice-bridge/tools.py` | `welcome_ritual`, `stop_music`, `play_youtube`, `open_app`, `open_url` | Core daily-use tools |
| `voice-bridge/tools_advanced.py` | `search_web`, `fetch_url`, `list_projects`, `open_project`, `git_status_project`, `hide_window`, `cinema_mode`, `exit_cinema_mode`, `take_screenshot`, `set_system_volume`, `current_time`, `ask_hermes` | Research, project ops, system, delegation |

Each tool is a Python function decorated with `@function_tool()`. The docstring is what the LLM reads to decide when to call it — write them as **prompt instructions** in Spanish, not API docs.
