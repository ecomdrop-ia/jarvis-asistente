# YARBIS — Guía del proyecto para Claude Code

Este archivo se carga automáticamente cuando Claude Code abre este proyecto. Le dice a Claude (o a cualquier AI agent que codee) qué es importante del codebase, las convenciones, y cómo se conectan las cosas.

## Qué es este proyecto

YARBIS es un **asistente de voz tipo JARVIS** corriendo localmente en un Mac. Tres componentes principales en runtime:

1. **`voice-bridge/`** — Worker Python LiveKit Agents. Maneja STT (Deepgram) → LLM (OpenAI gpt-4o-mini) → TTS (ElevenLabs). El loop de voz.
2. **`ui/`** — HUD Next.js 16 + Tailwind v4 + Three.js. Estado visual del asistente.
3. **`electron/`** — Shell nativo que carga el UI Next.js en Chromium sin restricciones de autoplay del browser, con micro auto-grant y un servidor HTTP local de comandos (puerto 9871) para control de ventana.

Cuarto opcional: **Hermes Agent** (Nous Research) instalado en `~/.hermes/`, exponiendo un Gateway API en puerto 8642 — usado por el voice tool `ask_hermes` para delegar tareas complejas (Gmail, Calendar, Notion, etc.).

## Layout del proyecto

```
yarbis-asistente/
├── ui/                            # Next.js 16 (App Router)
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Monta <VoiceRoom>
│       │   ├── layout.tsx         # Fuentes: JetBrains Mono, Inter, Orbitron
│       │   ├── globals.css        # Design tokens (colores, escala tipográfica, glow)
│       │   └── api/token/route.ts # Generador de JWT de LiveKit (server-only)
│       └── components/            # Todas las piezas del HUD (ver "Componentes del UI" abajo)
├── voice-bridge/
│   ├── main.py                    # Entrypoint, setup del agent, system prompt
│   ├── tools.py                   # Tools core + cliente del cmd server de Electron
│   ├── tools_advanced.py          # Tools de web/proyecto/sistema/Hermes
│   ├── hermes_bridge.py           # (legacy, no usado en el flow actual)
│   └── assets/                    # Música de bienvenida (gitignored)
├── electron/
│   ├── main.js                    # BrowserWindow + permisos + cmd server
│   └── preload.js                 # (placeholder — vacío)
├── hermes/                        # Personalidad + contexto de Hermes Agent
│   ├── personality.md             # Copiado a ~/.hermes/SOUL.md por install.sh
│   └── context.md
├── scripts/
│   ├── dev_all.sh                 # Arranca los 5 servicios (paneles de Terminal vía osascript)
│   ├── stop_yarbis.sh             # Mata todo
│   ├── healthcheck.sh             # Status check (retorna no-cero si algún servicio cae)
│   ├── install.sh                 # Setup primera vez
│   ├── start_yarbis.sh            # Boot estilo producción para launchd
│   ├── dev_voice.sh               # Voice-bridge con auto-recarga via watchfiles
│   ├── dev_ui.sh                  # Dev server de Next.js
│   └── launchd/
│       └── com.ecomdrop.yarbis.plist
├── docs/
│   ├── SETUP.md                   # Instalación paso a paso
│   ├── VOICE_COMMANDS.md          # Los 17 tools + triggers
│   ├── TROUBLESHOOTING.md         # Issues comunes
│   ├── jarvis-reference.md        # Lore de JARVIS (películas)
│   ├── mcp-tools-guide.md
│   ├── demo.svg                   # Mockup vectorial del HUD (para README)
│   └── roadmap.md
├── ARCHITECTURE.md                # Diagramas + flujo de datos
├── README.md                      # Intro pública
├── LICENSE                        # MIT
├── .env.example                   # Template (sin keys reales)
└── livekit.yaml                   # Config de LiveKit Server
```

## Convenciones clave

### 1. El voice loop es OpenAI directo, NO Hermes-via-voice

Probamos rutear voz a través del Gateway de Hermes. Hermes infla el prompt con SOUL.md + memoria + 89 skills (~13k tokens), haciendo que la latencia al primer token sea de 10–25 segundos — inutilizable para voz en tiempo real.

