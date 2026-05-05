"""Function tools that YARBIS can call from voice.

The LLM decides when to call them based on what Elkin says, so each
docstring is what the model reads — write them like prompts, not API docs.

Music playback uses LiveKit's BackgroundAudioPlayer, which mixes the track
into the same audio stream as the agent's voice. LiveKit auto-ducks the
music while YARBIS speaks, so we don't manage volume by hand.
"""

import logging
import os
import socket
import subprocess
import urllib.parse
from pathlib import Path
from typing import Optional

from livekit.agents import function_tool
from livekit.agents.voice.background_audio import (
    AudioConfig,
    BackgroundAudioPlayer,
    PlayHandle,
)

# Electron command server — see electron/main.js for the supported routes.
ELECTRON_CMD_HOST = "127.0.0.1"
ELECTRON_CMD_PORT = int(os.environ.get("YARBIS_CMD_PORT", "9871"))


def _send_electron_command(command: str, timeout: float = 1.0) -> bool:
    """Send a command to the Electron window control server.

    Uses a raw socket + a tiny HTTP request so we don't pull in httpx for
    a one-line POST.  Fails silently when Electron isn't running — the
    voice loop must keep working with or without the GUI."""
    request = (
        f"POST /{command} HTTP/1.1\r\n"
        f"Host: {ELECTRON_CMD_HOST}\r\n"
        "Content-Length: 0\r\n"
        "Connection: close\r\n"
        "\r\n"
    )
    try:
        with socket.create_connection((ELECTRON_CMD_HOST, ELECTRON_CMD_PORT), timeout=timeout) as s:
            s.sendall(request.encode())
            response = s.recv(64)
        ok = b"200" in response[:16]
        if not ok:
            logger.warning("electron command %s returned: %r", command, response[:64])
        return ok
    except Exception as e:
        logger.debug("electron command %s skipped (%s)", command, e)
        return False

logger = logging.getLogger("yarbis-tools")

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
WELCOME_AUDIO_PATH = str(ASSETS_DIR / "welcome_shoot_to_thrill.mp3")

# Music volume (0..1). LiveKit auto-ducks this while YARBIS speaks.
WELCOME_VOLUME = 0.55


# ─── Module-level player handle ─────────────────────────────────────────────
# Set by main.py at session start. Tools fail loud if it's missing.
_player: Optional[BackgroundAudioPlayer] = None
_active_handle: Optional[PlayHandle] = None


def set_background_player(player: BackgroundAudioPlayer) -> None:
    global _player
    _player = player


def _get_player() -> BackgroundAudioPlayer:
    if _player is None:
        raise RuntimeError(
            "BackgroundAudioPlayer not initialized. "
            "main.py must call set_background_player() before tools run."
        )
    return _player


def play_welcome_music(player: Optional[BackgroundAudioPlayer] = None) -> bool:
    """Start the AC/DC welcome track on the given player (or the module-level
    one).  Also tells the Electron window to come to the front and go
    fullscreen — Tony-Stark-walking-into-the-lab effect.

    Returns True on success.  Used both by the LLM-invoked tool below AND
    by main.py's entrypoint when YARBIS auto-greets on connect."""
    global _active_handle

    if not os.path.exists(WELCOME_AUDIO_PATH):
        logger.error("welcome audio not found at %s", WELCOME_AUDIO_PATH)
        return False

    target = player or _player
    if target is None:
        logger.error("play_welcome_music: no player available")
        return False

    if _active_handle is not None:
        try:
            _active_handle.stop()
        except Exception:
            pass

    # Bring the lab UI front-and-center.  Fire-and-forget — if Electron isn't
    # running, the voice loop keeps working without it.
    _send_electron_command("show-fullscreen")

    logger.info("welcome music — playing %s", WELCOME_AUDIO_PATH)
    _active_handle = target.play(
        AudioConfig(source=WELCOME_AUDIO_PATH, volume=WELCOME_VOLUME),
    )
    return True


# ─── Tools ─────────────────────────────────────────────────────────────────


@function_tool()
async def welcome_ritual() -> str:
    """Reproduce 'Shoot to Thrill' de AC/DC y activa el modo laboratorio. \
Llama a este tool cuando Elkin diga 'buenos días', 'llegué', 'estoy aquí', \
'a trabajar', o 'modo trabajo'. Es el ritual de bienvenida estilo Iron Man — \
Tony Stark llegando al taller. La música se mezcla con tu voz y baja \
automáticamente cuando hablas. Después de llamarlo, da el saludo largo con \
frases estoicas con energía total."""
    if not play_welcome_music():
        return "Error: el audio de bienvenida no está disponible."
    return "Ritual de bienvenida activado. Reproduciendo Shoot to Thrill."


@function_tool()
async def stop_music() -> str:
    """Detiene la música de fondo. Llama cuando Elkin diga 'baja la música', \
'apaga la música', 'silencio', 'pausa', o 'quita la música'."""
    global _active_handle
    if _active_handle is None:
        return "No hay música reproduciéndose."
    try:
        _active_handle.stop()
        _active_handle = None
        logger.info("stop_music: track stopped")
        return "Música detenida."
    except Exception as e:
        logger.warning("stop_music failed: %s", e)
        return "No pude detener la música."


@function_tool()
async def play_youtube(query: str) -> str:
    """Busca y abre un video de YouTube en el navegador. Usa esto cuando \
Elkin diga 'pon X en YouTube', 'busca en YouTube X', o cuando quiera VER \
un video específico (no para música de fondo, esa la maneja welcome_ritual). \
El parámetro query es el texto a buscar."""
    encoded = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded}"
    logger.info("play_youtube query=%r", query)
    subprocess.Popen(
        ["open", url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return f"Buscando {query} en YouTube."


@function_tool()
async def open_app(app_name: str) -> str:
    """Abre una aplicación de Mac. Usa cuando Elkin diga 'abre X', \
'lanza X', o 'abre la aplicación X'. Ejemplos válidos: 'Cursor', \
'Safari', 'Spotify', 'Notion', 'Slack', 'Terminal', 'Finder'."""
    logger.info("open_app name=%r", app_name)
    subprocess.Popen(
        ["open", "-a", app_name],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return f"Abriendo {app_name}."


@function_tool()
async def open_url(url: str) -> str:
    """Abre una URL en el navegador. Usa cuando Elkin diga 'abre [sitio]', \
'llévame a [sitio]', o cuando necesite navegar a una página específica. \
Si Elkin solo dice un nombre (ej: 'github'), construye el URL completo \
agregando https:// antes."""
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    logger.info("open_url url=%r", url)
    subprocess.Popen(
        ["open", url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return f"Abriendo {url}."


ALL_TOOLS = [welcome_ritual, stop_music, play_youtube, open_app, open_url]
