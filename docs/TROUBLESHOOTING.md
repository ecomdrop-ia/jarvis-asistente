# YARBIS — Solución de problemas

Los problemas más comunes, ordenados por frecuencia.

## 🎙️ YARBIS no escucha

**Síntoma**: hablas, no pasa nada. No hay transcripción, no hay respuesta.

### Diagnóstico

```bash
bash scripts/healthcheck.sh
```

Verifica:
- ✅ ¿Voice-bridge worker corriendo?
- ✅ ¿Proceso de Electron app vivo?
- ✅ ¿Hay 2 participantes en el room (cliente + agente)?

### Causas más comunes

**1. Música tapando tu voz (VAD confundido).**
El track de AC/DC al 55% de volumen + tu voz puede confundir al VAD. Prueba:
- *"Yarbis, apaga la música"* (fuerte y claro)
- O espera a que termine el saludo de bienvenida

**2. Permiso de micrófono no concedido.**
Electron lo pregunta una vez al primer arranque. Si lo negaste:
- macOS Configuración → Privacidad y Seguridad → Micrófono → habilita Electron
- Reinicia Electron: `bash scripts/stop_yarbis.sh && bash scripts/dev_all.sh`

**3. Mic equivocado seleccionado.**
macOS puede tomar el micrófono interno cuando tienes uno externo conectado:
- macOS Configuración → Sonido → Entrada → revisa que el medidor se mueva cuando hablas
- Si está mal, selecciona el dispositivo correcto

**4. Múltiples voice-bridges corriendo (caos en dispatch de jobs).**
Después de varios reinicios puedes tener procesos zombie:
```bash
pgrep -af "voice-bridge.*main.py" | head -5  # debería ser UNO
```
Si hay más de uno, ejecuta `bash scripts/stop_yarbis.sh` y reinicia con `dev_all.sh`.

**5. Warmup del AEC (Acoustic Echo Cancellation).**
Al arrancar, AEC silencia las interrupciones por los primeros 3 segundos. **Espera 3-5 segundos después del saludo de bienvenida antes de hablar.**

## 🔥 Caché atascado — los cambios al UI no se reflejan

**Síntoma**: tú (o la IA) edita un componente del UI, lo guarda, pero el navegador no muestra el cambio. Ni con `Cmd+Shift+R`.

### Causa
Turbopack (el bundler de Next.js 16) a veces se cuelga después de varios cambios de archivos.

### Fix
```bash
cd ui
pkill -f "next dev"
rm -rf .next
pnpm dev
```

15 segundos y vuelves a estar al día. Después `Cmd+Shift+R` en Electron.

## 🚫 Errores "401 Adaptive Interruption" en los logs del voice-bridge

```
WSServerHandshakeError: 401, message='Invalid response status'
url='wss://agent-gateway.livekit.cloud/v1/bargein'
APIConnectionError: failed to detect interruption after 3 attempts
```

### Esto es **NORMAL** e inofensivo

El Adaptive Interruption Detector intenta llamar al cloud de LiveKit (`agent-gateway.livekit.cloud`), que requiere una API key real de LiveKit Cloud. Nosotros usamos un LiveKit Server self-hosted con `devkey`, así que el cloud nos rechaza con 401.

**LiveKit hace fallback automático a interrupción basada en VAD local** (que funciona perfecto). Verás esta línea en los logs:

```
WARNING adaptive interruption disabled due to unrecoverable error,
        falling back to VAD-based interruption
```

✅ **La voz sigue funcionando bien.** Ignora los stack traces. Solo aparecen al inicio.

Si te molestan visualmente, puedes hacer monkey-patch del logger en `voice-bridge/main.py` (avísanos si quieres un PR para esto).

## ⚠️ La música no baja cuando YARBIS habla

**Síntoma**: AC/DC sigue al 100% de volumen mientras YARBIS habla.

### Causa
El `BackgroundAudioPlayer` de Python no expone ducking. Lo implementamos del lado del cliente en `ui/src/components/VoiceRoom.tsx` (el hook `useDuckBackgroundMusic`).

### Verifica que el fix esté activo

Después de actualizar el código, **`Cmd+Shift+R` en Electron** es obligatorio. El hook solo se carga cuando:

1. El UI está fresh-built (sin cache stale de Turbopack)
2. Electron recargó la página

Si aún no hace ducking, revisa la consola del DevTools del navegador (`Cmd+Option+I` en Electron):

```
Failed to set the 'volume' property on 'HTMLMediaElement':
The volume provided (1.00198) is outside the range [0, 1].
```

Si ves este error, tu versión no tiene el fix de clamp. Haz pull de la última versión o actualiza el hook para hacer clamp con `Math.max(0, Math.min(1, value))`.

## 🔇 Sin audio de nada (ni YARBIS ni música)

