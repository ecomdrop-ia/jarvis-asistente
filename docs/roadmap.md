# Roadmap — YARBIS v3 (Hermes + LiveKit)

## Fase 1: Hermes + Voz + Particulas (Semanas 1-4)

### Objetivo
Hablar con YARBIS por voz, ver particulas reaccionar, con Hermes como cerebro.

### Entregables
1. Hermes Agent instalado y configurado con personalidad YARBIS
2. LiveKit Server self-hosted en Mac Mini
3. Voice Bridge: LiveKit → Hermes → LiveKit (audio bidireccional)
4. Pipeline: Silero VAD → Deepgram STT → Hermes → ElevenLabs TTS
5. UI de particulas (Three.js) con 4 estados: idle, listening, thinking, speaking
6. MCPs basicos: Gmail, Google Calendar, Brave Search
7. Chrome auto-open kiosk al boot
8. Hermes personality + context files configurados

### Criterio de exito
Dices "Yarbis, que emails tengo y que hay en mi calendario", las particulas reaccionan, y recibes respuesta de voz con datos reales. Hermes recuerda la conversacion.

---

## Fase 2: Director de Proyectos + MCPs completos (Semanas 5-8)

### Entregables
1. MCPs: Notion, GitHub, Supabase/Ecomdrop, Google Drive, Filesystem
2. Hermes skills custom: morning-briefing, ecomdrop-metrics, content-calendar
3. Cron jobs: daily metrics, email digest, stock alerts (via Hermes scheduler)
4. Remotion MCP: renderizar videos por voz
5. Mission Control MCP: estado de agentes
6. Hermes Gateway: Telegram bot para hablar con YARBIS desde el celular
7. Subagent delegation para tareas pesadas

### Criterio de exito
"Yarbis, dame el estado general" devuelve metricas de Ecomdrop, PRs pendientes, emails urgentes, y calendario. Tambien funciona desde Telegram.

---

## Fase 3: Hardware + Wake Word (Semanas 9-11)

### Entregables
1. Microfono de calidad dedicado
2. Wake word "Yarbis" con Picovoice Porcupine
3. Deteccion de doble aplauso
4. Parlante de alta calidad
5. launchd services para todos los componentes (auto-restart)

### Criterio de exito
Entras al lab, dices "Yarbis" desde 3 metros, te saluda sin tocar nada.

---

## Fase 4: Home Automation + Escenas (Semanas 12-14)

### Entregables
1. Home Assistant en Mac Mini
2. Home Assistant MCP para Hermes
3. Luces inteligentes por zonas
4. Spotify MCP
5. Escenas: modo trabajo, descanso, build log, presentacion
6. Dashboard en monitor secundario

### Criterio de exito
"Yarbis, modo trabajo" cambia todo el ambiente.

---

## Fase 5: Expansion (Mes 4+)

- WhatsApp Business integration
- Vision por camara (analizar lo que hay en pantalla)
- Multi-agente: YARBIS delega a sub-agentes especializados
- Generacion autonoma de contenido para @elkingarcia.ia
- Control de deploy de Ecomdrop Connector por voz
- Hermes learning loop optimizado con datos reales de uso
