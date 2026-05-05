# Guia de Herramientas MCP — YARBIS

## Que son los MCPs

MCP (Model Context Protocol) es un estandar de Anthropic que permite conectar herramientas externas a modelos de IA. YARBIS usa MCPs para darle a Claude acceso a Gmail, Calendar, Notion, Supabase y todos los demas servicios.

LiveKit Agents tiene soporte nativo para MCP: con una linea de configuracion, el agente carga las herramientas y Claude las puede invocar durante la conversacion.

---

## MCPs Configurados

### 1. Gmail MCP

**Paquete**: `@anthropic/gmail-mcp` (o equivalente)
**Autenticacion**: OAuth2 con Google

**Herramientas disponibles:**

| Tool | Que hace | Ejemplo de uso por voz |
|---|---|---|
| `search_threads` | Buscar emails por query | "Yarbis, busca emails de Shopify esta semana" |
| `read_message` | Leer un email especifico | "Leeme el email de Shopify Support" |
| `create_draft` | Crear borrador | "Responde que ya estamos migrados" |
| `list_labels` | Ver etiquetas/carpetas | "Cuantos emails tengo sin leer?" |
| `list_drafts` | Ver borradores pendientes | "Tengo algun borrador sin enviar?" |

**Interacciones tipicas:**
```
Usuario: "Yarbis, que hay en mi correo?"
Yarbis: "Tienes 7 emails nuevos. 2 son de Shopify, 1 de un cliente 
         preguntando por precios, y 4 notificaciones de GitHub. 
         El de Shopify parece importante, es sobre cambios en su API. 
         ¿Te lo leo?"

Usuario: "Si, leemelo"
Yarbis: [lee resumen del email]
        "Quieres que prepare una respuesta?"

Usuario: "Si, dile que ya estamos al dia con la migracion"
Yarbis: → gmail.create_draft(...)
        "Borrador listo en tu bandeja. Revisalo cuando quieras."
```

---

### 2. Google Calendar MCP

**Paquete**: `@anthropic/google-calendar-mcp`
**Autenticacion**: OAuth2 con Google

| Tool | Que hace | Ejemplo |
|---|---|---|
| `list_events` | Ver eventos de un dia/rango | "Que tengo manana?" |
| `create_event` | Crear evento | "Agendame reunion a las 3pm" |
| `update_event` | Modificar evento | "Mueve la reunion a las 4" |
| `delete_event` | Cancelar evento | "Cancela la reunion de manana" |
| `suggest_time` | Buscar horarios libres | "Cuando tengo libre esta semana?" |

**Interacciones tipicas:**
```
Usuario: "Yarbis, como esta mi dia?"
Yarbis: "Hoy tienes 3 cosas: standup a las 9, almuerzo con Juan a las 12:30, 
         y call con Dropi a las 3pm. De 10 a 12 y de 4 en adelante estas libre."

Usuario: "Bloquea de 4 a 6 para grabar contenido"
Yarbis: → calendar.create_event(...)
        "Listo, te bloquee 4 a 6pm para grabar. Te recuerdo 30 minutos antes?"
```

---

### 3. Notion MCP

**Paquete**: `@anthropic/notion-mcp`
**Autenticacion**: Notion API Key

| Tool | Que hace | Ejemplo |
|---|---|---|
| `notion-search` | Buscar paginas/bases | "Busca las tareas pendientes" |
| `notion-create-pages` | Crear pagina | "Crea una nota sobre la reunion" |
| `notion-update-page` | Actualizar propiedades | "Marca esa tarea como completada" |
| `notion-fetch` | Leer contenido de pagina | "Leeme el brief del proyecto X" |

---

### 4. Supabase MCP (Ecomdrop)

**Paquete**: `@supabase/mcp`
**Autenticacion**: Supabase URL + Service Key

Este es el MCP mas critico para Ecomdrop. Permite consultar directamente la base de datos del SaaS.

| Tool | Que hace | Ejemplo |
|---|---|---|
| `execute_sql` | Ejecutar queries SQL | "Cuantos pedidos hay hoy?" |
| `list_tables` | Ver tablas disponibles | "Que datos tiene la base?" |
| `get_logs` | Ver logs de Edge Functions | "Hay errores en los webhooks?" |

**Interacciones tipicas:**
```
Usuario: "Yarbis, como van los pedidos?"
Yarbis: → supabase.execute_sql("SELECT count(*), sum(total) FROM orders 
           WHERE created_at >= current_date")
        "Van 52 pedidos hoy por $3,800 USD. El producto estrella es el kit 
         de accesorios con 18 unidades. ¿Quieres el desglose por proveedor?"

Usuario: "Si, y dime si hay algo con stock bajo"
Yarbis: → supabase.execute_sql("SELECT name, stock FROM products 
           WHERE stock < min_stock")
        "3 productos debajo del minimo: 
         - Funda Premium: 5 unidades (minimo 20)
         - Cable USB-C: 8 unidades (minimo 15)  
         - Protector pantalla: 3 unidades (minimo 10)
         Quieres que le avise al proveedor?"
```

---

### 5. GitHub MCP (via wrapper)

| Tool | Que hace | Ejemplo |
|---|---|---|
| `repos.list` | Listar repos | "Cuantos repos tenemos?" |
| `prs.list` | PRs abiertos | "Hay PRs pendientes?" |
| `issues.list` | Issues abiertas | "Que bugs hay reportados?" |
| `commits.recent` | Ultimos commits | "Que se hizo ayer en el connector?" |

---

### 6. Brave Search MCP

**Paquete**: `@anthropic/brave-search-mcp`

| Tool | Que hace | Ejemplo |
|---|---|---|
| `web_search` | Buscar en internet | "Busca novedades de Shopify API" |

---

### 7. Home Assistant MCP (custom)

MCP server custom que se comunica con la API REST de Home Assistant.

| Tool | Que hace | Ejemplo |
|---|---|---|
| `lights.on/off/dim` | Controlar luces | "Enciende las luces del lab" |
| `lights.color` | Cambiar color | "Luces azules" |
| `music.play` | Reproducir musica | "Pon algo para concentrarse" |
| `music.pause/skip` | Control de musica | "Salta esta cancion" |
| `scene.activate` | Activar escena | "Modo trabajo" / "Modo descanso" |

**Escenas predefinidas:**
```
modo_trabajo:   Luces azul frio 60%, Spotify "Deep Focus", notif silenciadas
modo_descanso:  Luces calidas 30%, Spotify "Chill", notif normales
modo_buildlog:  Luces rojo suave, mic activado, grabacion lista
modo_off:       Todo apagado
```

---

### 8. Filesystem MCP

**Paquete**: `@anthropic/filesystem-mcp`
**Ruta**: `/Users/ecomdropsolutions/projects/ecomdrop`

| Tool | Que hace | Ejemplo |
|---|---|---|
| `read_file` | Leer archivo | "Lee el README del connector" |
| `search_files` | Buscar archivos | "Donde esta el config de deploy?" |
| `list_directory` | Listar carpeta | "Que hay en el proyecto remotion?" |

---

## Seguridad

- Los MCP servers corren localmente en la Mac Mini (no expuestos a internet)
- Las API keys se guardan en `.env` (gitignored)
- Supabase usa Service Key con RLS desactivado solo para queries de lectura
- Gmail/Calendar usan OAuth2 con scope minimo necesario
- YARBIS nunca lee en voz alta API keys, passwords o datos sensibles
- Filesystem MCP tiene acceso solo a ~/projects/ecomdrop/ (no al sistema completo)
