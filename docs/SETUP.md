# YARBIS — Guía detallada de instalación

Setup paso-a-paso para usuarios que quieren control total. Para la versión TL;DR, ve al [README principal](../README.md#-inicio-rápido).

## Tabla de contenido

1. [Requisitos del sistema](#1-requisitos-del-sistema)
2. [Prerrequisitos](#2-prerrequisitos)
3. [API keys que necesitas](#3-api-keys-que-necesitas)
4. [Instalación](#4-instalación)
5. [Música de bienvenida (AC/DC)](#5-música-de-bienvenida)
6. [Primer arranque](#6-primer-arranque)
7. [Verificar que todo funciona](#7-verificar-que-todo-funciona)
8. [Opcional: Hermes Gateway](#8-opcional-hermes-gateway)
9. [Opcional: auto-arranque al login](#9-opcional-auto-arranque-al-login)
10. [Personalización](#10-personalización)

---

## 1. Requisitos del sistema

- **macOS 13+** (probado en Sonoma & Sequoia, Apple Silicon recomendado)
- **8 GB RAM** mínimo, 16 GB recomendado
- **5 GB de espacio en disco** (Electron + Hermes + LiveKit + Node modules)
- **Micrófono + parlantes** (los del Mac sirven perfecto)
- **Internet** (para llamadas a APIs de STT/TTS/LLM)

> ⚠️ Linux/Windows aún no están soportados oficialmente. El voice-bridge es Python multiplataforma, pero el auto-launch de Electron + comandos específicos de macOS (`open`, `osascript`) necesitan adaptadores.

## 2. Prerrequisitos

Instala esto una sola vez:

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 20+ y pnpm
brew install node
npm install -g pnpm

# yt-dlp (para descargar la música de bienvenida)
brew install yt-dlp ffmpeg

# Verifica las versiones
node --version  # debería ser 20+
pnpm --version  # debería ser 8+
python3 --version  # 3.11+ recomendado (uv lo instala si falta)
```

## 3. API keys que necesitas

YARBIS requiere 3 keys para funcionar, más 1 opcional:

### Requeridas

| Servicio | Para qué | Tier gratis | Conseguir key |
|---|---|---|---|
| **OpenAI** | Cerebro de la conversación por voz | $5 de crédito al registrarte | https://platform.openai.com/api-keys |
| **Deepgram** | Speech-to-text (tu voz → texto) | ~45,000 minutos gratis | https://console.deepgram.com/signup |
| **ElevenLabs** | Text-to-speech (la voz de YARBIS) | ~10,000 chars/mes gratis | https://elevenlabs.io/app/settings/api-keys |

### Opcionales

| Servicio | Para qué | Sin esto… |
|---|---|---|
| **Brave Search** | Búsquedas web por voz | El comando `search_web` no funcionará |
| **Hermes** | Acceso a email/calendar/Notion por voz | El comando `ask_hermes` no funcionará; todo lo demás sí |

## 4. Instalación

```bash
# 1. Clona el repo
git clone https://github.com/<tu-usuario>/yarbis-asistente.git
cd yarbis-asistente

# 2. Ejecuta el instalador maestro
bash scripts/install.sh
```

Lo que hace `install.sh`:

- ✅ Verifica que Node, pnpm y Homebrew estén instalados
- ✅ Instala **Hermes Agent** (Nous Research) en `~/.hermes/`
- ✅ Instala **LiveKit Server** vía Homebrew
- ✅ Crea `livekit.yaml` si falta
- ✅ Configura el **venv de Python 3.11** en `voice-bridge/.venv` (usando el `uv` que viene con Hermes)
- ✅ Instala `livekit-agents` + plugins
- ✅ Copia la personalidad de YARBIS (`hermes/personality.md`) al `SOUL.md` de Hermes

Cuando termina, ves:

```
╔══════════════════════════════════════════════╗
║          YARBIS Installation Complete!        ║
╚══════════════════════════════════════════════╝
```

### Configura el entorno

```bash
# 3. Copia el template de env
cp .env.example .env

# 4. Ábrelo y pega tus API keys
nano .env
```

Como mínimo, completa:

```bash
OPENAI_API_KEY=sk-proj-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=sk_...
```

### Instala dependencias del UI + Electron

```bash
# 5. Dependencias del UI
cd ui
pnpm install
cd ..

# 6. Dependencias de Electron
cd electron
npm install
cd ..
```

## 5. Música de bienvenida

El ritual matutino (`"Yarbis, buenos días"`) reproduce **"Shoot to Thrill" de AC/DC** — el mismo track de la escena del taller en Iron Man 2. No incluimos el audio (copyright). Lo descargas localmente:

```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "voice-bridge/assets/welcome_shoot_to_thrill.%(ext)s" \
  "https://www.youtube.com/watch?v=wLoWd2KyUro"
```

Esto es **solo para uso personal, no comercial**. Si prefieres otra canción, guárdala como `voice-bridge/assets/welcome_shoot_to_thrill.mp3` — lo importante es el nombre del archivo.

> ¿Quieres desactivar la música del todo? Edita `voice-bridge/main.py` y elimina la llamada `play_welcome_music(player)` dentro de `entrypoint()`.

## 6. Primer arranque

```bash
bash scripts/dev_all.sh
```

Esto abre 5 paneles de Terminal. El orden importa:

1. **LiveKit Server** arranca primero (puerto 7880)
2. **Hermes Gateway** arranca si está disponible (puerto 8642)
3. **Voice-bridge worker** se registra con LiveKit
4. **Next.js UI** compila (~10 seg en el primer arranque)
5. **Electron** espera al UI, luego abre la ventana JARVIS

### macOS te va a pedir permiso del micrófono

Cuando se abra la ventana de Electron por primera vez:

> *"Electron quiere acceder al micrófono."*

**Click en Aceptar.** Solo lo pide una vez. Después de eso, YARBIS funciona sin más.

### Comportamiento esperado en el primer arranque

1. Se abre la ventana de Electron con el HUD de YARBIS
2. Después de ~2 segundos, arranca AC/DC
3. YARBIS entrega un saludo estoico de 15 segundos en español colombiano
4. La placa "ESTADO ACTUAL" cambia a **● ESCUCHANDO**
5. Ya puedes hablarle

## 7. Verificar que todo funciona

Corre el health check:

```bash
bash scripts/healthcheck.sh
```

Deberías ver:

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

Si algún servicio falta, mira la [guía de TROUBLESHOOTING](TROUBLESHOOTING.md).

### Prueba un comando de voz

Di:

> *"Yarbis, qué hora es"*

YARBIS debería responder con la hora actual en español colombiano.

Si no obtienes respuesta, ve a [TROUBLESHOOTING — YARBIS no escucha](TROUBLESHOOTING.md#yarbis-no-escucha).

## 8. Opcional: Hermes Gateway

Si quieres usar el comando de voz `ask_hermes` (delegar a Hermes para emails/calendario/Notion/etc.), Hermes ya está instalado por `install.sh`. Solo activa su API server:

```bash
# La config de Hermes está en ~/.hermes/.env — ábrelo
nano ~/.hermes/.env

# Asegúrate de que estas líneas estén configuradas:
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=yarbis-local-secret
```

El script `dev_all.sh` arranca Hermes Gateway automáticamente si está instalado. Para configurar Hermes en sí (Gmail, Calendar, etc.), ve a la doc de Hermes: https://hermes-agent.nousresearch.com/docs/

## 9. Opcional: auto-arranque al login

Una vez que el flujo manual te funciona, automatízalo:

```bash
mkdir -p ~/Library/LaunchAgents ~/Library/Logs/yarbis
cp scripts/launchd/com.ecomdrop.yarbis.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

Después de esto, **YARBIS arrancará automáticamente cada vez que inicies sesión en tu Mac**. El stack completo vive en:

- Logs: `~/Library/Logs/yarbis/{livekit,voice-bridge,ui,electron}.log`
- Gestión de procesos: `launchctl list | grep yarbis`

Para desinstalar:

```bash
launchctl unload ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
rm ~/Library/LaunchAgents/com.ecomdrop.yarbis.plist
```

> ⚠️ El plist tiene rutas absolutas. Si mueves el proyecto, edita `scripts/launchd/com.ecomdrop.yarbis.plist` y reinstala.

## 10. Personalización

### Cambiar el nombre de YARBIS

La palabra de activación "Yarbis" es solo una convención del system prompt — cámbiala en `voice-bridge/main.py` (busca `YARBIS_INSTRUCTIONS`).

### Cambiar la voz

La voz default es **Cristian** (español colombiano masculino). Elige otra del [voice library de ElevenLabs](https://elevenlabs.io/app/voice-library), copia el voice ID, y actualiza `.env`:

```bash
ELEVENLABS_VOICE_ID=<nuevo-voice-id>
```

### Cambiar el modelo LLM

En `.env`:

```bash
HERMES_MODEL=gpt-5-mini   # (default) razona, balanceado
# Otras opciones: gpt-4o-mini (más rápido, más barato), gpt-5 (más inteligente, más lento), o3-mini
```

Para la voz (en `voice-bridge/main.py`), el modelo está hardcoded en `gpt-4o-mini` por baja latencia. Cámbialo en la línea `openai.LLM(model=...)` si lo necesitas.

### Agregar tu propio comando de voz (tool)

Abre `voice-bridge/tools_advanced.py` y agrega una nueva función decorada con `@function_tool()`. Ejemplo:

```python
@function_tool()
async def lock_screen() -> str:
    """Bloquea la pantalla del Mac. Usa cuando Elkin diga \
'bloquea la pantalla', 'me voy un momento', 'lockea'."""
    subprocess.Popen(["pmset", "displaysleepnow"])
    return "Pantalla bloqueada."
```

Luego regístrala en `ADVANCED_TOOLS = [..., lock_screen]`. Guarda el archivo. El voice-bridge se auto-recarga vía `watchfiles`. Listo.

### Personalizar el HUD

Todo el HUD vive en `ui/src/components/`. Los componentes son:

- `HudHeader.tsx` — barra superior con hora, wordmark "BIENVENIDO SEÑOR", placa de estado
- `HudFrame.tsx` — anillos SVG concéntricos rotantes
- `ArcReactor.tsx` — elemento focal central (reactivo a audio)
- `AudioOrbit.tsx` — barras radiales alrededor del reactor
- `HudPanels.tsx` — Panel de Subsistemas (izquierda), Panel de Frase (derecha), Footer
- `AiEngine.tsx` — telemetría IA (modelo, tokens, costo, latencia)
- `BuildActivity.tsx` — feed de builds de proyectos
- `StackChips.tsx` — chips de stack tecnológico debajo del header
- `DevBackground.tsx` — code rain, blueprint marks, capas ambient
- `CircuitTraces.tsx` — trazos de PCB en las esquinas

Los design tokens viven en `ui/src/app/globals.css`. El setup de fuentes está en `ui/src/app/layout.tsx`.

## ¿Qué sigue?

- Ve [VOICE_COMMANDS.md](VOICE_COMMANDS.md) para la referencia completa de comandos
- Ve [ARCHITECTURE.md](../ARCHITECTURE.md) para el diseño del sistema
- Ve [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para problemas comunes
- Ve [roadmap.md](roadmap.md) para features futuros
