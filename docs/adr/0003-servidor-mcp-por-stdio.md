# 0003 - Servidor MCP sobre stdio con núcleo de persistencia compartido

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-13
- **Tareas:** `dev-023`, `dev-025`, `DEV-102`, `DEV-249`
- **Reemplaza:** - 

---

## Contexto

gripm tiene dos consumidores del mismo estado: la UI web y los agentes de IA. Los agentes no deben abrir un navegador ni aprender una API HTTP con semántica de UI; necesitan una interfaz estable, tipada y validada que les permita leer y mutar el backlog de forma programática. El protocolo estándar para eso es **MCP** (Model Context Protocol), que el proyecto expone mediante un segundo binario, `gripm-mcp`.

El riesgo principal de este diseño es la **divergencia de reglas**: si la UI y el agente pueden dejar una tarea en estados distintos, el backlog se vuelve incoherente y el guard de sincronización empieza a rechazar tareas válidas.

## Decision Drivers

1. **Un solo núcleo de reglas:** UI y agente deben aplicar exactamente la misma validación y las mismas invariantes.
2. **Integración nativa del cliente MCP:** que funcione en Cursor, Claude Code y Antigravity sin adaptadores.
3. **Superficie mínima:** pocas herramientas, bien delimitadas, con validación estricta de parámetros.
4. **Sin red:** el agente no debe abrir un puerto para operar el backlog.

## Opciones consideradas

### Opción A - Exponer el backlog como endpoints HTTP y que cada agente escriba su propio cliente

- **A favor:** cero trabajo de servidor MCP, reutilización de la API existente.
- **En contra:** cada cliente reinventa validaciones y manejo de errores; los contratos son implícitos y divergen; el agente depende de que haya un servidor levantado.
- **Veredicto:** descartada. Es exactamente la fuente de divergencia que el driver 1 busca eliminar.

### Opción B - Servidor MCP sobre HTTP/SSE

- **A favor:** puede compartir proceso con la UI, útil para clientes remotos o multiusuario.
- **En contra:** requiere puerto, gestión de sesiones y autenticación; agrega superficie de red a una herramienta local monousuario.
- **Veredicto:** descartada. El producto es monousuario local (ver [ADR-0004](0004-daemon-local-sin-autenticacion-http.md)); el transporte HTTP no aporta nada aquí.

### Opción C - Servidor MCP JSON-RPC 2.0 sobre `stdio`

- **A favor:** es el transporte nativo del protocolo y lo soporta el ciclo de vida del proceso del cliente; no requiere puertos ni sesiones; valida entradas de forma estricta en el borde.
- **En contra:** no es consultable desde un navegador ni desde otro proceso salvo por el spawn del binario.
- **Veredicto:** adoptada.

## Decisión

**El acceso de agentes se expone como un servidor MCP JSON-RPC 2.0 sobre `stdio`**, implementado en [`scripts/mcp-server.ts`](../../scripts/mcp-server.ts) y lanzado por [`bin/gripm-mcp.js`](../../bin/gripm-mcp.js). `stdout` es el canal de respuestas: **nada más puede escribir en `stdout`**.

El servidor expone 12 herramientas:

| Grupo | Herramientas |
| :--- | :--- |
| Inspección | `gripm_list_tasks`, `gripm_get_task`, `gripm_get_stats`, `gripm_list_projects`, `gripm_list_releases`, `gripm_list_retros` |
| Mutación | `gripm_create_task`, `gripm_update_task`, `gripm_bulk_update_tasks` |
| Operaciones | `gripm_sync_backlog`, `gripm_export_backlog`, `gripm_create_retro` |

Reglas que quedan fijadas por esta decisión:

1. **Validación estricta en el borde:** todo parámetro (`limit`, `offset`, `taskId`, `toggleAcIndex`) se valida y se acota antes de tocar el disco, y las rutas recibidas se validan con contención estricta contra `--repo`.
2. **Mismo núcleo de dominio que la UI:** las herramientas reutilizan los servicios de `server/` y el parser Markdown; no hay una segunda implementación de las invariantes.
3. **La sincronización nunca tilda criterios de aceptación por deducción:** `gripm_sync_backlog` opera con `autoFix: false` por defecto y jamás convierte `- [ ]` en `- [x]` sin verificación real.
4. **El servidor MCP no persiste comandos en el frontmatter** y **jamás** lee ni ejecuta un `verifyCommand` desde el disco: el comando se ejecuta sólo si el agente lo pasa explícitamente como argumento, con timeout de 15 s.

## Consecuencias

### Positivas

- Un agente opera el backlog con la misma semántica que la UI, sin posibilidad de divergencia de estados.
- La instalación es un binario más del paquete: `bin: { "gripm-mcp": "bin/gripm-mcp.js" }`.
- La superficie de red del producto no crece con el uso por agentes.

### Negativas

- El transporte `stdio` no es inspeccionable con un browser ni con `curl`, y obliga a que los logs vayan a `stderr`.
- Una herramienta mal implementada puede mutar el backlog sin visibilidad humana: por eso el estado canónico terminal del desarrollo es `ready` y el `done` sólo lo alcanza el despliegue.

### Neutras o a vigilar

- El número de herramientas crece con cada capacidad nueva y hay que mantenerlo legible; el playbook documenta las herramientas en `README.md` como contrato público.

## Referencias

- [`README.md`](../../README.md) - tabla de herramientas MCP.
- [`AGENTS.md`](../../AGENTS.md) §7 - gotchas de MCP (validación estricta, `autoFix: false`, prohibición de leer comandos del frontmatter).
- `backlog/tasks/dev-023 - gestin-e-inspeccin-de-releases-en-mcp-devboardlist.md`.