# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **gripm** (anteriormente DevBoard). Este documento establece las normas operativas, el flujo ágil de entrega y los guardrails técnicos para agentes de IA (Antigravity, Cursor, Claude Code) y desarrolladores.

---

## 1. Flujo Ágil de Entrega (Dev → QA → Release Management → Prod)

Toda modificación de código debe estar asociada a una tarea en `backlog/tasks/`.

```
[Backlog / Sprint] 
   └── 1. Dev (doing → review): Implementa y tilda criterios (- [x]). Al terminar, deja en 'review'.
          └── 2. QA (ready): Audita pruebas y calidad. 'ready' es la entrega formal de desarrollo.
                 └── 3. Release Management (PO + Scrum Lead): Arma paquetes por valor con ítems 'ready'.
                        └── 4. Implementación en Prod (done): Commit/push de la versión. Pasa a 'done'.
```

- **Invariante Fundamental:** **No puede haber un ítem en producción que no esté en `done`**.
- **Desacople Sprint vs. Release:** Sprints y releases no tienen vinculación 1:1. Un release se compone exclusivamente por el **valor entregado** agrupando cualquier ítem disponible en `ready` (sea histórico o del sprint actual), con o sin sprint activo.
- **Trazabilidad Total:** Todo cambio de código —incluidos micro-refinamientos visuales o de texto— debe tener un criterio de aceptación (AC) o tarea asociada. Incluir el archivo `.md` de la tarea en el mismo commit que el código.
- **Sincronización Inmediata:** Al crear o modificar cualquier archivo en `backlog/tasks/`, ejecutar `npm run backlog:sync` en el mismo movimiento para regenerar `BACKLOG.md` y mantener la coherencia del consolidado con el árbol de tareas.

---

## 2. Ciclo de Vida de Sprints y Retrospectiva (Soberanía del PO)

- **Timebox:** En primera opción, el sprint finaliza cuando vence su plazo programado (duración fija), independientemente del progreso alcanzado. Lo no completado se re-planifica al siguiente sprint o vuelve al backlog.
- **Productividad Continua:** Si los ítems se entregan antes del vencimiento del timebox, el PO amplía el alcance incorporando nuevos ítems refinados del backlog para no pausar la productividad. Raramente un sprint concluye de forma anticipada.
- **Prohibido el Cierre o Retro por Deducción:** El agente **NUNCA** cierra un sprint ni ejecuta una retrospectiva por iniciativa propia. Ambas acciones se ejecutan **única y exclusivamente ante orden textual y explícita del PO** (ej: *"cerremos el sprint"*, *"hacé la retro del sprint"*).
- **Salidas Obligatorias de la Retro:** Actualizar gotchas en este `AGENTS.md`, actualizar skills relevantes y crear tareas en el backlog para mejoras identificadas.

---

## 3. Guardrails de Git y Commits

- **Cero Commits No Solicitados:** El agente NUNCA ejecuta `git commit` por deducción propia. Resolver un bug, tildar ACs o compilar NO autoriza a comitear. El agente solo prepara los cambios en el árbol de trabajo y los valida. El commit se ejecuta **única y exclusivamente ante orden textual explícita del usuario** (ej: *"hacé el commit"*, *"comiteá"*).
- **Hooks Pre-Commit No Invasivos:** Los hooks (`verify-backlog-sync.js`) verifican la integridad sin mutar el índice de Git, preservando staging y commits selectivos.

---

## 4. Pirámide de Verificación y Gate de Calidad

Antes de marcar cualquier tarea en `ready` o sellar un release, verificar en orden:

1. ✅ `npx tsc --noEmit` — 0 errores de tipado TypeScript estricto.
2. ✅ `npm test` — Suite unificada de pruebas (14 pasos secuenciales, código 0).
3. ✅ `npm run backlog:sync` && `npm run backlog:check` — Coherencia de tareas, versiones y releases (código 0).
4. ✅ `npm run publish:check` — Cero fugas de datos y superficie de distribución limpia.
5. ✅ `npm run build` — Bundle Vite y binarios standalone en `bin/`.

> [!IMPORTANT]
> **Gate de Calidad Verificable:** Antes de pasar a `ready`, cada criterio de aceptación tildado (`- [x]`) debe estar respaldado por un comando o verificación ejecutable (tests, types, grep). Prohibido tildar ACs por deducción o inspección superficial sin aserción real.

> [!CAUTION]
> **Anti-Browser-Subagent Ineficiente:** Prohibido invocar `browser_subagent` para verificar lógica, estado, contratos de API o persistencia que se auditan en milisegundos de forma headless. Se reserva **exclusivamente** para layouts visuales de CSS no deducibles estáticamente o pedido explícito del usuario.

---

## 5. Herramientas MCP y Scripts del Repositorio

Usar el servidor MCP de gripm (`npm run mcp` o `bin/gripm-mcp.js`) para interactuar con el backlog:
- `gripm_list_tasks` / `gripm_get_task`: Inspección eficiente de tareas y ACs.
- `gripm_update_task` / `gripm_bulk_update_tasks`: Mutaciones atómicas individuales y masivas.
- `gripm_list_releases`: Consulta de versiones released y unreleased.
- `gripm_sync_backlog`: Auto-reconciliación y regeneración de `BACKLOG.md`.

