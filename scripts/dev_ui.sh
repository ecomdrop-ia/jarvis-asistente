#!/usr/bin/env bash
# Run the YARBIS particle UI (Next.js) in dev mode.
# Visit http://localhost:3000 once it boots.
set -euo pipefail

UI_DIR="$(cd "$(dirname "$0")/.." && pwd)/ui"
cd "$UI_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  YARBIS UI — http://localhost:3000"
echo "  Press Ctrl+C to exit."
echo "═══════════════════════════════════════════════════════"

exec pnpm dev
