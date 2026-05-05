#!/usr/bin/env bash
# Run the YARBIS voice-bridge in worker (dev) mode with auto-reload.
# In dev mode the agent connects to the local LiveKit Server and waits
# for jobs — when the Next.js UI joins the room, LiveKit dispatches a
# job to this worker and the voice loop starts.
#
# Re-runs `python main.py dev` whenever main.py or tools.py changes.
#
# Usage:
#   bash scripts/dev_voice.sh
#
# Stop with Ctrl+C.
set -euo pipefail

VOICE_BRIDGE_DIR="$(cd "$(dirname "$0")/.." && pwd)/voice-bridge"
cd "$VOICE_BRIDGE_DIR"

# shellcheck disable=SC1091
source .venv/bin/activate

echo "═══════════════════════════════════════════════════════"
echo "  YARBIS Voice — WORKER MODE (auto-reload)"
echo "  Connects to: ws://localhost:7880"
echo "  Watching:    $VOICE_BRIDGE_DIR/{main.py,tools.py}"
echo "  Press Ctrl+C to exit."
echo "═══════════════════════════════════════════════════════"

exec python -m watchfiles \
    --filter python \
    --target-type command \
    "python main.py dev" \
    "$VOICE_BRIDGE_DIR/main.py" \
    "$VOICE_BRIDGE_DIR/tools.py" \
    "$VOICE_BRIDGE_DIR/tools_advanced.py"