**Síntoma**: la ventana de Electron muestra el HUD, ves logs de YARBIS hablando, pero no escuchas nada.

### Causas

**1. Dispositivo de salida del Mac equivocado.**
macOS Configuración → Sonido → Salida → verifica que el parlante/audífonos correctos estén seleccionados.

**2. Modo Focus de macOS silenciando.**
Si "No molestar" o "Focus" está activo, el audio puede estar muteado. Desactívalo temporalmente.

**3. Audio context de Electron no concedido.**
Cierra Electron (`Cmd+Q` desde menú YARBIS), luego `bash scripts/dev_all.sh` de nuevo. A veces el audio context necesita un user gesture fresco.

**4. Cuota de ElevenLabs API agotada.**
Tier gratis es 10k chars/mes. Si te lo agotaste, no se genera audio TTS. Verifica en https://elevenlabs.io/app/settings/usage

## 🌀 Los anillos se ven descentrados / aparecen en posición equivocada

**Síntoma**: los anillos concéntricos del HUD rotan alrededor de un punto que NO es el centro de la pantalla.

### Causa
`transform-box: view-box` en CSS no siempre funciona para elementos `<g>` SVG con hijos asimétricos. El fix usa SMIL `<animateTransform>` en su lugar.

### Verifica
El `HudFrame.tsx` actual usa SMIL. Si ves anillos drifting, probablemente tienes un build stale. Forza fresh:

```bash
cd ui && rm -rf .next && pnpm dev
```

Luego `Cmd+Shift+R`.

## 🔧 Hermes Gateway no responde

**Síntoma**: el comando de voz `ask_hermes` devuelve "Hermes no respondió (código 000)".

### Diagnostica

```bash
curl -sf http://localhost:8642/health || echo "Hermes caído"
```

### Fix

```bash
~/.local/bin/hermes gateway run --accept-hooks
```

Si Hermes nunca se configuró, ejecuta:

```bash
bash scripts/install.sh
```

Después habilita el API server en `~/.hermes/.env`:

```
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=yarbis-local-secret
```

## 🎧 Glitches de audio / voz robótica

**Síntoma**: la voz de ElevenLabs suena entrecortada, glitcheada o con artefactos.

### Causas

**1. Latencia de red.**
ElevenLabs hace streaming en tiempo real. Con wifi pobre, los frames llegan tarde. Prueba ethernet.

**2. Presión de CPU.**
El voice-bridge hace VAD (Silero), decoding STT y mixing de audio en paralelo. Si tu Mac también está compilando un proyecto pesado, los frames de audio se caen.
- Revisa Activity Monitor → CPU
- Cierra apps pesadas (especialmente otras basadas en Electron)

**3. Setting de streaming latency de ElevenLabs.**
En `voice-bridge/main.py`, el param `streaming_latency` (actualmente NOT_GIVEN) usa el default "máxima calidad, más lento". Puedes bajarlo (escala 1-4) para más rápido pero más glitchy:

```python
elevenlabs.TTS(
    ...,
    streaming_latency=2,  # 1 = mejor calidad, 4 = menor latencia
)
```

## 🪪 Electron pide permiso de micrófono CADA vez

**Síntoma**: cada arranque, macOS muestra el diálogo "permitir micrófono".

### Causa
El cache de permisos de Electron en tu home folder puede estar corrupto. Resetéalo:

```bash
rm -rf "$HOME/Library/Application Support/yarbis-electron"
```

Después relanza. macOS preguntará una vez más, lo permites, y debería recordarlo de ahí en adelante.

## 🔥 Múltiples ventanas de Electron abiertas tras reinicio

**Síntoma**: después de correr `dev_all.sh`, ves 2 o 3 ventanas de YARBIS.

### Causa
Procesos previos de Electron no se mataron limpio.

### Fix

```bash
bash scripts/stop_yarbis.sh
sleep 3
bash scripts/dev_all.sh
```

Si `stop_yarbis.sh` no los mata todos, forza:

```bash
pkill -9 -f "yarbis-asistente/electron"
```

## 🐛 Errores que no cubrí

Si algo más falla:

1. Corre `bash scripts/healthcheck.sh` y revisa qué servicio está caído
2. Mira el log correspondiente:
   - LiveKit: panel de Terminal + `~/Library/Logs/yarbis/livekit.log` (si usas launchd)
   - Voice-bridge: panel de Terminal (tiene tracebacks si algo crashea)
   - Next.js: panel de Terminal + `.next/` para errores de build
   - Electron: panel de Terminal + DevTools console (`Cmd+Option+I`)
3. Abre un issue en GitHub con:
   - Tu versión de macOS
   - Output de `bash scripts/healthcheck.sh`
   - Últimas ~50 líneas del log que falla
   - Pasos para reproducir
