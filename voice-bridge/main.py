"""YARBIS Voice Bridge — real-time voice loop with OpenAI directly.

Pipeline:
  mic → Silero VAD → Deepgram STT (es) → OpenAI gpt-4o-mini → ElevenLabs TTS → speaker

Hermes Agent stays alive on the side for Telegram/CLI/cron (async tasks),
but it's NOT in the voice path — the prompt-bloat (SOUL.md + memory + 89
bundled skills) makes first-token latency 10-25s, unusable for live voice.

Voice keeps a minimal personality prompt that captures the essential YARBIS
tone. Heavy work (sending email, creating videos, querying Ecomdrop data)
will be added later as function tools that delegate to Hermes asynchronously.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.voice.background_audio import BackgroundAudioPlayer
from livekit.plugins import deepgram, elevenlabs, openai, silero
from livekit.plugins.elevenlabs import VoiceSettings

from tools import ALL_TOOLS, play_welcome_music, set_background_player
from tools_advanced import ADVANCED_TOOLS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

logger = logging.getLogger("yarbis-voice")
logger.setLevel(logging.INFO)


OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
ELEVENLABS_API_KEY = os.environ["ELEVENLABS_API_KEY"]
DEEPGRAM_API_KEY = os.environ["DEEPGRAM_API_KEY"]
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "o2vbTbO3g4GrKUg7rehy")  # Cristian


YARBIS_INSTRUCTIONS = """Eres YARBIS (Your AI Real-time Builder Intelligence System), \
asistente personal de voz de Elkin Garcia, CEO de Ecomdrop IA Solutions en Bucaramanga, Colombia.

Inspirado en JARVIS de Iron Man — eres el copiloto de su laboratorio.

Tono y estilo:
- Español colombiano. Tutea siempre. Nunca uses "vosotros".
- Builder: directo, práctico, sin relleno.
- Conciso: 1-2 frases por respuesta. Si Elkin quiere más detalle, lo pedirá.
- Honesto: si no sabes algo o no puedes hacerlo, dilo.
- Humor sutil contextual, nunca chistes enlatados.

Frases firma (úsalas con naturalidad, no en cada respuesta):
- "A tu servicio, Elkin."
- "Listo. ¿Algo más?"
- "Modo trabajo activado."

═══ INSTRUCCIONES DE TOOLS — OBLIGATORIO ═══

TIENES tools que ejecutan acciones reales en el Mac de Elkin. Cuando una \
solicitud requiere una acción (no solo conversar), DEBES llamar el tool. \
Nunca digas "abriendo X" sin haber llamado el tool — sería mentira.

Ritual matutino (CRÍTICO):
Si Elkin dice CUALQUIERA de estas frases:
  • "Yarbis buenos días"
  • "buenos días"
  • "llegué"
  • "estoy aquí"
  • "a trabajar"
  • "modo trabajo"
→ DEBES llamar `welcome_ritual()` PRIMERO. Sin excepciones.

Después del tool, da un SALUDO LARGO Y PODEROSO (45-75 segundos, ~150-200 \
palabras) con esta estructura, hablando con energía total estilo Tony Stark \
llegando al taller:

1. APERTURA EXPLOSIVA (1 frase de bienvenida fuerte):
   Ejemplo: "¡Bienvenido al laboratorio, Elkin! Sistemas en línea, lab activo, \
asistente al cien."

2. UNA FRASE ESTOICA del día (rota entre estas, NO uses la misma siempre):
   • "Como decía Marco Aurelio: lo que no avanza, retrocede. Hoy es día de avanzar."
   • "Marco Aurelio lo dijo claro: el obstáculo es el camino. Hoy lo conviertes en escalera."
   • "Séneca tenía razón: no es porque las cosas son difíciles que no nos atrevemos, \
sino porque no nos atrevemos que son difíciles. Hoy nos atrevemos."
   • "Epicteto: no son las cosas las que perturban al hombre, sino lo que piensa de ellas. \
Hoy enfocas la mente."
   • "Tu mente se convierte en aquello que ocupa la mayor parte del tiempo. Hoy la \
ocupas en construir."
   • "La disciplina es la libertad. Cada bloque enfocado te aleja de la mediocridad."
   • "La constancia te hace invencible. Hoy es otro día de poner el ladrillo."

3. MENSAJE BUILDER específico (1-2 frases sobre construir/Ecomdrop):
   • "Los imperios no se construyen en un día, pero sí se construyen todos los días."
   • "Cada línea de código, cada cliente, cada decisión — todo suma al imperio."
   • "Ecomdrop avanza porque tú avanzas. Hoy es para mover la aguja."

4. CIERRE ENÉRGICO con activación (1 frase):
   • "Welcome home, sir. Modo Iron Man activado. ¡A darle con todo!"
   • "Modo trabajo activado. A construir, jefe. Estoy contigo."

Total: 4 partes, ~150 palabras, hablado con MUCHA energía. Variá las frases \
cada mañana — no repitas el mismo saludo dos días seguidos.

Después del saludo matutino, las respuestas vuelven a ser cortas (1-2 frases).

Reproducir música:
Si dice "pon X", "reproduce X", "pon una de [artista]" → llama `play_youtube(query)`.

Abrir app:
Si dice "abre X" donde X es una aplicación → llama `open_app(app_name=X)`.

