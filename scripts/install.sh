#!/bin/bash
# YARBIS Installation Script for Mac Mini
# Installs: Hermes Agent + LiveKit Server + Voice Bridge + Particle UI

set -e
YARBIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "╔══════════════════════════════════════════════╗"
echo "║         YARBIS Installation Script            ║"
echo "║   Your AI Real-time Builder Intelligence      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# --- 1. Prerequisites ---
echo "=== Step 1: Checking prerequisites ==="

# Check Python
if command -v python3 &> /dev/null; then
    echo "[OK] Python3: $(python3 --version)"
else
    echo "[ERROR] Python3 not found. Install via: brew install python"
    exit 1
fi

# Check Node
if command -v node &> /dev/null; then
    echo "[OK] Node.js: $(node --version)"
else
    echo "[ERROR] Node.js not found. Install via: brew install node"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    echo "[OK] pnpm: $(pnpm --version)"
else
    echo "[WARN] pnpm not found. Installing..."
    npm install -g pnpm
fi

# --- 2. Install Hermes Agent ---
echo ""
echo "=== Step 2: Installing Hermes Agent ==="

if command -v hermes &> /dev/null; then
    echo "[OK] Hermes Agent already installed"
else
    echo "Installing Hermes Agent..."
    curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
    echo "[OK] Hermes Agent installed"
fi

# --- 3. Install LiveKit Server ---
echo ""
echo "=== Step 3: Installing LiveKit Server ==="

if command -v livekit-server &> /dev/null; then
    echo "[OK] LiveKit Server already installed"
else
    echo "Installing LiveKit Server..."
    brew install livekit 2>/dev/null || {
        echo "[WARN] brew install failed. Trying manual install..."
        echo "Visit: https://docs.livekit.io/home/self-hosting/local/"
    }
fi

# Create LiveKit config if not exists
if [ ! -f "$YARBIS_DIR/livekit.yaml" ]; then
    cat > "$YARBIS_DIR/livekit.yaml" << 'EOF'
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
keys:
  devkey: secret
logging:
  level: info
EOF
    echo "[OK] LiveKit config created"
fi

# --- 4. Setup Voice Bridge ---
echo ""
echo "=== Step 4: Setting up Voice Bridge ==="

cd "$YARBIS_DIR/voice-bridge"

# Use Python 3.11 from Hermes install (via uv) — Python 3.9 lacks wheels for recent livekit-agents
PY311="$HOME/.hermes/hermes-agent/venv/bin/python3.11"
if [ ! -x "$PY311" ]; then
    echo "[ERROR] Python 3.11 not found at $PY311. Hermes install may have failed."
    exit 1
fi

# Recreate venv with Python 3.11 if missing or pinned to old version
if [ ! -d ".venv" ] || [ ! -x ".venv/bin/python3.11" ]; then
    rm -rf .venv
    "$PY311" -m venv .venv
fi
source .venv/bin/activate
python -m pip install -q --upgrade pip
pip install -q "livekit-agents[openai,silero,deepgram,cartesia,turn-detector]~=1.3" httpx
deactivate
echo "[OK] Voice Bridge dependencies installed (Python 3.11 + livekit-agents ~=1.3)"

# --- 5. Setup Particle UI ---
echo ""
echo "=== Step 5: Setting up Particle UI ==="

cd "$YARBIS_DIR/ui"
if [ -f "package.json" ]; then
    pnpm install
    echo "[OK] Particle UI dependencies installed"
else
    echo "[SKIP] No package.json found in ui/. Create the UI project first."
fi

# --- 6. Environment setup ---
echo ""
echo "=== Step 6: Environment configuration ==="

cd "$YARBIS_DIR"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "[CREATED] .env file — EDIT THIS with your API keys!"
    echo ""
    echo "  Required keys to fill in:"
    echo "  - ANTHROPIC_API_KEY (for Claude via Hermes)"
    echo "  - ELEVENLABS_API_KEY (already have it)"
    echo "  - DEEPGRAM_API_KEY"
    echo "  - GOOGLE_CLIENT_ID/SECRET (Gmail + Calendar)"
    echo ""
else
    echo "[OK] .env already exists"
fi

# --- 7. Configure Hermes personality ---
echo ""
echo "=== Step 7: Configuring Hermes personality ==="

# Copy YARBIS personality to Hermes config directory
HERMES_DIR="$HOME/.hermes"
if [ -d "$HERMES_DIR" ]; then
    cp "$YARBIS_DIR/hermes/personality.md" "$HERMES_DIR/personality.md" 2>/dev/null || true
    cp "$YARBIS_DIR/hermes/context.md" "$HERMES_DIR/context.md" 2>/dev/null || true
    echo "[OK] YARBIS personality configured in Hermes"
else
    echo "[SKIP] Hermes directory not found. Run 'hermes' first to initialize."
fi

# --- Done ---
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          YARBIS Installation Complete!        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API keys"
echo "  2. Run: hermes model   (to configure LLM provider)"
echo "  3. Run: bash scripts/start.sh   (to launch everything)"
echo ""
echo "Or test components individually:"
echo "  hermes                    # Test Hermes in CLI mode"
echo "  livekit-server --config livekit.yaml   # Start LiveKit"
echo "  cd voice-bridge && python main.py dev  # Start voice bridge"
echo "  cd ui && pnpm dev         # Start particle UI"
