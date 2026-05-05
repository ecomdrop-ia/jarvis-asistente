# Arquitectura YARBIS v3 — Hermes Agent (Cerebro) + LiveKit (Voz)

## Principio de Diseno

YARBIS combina dos frameworks open-source potentes:

- **Hermes Agent** (Nous Research) = el cerebro. Razonamiento, aprendizaje autonomo, 40+ tools, skills que se auto-mejoran, memoria persistente, cron scheduler, MCP nativo.
- **LiveKit Agents** = la voz. Pipeline de audio en tiempo real (WebRTC), VAD, STT, TTS, baja latencia.

La UI de particulas 3D es la cara visual del sistema, conectada via WebRTC.

**En resumen:** LiveKit escucha tu voz y la convierte a texto → Hermes piensa, ejecuta tools, aprende → LiveKit convierte la respuesta a voz → las particulas reaccionan en tiempo real.

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAC MINI (always-on)                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                 INTERFAZ DE PARTICULAS 3D                      │ │
│  │            Next.js + Three.js + Web Audio API                  │ │
│  │           Chrome Kiosk → localhost:3001                        │ │
│  │                                                                │ │
│  │  [Esfera Particulas] ←── WebRTC Audio ──→ [LiveKit Client]   │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                              │ WebRTC                               │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                 LIVEKIT SERVER (self-hosted)                    │ │
│  │            WebRTC SFU — localhost:7880                         │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              LIVEKIT VOICE BRIDGE (Python)                     │ │
│  │                                                                │ │
│  │  ┌──────────┐  ┌──────────┐              ┌──────────┐        │ │
│  │  │ Silero   │  │ Deepgram │              │Eleven-   │        │ │
│  │  │ VAD      │  │ STT      │              │Labs TTS  │        │ │
│  │  └──────────┘  └────┬─────┘              └────▲─────┘        │ │
│  │                      │ texto                   │ texto        │ │
│  └──────────────────────┼───────────────────────┼────────────────┘ │
│                         │                        │                  │
│                         ▼                        │                  │
│  ╔═══════════════════════════════════════════════╧════════════════╗ │
│  ║              HERMES AGENT (Cerebro Central)                    ║ │
│  ║                                                                ║ │
│  ║  ┌─────────────────┐  ┌─────────────────┐                    ║ │
│  ║  │  LEARNING LOOP   │  │  SKILL SYSTEM   │                    ║ │
│  ║  │  Aprende de cada │  │  25 categorias  │                    ║ │
│  ║  │  interaccion     │  │  + auto-creacion│                    ║ │
│  ║  └─────────────────┘  └─────────────────┘                    ║ │
│  ║                                                                ║ │
│  ║  ┌─────────────────┐  ┌─────────────────┐                    ║ │
│  ║  │  MEMORY SYSTEM   │  │  USER MODELING  │                    ║ │
│  ║  │  FTS5 + LLM sum  │  │  Honcho dialect │                    ║ │
│  ║  │  Cross-session   │  │  Perfil persist │                    ║ │
│  ║  └─────────────────┘  └─────────────────┘                    ║ │
│  ║                                                                ║ │
│  ║  ┌─────────────────┐  ┌─────────────────┐                    ║ │
│  ║  │  40+ TOOLS       │  │  CRON SCHEDULER │                    ║ │
│  ║  │  Terminal, Web,  │  │  Tareas auto    │                    ║ │
│  ║  │  Files, Vision,  │  │  Daily reports  │                    ║ │
│  ║  │  Code exec...    │  │  Monitoreo      │                    ║ │
│  ║  └─────────────────┘  └─────────────────┘                    ║ │
│  ║                                                                ║ │
│  ║  ┌─────────────────┐  ┌─────────────────┐                    ║ │
│  ║  │  SUBAGENT        │  │  PERSONALITY    │                    ║ │
│  ║  │  DELEGATION      │  │  (YARBIS prompt)│                    ║ │
│  ║  │  Tareas paralelo │  │  Builder LATAM  │                    ║ │
│  ║  └─────────────────┘  └─────────────────┘                    ║ │
│  ║                           │                                    ║ │
│  ╚═══════════════════════════╪════════════════════════════════════╝ │
│                              │                                      │
│              ┌───────────────┼───────────────────┐                 │
│              │          MCP SERVERS               │                 │
│              │                                    │                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │                 │
│  │ Gmail  │ │Calendar│ │ Notion │ │ GitHub │   │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘   │                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │                 │
│  │Supabase│ │  Home  │ │Filesys │ │ Brave  │   │                 │
│  │Ecomdrop│ │Assistnt│ │projects│ │ Search │   │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘   │                 │
│  ┌────────┐ ┌────────┐ ┌────────┐               │                 │
│  │Spotify │ │Mission │ │Remotion│               │                 │
│  │        │ │Control │ │ render │               │                 │
│  └────────┘ └────────┘ └────────┘               │                 │
│              └────────────────────────────────────┘                 │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              CANALES ADICIONALES (via Hermes Gateway)          │ │
│  │                                                                │ │
│  │  [Telegram]  [WhatsApp]  [Discord]  [Slack]  [Signal]  [CLI] │ │
│  │   Hablar con YARBIS desde el celular cuando no estas en el lab│ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Como Fluye una Interaccion