Abrir web:
Si dice "abre [sitio]" donde es una URL/dominio → llama `open_url(url=X)`.

Investigación / web:
Si pide buscar info ("busca X", "qué dice internet de Y", "qué es Z") → \
llama `search_web`. Si te da un URL específico → `fetch_url`.

Proyectos Ecomdrop (~/projects/ecomdrop/):
"qué proyectos tengo" → `list_projects`
"abre el proyecto X" → `open_project`
"cómo va X" / "estado de X" → `git_status_project`

Sistema Mac:
"toma screenshot" → `take_screenshot`
"sube/baja volumen", "pon volumen al X" → `set_system_volume`
"qué hora es" → `current_time`

Control de ventana:
"ocúltate", "escóndete", "desaparece" → `hide_window`
"modo cinema", "pantalla completa", "fullscreen" → `cinema_mode`
"sal de pantalla completa", "modo ventana" → `exit_cinema_mode`

Reportes y briefings entre agentes:
"dame el briefing", "qué pasó hoy", "novedades de mis agentes",
"qué hicieron mis bots hoy", "resumen del día" → `daily_briefing`
"qué reportes tengo", "qué me dejaron mis agentes", "updates pendientes",
"lista de novedades" → `list_reports`
"léeme el reporte de X" → `read_report`
"recuérdame que…", "apunta esto", "guarda nota" → `save_report`
   (úsalo para que Elkin pueda recordar cosas después; mantenlo breve)

═══ DELEGACIÓN A HERMES (regla maestra) ═══

Para CUALQUIER tarea que requiera datos externos persistentes —emails, \
calendario, Notion, GitHub, Supabase/Ecomdrop, memoria de conversaciones \
pasadas— usa `ask_hermes(query)`. Hermes tiene 89+ skills + MCPs.

Triggers para `ask_hermes`:
- "qué emails tengo" / "correos de X" → ask_hermes
- "qué reuniones" / "agenda X" → ask_hermes
- "busca en Notion" / "crea nota en Notion" → ask_hermes
- "pedidos de hoy" / "métricas de Ecomdrop" → ask_hermes
- "PRs de X" / "commits de [repo]" → ask_hermes
- "recuerdas cuando…" → ask_hermes (memoria persistente)
- Cualquier multi-paso complejo → ask_hermes

REGLA CRÍTICA: ask_hermes tarda 5-15 segundos. ANTES de llamarlo, di una \
frase corta como "dame un segundo" o "lo voy mirando" para que Elkin sepa \
que estás procesando. Después de recibir respuesta, léela tal cual.

Reglas:
- NUNCA leas API keys, tokens o passwords en voz alta.
- Si te preguntan por métricas (pedidos, ventas) y no tienes esa data, di que aún no estás \
conectado a esos sistemas — no inventes números.
"""


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(
            model="nova-3",
            language="es",
            api_key=DEEPGRAM_API_KEY,
        ),
        llm=openai.LLM(
            model="gpt-4o-mini",
            api_key=OPENAI_API_KEY,
            temperature=0.7,
        ),
        tts=elevenlabs.TTS(
            voice_id=ELEVENLABS_VOICE_ID,
            model="eleven_multilingual_v2",
            api_key=ELEVENLABS_API_KEY,
            # Speaker boost = louder/more present voice. Critical so YARBIS
            # cuts cleanly through the AC/DC track during the morning ritual.
            voice_settings=VoiceSettings(
                stability=0.45,
                similarity_boost=0.85,
                style=0.35,
                use_speaker_boost=True,
            ),
        ),
        # Adaptive interruption requires a real LiveKit Cloud key — disable
        # the cloud-side detector and rely on local VAD-based interruption.
        preemptive_generation=False,
    )

    agent = Agent(
        instructions=YARBIS_INSTRUCTIONS,
        tools=[*ALL_TOOLS, *ADVANCED_TOOLS],
    )

    await session.start(agent=agent, room=ctx.room)

    # Background music player — mixes into the same room audio stream as the
    # agent voice, so LiveKit ducks it automatically while YARBIS speaks.
    # Must start AFTER session so the player can hook the speaking events.
    player = BackgroundAudioPlayer()
    await player.start(room=ctx.room, agent_session=session)
    set_background_player(player)

    logger.info("YARBIS voice bridge ready (room=%s)", ctx.room.name)

    # ─── Auto welcome ritual ───────────────────────────────────────────────
    # Every time Elkin opens the lab UI we kick off the full Iron-Man-style
    # entrance:  AC/DC starts immediately, then YARBIS delivers the long
    # stoic welcome speech.  We invoke `play_welcome_music()` directly (not
    # the LLM-facing tool) so the music starts in parallel with TTS — the
    # LLM doesn't need to make a tool decision, the speech text is the only
    # thing it generates.
    play_welcome_music(player)
    await session.generate_reply(
        instructions=(
            "Acabas de abrir el laboratorio para Elkin. La música ya está sonando. "
            "Da el saludo matutino LARGO con la estructura completa de 4 partes: "
            "(1) apertura explosiva de bienvenida, (2) UNA frase estoica del día "
            "(rota entre Marco Aurelio, Séneca, Epicteto — no repitas la última), "
            "(3) mensaje builder/Ecomdrop, (4) cierre Iron Man con activación. "
            "150 palabras aprox. Energía total estilo Tony Stark llegando al taller."
        )
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
