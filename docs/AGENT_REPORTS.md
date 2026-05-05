# YARBIS — Reportes entre agentes

YARBIS puede leer y consolidar información que **otros agentes** ya generaron — Claude Code, Hermes, n8n, GitHub Actions, cron jobs, etc. Esto te permite preguntarle por voz "¿qué pasó hoy con mis bots?" y obtener un briefing real.

## Filosofía

YARBIS no es un agente más compitiendo por atención. Es la **interfaz de voz unificada** sobre todos tus agentes existentes. Cada agente sigue haciendo su trabajo; YARBIS lee sus outputs y te los lee de vuelta cuando los necesitas.

## Las 4 fuentes que YARBIS lee

### 1. Git activity (automático)
Lee commits recientes de todos los proyectos en `~/projects/ecomdrop/`. No requiere setup — funciona desde el día 1.

### 2. Claude Code projects (automático)
Detecta qué proyectos abriste con Claude Code recientemente vía las carpetas en `~/.claude/projects/`. Sin setup.

### 3. Hermes sessions (automático)
Lee las sesiones recientes de Hermes Agent en `~/.hermes/sessions/`. Extrae tu primer mensaje de cada sesión como contexto. Sin setup.

### 4. Reportes manuales (`~/.yarbis/reports/`)
**Aquí está el truco**: cualquier agente externo puede dejar un reporte en `~/.yarbis/reports/YYYY-MM-DD/<agent>__<topic>__<HHMM>.md` y YARBIS lo lee automáticamente.

Ejemplos de quién puede dejar reportes:
- **n8n workflow** que sincroniza Shopify cada hora → "ya sincronicé X pedidos"
- **GitHub Actions** después de un deploy → "ecomdrop_connector deployed to Railway"
- **Cron job** que monitorea stock → "alerta: 3 productos con stock <5"
- **Claude Code hook** post-task → "terminé la feature X, falta revisar Y"
- **Tú mismo** — diciéndole a YARBIS por voz "guarda nota: Z"

## Comandos de voz

| Frase | Acción |
|---|---|
| *"Yarbis, dame el briefing"* | Resumen completo (git + Claude Code + Hermes + reportes) |
| *"Yarbis, qué pasó hoy"* | Mismo |
| *"Yarbis, novedades de mis agentes"* | Mismo |
| *"Yarbis, qué reportes tengo"* | Lista solo los reportes manuales |
| *"Yarbis, léeme el reporte de X"* | Lee un reporte específico completo |
| *"Yarbis, recuérdame que…"* | YARBIS guarda una nota en tus reportes |
| *"Yarbis, apúntale a Elkin que…"* | Mismo |

## Formato del reporte

Markdown con frontmatter YAML simple:

```markdown
---
agent: claude-code
project: ecomdrop_connector
timestamp: 2026-05-05T14:30:00
type: development
priority: high
---

# Resumen del trabajo

Hoy implementé:
- X
- Y

Próximos pasos:
- Z
```

**Campos**:
- `agent` (requerido): quién escribió el reporte. Ej: `claude-code`, `hermes`, `n8n-shopify-sync`, `github-actions`
- `project` (opcional): proyecto al que se refiere. Default: `general`
- `timestamp` (opcional): ISO 8601 cuando se generó. Default: ahora
- `type` (opcional): `development`, `deploy`, `alert`, `metric`, `note`. Default: `update`
- `priority` (opcional): `normal`, `high`, `urgent`. Default: `normal`. Los `high`/`urgent` se destacan en el briefing.

## Cómo escribir reportes desde otros agentes

### Desde Python

```python
from agent_reports import write_manual_report

write_manual_report(
    agent="n8n-shopify-sync",
    title="Sincronización completada",
    body="Procesé 47 pedidos nuevos. 3 con stock crítico — ver Notion.",
    project="ecomdrop_connector",
    report_type="alert",
    priority="high",
)
```

### Desde un script bash (sin Python)

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
mkdir -p ~/.yarbis/reports/$DATE

cat > ~/.yarbis/reports/$DATE/cron__stock-alert__$TIME.md <<EOF
---
agent: cron-stock-monitor
project: ecomdrop_connector
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
type: alert
priority: high
---

# Alerta de stock crítico

3 productos con stock < 5 unidades:
- SKU-001: Pantaloneta hombre — 2 unidades
- SKU-042: Tenis blanco — 4 unidades
- SKU-103: Camiseta básica — 1 unidad
EOF
```

### Desde n8n

Usa el nodo "Write file" con:
- File path: `={{ $now.format('yyyy-MM-dd') }}/n8n__$workflow__{{ $now.format('HHmm') }}.md` con base `~/.yarbis/reports/`
- Content: el frontmatter + body

### Desde GitHub Actions

```yaml
- name: Notify YARBIS
  run: |
    DATE=$(date +%Y-%m-%d)
    TIME=$(date +%H%M)
    mkdir -p ~/.yarbis/reports/$DATE
    cat > ~/.yarbis/reports/$DATE/github__deploy-${{ github.event.repository.name }}__$TIME.md <<EOF
    ---
    agent: github-actions
    project: ${{ github.event.repository.name }}
    timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
    type: deploy
    priority: normal
    ---

    # Deploy a Railway exitoso

    Branch: ${{ github.ref_name }}
    Commit: ${{ github.sha }}
    Tiempo: ${{ steps.deploy.outputs.duration }}
    EOF
```

## Ejemplo de uso

**Tú (a YARBIS):**
> "Yarbis, dame el briefing"

**YARBIS responde:**
> "Aquí va el briefing de hoy:
>
> **Reportes de otros agentes (3):**
> · [HIGH] cron-stock-monitor sobre ecomdrop_connector: 3 productos con stock crítico
> · github-actions sobre ecomdrop_connector: Deploy a Railway exitoso, 2 min
> · n8n-shopify-sync sobre ecomdrop_connector: 47 pedidos nuevos sincronizados
>
> **Actividad git (9 commits, 3 proyectos):**
> · ecomdrop_connector: 'feat: enriquecer reconciliación', 'fix: stock validation'…
> · yarbis-asistente: 'feat: add agent reports system'…
>
> **Proyectos activos en Claude Code:**
> · paperclip — hace 15 segundos
> · ecomdrop_connector — hace 2 horas
>
> **Sesiones recientes de Hermes:**
> · hace 23h: 'Hola Yarbis'"

## Ideas para empezar

Setups básicos que dan ROI inmediato:

1. **Cron diario** que escribe un reporte con métricas de Ecomdrop (pedidos, ingresos, stock crítico) cada mañana a las 7 AM
2. **GitHub Action** que escribe un reporte cuando se mergea un PR
3. **Hook de Claude Code** (Stop hook) que escribe un breve resumen de lo que hizo en cada sesión
4. **n8n workflow** que cuando llega un email importante escribe un reporte high-priority

Con esos 4 corriendo, tu briefing matutino se vuelve **el panel de control de tu negocio** — sin que toques nada.

## Limpieza

Los reportes viejos se acumulan. Para mantener el directorio limpio, agrega un cron:

```bash
# crontab -e
0 3 * * * find ~/.yarbis/reports -mtime +30 -type f -name "*.md" -delete
```

(borra reportes mayores a 30 días, a las 3 AM cada día)