### Via Voz (en el laboratorio)

```
1. Dices "Yarbis" (wake word)
   → UI: particulas pasan de idle a listening

2. "Como van los pedidos de hoy y tengo emails urgentes?"
   → Silero VAD: detecta fin de turno
   → Deepgram STT: convierte a texto
   → UI: particulas pasan a thinking

3. Texto llega a Hermes Agent
   → Hermes consulta su memoria: "Elkin pregunta esto cada manana"
   → Hermes decide usar 2 MCP tools:
     - supabase: execute_sql (pedidos del dia)
     - gmail: search_threads (urgentes sin leer)
   → Los tools ejecutan y devuelven resultados
   → Hermes formula respuesta con personalidad YARBIS
   → Hermes guarda en memoria: "Elkin reviso metricas a las 9am"
   → Hermes mejora el skill "morning_briefing" basado en esta interaccion

4. Respuesta texto vuelve a LiveKit Voice Bridge
   → ElevenLabs TTS genera audio (voz Cristian)
   → Audio va por WebRTC al parlante
   → UI: particulas pulsan al ritmo de la voz

5. "Van 52 pedidos hoy, 8% arriba. Tienes 2 emails urgentes:
    uno de Shopify sobre API deprecation y uno de un cliente
    pidiendo demo. Quieres que los lea?"
```

### Via Telegram (fuera del laboratorio)

```
1. Envias mensaje de Telegram a YARBIS Bot:
   "Yarbis, cuantos pedidos llevamos?"

2. Hermes Gateway recibe el mensaje
   → Hermes Agent procesa (misma logica que por voz)
   → Responde via Telegram: "Van 52 pedidos, $3,800 USD. 
     El mejor producto es el kit de accesorios (18 unidades)."
   
3. No hay voz ni particulas (es solo texto)
   → Pero usa la misma memoria, tools, y skills
```

---

## Lo que Hermes aporta vs. Claude API directo

| Aspecto | Solo Claude API | Hermes Agent + Claude |
|---|---|---|
| Razonamiento | Claude piensa y responde | Hermes orquesta, Claude razona dentro de Hermes |
| Memoria | Sin memoria entre sesiones | FTS5 + resumenes LLM + cross-session recall |
| Aprendizaje | No aprende | Skills se crean y mejoran autonomamente |
| User modeling | No modela al usuario | Honcho dialectic: aprende tus patrones |
| Tools | Solo function tools manuales | 40+ tools built-in + MCP + skills custom |
| Cron/Scheduler | No tiene | Built-in: daily reports, monitoreo, backups |
| Subagentes | No tiene | Puede delegar tareas en paralelo |
| Multi-canal | Solo donde lo conectes | Telegram, WhatsApp, Discord, Slack, Signal, CLI |
| Contexto | Se pierde entre sesiones | Compresion inteligente + memoria persistente |

---

## Componentes del Sistema

### 1. LiveKit Server (WebRTC SFU)
- Self-hosted en Mac Mini
- Maneja transporte de audio en tiempo real
- Puerto: 7880

### 2. LiveKit Voice Bridge (Python)
- Intermediario entre audio WebRTC y Hermes
- Pipeline: VAD (Silero) → STT (Deepgram) → [texto a Hermes] → [respuesta de Hermes] → TTS (ElevenLabs)
- NO razona: solo convierte audio ↔ texto

### 3. Hermes Agent (Cerebro Central)
- Toda la inteligencia vive aqui
- Personalidad de YARBIS configurada via personality/context files
- 40+ tools nativos + MCP servers para integraciones
- Learning loop: crea y mejora skills automaticamente
- Memoria persistente entre sesiones
- Cron scheduler para tareas automaticas
- Subagent delegation para tareas paralelas

