# Invariantes de Dominio, Modelo de Datos y Operación (Gripm Board)

Este documento centraliza las reglas de negocio, convenciones de datos y directivas de arquitectura técnica específicas de **Gripm Board** (`@gripm/board`).

---

## 1. Operación de Backlog y Protocolo MCP

1. **`status` siempre como campo top-level en `gripm_update_task`:**
   ```json
   // ROTO: { "taskId": "DEV-001", "updates": { "status": "ready" } }
   // OK:   { "taskId": "DEV-001", "status": "ready" }
   ```
2. **`toggleAcIndex` secuencial:** NUNCA paralelizar llamadas sobre una misma tarea para evitar race conditions al tildar ACs.
3. **Cero marcadores de sección sin escapar (DEV-132):** NUNCA escribir marcadores HTML literales como `<!-- AC:BEGIN -->` dentro de descripciones o notas; usar texto neutro `[marcador AC:BEGIN]` o la forma escapada `<!\-- AC:BEGIN -->`.
4. **Slugs de tareas canónicos:** Nombres de archivo bajo el patrón canónico `DEV-XXX - slug-descriptivo.md` (o `dev-xxx - slug-descriptivo.md`). El prefijo numérico debe coincidir de forma unívoca con el `id` declarado en el frontmatter YAML. Prohibido doble guión (`dev--XXX`).
5. **Cero colisiones de ID:** Antes de crear una tarea, releer el ID máximo **en el momento de crearla** -no al inicio de la sesión: con dos agentes escribiendo en paralelo la ventana de colisión es real- y asignar `max + 1`. Verificar antes de cerrar: `grep -h '^id: DEV-' backlog/tasks/*.md | sort | uniq -d` debe devolver **vacío**.

---

## 2. Ortogonalidad y Modelo de Datos ("Anti-Label-Smuggling")

1. **Ortogonalidad estricta:** Estado, Sprint, Release, Prioridad y Asignado son dimensiones 100% independientes. Prohibido usar "Backlog" como sprint, o deducir versiones fantasma como `vSprint 5` por pertenecer a un sprint. Si un campo no tiene valor, su valor visual canónico debe ser unívoco: `Sin Sprint`, `Sin Asignar` o `-`.
2. **Estado `ideas` de primera clase:** NUNCA normalizar o degradar `ideas` a `draft` en parsers o vistas.
3. **Simetría `sprint` vs `sprints`:** Al desasignar sprint en `ItemModal`, enviar `sprint: ""` y `targetSprint: ""` explícitamente para persistir la limpieza en disco.
4. **Metodología Lean / Kanban preferente:** En `gripm`, el desarrollo se opera preferentemente bajo flujo continuo Kanban con una cola de backlog priorizada y entregas agrupadas por valor en Releases, evitando la sobrecarga artificial de timeboxes de sprint cuando el ritmo ágil es continuo.
5. **Semántica de filtros de estado (Anti-Ambigüedad, DEV-287):** En selectores y chips de filtro, nombrar el conjunto de trabajo en curso como **"Estados activos"** (ES) / **"Active statuses"** (EN). Prohibido usar "Todos los estados" para referirse a estados no terminales, reservando "Todos" únicamente cuando la consulta incluya exhaustivamente `done`, `cancelled` y `dismissed`.

---

## 3. Entorno, Terminal y Estándares de UI

1. **Sandbox de Terminal (Prohibido `curl http://localhost:4100`):** El sandbox bloquea peticiones HTTP locales. Para validar si el servidor escucha en el puerto 4100, verificar el bind local en terminal o logs sin emitir peticiones de red directas. Para interactuar con la UI, usar `browser_subagent`.
2. **Estabilidad de layout (Zero-CLS):** El elemento raíz `html` debe declarar siempre `overflow-y: scroll; scrollbar-gutter: stable;` en `index.css`.
3. **Portales para modales y menús (DEV-129, DEV-130):** Renderizar overlays (`ConfirmModal`, dropdowns) vía `createPortal(..., document.body)` para evitar bugs de stacking context y containing block (`transform`, `backdrop-filter`).
4. **Cero `truncate` en confirmaciones:** En cajas de advertencia o confirmación, usar siempre `break-words text-xs leading-relaxed` para nunca cortar texto crítico con elipsis (`…`).
5. **Tipos de ítem dinámicos:** Emplear Proxy defensivo o `getItemTypeInfo` para renderizar cualquier clave personalizada sin provocar fallas.
6. **Anti-Suppression:** NUNCA apagar linters o ignorar tipos (`@ts-ignore`, `eslint-disable`) para tapar síntomas.
7. **Resolución absoluta de rutas:** Usar siempre `root: PKG_ROOT` y rutas absolutas en binarios CLI y plugins para ejecución global.
8. **Gobernanza de configuración pública (`.gripm/config.json`):** El archivo `.gripm/config.json` del repositorio define la configuración canónica OSS (`"language": "en"`, `"theme": "dark"`, `"density": "comfortable"`, `"methodology": "kanban"`, `"enabledTabs": { "kanban": true, "sprint": false, "release": true }`). Prohibido commitear en este archivo configuraciones o preferencias de entorno personales del desarrollador.
9. **Visibilidad de versión en entornos Sandbox (DEV-288):** Todo despliegue web/sandbox debe exponer su versión canónica visiblemente (ej. en el modal de atajos de teclado o cabecera) para permitir la certificación inmediata por parte de usuarios y QA sin recurrir a la consola de desarrollo.
10. **Trazabilidad de arquitectura (ADR, DEV-260):** Toda decisión de arquitectura con trade-offs reales que **no sea derivable del código** se registra como un ADR en `docs/adr/NNNN-slug.md` (numeración secuencial e inmutable, convención y estados en `docs/adr/README.md`). Los ADR aceptados son append-only: una decisión que cambia se documenta en un registro nuevo que marca al anterior como `Reemplazado`. `docs/ARCHITECTURE.md` describe el estado actual; el ADR explica el porqué. Al cerrar un sprint o release, el campo `ADR Recorded` de la especificación o registro de release apunta a la ruta del ADR correspondiente.
11. **Documentación bilingüe en un único archivo (DEV-309):** Para documentos comunitarios y de gobernanza (`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, etc.), se unifican ambos idiomas en el mismo archivo: versión en inglés arriba, versión en español debajo, con selector de anclajes de navegación rápida en la cabecera (`🌐 [English](#...) | [Español](#...)`). Queda prohibido bifurcar la documentación en archivos paralelos `*.es.md` (exceptuando temporalmente `README.md` / `README.es.md`).
