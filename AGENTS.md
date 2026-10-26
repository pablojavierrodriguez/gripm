# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **gripm**. Este documento establece las normas operativas, el flujo ágil de entrega y los guardrails técnicos para agentes de IA (Antigravity, Cursor, Claude Code) y desarrolladores.

---

## 0. Ecosistema Gripm y Dogfooding de Gripm Playbook (DEV-250)

- **Gripm Board (`@gripm/board`, este repositorio):** Es el producto de software (Cockpit visual web, motor de Markdown, servidor MCP y CLI). El paquete publicado en npm distribuye exclusivamente la aplicación, el servidor MCP y la skill de conexión `.agents/skills/gripm/`.
- **Gripm Playbook (`@gripm/playbook`, repositorio `gripm-playbook`):** Es el framework metodológico autónomo para equipos de agentes (roles, State Machine, Pirámide de Verificación y auditoría de UX).
- **Dogfooding en este repositorio:** Para desarrollar Gripm Board, el equipo adopta metodológicamente Gripm Playbook. Por esta razón conviven en `.agents/skills/` los roles del playbook (`principal-engineer`, `qa-auditor`, `pm-orchestrator`, etc.), gobernados por `.playbook-lock.json`. No forman parte del producto distribuido de Gripm Board y están excluidos del tarball de producción de npm.

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
- **Salidas Obligatorias de la Retro:** Actualizar gotchas en este `AGENTS.md`, actualizar skills relevantes y crear tareas en el backlog para mejoras identificadas.

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
5. **Cero colisiones de ID:** Antes de crear una tarea, releer el ID máximo **en el momento de crearla** -no al inicio de la sesión: con dos agentes escribiendo en paralelo la ventana de colisión es real- y asignar `max + 1`. Verificar antes de cerrar: `grep -h '^id: DEV-' backlog/tasks/*.md | sort | uniq -d` debe devolver **vacío**.

### Ortogonalidad y Modelo de Datos
6. **Ortogonalidad estricta ("Anti-Label-Smuggling"):** Estado, Sprint, Release, Prioridad y Asignado son dimensiones 100% independientes. Prohibido usar "Backlog" como sprint, o deducir versiones fantasma como `vSprint 5` por pertenecer a un sprint. Si un campo no tiene valor, su valor visual canónico debe ser unívoco: `Sin Sprint`, `Sin Asignar` o `-`.
7. **Estado `ideas` de primera clase:** NUNCA normalizar o degradar `ideas` a `draft` en parsers o vistas.
8. **Simetría `sprint` vs `sprints`:** Al desasignar sprint en `ItemModal`, enviar `sprint: ""` y `targetSprint: ""` explícitamente para persistir la limpieza en disco.