Entonces el voice-bridge usa **OpenAI gpt-4o-mini directo** con un system prompt mínimo en español (`YARBIS_INSTRUCTIONS` en `main.py`). Hermes es alcanzable vía el voice tool `ask_hermes` cuando YARBIS necesita tareas pesadas (delegado explícitamente, con un warning de 5–15s).

**No intentes rutear voz por Hermes de nuevo.** Ya se probó. No funciona.

### 2. Los function tools viven en dos archivos

- `voice-bridge/tools.py` — pequeños, de uso diario (welcome ritual, música, abrir app, abrir URL)
- `voice-bridge/tools_advanced.py` — investigación, project ops, sistema, delegación a Hermes

Cada tool está decorado con `@function_tool()`. **El docstring es lo que el LLM lee** para decidir cuándo llamarlo — escríbelos como **instrucciones de prompt en español**, no como docs de API.

Cuando agregues un tool nuevo:
1. Define la función con un docstring claro en español
2. Agrégalo a la lista `ALL_TOOLS` o `ADVANCED_TOOLS` correspondiente
3. Actualiza `YARBIS_INSTRUCTIONS` en `main.py` con las frases trigger (para que el LLM tenga ejemplos explícitos)
4. Guarda — `watchfiles` auto-recarga el worker

### 3. Servidor de comandos de Electron para control de ventana

`electron/main.js` corre un servidor HTTP local en `127.0.0.1:9871`. Los voice tools le hacen POST en lugar de usar AppleScript:

| Endpoint | Efecto |
|---|---|
| `POST /show` | Trae la ventana al frente |
| `POST /show-fullscreen` | Mostrar + fullscreen (usado por `welcome_ritual`) |
| `POST /hide` | Oculta la ventana (¡el mic sigue activo!) |
| `POST /exit-fullscreen` | Sale de fullscreen |

El cierre de ventana se intercepta en `electron/main.js`: en lugar de destruir webContents (lo que mata el mic), `event.preventDefault()` + `win.hide()`. El renderer sigue corriendo con `backgroundThrottling: false`.

### 4. Componentes del UI y jerarquía z-index

El `<VoiceRoom>` monta todo en este orden de z:

```
z-0   DevBackground (code rain, blueprint marks, circuit traces)
z-5   HudFrame (3 anillos SVG rotantes — SMIL animateTransform)
z-7   AudioOrbit (72 barras radiales, reactivas a audio)
z-10  ArcReactor (elemento focal — glow más fuerte)
z-20  HudHeader, StatusPanel, AiEngine, QuotePanel, BuildActivity, HudFooter
```

**Crítico**: HudFrame debe estar DEBAJO del ArcReactor (z-5 < z-10). Si lo pones encima, los anillos flotan sobre el foco y rompe la jerarquía visual.

### 5. Las rotaciones usan SMIL, no CSS

Las rotaciones de los anillos (`HudFrame.tsx`) usan SVG `<animateTransform>`, no CSS keyframes. CSS `transform-box: view-box` no es confiable entre browsers y los anillos se descentran. SMIL rota alrededor de `0,0` del sistema de coordenadas del SVG padre (que es el centro del viewBox). Quédate con SMIL para cualquier elemento SVG nuevo que rote.

### 6. El audio ducking es del lado del cliente

El `BackgroundAudioPlayer` de Python NO tiene ducking — verificado leyendo su source. El agent publica 2 tracks separados:
- `roomio_audio` — la voz (TTS)
- `background_audio` — la música

El ducking se implementa en el cliente React (hook `useDuckBackgroundMusic` en `VoiceRoom.tsx`):
1. Encuentra el track `background_audio` en el room
2. Toma su elemento `<audio>`
3. Anima `.volume` según el `AgentState`:
   - `speaking` → 0.10
   - `thinking` → 0.55
   - else → 0.85
4. Rampa lineal 250ms vía `requestAnimationFrame`
5. **Siempre clampa** el valor a `[0, 1]` — el float math drift puede pasar de 1 y `audioElement.volume` rechaza con IndexSizeError

### 7. Design tokens

