"""YARBIS Agent — Main entrypoint using LiveKit Agents framework."""

import logging
from livekit.agents import Agent, AgentSession, AgentServer, RunContext, function_tool, cli
from livekit.agents import inference
from livekit.plugins import silero

from personality import YARBIS_SYSTEM_PROMPT, GREETING_INSTRUCTIONS

logger = logging.getLogger("yarbis")
logger.setLevel(logging.INFO)

# ─── Custom Function Tools ───

@function_tool
async def get_current_time(context: RunContext) -> dict:
    """Returns the current date and time in Colombia timezone."""
    from datetime import datetime, timezone, timedelta
    col_tz = timezone(timedelta(hours=-5))
    now = datetime.now(col_tz)
    return {
        "datetime": now.isoformat(),
        "date": now.strftime("%A %d de %B de %Y"),
        "time": now.strftime("%I:%M %p"),
        "day_of_week": now.strftime("%A"),
    }


@function_tool
async def activate_scene(context: RunContext, scene_name: str) -> dict:
    """Activate a predefined home automation scene.

    Args:
        scene_name: Name of the scene to activate. Options:
                    'modo_trabajo', 'modo_descanso', 'modo_buildlog', 'modo_off'
    """
    scenes = {
        "modo_trabajo": {
            "lights": {"color": "#22D3EE", "brightness": 60},
            "music": "spotify:playlist:deep-focus",
            "description": "Luces azules al 60%, musica lo-fi, notificaciones silenciadas"
        },
        "modo_descanso": {
            "lights": {"color": "#FFA500", "brightness": 30},
            "music": "spotify:playlist:chill",
            "description": "Luces calidas al 30%, musica chill"
        },
        "modo_buildlog": {
            "lights": {"color": "#EF4444", "brightness": 40},
            "music": None,
            "description": "Luces rojas suaves, microfono listo para grabar"
        },
        "modo_off": {
            "lights": {"color": None, "brightness": 0},
            "music": None,
            "description": "Todo apagado"
        },
    }

    scene = scenes.get(scene_name)
    if not scene:
        return {"error": f"Escena '{scene_name}' no encontrada. Opciones: {list(scenes.keys())}"}

    # TODO: Integrate with Home Assistant API
    logger.info(f"Activating scene: {scene_name} -> {scene}")
    return {"activated": scene_name, "description": scene["description"]}


@function_tool
async def list_projects(context: RunContext) -> dict:
    """List all projects in the ~/projects/ecomdrop/ directory with basic info."""
    import os

    projects_dir = os.path.expanduser("~/projects/ecomdrop")
    projects = []

    for item in sorted(os.listdir(projects_dir)):
        item_path = os.path.join(projects_dir, item)
        if os.path.isdir(item_path) and not item.startswith('.'):
            has_git = os.path.exists(os.path.join(item_path, '.git'))
            has_package = os.path.exists(os.path.join(item_path, 'package.json'))
            has_pyproject = os.path.exists(os.path.join(item_path, 'pyproject.toml'))

            projects.append({
                "name": item,
                "has_git": has_git,
                "type": "node" if has_package else "python" if has_pyproject else "other",
            })

    return {"projects": projects, "count": len(projects)}


# ─── Agent Server Setup ───

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx):
    """Main entrypoint for YARBIS agent sessions."""

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=inference.STT("deepgram/nova-3", language="es"),
        llm=inference.LLM("anthropic/claude-sonnet-4"),
        tts=inference.TTS(
            "elevenlabs/cristian",
            # Configuracion de voz
        ),
    )

    agent = Agent(
        instructions=YARBIS_SYSTEM_PROMPT,
        tools=[
            get_current_time,
            activate_scene,
            list_projects,
        ],
        # MCP tools se cargan automaticamente desde mcp_config.json
    )

    # Start session
    await session.start(agent=agent, room=ctx.room)

    # Generate initial greeting
    await session.generate_reply(instructions=GREETING_INSTRUCTIONS)

    logger.info("YARBIS session started successfully")


if __name__ == "__main__":
    cli.run_app(server)