### Entorno, Terminal y UI
9. **Sandbox de Terminal (Prohibido `curl http://localhost:4100`):** El sandbox bloquea peticiones HTTP locales. Para validar si el servidor escucha en el puerto 4100, verificar el bind local en terminal o logs sin emitir peticiones de red directas. Para interactuar con la UI, usar `browser_subagent`.
10. **Estabilidad de layout (Zero-CLS):** El elemento raíz `html` debe declarar siempre `overflow-y: scroll; scrollbar-gutter: stable;` en `index.css`.
11. **Portales para modales y menús (DEV-129, DEV-130):** Renderizar overlays (`ConfirmModal`, dropdowns) vía `createPortal(..., document.body)` para evitar bugs de stacking context y containing block (`transform`, `backdrop-filter`).
12. **Cero `truncate` en confirmaciones:** En cajas de advertencia o confirmación, usar siempre `break-words text-xs leading-relaxed` para nunca cortar texto crítico con elipsis (`…`).
13. **Tipos de ítem dinámicos:** Emplear Proxy defensivo o `getItemTypeInfo` para renderizar cualquier clave personalizada sin provocar fallas.
14. **Anti-Suppression:** NUNCA apagar linters o ignorar tipos (`@ts-ignore`, `eslint-disable`) para tapar síntomas.
15. **Resolución absoluta de rutas:** Usar siempre `root: PKG_ROOT` y rutas absolutas en binarios CLI y plugins para ejecución global.
16. **Metodología Lean / Kanban preferente:** En `gripm`, el desarrollo se opera preferentemente bajo flujo continuo Kanban con una cola de backlog priorizada y entregas agrupadas por valor en Releases, evitando la sobrecarga artificial de timeboxes de sprint cuando el ritmo ágil es continuo.
17. **Gobernanza de configuración pública (`.gripm/config.json`):** El archivo `.gripm/config.json` del repositorio define la configuración canónica OSS (`"language": "en"`, `"theme": "dark"`, `"density": "comfortable"`, `"methodology": "kanban"`, `"enabledTabs": { "kanban": true, "sprint": false, "release": true }`). Prohibido commitear en este archivo configuraciones o preferencias de entorno personales del desarrollador.
18. **Paridad CI vs Local (DEV-249):** La suite headless (`npm test`) no ejecuta `test:ui` ni `verify-changes.js --all`. Ante cambios en Header/navegación, empaquetado o antes de sellar releases, correr ambos obligatoriamente y validar la suite desde estado limpio (sin depender de `dist/` preexistente en disco).
19. **Inmunidad a CRLF (DEV-249):** Todo script que parsee líneas debe normalizar `\r` (`replace(/\r$/, '')`). El repositorio preserva `.gitattributes` (`* text=auto eol=lf`) para evitar divergencias entre plataformas.
20. **Trazabilidad de arquitectura (ADR, DEV-260):** Toda decisión de arquitectura con trade-offs reales que **no sea derivable del código** se registra como un ADR en `docs/adr/NNNN-slug.md` (numeración secuencial e inmutable, convención y estados en `docs/adr/README.md`). Los ADR aceptados son append-only: una decisión que cambia se documenta en un registro nuevo que marca al anterior como `Reemplazado`. `docs/ARCHITECTURE.md` describe el estado actual; el ADR explica el porqué. Al cerrar un sprint o release, el campo `ADR Recorded` de la plantilla de sprint apunta a la ruta del ADR correspondiente.
21. **Cero tamaños de fuente arbitrarios (UX-011):** Usar siempre la escala canónica de Tailwind (`text-xs`, `text-sm`, `text-base`). Prohibido introducir clases de estilo libre como `text-[9px]`, `text-[10px]` o `text-[11px]` en componentes de UI para evitar dispersión tipográfica y fallas en la suite de auditoría UX (`audit-ux-baseline`).
22. **Semántica de filtros de estado (Anti-Ambigüedad, DEV-287):** En selectores y chips de filtro, nombrar el conjunto de trabajo en curso como **"Estados activos"** (ES) / **"Active statuses"** (EN). Prohibido usar "Todos los estados" para referirse a estados no terminales, reservando "Todos" únicamente cuando la consulta incluya exhaustivamente `done`, `cancelled` y `dismissed`.
23. **Visibilidad de versión en entornos Sandbox (DEV-288):** Todo despliegue web/sandbox debe exponer su versión canónica visiblemente (ej. en el modal de atajos de teclado o cabecera) para permitir la certificación inmediata por parte de usuarios y QA sin recurrir a la consola de desarrollo.
24. **Documentación bilingüe en un único archivo (DEV-309):** Para documentos comunitarios y de gobernanza (`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, etc.), se unifican ambos idiomas en el mismo archivo: versión en inglés arriba, versión en español debajo, con selector de anclajes de navegación rápida en la cabecera (`🌐 [English](#...) | [Español](#...)`). Queda prohibido bifurcar la documentación en archivos paralelos `*.es.md` (exceptuando temporalmente `README.md` / `README.es.md`).
25. **Cero guiones largos artificiales (Anti-Em-Dash / Anti-IA):** Queda terminantemente prohibido el uso de guiones largos (em-dash ` - ` o en-dash ` - `) en títulos de navegador, interfaces de usuario, opciones de select, nombres de releases, notas de versión, `CHANGELOG.md`, `releases.json`, `BACKLOG.md` y documentación. Utilizar **siempre y exclusivamente** el guión simple estándar `-` con espacios (` - `). El uso de ` - ` es un cliché estilístico artificial que degrada la identidad y calidad del producto.
26. **Cero despliegues a producción desde `dev` (Anti-Dev-Production-Deploy, DEV-340):** Queda terminantemente prohibido ejecutar `vercel --prod` o promover a producción desde la rama `dev` o ramas de trabajo. La producción debe originarse única y exclusivamente en `main` mediante `npm run deploy:prod` tras certificar la Pirámide de Verificación y mergear a `main`.

---

## 7. Superficie de Riesgo, Seguridad y Mitigaciones (SEC-01 a SEC-10)

- **Daemon local sin autenticación HTTP (SEC-10):** gripm es una herramienta local monousuario. La API REST no incluye autenticación ni tokens. La frontera de aislamiento es el proceso del usuario.
- **Exposición en LAN con `--host 0.0.0.0` (SEC-06):** Iniciar el servidor en `0.0.0.0` permite el acceso a cualquier dispositivo en la misma red local. Usar exclusivamente en redes de confianza; nunca en redes públicas.
- **Contención en `/api/fs/browse` (SEC-07):** El explorador de carpetas valida contención estricta mediante `path.relative` y `realpathSync` contra raíces permitidas (`home`, `cwd`, proyectos registrados), evitando traversals.
- **Servidor MCP stdio y validación estricta (SEC-03, SEC-05):** `gripm-mcp` opera mediante `stdin`/`stdout`. Valida todos los parámetros de entrada (`limit`, `offset`, `taskId`, `toggleAcIndex`) y asegura contención estricta de rutas en `--repo`.
- **Ejecución segura en el Gatekeeper (SEC-01):** El Gatekeeper de certificación ejecuta `verifyCommand` **únicamente si fue provisto como argumento explícito** en la llamada MCP, con timeout estricto de 15 segundos. **Queda terminantemente prohibido leer o ejecutar comandos desde el frontmatter de los archivos `.md` en disco, y el servidor MCP nunca persiste scripts en el frontmatter.**
- **Cero fabricación de ACs (SEC-02):** `gripm_sync_backlog` opera con `autoFix: false` por defecto. Queda prohibido alterar checkboxes `- [ ]` a `- [x]` sin verificación real en tareas `done`.
- **Trazabilidad en bypass (SEC-09):** El uso de `force: true` para sortear el Gatekeeper emite una advertencia formal y persiste metadata de auditoría en la respuesta.

