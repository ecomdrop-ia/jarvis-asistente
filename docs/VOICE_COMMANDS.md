# YARBIS — Referencia de comandos de voz

Lista completa de comandos que YARBIS entiende. La palabra de activación **"Yarbis"** es convencional pero no estrictamente requerida — el LLM entiende la intención.

Todos los ejemplos están en español (el system prompt es español colombiano), pero también puedes hablar en inglés y YARBIS te entenderá y responderá en español.

> ¿Quieres agregar tu propio comando? Ve [SETUP.md — Agregar tu propio comando de voz](SETUP.md#agregar-tu-propio-comando-de-voz-tool).

## 🌅 Ritual matutino

Dispara `welcome_ritual`: abre pantalla completa, reproduce AC/DC, entrega el saludo estoico.

| Frase | Acción |
|---|---|
| *"Yarbis, buenos días"* | El ritual completo |
| *"Yarbis, llegué"* | Mismo |
| *"Yarbis, estoy aquí"* | Mismo |
| *"Yarbis, a trabajar"* | Mismo |
| *"Yarbis, modo trabajo"* | Mismo |

## 🎵 Control de música

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, apaga la música"* | Detiene el track de bienvenida | `stop_music` |
| *"Yarbis, silencio"* | Mismo | `stop_music` |
| *"Yarbis, pon una de Bad Bunny"* | Abre búsqueda en YouTube | `play_youtube` |
| *"Yarbis, busca videos de Iron Man"* | Abre búsqueda en YouTube | `play_youtube` |

## 💻 Aplicaciones del Mac

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, abre Cursor"* | Lanza Cursor | `open_app` |
| *"Yarbis, abre Spotify"* | Lanza Spotify | `open_app` |
| *"Yarbis, abre Notion"* | Lanza Notion | `open_app` |
| *"Yarbis, abre Slack"* | Lanza Slack | `open_app` |
| *"Yarbis, abre Terminal"* | Lanza Terminal | `open_app` |
| *"Yarbis, lanza Chrome"* | Lanza Chrome | `open_app` |

Funciona con **cualquier app instalada en Mac**. El LLM resuelve el nombre incluso con typos o coincidencias parciales.

## 🌐 Web

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, abre github"* | Abre github.com en el navegador default | `open_url` |
| *"Yarbis, abre vercel.com"* | Abre Vercel | `open_url` |
| *"Yarbis, llévame a stripe"* | Abre Stripe | `open_url` |

El LLM resuelve nombres sueltos automáticamente → `https://X.com`.

## 🔍 Investigación

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, busca noticias de OpenAI"* | Brave Search → lee top 3 resultados | `search_web` |
| *"Yarbis, qué es un MCP server"* | Brave Search | `search_web` |
| *"Yarbis, búscame info sobre Hydrogen"* | Brave Search | `search_web` |
| *"Yarbis, lee el contenido de https://news.ycombinator.com"* | Trae y resume la URL | `fetch_url` |

⚠️ Requiere `BRAVE_API_KEY` en `.env`. Sin esto, devuelve error.

## 📁 Operaciones de proyecto (`~/projects/ecomdrop/`)

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, qué proyectos tengo"* | Lista todos los repos en `~/projects/ecomdrop/` | `list_projects` |
| *"Yarbis, lístame los proyectos"* | Mismo | `list_projects` |
| *"Yarbis, abre el proyecto Ecomdrop connector"* | Abre en Cursor | `open_project` |
| *"Yarbis, abre yarbis-asistente"* | Abre en Cursor (fuzzy match) | `open_project` |
| *"Yarbis, cómo va el connector"* | Devuelve git status + branch + últimos 3 commits | `git_status_project` |
| *"Yarbis, estado de mission control"* | Mismo | `git_status_project` |

> El directorio de proyectos está hardcoded a `~/projects/ecomdrop/` en `tools_advanced.py`. Cambia la constante `PROJECTS_DIR` si tus proyectos viven en otro lado.

## 🖥️ Control del sistema Mac

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, qué hora es"* | Devuelve fecha + hora en español colombiano | `current_time` |
| *"Yarbis, qué día es hoy"* | Mismo | `current_time` |
| *"Yarbis, toma un screenshot"* | Guarda en `~/Desktop` | `take_screenshot` |
| *"Yarbis, captura la pantalla"* | Mismo | `take_screenshot` |
| *"Yarbis, sube el volumen al 80"* | Sube el volumen del sistema al 80% | `set_system_volume` |
| *"Yarbis, baja el volumen al 30"* | Baja al 30% | `set_system_volume` |
| *"Yarbis, silencia el volumen"* | Pone en 0 | `set_system_volume` |

## 🪟 Control de ventana (Electron)

| Frase | Acción | Tool |
|---|---|---|
| *"Yarbis, ocúltate"* | Esconde la ventana (mic sigue activo) | `hide_window` |
| *"Yarbis, escóndete"* | Mismo | `hide_window` |
| *"Yarbis, desaparece"* | Mismo | `hide_window` |
| *"Yarbis, modo cinema"* | Entra en pantalla completa | `cinema_mode` |
| *"Yarbis, pantalla completa"* | Mismo | `cinema_mode` |
| *"Yarbis, modo Iron Man"* | Mismo | `cinema_mode` |
| *"Yarbis, sal de pantalla completa"* | Sale del fullscreen | `exit_cinema_mode` |
| *"Yarbis, modo ventana"* | Mismo | `exit_cinema_mode` |

## 🧠 Delegación a Hermes (los pesados)

Estos comandos delegan a Hermes Agent que tiene 89+ skills + MCPs (Gmail, Calendar, Notion, etc.).

⚠️ Latencia: 5–15 segundos. YARBIS dirá *"dame un segundo"* antes de procesar.
⚠️ Requiere Hermes Gateway corriendo en puerto 8642 (auto-arrancado por `dev_all.sh`).

| Frase | Acción |
|---|---|
| *"Yarbis, qué emails tengo"* | Lee inbox reciente vía Gmail MCP |
| *"Yarbis, busca un correo de Shopify"* | Búsqueda en Gmail |
| *"Yarbis, qué reuniones tengo hoy"* | Google Calendar |
| *"Yarbis, agenda una reunión con María mañana a las 3"* | Crea evento de Calendar |
| *"Yarbis, busca en Notion el plan del Q2"* | Búsqueda en Notion vía MCP |
| *"Yarbis, crea una nota en Notion sobre…"* | Crea página en Notion |
| *"Yarbis, cuántos pedidos llevamos hoy"* | Query a Supabase (si está configurado) |
| *"Yarbis, PRs abiertos en el connector"* | GitHub MCP |
| *"Yarbis, recuerdas cuando…"* | Trae de la memoria persistente de Hermes |

## 🎮 Combos (tools encadenados)

YARBIS maneja varias intenciones en una sola frase:

| Frase | Tools que dispara |
|---|---|
| *"Yarbis, modo trabajo, abre Cursor y dime qué proyectos tengo"* | `welcome_ritual` + `open_app` + `list_projects` |
| *"Yarbis, qué hora es y cómo va el connector"* | `current_time` + `git_status_project` |
| *"Yarbis, busca info sobre Three.js y abre la documentación"* | `search_web` + `open_url` |

## ⚡ Comandos del sistema (NO son por voz — terminal)

Estos son scripts bash que tú ejecutas:

```bash
bash scripts/dev_all.sh        # arranca los 5 servicios
bash scripts/stop_yarbis.sh    # mata todo
bash scripts/healthcheck.sh    # estado de los servicios
```

O control de ventana vía HTTP:

```bash
curl -X POST http://localhost:9871/show           # mostrar ventana
curl -X POST http://localhost:9871/hide           # ocultar
curl -X POST http://localhost:9871/show-fullscreen # pantalla completa
curl -X POST http://localhost:9871/exit-fullscreen # salir
```

## 🛠️ Referencia de tools (para developers)

Hay **17 tools** registrados en YARBIS. Viven en dos archivos:

| Archivo | Tools | Descripción |
|---|---|---|
| `voice-bridge/tools.py` | `welcome_ritual`, `stop_music`, `play_youtube`, `open_app`, `open_url` | Tools core de uso diario |
| `voice-bridge/tools_advanced.py` | `search_web`, `fetch_url`, `list_projects`, `open_project`, `git_status_project`, `hide_window`, `cinema_mode`, `exit_cinema_mode`, `take_screenshot`, `set_system_volume`, `current_time`, `ask_hermes` | Investigación, project ops, sistema, delegación |

Cada tool es una función Python decorada con `@function_tool()`. El docstring es lo que el LLM lee para decidir cuándo llamarla — escríbelos como **instrucciones de prompt en español**, no como docs de API.
