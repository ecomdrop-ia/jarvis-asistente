#!/usr/bin/env bash
# Boot every YARBIS dev process. Each runs in its own Terminal pane so you
# can read logs independently while iterating.
#
# Components:
#   1. LiveKit Server          (audio SFU, port 7880)
#   2. voice-bridge worker     (Python LiveKit Agents, auto-reload)
#   3. Next.js UI              (HUD at localhost:3000)
#   4. Electron shell          (loads localhost:3000 with autoplay enabled)
#
# Hermes Gateway is intentionally separate — start it via `hermes gateway run`
# only when you want Telegram/Slack/etc. routing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

open_pane() {
  local title="$1"
  local cmd="$2"
  osascript <<EOF
tell application "Terminal"
  activate
  do script "echo '── $title ──'; $cmd"
end tell
EOF
}

echo "Starting YARBIS dev stack from $ROOT"
echo

# 1. LiveKit Server — only spawn if not already up.
if ! curl -sf http://127.0.0.1:7880 > /dev/null; then
  open_pane "LiveKit Server" "cd $ROOT && livekit-server --config livekit.yaml"
  echo "  • LiveKit Server starting…"
  sleep 2
else
  echo "  • LiveKit Server already running ✓"
fi

# 2. Hermes Gateway — only spawn if not already up.  Required for the
# `ask_hermes` tool (delegation to Hermes brain). Skipped if you don't
# need email/calendar/notion access.
if ! curl -sf http://127.0.0.1:8642/health > /dev/null; then
  # Absolute path avoids needing to set PATH inside the AppleScript
  # heredoc (escaping nested quotes there is fragile).
  HERMES_BIN="$HOME/.local/bin/hermes"
  if [[ -x "$HERMES_BIN" ]]; then
    open_pane "Hermes Gateway" "$HERMES_BIN gateway run --accept-hooks"
    echo "  • Hermes Gateway starting…"
    sleep 1
  else
    echo "  • Hermes binary not found at $HERMES_BIN (skipping)"
  fi
else
  echo "  • Hermes Gateway already running ✓"
fi

# 3. Voice-bridge worker.
open_pane "YARBIS Voice (worker)" "cd $ROOT && bash scripts/dev_voice.sh"
echo "  • Voice bridge starting…"

# 4. Next.js UI.
open_pane "YARBIS UI (Next.js)" "cd $ROOT && bash scripts/dev_ui.sh"
echo "  • Next.js UI starting…"

# 5. Electron shell — wait until Next.js is responding, otherwise the window
# pops up empty and the retry-loop clutters the logs.
echo "  • Waiting for Next.js to respond before launching Electron…"
ELECTRON_CMD="cd $ROOT/electron && until curl -sf http://localhost:3000 > /dev/null; do sleep 1; done; npm start"
open_pane "YARBIS Electron" "$ELECTRON_CMD"

echo
echo "All services launching. Electron will appear once the UI is ready."
echo "  → Stop everything:    bash scripts/stop_yarbis.sh"
echo "  → Health check:       bash scripts/healthcheck.sh"
