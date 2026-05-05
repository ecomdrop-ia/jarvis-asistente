#!/usr/bin/env bash
# Quick liveness check for every YARBIS service.  Fails non-zero if any
# service is missing — useful to gate launch scripts or alert the user.
set -uo pipefail

GREEN=$'\033[92m'; RED=$'\033[91m'; YELLOW=$'\033[93m'; RESET=$'\033[0m'
OK="${GREEN}✅${RESET}"; NO="${RED}❌${RESET}"; WARN="${YELLOW}⚠️${RESET}"

failed=0

check_http() {
  local label="$1" port="$2" path="${3:-/}" method="${4:-GET}" hint="$5"
  local pid=$(lsof -ti "tcp:${port}" 2>/dev/null | awk 'NR==1')
  local code=$(curl -s -o /dev/null -w "%{http_code}" -X "${method}" \
    "http://127.0.0.1:${port}${path}" 2>/dev/null)
  if [[ "$code" =~ ^(200|404|405)$ && -n "$pid" ]]; then
    printf "%b  %-26s :%-5s PID %-7s HTTP %s\n" "$OK" "$label" "$port" "$pid" "$code"
  else
    printf "%b  %-26s :%-5s no responde  →  %s\n" "$NO" "$label" "$port" "$hint"
    failed=$((failed + 1))
  fi
}

check_proc() {
  local label="$1" pattern="$2" hint="$3"
  local pid=$(pgrep -f "$pattern" 2>/dev/null | awk 'NR==1')
  if [[ -n "$pid" ]]; then
    printf "%b  %-26s        PID %s\n" "$OK" "$label" "$pid"
  else
    printf "%b  %-26s        no corriendo  →  %s\n" "$NO" "$label" "$hint"
    failed=$((failed + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════════"
printf "  YARBIS — Health Check  %s\n" "$(date '+%H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"

check_http "LiveKit Server"     7880 "/"        GET  "livekit-server --config livekit.yaml"
check_http "Hermes Gateway"     8642 "/health"  GET  "hermes gateway run --accept-hooks"
check_http "Next.js UI"         3000 "/"        GET  "bash scripts/dev_ui.sh"
check_http "Electron cmd server" 9871 "/show"   POST "cd electron && npm start"
check_proc "Voice-bridge worker" "voice-bridge.*main.py (dev|start|console)" "bash scripts/dev_voice.sh"
check_proc "Electron app"        "yarbis-asistente/electron" "cd electron && npm start"

echo
if (( failed == 0 )); then
  echo "  ${OK}  Todo OK."
  exit 0
else
  echo "  ${WARN}  ${failed} servicios no están corriendo."
  echo "      Para arrancar todo:  bash scripts/dev_all.sh"
  exit 1
fi
