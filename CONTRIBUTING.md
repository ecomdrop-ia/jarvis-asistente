# Contributing to YARBIS

Thanks for considering a contribution! This document covers how to set up your environment, run the project, and submit changes.

## Quick checklist before submitting a PR

- [ ] You can run `bash scripts/healthcheck.sh` and see 6/6 OK
- [ ] You ran `cd ui && pnpm build` — build is clean
- [ ] You tested the change end-to-end (talked to YARBIS, verified the new behavior)
- [ ] You didn't commit any API keys (check `git diff` against `.env`)
- [ ] Your commits have descriptive messages

## Development setup

See [docs/SETUP.md](docs/SETUP.md) for the full setup. TL;DR:

```bash
git clone <fork>
cd yarbis-asistente
bash scripts/install.sh
cp .env.example .env  # fill in OPENAI_API_KEY, DEEPGRAM_API_KEY, ELEVENLABS_API_KEY
cd ui && pnpm install && cd ..
cd electron && npm install && cd ..
bash scripts/dev_all.sh
```

## Code style

### Python (`voice-bridge/`)

- Format with `ruff` (or just match existing style)
- Type hints encouraged, not strictly enforced
- Docstrings on every `@function_tool()` — and write them in Spanish, as **prompt instructions** (the LLM reads them)

### TypeScript / React (`ui/`)

- ESLint enforced (`pnpm lint`)
- Components are functional with hooks, no classes
- Tailwind v4 utility classes — use design tokens from `globals.css` over hardcoded values
- Each component has a brief JSDoc explaining its role in the HUD

### CSS

- All design tokens in `ui/src/app/globals.css`
- Don't introduce new colors without a token
- Avoid `style` inline mixed with Tailwind position classes — pick one (we've been burned by cascade conflicts)

## Adding a voice command

1. Open `voice-bridge/tools_advanced.py` (or `tools.py` for simple cases)
2. Add a function:

   ```python
   @function_tool()
   async def my_tool(arg: str) -> str:
       """Spanish docstring describing exactly when Elkin should trigger this. \
   Include 4-6 example phrases the LLM can match against."""
       # implementation
       return "respuesta corta para que YARBIS la lea"
   ```

3. Append it to `ALL_TOOLS` (or `ADVANCED_TOOLS`)
4. Update `YARBIS_INSTRUCTIONS` in `main.py` so the LLM has explicit triggers
5. Save — `watchfiles` reloads the worker
6. Test by speaking the trigger phrase

## Adding a UI component

1. Create `ui/src/components/MyComponent.tsx`
2. Use design tokens (`--accent`, `--fs-body`, etc.)
3. Place it correctly in the z-index hierarchy (see [CLAUDE.md](CLAUDE.md#4-ui-components-and-z-index-hierarchy))
4. Mount it in `VoiceRoom.tsx`

## What we're looking for

### Especially welcome

- 🌍 Localization (Mexican Spanish, English, etc.) — adapt `YARBIS_INSTRUCTIONS` and ElevenLabs voice
- 🔌 New MCP integrations (Linear, Stripe, etc.) via Hermes
- 🎨 Theme variants (dark cyan is default — Mark VII gold, Mark XLII blue, Stealth black)
- 🎙️ Wake-word implementation (Picovoice Porcupine in `voice-bridge/`)
- 🐧 Linux / Windows support (the voice-bridge is portable; Electron config + scripts need adapters)
- 📱 Mobile companion (talk to YARBIS from your phone — would need a public LiveKit endpoint)

### Less welcome (without prior discussion)

- Major architecture changes to the voice loop (LiveKit + OpenAI + Deepgram + ElevenLabs is intentional — see CLAUDE.md)
- Adding a database (we deliberately keep state in-memory + filesystem)
- New SaaS dependencies (the project's value prop is "fully self-hosted")

## Reporting issues

When opening an issue, include:

- Output of `bash scripts/healthcheck.sh`
- Your macOS version (`sw_vers`)
- Last ~50 lines of the failing log (terminal output of the failed component)
- Steps to reproduce

## Commit messages

We use conventional-ish commits:

```
feat: add take_screenshot voice tool
fix: clamp audio.volume to [0,1] to avoid IndexSizeError
docs: update SETUP.md with M1 Mac note
refactor: move ducking logic to a custom hook
chore: bump electron to 33.5
```

## License

By contributing, you agree your contributions will be licensed under the MIT License (the same as the rest of the project).