> [!CAUTION]
> **Regla Anti-Scripts Sueltos:** NUNCA ejecutar scripts de terminal ad-hoc (`node -e ...`, `node scripts/...` sueltos) ni comandos destructivos (`mv`, `rm` sobre tareas). Usar siempre los scripts de `package.json` (`npm test`, `npm run backlog:check`, `npm run backlog:sync`, `npm run build:bin`) o las herramientas MCP.

---

## 6. Gotchas Críticos y Reglas Técnicas Anti-Regresión

### Operación con Backlog y MCP
1. **`status` siempre como campo top-level en `gripm_update_task`:**
   ```json
   // ROTO: { "taskId": "DEV-001", "updates": { "status": "ready" } }
   // OK:   { "taskId": "DEV-001", "status": "ready" }
   ```
2. **`toggleAcIndex` secuencial:** NUNCA paralelizar llamadas sobre una misma tarea para evitar race conditions al tildar ACs.
3. **Cero marcadores de sección sin escapar (DEV-132):** NUNCA escribir marcadores HTML literales como `<!-- AC:BEGIN -->` dentro de descripciones o notas; usar texto neutro `[marcador AC:BEGIN]` o la forma escapada `<!\-- AC:BEGIN -->`.
4. **Slugs de tareas canónicos:** Nombres de archivo bajo el patrón canónico `DEV-XXX - slug-descriptivo.md` (o `dev-xxx - slug-descriptivo.md`). El prefijo numérico debe coincidir de forma unívoca con el `id` declarado en el frontmatter YAML. Prohibido doble guión (`dev--XXX`).
5. **Cero colisiones de ID:** Antes de crear una tarea, releer el ID máximo **en el momento de crearla** —no al inicio de la sesión: con dos agentes escribiendo en paralelo la ventana de colisión es real— y asignar `max + 1`. Verificar antes de cerrar: `grep -h '^id: DEV-' backlog/tasks/*.md | sort | uniq -d` debe devolver **vacío**.

### Ortogonalidad y Modelo de Datos
6. **Ortogonalidad estricta ("Anti-Label-Smuggling"):** Estado, Sprint, Release, Prioridad y Asignado son dimensiones 100% independientes. Prohibido usar "Backlog" como sprint, o deducir versiones fantasma como `vSprint 5` por pertenecer a un sprint. Si un campo no tiene valor, su valor visual canónico debe ser unívoco: `Sin Sprint`, `Sin Asignar` o `—`.
7. **Estado `ideas` de primera clase:** NUNCA normalizar o degradar `ideas` a `draft` en parsers o vistas.
8. **Simetría `sprint` vs `sprints`:** Al desasignar sprint en `ItemModal`, enviar `sprint: ""` y `targetSprint: ""` explícitamente para persistir la limpieza en disco.

### Entorno, Terminal y UI
9. **Sandbox de Terminal (Prohibido `curl http://localhost:4100`):** El sandbox bloquea peticiones HTTP locales. Para validar si el servidor escucha, usar `lsof -nP -iTCP:4100 -sTCP:LISTEN`. Para interactuar con la UI, usar `browser_subagent`.
10. **Estabilidad de layout (Zero-CLS):** El elemento raíz `html` debe declarar siempre `overflow-y: scroll; scrollbar-gutter: stable;` en `index.css`.
11. **Portales para modales y menús (DEV-129, DEV-130):** Renderizar overlays (`ConfirmModal`, dropdowns) vía `createPortal(..., document.body)` para evitar bugs de stacking context y containing block (`transform`, `backdrop-filter`).
12. **Cero `truncate` en confirmaciones:** En cajas de advertencia o confirmación, usar siempre `break-words text-[11px] leading-relaxed` para nunca cortar texto crítico con elipsis (`…`).
13. **Tipos de ítem dinámicos:** Emplear Proxy defensivo o `getItemTypeInfo` para renderizar cualquier clave personalizada sin provocar fallas.
14. **Anti-Suppression:** NUNCA apagar linters o ignorar tipos (`@ts-ignore`, `eslint-disable`) para tapar síntomas.
15. **Resolución absoluta de rutas:** Usar siempre `root: PKG_ROOT` y rutas absolutas en binarios CLI y plugins para ejecución global.
16. **Metodología Lean / Kanban preferente:** En `gripm`, el desarrollo se opera preferentemente bajo flujo continuo Kanban con una cola de backlog priorizada y entregas agrupadas por valor en Releases, evitando la sobrecarga artificial de timeboxes de sprint cuando el ritmo ágil es continuo.
17. **Gobernanza de configuración pública (`.gripm/config.json`):** El archivo `.gripm/config.json` del repositorio define la configuración canónica OSS (`"language": "en"`, `"theme": "dark"`, `"density": "comfortable"`, `"methodology": "kanban"`, `"enabledTabs": { "kanban": true, "sprint": true, "release": true }`). Prohibido commitear en este archivo configuraciones o preferencias de entorno personales del desarrollador.
