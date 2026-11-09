# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **gripm**. Este documento establece las normas operativas, el flujo ágil de entrega y los guardrails técnicos para agentes de IA (Antigravity, Cursor, Claude Code) y desarrolladores.

---

## 0. Ecosistema Gripm y Dogfooding de Gripm Playbook (DEV-250)

- **Gripm Board (`@gripm/board`, este repositorio):** Es el producto de software (Cockpit visual web, motor de Markdown, servidor MCP y CLI). El paquete publicado en npm distribuye exclusivamente la aplicación, el servidor MCP y la skill de conexión `.agents/skills/gripm/`.
- **Gripm Playbook (`@gripm/playbook`, repositorio `gripm-playbook`):** Es el framework metodológico autónomo para equipos de agentes (roles, State Machine, Pirámide de Verificación y auditoría de UX).
- **Dogfooding en este repositorio:** Para desarrollar Gripm Board, el equipo adopta metodológicamente Gripm Playbook. Por esta razón conviven en `.agents/skills/` los roles del playbook (`principal-engineer`, `qa-auditor`, `pm-orchestrator`, etc.), gobernados por `.gripm/playbook-lock.json`. No forman parte del producto distribuido de Gripm Board y están excluidos del tarball de producción de npm.

---

## 1. Flujo Ágil de Entrega (Backlog [draft] → Dev [doing] → QA [ready] → Release Management → Prod [done])

Toda modificación de código debe estar asociada a una tarea en `backlog/tasks/`.

```
[Backlog / Pool]
   └── 0. Backlog (draft / ideas): Tarea formalmente especificada y estimada con ACs.
          └── 1. Dev (doing → review): Implementa y tilda criterios (- [x]). Al terminar, pasa a 'review'.
                 └── 2. QA (ready): Audita pruebas y calidad. 'ready' es la entrega formal de desarrollo.
                        └── 3. Release Management: Arma paquetes por valor entregado con ítems 'ready'.
                               └── 4. Despliegue en Prod (done): Publicación de release. Pasa a 'done'.
```

- **El Backlog no es un estado:** Es la dimensión de planificación y el inventario de trabajo no iniciado. Toda tarea en el Backlog tiene asignado legítimamente el estado canónico `draft` (o `ideas` si es descubrimiento).
- **Línea de Llegada del Desarrollador (`ready`):** La meta terminal del desarrollador y del agente es `ready`. Queda terminantemente prohibido marcar `done` durante el desarrollo.
- **Invariante Fundamental:** **No puede haber un ítem en producción que no esté en `done`, ni un ítem en `done` que no esté desplegado en producción**. El paso de `ready` a `done` lo realiza el empaquetado/despliegue del release (Release Assembler).
- **Procedimiento Canónico de Release (`release-management`):** Todo corte de versión, determinación SemVer, compilación de changelog y ejecución de deploy hooks se rige exclusivamente por la skill [`.agents/skills/release-management/SKILL.md`](.agents/skills/release-management/SKILL.md). Es el único rol autorizado para ejecutar la transición de `ready` a `done` tras comprobar el despliegue real en producción.
- **Despliegue Completo de Producción (Anti-Dev-Production-Deploy, DEV-340):** El cierre de una versión no concluye con el push del tag o el tarball de npm. Si el proyecto mantiene una instancia web en producción (Vercel Sandbox `https://gripm.vercel.app`), es **obligatorio ejecutar la promoción de producción única y exclusivamente desde el trunk canónico `main`**:
  ```bash
  git checkout main
  npm run deploy:prod
  git checkout dev
  ```
  `npm run deploy:prod` cuenta con un guardrail mecánico (`scripts/deploy-prod.js`) que aborta de inmediato si se invoca desde `dev` o con el árbol sucio, garantizando que Vercel solo reciba builds autorizados y etiquetados en `main`.
- **Desacople Sprint vs. Release:** Sprints y releases no tienen vinculación 1:1. Un release se compone exclusivamente por el **valor entregado** agrupando cualquier ítem disponible en `ready` (sea histórico o del sprint actual), con o sin sprint activo.
- **Trazabilidad Total:** Todo cambio de código (incluidos micro-refinamientos visuales o de texto) debe tener un criterio de aceptación (AC) o tarea asociada. Incluir el archivo `.md` de la tarea en el mismo commit que el código.
- **Sincronización Inmediata:** Al crear o modificar cualquier archivo en `backlog/tasks/`, ejecutar `npm run backlog:sync` en el mismo movimiento para regenerar `BACKLOG.md` y mantener la coherencia del consolidado con el árbol de tareas.

---

## 2. Ciclo de Vida de Sprints y Retrospectiva (Soberanía del PO)

- **Timebox:** En primera opción, el sprint finaliza cuando vence su plazo programado (duración fija), independientemente del progreso alcanzado. Lo no completado se re-planifica al siguiente sprint o vuelve al backlog.
- **Productividad Continua:** Si los ítems se entregan antes del vencimiento del timebox, el PO amplía el alcance incorporando nuevos ítems refinados del backlog para no pausar la productividad. Raramente un sprint concluye de forma anticipada.
- **Prohibido el Cierre o Retro por Deducción:** El agente **NUNCA** cierra un sprint ni ejecuta una retrospectiva por iniciativa propia. Ambas acciones se ejecutan **única y exclusivamente ante orden textual y explícita del PO** (ej: *"cerremos el sprint"*, *"hacé la retro del sprint"*).
- **Salidas Obligatorias de la Retro (Progressive Disclosure):** Convertir aprendizajes en: (1) tests o reglas estáticas mecánicas, (2) invariantes en `.agents/rules/gripm-domain.md`, o (3) mejoras a skills de rol. Prohibido agregar micro-gotchas a este `AGENTS.md`, preservando su rol de enrutador liviano.

