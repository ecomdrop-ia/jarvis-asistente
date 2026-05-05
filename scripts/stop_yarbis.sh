#!/usr/bin/env bash
# Kill every YARBIS component. Used both as a manual "stop everything" and
# as the StopCommand for the launchd job.
set -uo pipefail

echo "[yarbis] stopping all components…"

# Kill by process name. `pkill -f` matches the full command line.
pkill -f "livekit-server --config" 2>/dev/null || true
pkill -f "watchfiles.*main.py" 2>/dev/null || true
pkill -f "voice-bridge.*main.py" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "yarbis-asistente/electron" 2>/dev/null || true
pkill -f "Electron.*yarbis" 2>/dev/null || true
pkill -f "hermes gateway run" 2>/dev/null || true

sleep 1

# Final pass: anything still bound to our ports.
for port in 7880 8642 9871 3000; do
  pid=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
    echo "  · :$port (PID $pid) liberado"
  fi
done

echo "[yarbis] stopped."
