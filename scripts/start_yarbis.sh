#!/usr/bin/env bash
# Production-style boot — used by launchd at user login.
#
# Runs all four components in the foreground of a single shell session,
# in dependency order, with logs piped to ~/Library/Logs/yarbis/.
#
# Differences from dev_all.sh:
#   • No multiple Terminal panes — all output goes to log files
#   • Sequential startup with health checks before starting next component
#   • Children are killed cleanly when this script receives SIGTERM
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/yarbis"
mkdir -p "$LOG_DIR"

PIDS=()
cleanup() {
  echo "[yarbis] shutting down (PIDs: ${PIDS[*]:-})"
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait_for_port() {
  local port="$1" name="$2" max=30
  for ((i = 0; i < max; i++)); do
    if curl -sf "http://127.0.0.1:$port" > /dev/null 2>&1; then
      echo "[yarbis] $name ready on :$port"
      return 0
    fi
    sleep 1
  done
  echo "[yarbis] $name failed to start on :$port (waited ${max}s)"
  return 1
}

# Make sure user-installed CLIs are on PATH (launchd starts with a minimal env).
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# ─── 1. LiveKit Server ────────────────────────────────────────────────────
echo "[yarbis] starting LiveKit Server…"
livekit-server --config "$ROOT/livekit.yaml" \
  >> "$LOG_DIR/livekit.log" 2>&1 &
PIDS+=($!)
wait_for_port 7880 "LiveKit Server" || cleanup

# ─── 2. Voice-bridge worker ───────────────────────────────────────────────
echo "[yarbis] starting voice-bridge…"
(
  cd "$ROOT/voice-bridge"
  source .venv/bin/activate
  exec python main.py dev
) >> "$LOG_DIR/voice-bridge.log" 2>&1 &
PIDS+=($!)
sleep 3  # give the worker time to register with LiveKit Server

# ─── 3. Next.js UI ────────────────────────────────────────────────────────
echo "[yarbis] starting Next.js UI…"
(
  cd "$ROOT/ui"
  exec pnpm start
) >> "$LOG_DIR/ui.log" 2>&1 &
PIDS+=($!)
wait_for_port 3000 "Next.js UI" || cleanup

# ─── 4. Electron shell ────────────────────────────────────────────────────
echo "[yarbis] starting Electron…"
(
  cd "$ROOT/electron"
  exec npm start
) >> "$LOG_DIR/electron.log" 2>&1 &
PIDS+=($!)

echo "[yarbis] all components running. logs in $LOG_DIR"
wait