---

## 3. Política Pragmática de Commits y Guardrails de Git

- **Cadencia Limpia (1 Tarea = 1 Commit Consolidado):** Durante la exploración y el desarrollo no se generan micro-commits ruidosos. Al certificar la tarea y dejarla en `ready` con la Pirámide de Verificación en verde, se realiza un único commit consolidado que incluye el código y el archivo `.md` de la tarea.
- **Soberanía y Confirmación del Usuario:** El commit se ejecuta con confirmación o pedido explícito del usuario (`feat(DEV-XXX): ...` o `fix(DEV-XXX): ...`), manteniendo trazabilidad unívoca con el ID de la tarea.
- **Hooks Pre-Commit como Salvaguarda Mecánica:** Los hooks (`verify-backlog-sync.js` y `verify-changes.js`) actúan como barrera física de calidad: abortan mecánicamente cualquier commit si el backlog está desincronizado, si hay archivos sin trackear o inconsistencias en tareas, sin imponer burocracia manual adicional al desarrollador.
- **Multi-Agent Parallelism & Dynamic Peer Discovery:**
 - Prohibido `git checkout` o `git restore` en el working tree principal cuando otro agente está trabajando en el repositorio.
 - **Pre-Flight Concurrency Probe:** Antes de modificar archivos o ejecutar comandos de Git, consultar el backlog (`status: doing`) y `git status --porcelain`. Si hay un ítem en `doing` con `claimed_by` ajeno (formato `<provider>:<id>`, ej. `antigravity:<id>`, `cursor:<id>`, `human:<id>`), prohibido revertir o limpiar el árbol de trabajo.
 - **Handshake Autónomo & Protocolo Cross-Harness:** Si comparten runtime (ej. `antigravity:`), contactar al par directamente vía `send_message(Recipient: claimed_by)`. Si son de proveedores heterogéneos, respetar el lease, evitar RPC fallido y auto-aislarse de inmediato en `git worktree` (`git worktree add -b <branch> ../<repo>-<task>`) informando al usuario en chat.

---

## 4. Pirámide de Verificación y Gate de Calidad

Antes de marcar cualquier tarea en `ready` o sellar un release, verificar en orden:

1. ✅ `npx tsc --noEmit` - 0 errores de tipado TypeScript estricto.
2. ✅ `npm test` - Suite unificada de pruebas (18 pasos secuenciales, código 0). Reporta duración por paso y nombra el paso culpable si algo se cuelga.
3. ✅ `npm run test:linux` - **Obligatorio si el cambio toca runtime, CI, I/O o el sistema de archivos.** Corre la suite completa en un contenedor Linux para validar consistencia de plataforma (DEV-190).
4. ✅ `npm run backlog:sync` && `npm run backlog:check` - Coherencia de tareas, versiones y releases (código 0).
5. ✅ `npm run publish:check` - Cero fugas de datos y superficie de distribución limpia.
6. ✅ `npm run build` - Bundle Vite y binarios standalone en `bin/`.
7. ✅ `node scripts/verify-changes.js --all` - Defectos estructurales y codificación en todo el árbol (obligatorio antes de merge o release).

> [!IMPORTANT]
> **Gate de Calidad Verificable:** Antes de pasar a `ready`, cada criterio de aceptación tildado (`- [x]`) debe estar respaldado por un comando o verificación ejecutable (tests, types, grep). Prohibido tildar ACs por deducción o inspección superficial sin aserción real.

> [!CAUTION]
> **La pirámide no cubre las clases de defecto de verificación (DEV-190).** YAML inválido, `import()` con rutas del sistema de archivos (rompe solo en Windows), handles sin cerrar (mueren solo en Linux) y corrupción de codificación no los detecta ni `tsc` ni los tests. Para eso está `scripts/verify-changes.js`, que corre en el pre-commit sobre los archivos stageados. Un check omitido se reporta como omitido, nunca como aprobado; y un check que produce falsos positivos se corrige o se elimina, nunca se ensucia con una lista de permitidos.

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

## 6. Reglas de Dominio, Seguridad y Referencias Desacopladas

Para evitar el **Prompt Bloat** y preservar la ventana de contexto de los modelos de IA, las especificaciones detalladas residen en reglas dedicadas:

- **Invariantes de Dominio y Modelo de Datos:** [`.agents/rules/gripm-domain.md`](.agents/rules/gripm-domain.md) (operación de backlog y MCP, ortogonalidad de estados/sprints, estándares de UI, portales y estabilidad de layout).
- **Superficie de Riesgo y Seguridad (SEC-01 a SEC-10):** [`.agents/rules/security.md`](.agents/rules/security.md) y política general en [`SECURITY.md`](SECURITY.md).
- **Flujo Canónico de Git y Concurrencia:** [`.agents/rules/git-workflow.md`](.agents/rules/git-workflow.md).
- **Dogfooding del Backlog:** [`.agents/rules/backlog-dogfooding.md`](.agents/rules/backlog-dogfooding.md).
- **Protocolo de Release y Despliegue:** [`.agents/skills/release-management/SKILL.md`](.agents/skills/release-management/SKILL.md).
- **Auditoría de UX y Ergonomía:** [`.agents/skills/code-level-ux-auditor/SKILL.md`](.agents/skills/code-level-ux-auditor/SKILL.md).

