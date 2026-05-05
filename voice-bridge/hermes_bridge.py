"""Hermes LLM Adapter — Routes LiveKit text to Hermes Agent.

This adapter implements the LLM interface expected by LiveKit Agents
but instead of calling an LLM API directly, it forwards messages
to the Hermes Agent process running locally.

Communication options:
1. HTTP API: Hermes exposes a local API endpoint
2. CLI pipe: Send messages to hermes CLI process
3. WebSocket: Direct WS connection to Hermes

For MVP, we use the HTTP approach since it's the most straightforward.
"""

import os
import httpx
import logging
from typing import AsyncIterator

logger = logging.getLogger("hermes-bridge")

HERMES_API_URL = os.getenv("HERMES_API_URL", "http://localhost:8765")


class HermesLLMAdapter:
    """Adapter that makes Hermes Agent look like an LLM to LiveKit.

    LiveKit Voice Bridge calls this like it would call Claude/GPT:
    - Sends user message text
    - Receives assistant response text

    But under the hood, it's talking to Hermes which has:
    - Memory (remembers past conversations)
    - Skills (learned behaviors that improve)
    - Tools (40+ built-in + MCP servers)
    - User modeling (knows Elkin's patterns)
    - Cron (scheduled tasks running in background)
    """

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.session_id = None

    async def chat(self, messages: list[dict]) -> str:
        """Send message to Hermes and get response.

        Args:
            messages: List of chat messages [{role, content}]

        Returns:
            Assistant response text from Hermes
        """
        try:
            # Extract the latest user message
            user_message = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    user_message = msg.get("content", "")
                    break

            if not user_message:
                return "No recibi tu mensaje. Puedes repetir?"

            # Send to Hermes Agent
            response = await self.client.post(
                f"{HERMES_API_URL}/chat",
                json={
                    "message": user_message,
                    "session_id": self.session_id,
                },
            )

            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("session_id", self.session_id)
                return data.get("response", "No obtuve respuesta de Hermes.")
            else:
                logger.error(f"Hermes returned {response.status_code}: {response.text}")
                return "Tuve un problema conectando con mi cerebro. Dame un momento."

        except httpx.ConnectError:
            logger.error("Cannot connect to Hermes Agent. Is it running?")
            return "No puedo conectar con Hermes. Verifica que este corriendo."
        except Exception as e:
            logger.error(f"Hermes bridge error: {e}")
            return f"Error interno: {str(e)}"

    async def stream_chat(self, messages: list[dict]) -> AsyncIterator[str]:
        """Stream response from Hermes for lower latency.

        LiveKit can start TTS on partial responses,
        reducing perceived latency.
        """
        # TODO: Implement streaming when Hermes supports it
        # For now, get full response and yield it
        response = await self.chat(messages)
        yield response