### 4. MCP Servers
Mismos que teniamos, ahora conectados a Hermes en vez de a Claude directo:
- Gmail, Calendar, Notion, Supabase, GitHub, Brave Search, Google Drive
- Filesystem (acceso a ~/projects/ecomdrop/)
- Home Assistant, Spotify, Mission Control, Remotion

### 5. Hermes Gateway (Multi-canal)
- Proceso que conecta Hermes con plataformas de mensajeria
- Telegram (principal para uso movil), WhatsApp, Discord, Slack, Signal
- El mismo YARBIS, accesible desde cualquier lugar

### 6. UI de Particulas (Next.js + Three.js)
- Fullscreen en Chrome kiosk
- Conectada a LiveKit via WebRTC para audio reactivo
- 6 estados visuales: idle, listening, thinking, speaking, alert, error

---

## Estructura del Proyecto Actualizada

```
yarbis-asistente/
├── README.md
├── ARCHITECTURE.md
├── mcp_config.json               # Config de MCP servers para Hermes
├── .env.example
│
├── hermes/                        # Hermes Agent config (el cerebro)
│   ├── personality.md             # Personalidad YARBIS para Hermes
│   ├── context.md                 # Contexto de proyectos Ecomdrop
│   ├── skills/                    # Skills custom de YARBIS
│   │   ├── ecomdrop-metrics/     # Skill: consultar metricas
│   │   ├── morning-briefing/     # Skill: resumen matutino
│   │   ├── content-calendar/     # Skill: calendario editorial
│   │   └── home-automation/      # Skill: control del hogar
│   └── cron/                      # Tareas programadas
│       ├── daily-metrics.yaml    # Reporte diario de Ecomdrop
│       ├── email-digest.yaml     # Resumen de emails
│       └── stock-alerts.yaml     # Alertas de stock bajo
│
├── voice-bridge/                  # LiveKit Voice Bridge (Python)
│   ├── __init__.py
│   ├── main.py                    # LiveKit Agent que conecta con Hermes
│   ├── hermes_bridge.py          # Comunicacion con Hermes API
│   └── tts_config.py             # Config de ElevenLabs
│
├── ui/                            # Interfaz de Particulas (Next.js)
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       ├── app/page.tsx
│       ├── components/
│       │   ├── ParticleSystem.tsx
│       │   ├── AudioAnalyzer.tsx
│       │   └── LiveKitRoom.tsx
│       └── lib/shaders/
│
├── scripts/
│   ├── install.sh                 # Setup: Hermes + LiveKit + UI
│   ├── start.sh                   # Levantar todo
│   └── launchd/                   # macOS auto-start
│
├── docs/
│   ├── jarvis-reference.md
│   ├── roadmap.md
│   └── mcp-tools-guide.md
│
└── tests/
```

---

## Costos Estimados Mensuales

| Servicio | Costo | Notas |
|---|---|---|
| LLM (via Hermes — Claude/OpenRouter) | $20-80 | Hermes soporta multiples providers |
| ElevenLabs TTS | $5-22 | Voz Cristian |
| Deepgram STT | $0-10 | Free tier generoso |
| Supabase | $0-25 | Memory + Ecomdrop data |
| LiveKit Server | $0 | Self-hosted |
| Hermes Agent | $0 | Open-source, self-hosted |
| Home Assistant | $0 | Self-hosted |
| MCP Servers | $0 | Corren localmente |
| **Total** | **$25-137/mes** | |

---

## Ventaja Competitiva de esta Arquitectura

1. **Aprende de ti**: Hermes crea skills basadas en tareas repetitivas. Si todos los dias preguntas por pedidos a las 9am, crea un skill optimizado para eso.
2. **Multi-canal sin esfuerzo**: Hermes Gateway te da Telegram/WhatsApp gratis. Hablas con YARBIS desde cualquier lugar.
3. **Subagentes**: Hermes puede delegar tareas pesadas a subagentes paralelos mientras te sigue respondiendo.
4. **Cron nativo**: Reportes diarios, alertas de stock, digest de emails — todo automatizado sin codigo extra.
5. **Model-agnostic**: Hermes soporta 200+ modelos via OpenRouter. Puedes cambiar de Claude a GPT-4 a Gemini con un comando.
6. **Voice-first**: LiveKit da la experiencia de voz que ningun agente de texto tiene.
7. **Open source**: Ambos frameworks son MIT. Sin vendor lock-in.
