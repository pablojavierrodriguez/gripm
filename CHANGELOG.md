# Changelog

Todas las novedades relevantes de gripm se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado es [SemVer](https://semver.org/lang/es/).

**Este archivo se genera automáticamente** desde `backlog/releases.json`, que es la
fuente de verdad del proceso de release. No editarlo a mano: para corregir una
entrada, modificar `releases.json` y ejecutar `npm run changelog`.

## [Unreleased]

---

## [1.5.1] — 2026-10-15 🛠️ Backend Standalone Compilado y Corrección de Smoke Test en CI

### 🎯 Resumen
*Versión 1.5.1 de Gripm: compilación del backend API a bundle independiente en bin/server.js para compatibilidad universal con cualquier runtime de Node.js (>=20.0.0) sin requerir cargadores de TypeScript, y resolución del paso de build en el job de smoke test de CI.*

### 🛠️ Correcciones y Robustecimiento de Runtime
- **Backend standalone en bin/server.js:** empaquetado del middleware backend a JavaScript estándar (ESM) para ejecución directa y autónoma sin necesidad de flags de tipado en Node 20/22.
- **Resolución de smoke test en CI:** incorporación del paso de build en el runner de Playwright y auto-sanación de bundle en test-ui-smoke.js.

---

## [1.5.0] — 2026-10-15 🚀 Métricas de Flujo, Importador Universal, Acciones Masivas y Blindaje de Persistencia Atómica

### 🎯 Resumen
*Versión 1.5.0 de Gripm: incorporación del módulo visual de analítica y métricas de flujo con KPIs de Throughput, Cycle Time, WIP y Salud de ACs (DEV-229), importador universal de backlogs externos para migración local-first desde Jira, Linear y CSV en modal visual y CLI (DEV-228), selección múltiple en backlog y barra de acciones masivas flotante con transferencias de sprint, release, estado y prioridad (DEV-277), rediseño de zonas de soltado a altura completa equitativas en Kanban para estados reales únicos y multi-estado (DEV-271), visualización de Timeline / Cronograma con rangos de fechas ampliados y nombres normalizados (DEV-281), gestión centralizada de módulos y componentes en Settings y multi-asignación en tareas (DEV-275), rediseño compacto en tarjetas de columnas Kanban en Settings (DEV-273), erradicación de truncamientos a cero bytes mediante persistencia atómica con temp, fsync y rename (DEV-291), desacople del servidor de desarrollo Vite en runtime productivo con servidor estático ligero y reducción de dependencias (DEV-290), blindaje de seguridad en daemon local contra path traversal y mutaciones en endpoints GET (DEV-292), prevención de procesos zombies y pureza de stdio en servidor MCP (DEV-295), integridad del parser Markdown/YAML protegiendo bloques de código cercados y metadatos personalizados (DEV-289), fin de fabricación de ACs y auto-promociones en sincronización (DEV-293), erradicación de stale closures en App.tsx con actualizaciones funcionales (DEV-294), refinamiento de etiquetas de filtros activos (DEV-287), visibilidad de versión en modal de atajos en modo Sandbox (DEV-288) e identidad minimalista sin clichés visuales.*

### 📊 Métricas de Flujo y Analítica de Entregas
- **DEV-229 — Módulo Visual de Métricas de Flujo y Salud de Entregas (Analytics Tab V1):** cabecera con KPIs de Throughput, Cycle Time, AC Health y WIP activo, con gráficos proporcionales nativos en SVG y desglose por sprint y release sin librerías externas pesadas.

### 🔄 Migración e Interoperabilidad Local-First
- **DEV-228 — Importador Universal de Backlogs Externos (Jira, Linear y CSV):** asistente visual interactivo en `ImportWizardModal` y comando terminal `gripm import` con mapeo automático de estados, prioridades, tipos y extracción de ACs.

### ⚡ Ergonomía, Productividad y Vistas de Trabajo
- **DEV-271 — Zonas de soltado multi-estado ampliadas y apiladas a altura completa en Kanban:** partición vertical equitativa (`flex-1`) del espacio visible de la columna, con estados únicos ocupando el 100% de la altura y multi-estados dividiendo el espacio en mitades o tercios con hover temático.
- **DEV-277 — Selección múltiple en Backlog y barra flotante de acciones masivas:** selección de rangos con `Shift + Click`, barra flotante fija inferior con reposicionamiento al tope/fondo, asignación masiva de sprint/release y cambio de estado o prioridad en lote.
- **DEV-281 — Vista de Timeline / Cronograma interactivo:** visualización de cronograma jerárquico con cálculo de límites temporales ampliado a mínimo 1 mes en el pasado y 3 meses en el futuro con fechas de 4 dígitos.
- **DEV-275 — Gestión centralizada de módulos y componentes en Settings y multi-asignación en tareas:** catálogo persistido en `config.modulesList` y selector multi-chip interactivo en `ItemModal`.
- **DEV-273 — Editor de columnas Kanban en Settings:** disposición en tarjetas verticales de ancho completo con reordenamiento accesible.
- **DEV-287 — Refinamiento de filtro de estados:** adopción de "Estados activos" / "Active statuses" para eliminar ambigüedad con estados completados.
- **DEV-288 — Visibilidad de versión en Sandbox:** versión de aplicación expuesta siempre en el pie del modal de atajos en entornos estáticos de Vercel.

### 🛡️ Seguridad, Persistencia Atómica e Integridad de Runtime
- **DEV-291 — Persistencia Atómica: erradicación de truncamientos a cero bytes:** escrituras seguras con archivo temporal, `fs.fsyncSync` y rename atómico en tareas y registry.
- **DEV-290 — Desacople de Vite en Runtime:** servidor estático nativo para distribución en producción y reducción de más de 120MB de dependencias de build.
- **DEV-292 — Seguridad en Daemon Local:** sanitización estricta de IDs contra path traversal en tareas, endpoints `GET` puramente idempotentes y protección de `EPIPE` en SSE.
- **DEV-289 — Integridad del Parser:** protección de secciones dentro de bloques de código cercados y preservación de campos YAML personalizados.
- **DEV-293 — Gobernanza de Calidad en Backlog Sync:** erradicación de falsificación de checkboxes y auto-promoción a `ready`.
- **DEV-294 — Prevención de Stale Closures en App:** sincronización funcional y prevención de conflictos 409 durante edición activa.
- **DEV-295 — Saneamiento del Servidor MCP:** manejo limpio de señales de proceso (`SIGINT`, `SIGTERM`, stdio close), subcomando no posicional en CLI y stdio puro para JSON-RPC.

---

## [1.4.0] — 2026-10-15 🚀 Modo Sandbox en Vercel, Ergonomía de Densidad a 1366×768, Acciones Rápidas y Jerarquía Semántica

### 🎯 Resumen
*Versión 1.4.0 de Gripm: despliegue del modo Sandbox interactivo con persistencia en memoria y paridad total de endpoints para Vercel y demos públicas (DEV-222, DEV-262), optimización integral de densidad para 1366×768 en la vista de configuración con controles compactos (DEV-274), chips descartables interactivos de filtros activos en FilterBar con alineación dimensional estricta (DEV-272), acciones rápidas de reposicionamiento (Top, Bottom) y asignación ágil de sprints tanto en tarjetas Kanban como en la vista de Sprints/Backlog (DEV-276), refinamiento del selector de Parent restringido a Épicas e Iniciativas con combobox accesible y búsqueda en vivo (DEV-280), internacionalización (i18n) de plantillas BDD para Historias de Usuario y Criterios de Aceptación (DEV-279), control de visibilidad del resumen de métricas en FilterBar (DEV-278), simetría visual y descompresión de pestañas en Header (DEV-270), gobernanza y trazabilidad de arquitectura con sistema ADR en docs/adr (DEV-260), corrección de persistencia de sprints en modo JSON (DEV-261), salvaguarda mecánica de correspondencia de git index en pre-commit (DEV-268), validación estricta de marcadores de ACs (DEV-267), higiene OSS canónica en .gripm/config.json (DEV-259), desacople de runtime vs desarrollo en binarios (DEV-266) y refinamiento del modal de atajos de teclado (DEV-258).*

### 🌐 Modo Sandbox y Portabilidad Pública
- **DEV-222 — Modo Sandbox interactivo y deploy público en Vercel:** soporte de ejecución en navegador sin Node.js local ni backend activo, con almacenamiento en memoria reactivo y banner informativo con botón de restauración.
- **DEV-262 — Cobertura y paridad del adaptador Sandbox:** suite exhaustiva de tests para `sandboxAdapter` y el detector de entorno `detect.ts`, garantizando 100% de paridad con los 31 métodos del contrato `GripmApi`.

### 🖥️ Ergonomía Visual, Densidad y Navegación
- **DEV-274 — Optimización de densidad para Metodología y Vistas en Settings (1366×768):** rediseño de tarjetas de selección de metodología y vistas a controles compactos de una fila con radio cards semánticas, liberando el primer pliegue en pantallas de 1366×768.
- **DEV-272 — Chips descartables de filtros activos en FilterBar:** píldoras interactivas con descarte individual (`✕`), altura alineada a `h-8` (32px) y radio consistente con los controles de la barra de filtros.
- **DEV-270 — Armonización y simetría en selector de pestañas del Header:** descompresión de tabs principales, simetría en padding y visualización clara del estado activo sin desbordamientos.
- **DEV-278 — Ajuste en Settings para alternar visibilidad de métricas en FilterBar:** switch de configuración para ocultar el bloque derecho de métricas numéricas, maximizando el ancho para filtros y búsqueda.

### ⚡ Interacción Rápida, Jerarquía y Productividad
- **DEV-276 — Acciones rápidas de reposicionamiento y asignación de Sprint:** menú contextual en tarjetas Kanban y vista de Sprints para mover tareas al tope (`moveToTop`), al fondo (`moveToBottom`) y asignarlas a sprints vigentes o devolverlas al backlog sin abrir el modal completo.
- **DEV-280 — Restricción de Parent a Epics/Iniciativas y combobox con búsqueda en ItemModal:** filtrado estricto de candidatos a contenedores jerárquicos genuinos, selector estilizado con badges semánticos por color (índigo/púrpura), atajos de teclado y búsqueda en vivo.
- **DEV-279 — Internacionalización (i18n) de plantillas BDD:** localización en inglés y español de los esqueletos BDD para Historias de Usuario (`AS A` / `COMO`) y Criterios de Aceptación (`GIVEN-WHEN-THEN` / `DADO-CUANDO-ENTONCES`).

### 🛡️ Calidad Mecánica, Gobernanza y Corrección de Bugs
- **DEV-260 — Sistema de Architecture Decision Records (ADR):** creación de `docs/adr/` con plantilla canónica, numeración secuencial inmutable y registro de las primeras 3 decisiones arquitectónicas fundacionales.
- **DEV-261 — Persistencia de sprints en proyectos en modo JSON:** corrección de descarte de sprints en proyectos configurados bajo almacenamiento JSON.
- **DEV-268 — Validación de git index en hook pre-commit:** el pre-commit valida correspondencia estricta de tareas stageadas contra el árbol exportado, previniendo discrepancias.
- **DEV-267 — Blindaje contra marcadores de AC malformados:** detección y error temprano ante bloques `<!-- AC:BEGIN -->` no cerrados.
- **DEV-259 — Higiene canónica de configuración OSS:** alineación estricta de `.gripm/config.json` con los valores OSS canónicos documentados en `AGENTS.md`.
- **DEV-266 — Desacople de requisitos de runtime en binarios:** separación limpia entre dependencias de desarrollo y ejecución de usuarios finales.
- **DEV-258 — Refinamiento del pie de cheatsheet de teclado:** retiro del botón de cierre redundante y alineación sutil del hint de reapertura.

---

## [1.3.0] — 2026-10-12 📐 Sistema Integral de Estimación, Rediseño CLI y Ergonomía de Teclado

### 🎯 Resumen
*Versión 1.3.0 de Gripm: la estimación se consolida como capacidad de primera clase del tablero, con Story Points (Fibonacci) y T-Shirt Sizes como escalas soportadas de extremo a extremo (épica DEV-247). Se incorpora el rediseño y estandarización visual de la interfaz CLI (DEV-252), el modal de consulta y ayuda de atajos de teclado con disparador `?` (DEV-254), la gestión visual de tareas hijas en épicas e iniciativas (DEV-248) y la exportación liviana de eventos de calendario (DEV-230), sobre una base de saneamiento arquitectónico, documental y de portabilidad (DEV-165, DEV-249, DEV-250, DEV-251).*

### 📐 Sistema Integral de Estimación (Épica DEV-247)
- **DEV-247 — Épica del Sistema Integral de Estimación:** consolida la estimación como capacidad de primera clase del tablero, con Story Points (Fibonacci) y T-Shirt Sizes como escalas oficialmente soportadas.
- **DEV-136 — Activación soberana y configuración persistente:** selector Fibonacci vs T-Shirt en Settings, con tipos canónicos `EstimationMethod`/`EstimationConfig` y persistencia de la preferencia.
- **DEV-137 — Modelo de datos y soporte MCP:** campo `estimate` opcional en el frontmatter Markdown y en el contrato del servidor MCP.
- **DEV-138 — Selector en ItemModal y badges en tarjetas:** el control de estimación solo se renderiza si el módulo está habilitado, con badges visuales de alto contraste en las tarjetas Kanban.
- **DEV-139 — Métricas agregadas y filtros:** rollup de Story Points (planificados, completados y pendientes) en SprintView, tabla de backlog y filtros por estimación.

### 🖥️ Rediseño CLI y Ergonomía de la Interfaz
- **DEV-252 — Rediseño y estandarización visual de la CLI:** fin de la caja rígida y la sopa de emojis en el banner de arranque; jerarquía, alineación y salida alineadas a estándares modernos.
- **DEV-253 — Ergonomía de estimación, contraste de filtros y desacople de tema:** desplegables de `AdvancedFiltersPopover` con fondo opaco y chevron sin captura de eventos, alto contraste en dark mode y desacople de tema en módulos.
- **DEV-203 — Metadatos visibles configurables:** activación y desactivación de campos de metadatos mostrados en las tarjetas de ítems.

### ⌨️ Navegación por Teclado y Jerarquías
- **DEV-254 — Modal de consulta y ayuda de atajos de teclado:** cheat sheet categorizado (Navegación, Tareas y Acciones, Búsqueda y Modales) con badges `kbd` y disparador `?`, construido sobre el primitivo `Modal` y `useFocusTrap`.
- **DEV-257 — Pie de marca y enlaces de valor real:** footer con la marca `gripm` y la versión vigente en el modal de atajos, sin costo de layout en el tablero.
- **DEV-256 — Columna `Épica` renombrada a `Parent` en SprintView:** el contenedor puede ser épica o iniciativa, con claves de localización canónicas en ambos catálogos.
- **DEV-248 — Gestión visual de tareas hijas:** listado completo de ítems dependientes en épicas e iniciativas, con desvinculación bidireccional directa desde `ItemModal`.

### 🧱 Arquitectura, Documentación y Portabilidad
- **DEV-165 — Modularización de `vite.config.ts` y capa `server/`:** extracción del middleware de seguridad (CSRF, DNS Rebinding, Content-Type) a módulos propios en `server/`.
- **DEV-250 — Desacople de Gripm Playbook:** el onboarding de `gripm init` pregunta explícitamente por el Playbook y deja el proyecto completamente limpio si se declina.
- **DEV-251 — Saneamiento de READMEs:** retiro del badge y del enlace a una demo en Vercel que no existe.
- **DEV-249 — Tolerancia a CRLF en el Quality Gate:** eliminación de falsos positivos `U+D` en archivos con terminaciones CRLF y actualización del selector de pestaña Sprints en el smoke de UI.

### 📅 Exportación de Eventos
- **DEV-230 — Exportación liviana de eventos de calendario:** Web Intent e iCal para agendar sesión o evento a partir de los datos de la tarea, sin dependencias cloud.

---

## [1.2.0] — 2026-10-12 🛡️ Endurecimiento Integral de Seguridad, Estabilidad de Modales, Higiene Canónica y Quality Gate

### 🎯 Resumen
*Versión 1.2.0 de Gripm: implementación y resolución de la auditoría técnica integral (DEV-233). Incorpora el primitivo accesible `<Modal>` montado en `document.body` y corrección de orden de hooks en diálogos (DEV-234), integridad multiplataforma del Quality Gate en CI y Windows (DEV-235), remediación de seguridad Fase 2 con erradicación de RCE en frontmatter y auditoría MCP (DEV-242), endurecimiento de `verifyCommand` en Gatekeeper MCP contra prompt injection (DEV-244), cabeceras de seguridad CSP, fuentes locales offline y límite de body 413 (DEV-243), DevSecOps en GitHub Actions con auditoría SCA y mínimos privilegios (DEV-246), purga integral de referencias históricas legacy a DevBoard en código activo (DEV-238), switches accesibles y consistentes en SettingsView (DEV-239), interoperabilidad de modos CLI `--single` y `--hub` en runtime (DEV-240), consistencia condicional de ajustes según módulos activos (DEV-241), resolución de conflicto de stacking context y z-index (DEV-236), restauración reactiva del proyecto Demo (DEV-237) y code-splitting con `React.lazy` (DEV-164).*

### 🛡️ Seguridad, Gobernanza MCP y DevSecOps (Core)
- **DEV-242 — Remediación integral de seguridad Fase 2:** erradicación de ejecución de scripts desde frontmatter (SEC-01), `autoFix: false` por defecto en sincronización (SEC-02), contención estricta de rutas en `--repo` (SEC-03) y validación de tipos y rangos en herramientas MCP (SEC-05).
- **DEV-244 — Endurecimiento de `verifyCommand` contra prompt injection:** restricción estricta a scripts autorizados de `package.json` y rechazo inmediato de metacaracteres shell y subshells (`|`, `&`, `;`, `$()`, backticks).
- **DEV-243 — Cabeceras de seguridad, fuentes locales y límite de body:** inyección de CSP con `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, tipografías del sistema 100% offline sin peticiones externas a Google Fonts y límite HTTP 413 (10MB) anti-DoS.
- **DEV-246 — DevSecOps en GitHub Actions:** permisos globales mínimos `contents: read`, paso automatizado de `npm audit` (SCA) e interpolación segura de inputs vía variables de entorno en pipelines de publicación.

### 🧱 Estabilidad del Cockpit, Accesibilidad y Quality Gate (Fases 0 y 1)
- **DEV-234 — Primitivo accesible `<Modal>` y estabilidad funcional P0:** extracción de `<Modal>` unificado con renderizado vía portal en `document.body`, corrección de orden de hooks invocando `useFocusTrap` antes de early returns condicionales en 5 diálogos, blindaje de `ConfirmModal` ante Enter accidental y etiquetas accesibles con `aria-live`.
- **DEV-235 — Integridad del Quality Gate y verificación multiplataforma:** soporte nativo de rutas POSIX en Windows para `audit:ux`, eliminación de bloques `catch` silenciosos, limpieza garantizada de fixtures temporales en tests y validación estricta de timeouts.
- **DEV-238 — Purga de referencias históricas legacy:** unificación canónica total bajo `gripm`, erradicando fallbacks y variables `DEVBOARD_*` en código fuente activo.

### ⚡ UI/UX, Runtime CLI y Configuración
- **DEV-239 — Switches accesibles `SettingsSwitch` en Settings:** reemplazo de checkboxes nativos desalineados por toggles redondeados consistentes con foco visible y soporte de teclado en todas las pestañas de configuración.
- **DEV-240 — Modos `--single` y `--hub` intercambiables:** precedencia limpia de banderas CLI en runtime y persistencia reactiva del proyecto activo.
- **DEV-241 — Consistencia condicional en Settings:** desacople de metodologías Scrum/Scrumban cuando el módulo Sprints está deshabilitado y fallback limpio a Kanban.
- **DEV-236 — Jerarquía de apilamiento en Header y FilterBar:** corrección de conflicto de z-index evitando que el selector de proyectos quede ocluido detrás de la barra de filtros.
- **DEV-237 — Restauración del Proyecto Demo:** resolución de error HTTP 415 enviando Content-Type adecuado y activación inmediata del proyecto demo en el estado global.
- **DEV-164 — Code-splitting y optimización de arranque:** carga diferida con `React.lazy` para vistas pesadas (`SettingsView`, `ReleaseAssembler`), aligerando la transformación de módulos en frío.

---

## [1.1.0] — 2026-10-09 🚀 Arquitectura Canónica, Gatekeeper MCP, Perfiles CLI y Desacople de Flujos

### 🎯 Resumen
*Versión 1.1.0 de Gripm: unificación formal de la máquina de estados con draft e ideas (DEV-231), compuerta de verificación de calidad y criterios de aceptación en el servidor MCP (DEV-224), desacople de Sprints por defecto y flujo continuo Kanban minimalista (DEV-218), asistente CLI de onboarding con perfiles de adopción y selección de add-ons (DEV-219), panel de Módulos & Add-ons en SettingsView (DEV-220), guardrail ergonómico pre-commit sin fricción (DEV-232), canonicalización de estados en frontmatter (DEV-134), soporte para runtime Node 20 LTS (DEV-223), automatización de pipeline con auto-creación de GitHub Release (DEV-221) y documentación multilingüe integral (DEV-227).*

### 🛡️ Gobernanza Agéntica, Metodología y Calidad (Core)
- **DEV-231 — Unificación del modelo de estados y taxonomía del Delivery Flow:** formalización de `draft` como estado legítimo del backlog, `ideas` para descubrimiento y delimitación de `ready` como meta de desarrollo y `done` como evento exclusivo de despliegue.
- **DEV-224 — Execution Gatekeeper en el servidor MCP:** el servidor MCP valida que el 100% de los criterios de aceptación estén verificados antes de permitir transiciones a `ready` o `done`, proveyendo rechazos determinísticos y soporte para comandos de test automatizados.
- **DEV-232 — Política pragmática de commits y guardrails sin fricción:** garantía mecánica basada en hooks `pre-commit` y cadencia limpia de 1 commit consolidado por tarea.
- **DEV-134 — Canonicalización de estados en frontmatter:** serialización determinista en minúsculas en el write path con script de migración y preservación de atributos.

### ⚡ Minimalismo, Desacople y Experiencia de Usuario (UI/DX)
- **DEV-218 — Desacople de Sprints y defaults minimalistas:** metodología `kanban` por defecto en nuevos proyectos, ocultamiento limpio de campos de Sprint cuando el módulo está inactivo y preservación retrocompatible.
- **DEV-219 — Onboarding CLI con perfiles de adopción:** asistente interactivo `gripm --init` con perfiles 'Minimalista AI-First', 'Baterías Incluidas' y 'Personalizado', junto con flags no interactivas (`--minimal`, `--full`).
- **DEV-220 — Panel de gestión de Módulos & Add-ons en SettingsView:** catálogo visual interactivo para activar o desactivar capacidades (Sprints, Releases, Multi-Hub) en caliente sin recargar la página.

### 🚀 Distribución, Runtime e Integración Continua (CI/DevOps)
- **DEV-221 — Pipeline de publicación optimizado y auto-creación de GitHub Release:** reordenamiento de fases en CI (verificación total antes de publicar) y auto-creación de releases oficiales en GitHub mediante `gh release create` y `workflow_dispatch`.
- **DEV-223 — Compatibilidad amplia con Node 20 LTS y POC binaria:** soporte ampliado a Node 20+ y evaluación documentada de distribución ejecutable independiente.
- **DEV-227 — Documentación multilingüe integral:** actualización en perfecta simetría de `README.md` y `README.es.md` con las nuevas capacidades y arquitectura.

---

## [1.0.6] — 2026-10-09 ⚡ Hotfix: Sincronización Canónica con Playbook v2.2.2 e Infraestructura de Estados (DEV-184)

### 🎯 Resumen
*Alineación de infraestructura y metodología con @gripm/playbook v2.2.2: adopción de la máquina de estados canónica formal (STATE_MACHINE.md), unificación de transiciones T0-T5 en plantillas de especificación de sprints y actualización del sincronizador universal con soporte de lockfile determinista (.playbook-lock.json).*

### 🛡️ Cambios e Infraestructura
- **DEV-184 — Sincronizador Universal v2.2.2:** Actualización de `scripts/sync-playbook.mjs` con soporte para manifiesto `.playbook-manifest.json`, lockfile determinista `.playbook-lock.json`, verificación de procedencia canónica histórica y preservación estricta de plantillas de distribución.
- **DEV-184 — Máquina de Estados Canónica:** Incorporación formal de `.agents/STATE_MACHINE.md` y alineación unívoca de las transiciones T0 a T5 en `docs/sprints/SPRINT_SPEC_TEMPLATE.md` y `.agents/TEAM_PLAYBOOK.md`.
- **Preservación de Distribución:** Garantía de preservación intacta de plantillas `AGENTS.en.md`, `AGENTS.es.md`, `gripm` skills y reglas locales.

---

## [1.0.5] — 2026-10-09 🚀 Refinamiento UX/DX, Integración MCP y Resiliencia de Runtime

### 🎯 Resumen
*Versión 1.0.5 de Gripm: consistencia y estabilidad visual Zero-CLS en cambio de idioma, selector de Épica/Parent en panel de atributos, filtro inteligente de sprints en Kanban, integración reactiva de Board Density, nueva nomenclatura Unreleased en Releases, tolerancia a flags variantes en CLI (--h, -help), clarificación del binario independiente gripm-mcp para agentes, eliminación de creación preventiva/auto-regeneración de backlog/tasks en disco, refactor de tipos core (GripmConfig) y modernización de CI en Node 24.*

### 🎨 Experiencia de Usuario y Cockpit (UI/UX)
- **DEV-210 — I18n de Tarjetas y Estabilidad Visual Zero-CLS en Cambio de Idioma:** localización completa de campos de metadatos (prioridades P0-P3) y layout fijo para transiciones fluidas de idioma sin brincos visuales.
- **DEV-211 — Filtro de Sprints en Tablero y Corrección de Banner CLI:** selector de sprints inteligente en el Kanban y alineación de caracteres Unicode del recuadro del CLI.
- **DEV-212 — Jerarquía de Ítems Selector de Epic Parent en Panel Lateral:** traslado del selector de parent/épica al panel lateral de atributos para ergonomía y claridad conceptual.
- **DEV-213 — SettingsView Limpieza de Badges, Desacople de Manual Ranking e Integración de Board Density:** depuración de insignias redundantes, desacople de opciones en Settings y soporte reactivo en tiempo real para densidad del tablero.
- **DEV-214 — ReleasesView Nomenclatura Unreleased, Estabilidad de Contenedor y Botón de Nueva Versión:** adopción de nomenclatura 'Unreleased', contenedor con ancho estable independientemente del contenido y botón simplificado.

### ⚡ CLI, Servidor MCP y Resiliencia de Sistema
- **DEV-209 — Consistencia, alineación y subcomandos de ayuda en gripm CLI:** ayuda formateada distinguiendo comandos de opciones y soporte nativo de `--help` en subcomandos.
- **DEV-215 — Tolerancia de flags de ayuda y clarificación de comandos y servidor MCP:** soporte robusto de variantes `--h` y `-help`, eliminación de menciones confusas a Gripm Suite y desacople de `gripm-mcp` como binario para herramientas de IA.
- **DEV-216 — Eliminar creación preventiva y auto-regeneración no solicitada de directorios backlog/tasks:** lectura estrictamente pura en el servidor y fin de la creación automática de carpetas no deseadas en el disco del usuario.
- **DEV-217 — Corrección de paridad multiplataforma en CI y smoke test de jerarquías:** resolución de aserción en tests de UI y normalización de baseline de UX multiplataforma.
- **DEV-186 — Refactor de Tipos Core:** migración canónica de `DevBoardConfig` a `GripmConfig`.
- **DEV-192 — Normalizar IDs de Sprint:** IDs estandarizados bajo el patrón `sprint-<n>`.
- **DEV-191 — Actualizar GitHub Actions deprecadas:** migración limpia a Node 24.
- **DEV-208 — Clarificar narrativa de README:** onboarding intuitivo para principiantes y desarrolladores.

---

## [1.0.4] — 2026-10-07 🚀 Claridad de Producto, Flujo de Tareas y Estabilidad

### 🎯 Resumen
*Parche de mejoras para Gripm: aclara los productos y comandos disponibles, mejora la creación, gestión y presentación de tareas y relaciones, y refuerza la cobertura de pruebas, los smoke tests y la distribución del paquete.*

### 📦 Producto, CLI y distribución
- **DEV-142 — Activos visuales y storytelling del README:** incorpora capturas de pantalla y una propuesta de valor bilingüe para presentar el producto.
- **DEV-199 — Consolidar la marca Gripm:** alinea la marca en la aplicación y la documentación viva.
- **DEV-200 — Corregir las opciones de versión de la CLI:** hace fiables `gripm -v` y `gripm --version`.
- **DEV-204 — Aclarar productos Gripm y comandos de uso:** explica qué hace cada producto y cómo usarlo sin ambigüedades.
- **DEV-195 — Incluir el logo en el paquete npm:** asegura que el logo esté disponible en instalaciones del paquete.
- **DEV-196 — Preservar plantillas de skill por idioma:** conserva correctamente las plantillas localizadas en el paquete.

### 🧭 Tareas y relaciones
- **DEV-201 — Corregir edición inmediata y visibilidad de relaciones:** mejora la persistencia y la presentación de los cambios y relaciones.
- **DEV-202 — Acceso rápido para quitar relaciones y ver jerarquía de ítems:** agiliza la gestión de relaciones y facilita reconocer jerarquías.
- **DEV-206 — Evitar solapamiento entre filtros y contadores en español:** hace que la barra se adapte a traducciones más largas sin superponer los controles.

### 🧪 Calidad y estabilidad
- **DEV-172 — Cobertura de tests para la capa de UI:** añade cobertura a la lógica derivada de la interfaz.
- **DEV-194 — Corregir el orden de hooks al abrir ItemModal:** evita el error de hooks al mostrar el modal.
- **DEV-197 — Propagar fallos del smoke test Linux:** evita que fallos de la suite Linux se reporten como exitosos.
- **DEV-198 — Automatizar smoke test de creación de tarea en navegador:** valida el flujo principal de creación desde el navegador.

---

## [1.0.3] — 2026-10-06 🛡️ Estabilización: Pipeline de Publicación, Baseline de UX y Accesibilidad del Cockpit

### 🎯 Resumen
*Parche de estabilización v1.0.3 de gripm: pipeline de publicación automática con provenance npm y gates de CI (DEV-182), baseline del auditor estático de UX para detectar regresiones en lugar de ruido (DEV-166), higiene de documentación y metadata con el catálogo de 12 herramientas MCP sincronizado (DEV-183), y un pase de accesibilidad del cockpit con trampa de foco, navegación por teclado, contraste verificado y reduced-motion (DEV-173). El motor de auditoría deja de bifurcar y adopta el canónico de @gripm/playbook.*

### 🚀 Pipeline y CI
- **Publicación automática con provenance (DEV-182):** `.github/workflows/publish.yml` dispara con la publicación de una release etiquetada `v*` o con el push de ese tag, con permisos OIDC y `npm publish --provenance`. Gates que evitan que un tag mal cortado llegue al registro público, que es irreversible: coincidencia con `package.json`, annotated tag obligatorio, idempotencia contra `npm view`, changelog como contrato regenerado desde `releases.json`, y build más `npm pack --dry-run` antes de publicar.

### 🔍 Auditoría estática de UX
- **Baseline de regresiones (DEV-166):** el auditor ya no emite cientos de observaciones cosméticas conocidas en cada corrida. `audit-ux-baseline.json` registra lo revisado y aceptado, y el gate reporta solo el delta. Las identidades son invariantes a la posición, así insertar código no invalida el snapshot, y los ERROR nunca se absorben.
- **Adopción del motor canónico:** `scripts/audit-ux-code.cjs` es byte a byte idéntico a `@gripm/playbook@2.2.1`. El fork local queda en cero: la divergencia era de 270 y 358 líneas y ahora es nula.
- **UX-010 rehabilitada:** se reporta con la señal real. Los 127 hallazgos previos bajaron a 15: 3 genuinos corregidos y 12 falsos positivos por un defecto del motor que no reconoce etiquetas de expresión JSX, documentados y contados en vez de ocultos.

### ♿ Accesibilidad del cockpit
- **Trampa de foco en los 8 diálogos:** `useFocusTrap` compartido mueve el foco al abrir, cicla Tab y Shift+Tab, cierra con Escape y devuelve el foco al elemento disparador. `ItemModal` y `ConfirmModal` ya tenían Escape propio, que se unificó en el hook para no cerrar dos diálogos apilados de una vez.
- **Contraste verificado:** 6 de 16 combinaciones de badges de estado estaban por debajo de 4.5:1 en tema claro. Se ajustaron al tono que alcanza el umbral y `verify-status-contrast.js` lo verifica en cada corrida leyendo los estilos reales.
- **Teclado sin puntero:** la reordenación de tarjetas en el Kanban tenía únicamente drag and drop. Se agregaron acciones "Subir" y "Bajar" en el menú de la tarjeta, y el cambio de estado ya era alcanzable por teclado.
- **Semántica nativa:** 4 controles interactivos que no eran semánticos pasaron a usar `<button>`, `role` y `tabIndex` con manejo de Enter y Espacio. Los 31 casos restantes se clasificaron como guardas de propagación y cáscaras de overlay, donde agregar roles habría creado falsos puntos de foco.
- **Reduced motion:** los pulsos decorativos se congelan cuando el sistema lo pide, y los spinners se atenúan en lugar de detenerse porque son la única señal de carga en curso.

### 📚 Documentación y metadata
- **Catálogo MCP completo (DEV-183):** la documentación listaba 7 de las 12 herramientas disponibles.
- **Branding:** se eliminaron los residuos de la marca anterior en logs, en el generador del backlog consolidado y en el guard de sincronización.
- **Corrección de datos:** las releases tenían un identificador de proyecto obsoleto que las hacía invisibles en el tablero, porque el filtro por proyecto es de igualdad estricta.

---

## [1.0.2] — 2026-10-05 🐛 Parche de Desacople CLI: Soporte de Promesas en Desinstalación Interactiva

### 🎯 Resumen
*Parche correctivo v1.0.2 de gripm: corrección crítica de la CLI npx gripm --uninstall migrando a node:readline/promises para prevenir fallas por TypeError en terminales interactivas (DEV-185).*

### 🐛 Correcciones y Estabilidad
- **CLI de Desacople Interactivo (--uninstall / --clean):** Migración de node:readline a node:readline/promises, permitiendo resolver await rl.question() limpiamente y previniendo TypeError: Cannot read properties of undefined (reading trim) en consolas interactivas.
- **Manejo Defensivo de Entrada:** Salvaguardas ante lecturas nulas o cierres tempranos de flujo estándar de entrada.
- **Inyección de Streams y Pruebas de Integración:** Habilitación de inyección de streams en runUninstallCommand con suite automatizada de pruebas interactivas en scripts/verify-integration.js.

---

## [1.0.1] — 2026-10-05 ⚡ Saneamiento P0 de Frontera OSS: Skills Canónicas, Contrato MCP y Endurecimiento de Seguridad

### 🎯 Resumen
*Parche crítico v1.0.1 de gripm: saneamiento integral de las 13 skills del playbook para erradicar tokens residuales y referencias ajenas (DEV-181), alineación del catálogo de herramientas MCP canónicas gripm_* y formato de llamadas, contención estricta del filesystem en endpoints de navegación y creación de proyectos, y blindaje de endpoints locales contra DNS rebinding y orígenes web no autorizados.*

### 🐛 Correcciones y Estabilidad
- **Saneamiento Integral de Skills (.agents/skills/*):** Erradicación total de referencias ajenas y rutas ficticias en las 13 skills del framework.
- **Alineación de Herramientas MCP Canónicas:** Documentación corregida del catálogo de 12 herramientas `gripm_*` y formato top-level de `status` en `gripm/SKILL.md`.
- **Contención de Filesystem en API:** Validación rigurosa de rutas autorizadas en `/api/fs/browse`, `/api/projects` y `/api/projects/detect-path` impidiendo escapes fuera del home o directorio de trabajo.
- **Seguridad en Modo LAN:** Bloqueo de ataques de DNS Rebinding y filtrado estricto de encabezados `Origin` en peticiones entrantes y SSE.

---

## [1.0.0] — 2026-10-05 ⚡ Lanzamiento Oficial: gripm ("grip-em"), Seguridad, i18n, Empaquetado y Hardening

### 🎯 Resumen
*Lanzamiento oficial de la versión 1.0.0 de gripm ("grip-em"): tablero ágil multidisciplinario de ingeniería y producto para pair programming con IA, internacionalización total bilingüe, empaquetado autónomo verificado para npm, seguridad reforzada del API local, catálogo MCP canónico gripm_* con 12 tools, persistencia local con prefijo gripm_*, CI Multi-OS y automatización de dependencias.*

### 🚀 Novedades y Mejoras
- **Identidad de Marca y UI (DEV-043, DEV-176):** Presentación oficial de gripm ("grip-em"), adopción canónica de "tablero" en español, unificación de badges de estado y nuevo isotipo geométrico.
- **Internacionalización Total (DEV-060, DEV-152, DEV-153):** Cobertura 100% bilingüe en inglés y español, erradicación de cadenas hardcodeadas, traducción completa de Settings y selector de idioma dinámico.
- **Binarios Ejecutables y CLI (DEV-144, DEV-163):** Ejecutables canónicos `gripm` y `gripm-mcp`, subcomando `gripm mcp` y herramientas de línea de comandos integradas.
- **Empaquetado y Distribución npm (DEV-147, DEV-171):** Inclusión de plantillas `.agents/` y `.githooks/` en el tarball de npm, soporte zero-install y smoke tests rigurosos con `npm pack`.
- **Seguridad y Red Local (DEV-148, DEV-169, DEV-177):** Blindaje contra CSRF y DNS Rebinding, loopback bind estricto a IPv4 `127.0.0.1` y priorización amigable de `localhost` en logs y navegador.
- **Servidor MCP Canónico gripm_* (DEV-149, DEV-150, DEV-160):** Catálogo unificado de 12 herramientas canónicas, soporte nativo de estado `ideas` y suite de verificación automatizada.
- **Persistencia y Arquitectura Local (DEV-168):** Almacenamiento local bajo prefijo `gripm_*` con auto-migración y retrocompatibilidad total.
- **Integración Continua Multi-OS y Mantenimiento (DEV-174, DEV-175):** Matriz de GitHub Actions CI para Ubuntu, macOS y Windows en Node 22, junto con configuración de GitHub Dependabot.

---

## [0.7.0] — 2026-10-02 🚀 Integridad del Dato, Internacionalización, Apertura de Navegador, Paridad Light Mode y Robustez CLI

### 🎯 Resumen
*Consolidación integral de valor con 26 ítems completados: internacionalización completa (i18n), apertura automática de cockpit en navegador local, paridad absoluta de Light Mode, desinstalación y eject seguro en CLI, pre-commit hook no mutador, corrección de overlays y portales, y desacople canónico entre sprints y releases.*

### 🚀 Novedades y Mejoras
- **Internacionalización Integral (DEV-114):** Selector de idioma en asistente CLI (`--init`), diccionarios completos en Cockpit UI y plantillas bilingües.
- **Apertura Automática del Navegador (DEV-145):** `npm run dev` y `npm run board` abren el cockpit automáticamente en el navegador predeterminado con bandera opt-out `--no-open`.
- **Paridad Total de Light Mode (DEV-124):** Cobertura visual idéntica y transición fluida sin jank entre temas claro y oscuro.
- **Desinstalación y Eject Seguro (DEV-115):** Comando CLI `devboard --uninstall` con preservación garantizada del backlog y scripts de usuario.
- **Aislamiento Multi-Stack y Puertos Libres (DEV-116):** Detección inteligente de puertos libres sin colisiones en entornos multi-proyecto.
- **Identidad Canónica y Sprints Temáticos (DEV-117):** Resolución unificada de identidad y nombres de proyecto.
- **Pre-Commit Hook No Invasivo (DEV-125):** Verificación rigurosa sin mutar el índice de git para permitir commits selectivos.
- **Portales y Overlays Confiables (DEV-129, DEV-130):** Montaje de modales en `document.body` evitando bugs de stacking context y containing block.
- **Ergonomía de ItemModal (DEV-126):** Tipografía unificada, placeholders dinámicos contextuales por tipo y eliminación del flash de hidratación.
- **Tooling Open Source y CI/CD (DEV-121, DEV-122, DEV-123, DEV-140, DEV-141):** GitHub Actions CI, templates de issues/PRs, Prettier, EditorConfig y engines Node en package.json.
- **Desacople Canónico Sprint vs Release (DEV-146):** Paquetes de versión organizados por valor entregado y timeboxing ágil sin ataduras bidireccionales artificiales.

---

## [0.6.1] — 2026-09-26 ⚡ Hotfix: Resiliencia en Instalación Zero-Install, Renderizado UI y Onboarding en Español (DEV-112, DEV-113)

### 🎯 Resumen
*Corrección crítica para permitir la ejecución inmediata de DevBoard mediante `npx github:pablojavierrodriguez/dev-board --init` e instalación global con `npm install -g github:pablojavierrodriguez/dev-board` sin abortos de ciclo de vida (Exit Code 128), erradicación de pantallas en blanco al iniciar el cockpit en repositorios externos, unificación integral del onboarding en español y desacople bilingüe de la documentación.*

### 🐛 Correcciones y Estabilidad
- **Resiliencia en Hook `prepare` (DEV-112):** El script `prepare` en `package.json` ahora valida si se encuentra dentro de un worktree Git (`git rev-parse --is-inside-work-tree`) antes de intentar configurar `.githooks`, silenciando errores de directorio no existente y garantizando una salida exitosa con `|| true` en carpetas temporales de cache de npm (`~/.npm/_npx/`).
- **Scripts de Scaffolding con Fallback y Banner Preciso (DEV-113):** `devboard --init` inyecta scripts con fallback automático a GitHub (`devboard 2>/dev/null || npx -y github:pablojavierrodriguez/dev-board`), permitiendo que `npm run board` funcione siempre aunque el CLI no esté instalado globalmente.
- **Resolución de Pantalla en Blanco y Estilos Globales (DEV-113):** Se configuró PostCSS y Tailwind CSS con resolución absoluta directa en `vite.config.ts` y `postcss.config.js`, erradicando el fallo de pre-transformación de estilos (`Cannot read properties of undefined (reading 'get')`). Se incorporó `RootErrorBoundary` en `src/main.tsx` y fallback inline en `index.html` garantizando que la aplicación nunca quede en blanco.
- **Corrección de Importación de `react-dom/client` (DEV-113):** Se reemplazó la importación por defecto por la importación con nombre canónica `import { createRoot } from 'react-dom/client'`, configurando `optimizeDeps.include` y `resolve.dedupe` en `vite.config.ts` para erradicar el fallo de sintaxis en ESM (`does not provide an export named 'default'`).
- **Homogeneización del Onboarding en Español y Documentación Bilingüe (DEV-113):** Se unificaron al español todas las preguntas del asistente CLI, los mensajes de confirmación y las plantillas embebidas. Se desacopló la documentación oficial manteniendo `README.md` en inglés para la comunidad internacional y publicando `README.es.md` en español nativo con selector bilingüe.

---

## [0.6.0] — 2026-09-25 🚀 CLI Packaging, Single-Project Isolation, XDG Hub, Interactive Scaffolding, Canonical Sync & ItemModal UX

### 🎯 Resumen
*Consolidación integral de Sprint 6 (10 ítems completados): distribución y empaquetado standalone del CLI, aislamiento mono-proyecto estricto, registro global XDG, asistente interactivo de inicialización (`devboard --init`), chequeador de versiones, compatibilidad canónica Backlog.md y edición de etiquetas y responsables en ItemModal.*

### 🚀 Novedades y Mejoras
- **Distribución Global del CLI y Bundler (DEV-108):** Binarios ejecutables `devboard` y `devboard-mcp` con resolución absoluta de rutas de assets y plugins Tailwind para correr sin errores desde cualquier directorio del sistema.
- **Aislamiento Mono-Proyecto y Hub Global (DEV-104, DEV-105):** Modo mono-proyecto aislado (`--single`) que evita la mezcla de contextos entre repositorios independientes, junto a almacenamiento centralizado en `~/.devboard/registry.json` respetando estándares XDG y FHS.
- **Asistente Interactivo de Inicialización (DEV-109):** Comando `devboard --init` con asistente interactivo por consola (o flag `-y` / `--yes`) para configurar modo mono/multi-proyecto, skills de IA, reglas `AGENTS.md`, scripts en `package.json` y `.gitignore`.
- **Verificador de Actualizaciones Estilo Supabase (DEV-107):** Notificador no bloqueante de nuevas versiones en GitHub con ventana de cache de 24 horas y variable de entorno `DEVBOARD_NO_UPDATE_CHECK=1`.
- **Edición Interactiva de Labels y Asignados (DEV-111):** Gestión de chips de etiquetas y asignación visual de miembros o agentes en `ItemModal` con sincronización bidireccional limpia al frontmatter Markdown.
- **Compatibilidad Canónica con Backlog.md (DEV-103):** Nombres de archivo canónicos con ID en mayúsculas, sobreescritura atómica in-place por ID, serialización uniforme de estados y preservación estricta de `itemCodes`.
- **Auditoría Pre-Release y Especificación de Arquitectura (DEV-102, DEV-110):** Salvaguarda pre-release automatizada en `verify-backlog-sync.js` y documentación exhaustiva del CLI y modelo canónico de datos en `docs/ARCHITECTURE.md`.
- **Higiene de Código Abierto (DEV-106):** Erradicación total de fallbacks o rutas propietarias residuales en la detección de repositorios.

---

## [0.5.0] — 2026-09-24 🚀 UX Polishing, Backlog Coherence, BDD Support, Sovereign Releases & MCP Hardening

### 🎯 Resumen
*Consolidación integral de Sprint 5 (23 ítems completados): estabilización visual sin CLS, soporte para Historias de Usuario con BDD, desacople ortogonal estricto de Sprints vs Releases, acceso directo a Papelera, confirmaciones contextuales accesibles y hardening del servidor MCP.*

### 🚀 Novedades y Mejoras
- **Soporte BDD Nativo (DEV-084):** Integración de sintaxis Given/When/Then en historias y criterios de aceptación, enriqueciendo la especificación ágil.
- **Acceso Directo a Papelera (DEV-096, DEV-097):** Navegación de primer nivel a la Papelera (TrashView), eliminación de subpestañas redundantes de Archivo y separación ortogonal entre Descartar (`status: dismissed`) y Borrado Lógico (`isDeleted: true`).
- **Confirmaciones UX Accesibles (DEV-100):** Sustitución de `window.confirm` por un diálogo temático (`ConfirmModal`) accesible por teclado y con soporte para publicación formal de releases.
- **Selectores Enriquecidos y Control de Versiones (DEV-077, DEV-091):** Selector visual de versiones en `ItemModal` con distinción entre versiones en preparación (`unreleased`) y liberadas (`released`).
- **Ampliación de Columnas y Vistas (DEV-079, DEV-085, DEV-086):** Incorporación de más campos a las tablas de Sprint y Backlog, con visibilidad garantizada de sprints planificados vacíos.

### 🐛 Correcciones y Estabilidad
- **Desacople Estricto Sprint vs Release (DEV-080, DEV-083, DEV-099):** Erradicación del \"label smuggling\": \"Backlog\" no es un sprint y pertenecer a un sprint no inventa versiones fantasma como `vSprint5`.
- **Estabilidad de Layout Cross-View Zero-CLS (DEV-094, DEV-095, DEV-098):** Regla `overflow-y: scroll` y `scrollbar-gutter: stable` en `index.css` eliminando el layout shift horizontal de 15px en el Header entre vistas.
- **Preservación de Estado Discovery (DEV-088):** Preservación de `status: ideas` como ciudadano de primera clase sin degradación a `draft`.
- **Sincronización Bidireccional de Releases (DEV-087, DEV-090):** Consistencia en tiempo real entre `releases.json` y el frontmatter de tareas, sanitizando versiones inexistentes.
- **Hardening MCP y Métricas (DEV-081, DEV-082, DEV-089, DEV-092):** Soporte del campo `sprint` en mutaciones MCP, cálculo de métricas de avance de sprint alineadas a `ready` y corrección de cambios pendientes fantasma en Configuración.
- **Desacople de Scroll Horizontal (DEV-093):** Scroll horizontal independiente en columnas del tablero Kanban preservando la visibilidad del encabezado.

---

## [0.4.0] — 2026-09-23 🚀 Sovereign Cockpit: Sprints Hub, Relations Graph, Custom Types & MCP Hardening

### 🎯 Resumen
*Consolidación integral de Sprints 1, 2 y 3: gestión de ciclo de vida de Sprints (planificación, inicio, cierre y balance de tareas no terminadas), grafo de dependencias y relaciones padre-hijo (DEV-047, DEV-048), papelera con soft-delete y restauración (DEV-049), modal de tarjetas a 2 columnas estilo Linear (DEV-054), taxonomía configurable de tipos de ítem (DEV-059), hardening del servidor MCP con herramientas de sincronización atómica (DEV-064, DEV-068, DEV-069) y separación e independencia estricta de columnas Sprint y Estado (DEV-075, DEV-078).*

---

## [0.3.0] — 2026-09-18 🚀 Workflow Views, Release Planning, Drag & Drop & UX Ergonomics

### 🎯 Resumen
*Estabilización de navegación, vistas duales de flujo (Kanban Continuo vs Scrum), planificación de releases, personalización de columnas, reordenamiento vertical Drag & Drop en Backlog (DEV-050), asignación dinámica de estados, estabilidad visual sin CLS, persistencia de prioridad P0, separación unreleased vs released (DEV-062) y estabilidad de scroll en SprintView (DEV-063).*

---

## [0.2.0] — 2026-09-16 🚀 Distributed Resilience & Standalone Engine

### 🎯 Resumen
*Arquitectura distribuida con servidor MCP autónomo, cliente CLI npx dev-board, concurrencia optimista y sincronización en vivo.*

---

## Enlaces

- [Guía de contribución](CONTRIBUTING.md)
- [Código de conducta](CODE_OF_CONDUCT.md)
- [Política de seguridad](SECURITY.md)
