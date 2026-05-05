# Contribuir a YARBIS

¡Gracias por considerar una contribución! Este documento cubre cómo configurar tu entorno, correr el proyecto y enviar cambios.

## Checklist rápido antes de enviar un PR

- [ ] Puedes correr `bash scripts/healthcheck.sh` y ver 6/6 OK
- [ ] Corriste `cd ui && pnpm build` — el build está limpio
- [ ] Probaste el cambio de punta a punta (le hablaste a YARBIS, verificaste el comportamiento nuevo)
- [ ] No commiteaste API keys (revisa `git diff` contra `.env`)
- [ ] Tus commits tienen mensajes descriptivos

## Setup de desarrollo

Ve [docs/SETUP.md](docs/SETUP.md) para el setup completo. TL;DR:

```bash
git clone <fork>
cd yarbis-asistente
bash scripts/install.sh
cp .env.example .env  # completa OPENAI_API_KEY, DEEPGRAM_API_KEY, ELEVENLABS_API_KEY
cd ui && pnpm install && cd ..
cd electron && npm install && cd ..
bash scripts/dev_all.sh
```

## Estilo de código

### Python (`voice-bridge/`)

- Formatea con `ruff` (o solo replica el estilo existente)
- Type hints son recomendados, no estrictamente obligatorios
- Docstrings en cada `@function_tool()` — y escríbelos en español, como **instrucciones de prompt** (el LLM los lee)

### TypeScript / React (`ui/`)

- ESLint enforced (`pnpm lint`)
- Componentes funcionales con hooks, sin clases
- Utility classes de Tailwind v4 — usa los design tokens de `globals.css` antes que valores hardcoded
- Cada componente tiene un JSDoc breve explicando su rol en el HUD

### CSS

- Todos los design tokens en `ui/src/app/globals.css`
- No introduzcas colores nuevos sin un token
- Evita mezclar `style` inline con classes de posición de Tailwind — elige uno (nos quemamos con conflictos de cascade)

## Agregar un comando de voz

1. Abre `voice-bridge/tools_advanced.py` (o `tools.py` para casos simples)
2. Agrega una función:

   ```python
   @function_tool()
   async def my_tool(arg: str) -> str:
       """Docstring en español describiendo exactamente cuándo Elkin debería \
   disparar esto. Incluye 4-6 frases de ejemplo que el LLM pueda matchear."""
       # implementación
       return "respuesta corta para que YARBIS la lea"
   ```

3. Agrégalo a `ALL_TOOLS` (o `ADVANCED_TOOLS`)
4. Actualiza `YARBIS_INSTRUCTIONS` en `main.py` para que el LLM tenga triggers explícitos
5. Guarda — `watchfiles` recarga el worker
6. Prueba diciendo la frase trigger

## Agregar un componente al UI

1. Crea `ui/src/components/MyComponent.tsx`
2. Usa los design tokens (`--accent`, `--fs-body`, etc.)
3. Posiciónalo correctamente en la jerarquía de z-index (ver [CLAUDE.md](CLAUDE.md#4-componentes-del-ui-y-jerarquía-z-index))
4. Móntalo en `VoiceRoom.tsx`

## Lo que estamos buscando

### Especialmente bienvenido

- 🌍 Localización (español mexicano, inglés, etc.) — adapta `YARBIS_INSTRUCTIONS` y la voz de ElevenLabs
- 🔌 Nuevas integraciones MCP (Linear, Stripe, etc.) vía Hermes
- 🎨 Variantes de tema (cyan oscuro es default — Mark VII gold, Mark XLII azul, Stealth negro)
- 🎙️ Implementación de wake-word (Picovoice Porcupine en `voice-bridge/`)
- 🐧 Soporte Linux / Windows (el voice-bridge es portable; config de Electron + scripts necesitan adaptadores)
- 📱 App móvil compañera (hablarle a YARBIS desde tu celular — necesitaría un endpoint LiveKit público)

### Menos bienvenido (sin discusión previa)

- Cambios mayores de arquitectura al voice loop (LiveKit + OpenAI + Deepgram + ElevenLabs es intencional — ver CLAUDE.md)
- Agregar una base de datos (deliberadamente mantenemos estado en memoria + filesystem)
- Nuevas dependencias SaaS (la propuesta de valor del proyecto es "100% self-hosted")

## Reportar issues

Cuando abras un issue, incluye:

- Output de `bash scripts/healthcheck.sh`
- Tu versión de macOS (`sw_vers`)
- Últimas ~50 líneas del log que falla (output de terminal del componente caído)
- Pasos para reproducir

## Mensajes de commit

Usamos commits estilo conventional:

```
feat: add take_screenshot voice tool
fix: clamp audio.volume to [0,1] to avoid IndexSizeError
docs: update SETUP.md with M1 Mac note
refactor: move ducking logic to a custom hook
chore: bump electron to 33.5
```

## Licencia

Al contribuir, aceptas que tus contribuciones se licencien bajo MIT (la misma del resto del proyecto).