Todo en `ui/src/app/globals.css`. No hardcodees colores ni font sizes en componentes. Usa CSS variables:

```css
--accent: #07E2FE                   /* HUD ambient cyan */
--accent-build: #22C55E             /* "AI corriendo" verde */
--accent-warning: #F59E0B           /* amber */
--accent-error: #EF4444             /* rojo */
--speaking: #FB923C                 /* naranja (Iron Man) */
--thinking: #A78BFA                 /* violeta */

--fs-display: 30px                  /* "BIENVENIDO, SEÑOR" */
--fs-h2: 16px                       /* labels de sección */
--fs-body: 15px                     /* contenido */
--fs-label: 13px                    /* secundarios */
--fs-micro: 11px                    /* códigos, telemetría */
```

Glow utilities: `.hud-glow-ambient` (todo excepto el reactor) y `.hud-glow-focus` (solo el reactor).

### 8. Fuentes

| Variable | Fuente | Usada para |
|---|---|---|
| `--font-display` | JetBrains Mono | Labels de sección, códigos, datos técnicos |
| `--font-body` | Inter | Texto largo (frases, descripciones) |
| `--font-wordmark` | Orbitron | **SOLO** el hero "BIENVENIDO, SEÑOR" — feel sci-fi |

Orbitron se usa CON CUIDADO — sobreusarlo hace el UI cartoonish. Solo el hero.

## Workflows comunes

### Agregar un voice tool nuevo
Ve [docs/VOICE_COMMANDS.md — referencia de tools](docs/VOICE_COMMANDS.md#-referencia-de-tools-para-developers).

### Arrancar el dev stack
```bash
bash scripts/dev_all.sh         # abre 5 paneles de Terminal
bash scripts/healthcheck.sh     # verifica
bash scripts/stop_yarbis.sh     # mata todo
```

### Forzar HMR si los cambios no se reflejan
```bash
cd ui && rm -rf .next && pnpm dev
```
Luego `Cmd+Shift+R` en Electron.

### Verificar que un cambio del UI llegó al browser
```bash
# Busca en el bundle un string de tu cambio
for chunk in $(curl -s http://localhost:3000 | grep -oE '/_next/static/chunks/[^"]+\.js' | head -10); do
  if curl -s "http://localhost:3000$chunk" 2>/dev/null | grep -q "MI_STRING_DEL_EDIT"; then
    echo "✅ $chunk"
    break
  fi
done
```

## Cosas a evitar

- ❌ **No agregues animaciones hud-pulse a los paneles.** Era la fuente más grande de competencia visual con el Arc Reactor. Removida.
- ❌ **No pongas HudFrame en `z-10`.** Debe ser `z-5`, debajo del Arc Reactor.
- ❌ **No uses Orbitron en todos lados.** Solo el hero wordmark.
- ❌ **No intentes rutear voz por `/v1/chat/completions` de Hermes.** Probado; la latencia lo hace inutilizable. Voz → OpenAI directo, Hermes solo para `ask_hermes`.
- ❌ **No mezcles `style` inline + classes de posición de Tailwind.** Elige uno. Tailwind v4 tiene conflictos de cascade con `transform` inline.
- ❌ **No commitees `.env`** — tiene API keys. `.gitignore` lo cubre pero verifica siempre.
- ❌ **No mates Electron con `Cmd+W`.** Eso se intercepta para ocultar. Para cerrar de verdad, usa `Cmd+Q` (menú YARBIS → Cerrar) o `kill <PID>`.

## Estado del mundo

El roadmap está en [`docs/roadmap.md`](docs/roadmap.md). Fase 1 (voz + HUD + tools) está **lista**. Fase 2 (Telegram, integración más profunda con Hermes) **no empezó**. Fase 3 (wake-word, hardware) **no empezó**.

## ¿Preguntas mientras editas?

- **Arquitectura del sistema** → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Cómo agregar una feature** → [`docs/SETUP.md`](docs/SETUP.md#10-personalización)
- **Por qué algo se ve como se ve** → mira la sección **Cosas a evitar** arriba; está documentando decisiones de diseño que tomaron varias iteraciones para asentarse.
