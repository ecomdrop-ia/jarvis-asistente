#!/bin/bash
# YARBIS — Start all services
# Usage: bash scripts/start.sh

set -e

YARBIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== YARBIS Startup ==="
echo "Directory: $YARBIS_DIR"

# Load environment
if [ -f "$YARBIS_DIR/.env" ]; then
    export $(grep -v '^#' "$YARBIS_DIR/.env" | xargs)
    echo "[OK] Environment loaded"
else
    echo "[WARN] No .env file found. Copy .env.example to .env and fill in your keys."
    exit 1
fi

# 1. Start LiveKit Server (background)
echo ""
echo "--- Starting LiveKit Server ---"
if command -v livekit-server &> /dev/null; then
    livekit-server --config "$YARBIS_DIR/livekit.yaml" &
    LIVEKIT_PID=$!
    echo "[OK] LiveKit Server started (PID: $LIVEKIT_PID)"
else
    echo "[WARN] livekit-server not found. Install with: brew install livekit"
    echo "[WARN] Or run with Docker: docker run -p 7880:7880 livekit/livekit-server"
fi

sleep 2

# 2. Start YARBIS Agent (background)
echo ""
echo "--- Starting YARBIS Agent ---"
cd "$YARBIS_DIR/agent"
python main.py start &
AGENT_PID=$!
echo "[OK] YARBIS Agent started (PID: $AGENT_PID)"

sleep 2

# 3. Start UI (background)
echo ""
echo "--- Starting Particle UI ---"
cd "$YARBIS_DIR/ui"
pnpm start &
UI_PID=$!
echo "[OK] Particle UI started (PID: $UI_PID)"

sleep 3

# 4. Open Chrome in kiosk mode
echo ""
echo "--- Opening Chrome Kiosk ---"
open -a "Google Chrome" --args --kiosk --app=http://localhost:3001
echo "[OK] Chrome kiosk opened"

echo ""
echo "=== YARBIS is running ==="
echo "  LiveKit Server: ws://localhost:7880"
echo "  YARBIS Agent:   running (LiveKit Agents)"
echo "  Particle UI:    http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
