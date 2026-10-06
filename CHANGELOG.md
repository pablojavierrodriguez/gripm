# Changelog

Todas las novedades relevantes de gripm se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado es [SemVer](https://semver.org/lang/es/).

**Este archivo se genera automáticamente** desde `backlog/releases.json`, que es la
fuente de verdad del proceso de release. No editarlo a mano: para corregir una
entrada, modificar `releases.json` y ejecutar `npm run changelog`.

## [Unreleased]

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
