# Backlog: gripm
> Consolidado generado el 2026-10-06 por gripm ⚡

## Resumen de Estados

### 💡 Ideas / Discovery (2)

#### [DEV-061] Monitoreo y Telemetría de Agent Skills: Métricas de Uso, Frecuencia, Última Invocación y Auditoría
- **Prioridad**: `low` | **Tipo**: `feature`

Módulo de observabilidad, estadísticas y diagnóstico para el ecosistema de Agent Skills (`.agents/skills/`):
1. **Telemetría de Skills:** Monitorear de forma local y no invasiva la interacción de agentes de IA con las skills del proyecto:
   - Cuándo fue la última invocación o lectura de cada `SKILL.md`.
   - Contador acumulado de accesos / usos por proyecto.
   - Duración o pasos asociados si aplica.
2. **Métricas y Diagnóstico de Salud:** Proveer un panel visual dentro de Ajustes o Diagnóstico que permita:
   - Detectar qué skills son las más utilizadas y críticas para el flujo de trabajo.
   - Identificar skills inactivas, desactualizadas o nunca utilizadas para sugerir su depuración, actualización o archivado.
3. **Persistencia Segura:** Registro de telemetría en `.devboard/skills-telemetry.json` (aislado y con actualización silenciosa sin interferir con Git ni ensuciar diffs de código).

**Criterios de Aceptación:**
- [ ] #1 Registro no invasivo de accesos a skills (fecha/hora de última invocación y conteo) en .devboard/skills-telemetry.json
- [ ] #2 Panel visual de métricas de Agent Skills en SettingsView o vista de Diagnóstico
- [ ] #3 Tabla con listado de skills, última invocación y frecuencia de uso
- [ ] #4 Sugerencias automáticas de depuración para skills obsoletas o nunca consultadas
- [ ] #5 Integración opcional con comando CLI npm run skills --stats

---

#### [DEV-178] Previsibilidad de Puerto y Evitación de Saltos Innecesarios en Servidor Dev y CLI
- **Prioridad**: `low` | **Tipo**: `improvement`

Investigar y definir mecanismos para evitar que el servidor de desarrollo (`npm run dev`) y el CLI (`npm run board`) cambien inesperadamente de puerto (ej. saltando de 4100 a 4101 o 4102) durante una misma sesión de trabajo o ante reinicios de servidor.

**Problemas detectados:**
1. **Reinicio de servidor Vite (*Server Restart*):** `vite.config.ts` importa utilidades de backend/parsers (`scripts/backlogMdParser.ts`, `src/utils/legacyParser.ts`, etc.). Modificar estos módulos provoca un reinicio completo del servidor Vite (`server.restart()`). Si el socket anterior en macOS aún está cerrándose (estado `TIME_WAIT`), `findAvailablePort` detecta el puerto 4100 como ocupado y migra automáticamente a 4101.
2. **Política `strictPort: false`:** La configuración actual incrementa silenciosamente el puerto ante cualquier colisión o demora transitoria de bind, rompiendo la pestaña que el desarrollador tiene abierta en el navegador.
3. **Doble resolución redundante:** En `npm run board`, `bin/gripm.js` ejecuta `findAvailablePort(4100)` con binds temporales y luego `vite.config.ts` vuelve a invocar `findAvailablePort(4100)` antes del `server.listen()` definitivo, generando ráfagas de sockets de sondeo.

**Vías de solución a evaluar:**
- Evaluar `strictPort: true` con mensajes claros de diagnóstico para que el servidor falle explícitamente en lugar de cambiar de URL de forma silenciosa.
- Desacoplar `vite.config.ts` de dependencias de parsers para aislar el HMR de la UI y no disparar reinicios globales del servidor HTTP.
- Sincronizar el puerto resuelto en `bin/gripm.js` exportando `process.env.GRIPM_PORT` para evitar doble invocación de `findAvailablePort`.
- Reintento con backoff breve antes de declarar un puerto ocupado en reinicios calientes de Vite.

**Criterios de Aceptación:**
- [ ] #1 Evaluar tradeoff entre strictPort: true (fallo explícito y diagnóstico) vs strictPort: false (salto automático)
- [ ] #2 Evitar doble sondeo de puertos sincronizando el puerto entre bin/gripm.js y vite.config.ts vía process.env.GRIPM_PORT
- [ ] #3 Analizar desacoplamiento de imports de scripts en vite.config.ts para reducir disparadores de server restart completo
- [ ] #4 Preservar compatibilidad con configuración multi-puerto explícita (--port y GRIPM_PORT)

---

### 🚀 Ready for Deploy (1)

#### [DEV-189] Corregir el cuelgue del sondeo de puertos que bloqueaba npm test en CI
- **Prioridad**: `high` | **Tipo**: `bug`

`npm test` se colgaba en `ubuntu-latest` y mataba el job por `timeout-minutes`, con todos los asserts ya pasando. MacOS y Windows terminaban bien, lo que hacía el fallo parecer de infraestructura en lugar de un bug.

### Síntoma en CI

El log del job muestra la suite completa en verde y después nada:

```
🧹 Cleaned up test directory
🎉 Full verification passed successfully!
##[error]The operation was canceled.
```

El proceso terminó de trabajar pero nunca salió, así que el `&&` de `npm test` nunca avanzó al paso siguiente. Local el mismo script tarda 2s y sale con código 0.

### Causa raíz

`scripts/portUtils.js`, en `isPortAvailable`, sondea el puerto conectándose a él. El timeout del socket se fijaba con `socket.setTimeout(150)`, que **solo empieza a correr cuando el socket está establecido**. Un SYN descartado en vez de rechazado nunca llega a ese estado, así que la promesa nunca se resuelve.

En macOS el sistema operativo rechaza la conexión de inmediato y el proceso sale. En un runner Linux el puerto está filtrado, el SYN se descarta, y el `TCPConnectWrap` queda pendiente para siempre: mantiene vivo el event loop y Node nunca termina.

El test que disparaba el sondeo es DEV-177 en `scripts/verify-integration.js`, que resuelve la configuración real de Vite, y esa resolución llama a `findAvailablePort`.

### El error que cometí en el primer intento

La primera corrección añadió el timer guard con `guard.unref()`. Eso anula **justo el timer que debe resolver la promesa**: si es lo único que mantiene vivo el loop, Node sale antes de dispararlo y la promesa queda sin resolver. El síntoma pasó de "cuelgue silencioso" a `Detected unsettled top-level await`, que es el mismo bug con otro mensaje.

**Criterios de Aceptación:**
- [x] #1 `isPortAvailable` resuelve aunque el connect nunca se complete, mediante un timer guard independiente del estado del socket
- [x] #2 El timer guard no está `unref`'d y el socket se destruye en todas las rutas de salida
- [x] #3 Existe test de regresión que reproduce el SYN descartado de forma determinista, para que el bug no vuelva en silencio en macOS o Windows
- [x] #4 El test cubre también el comportamiento normal: puerto ocupado se reporta ocupado, puerto libre se reporta libre
- [x] #5 `npm test` sale con código 0 sin depender del sistema operativo

---

### 📋 Backlog / Draft (16)

#### [DEV-039] Sincronización no invasiva de árbol Git con estados de backlog y releases
- **Prioridad**: `low` | **Tipo**: `feature`

Inspección de solo lectura del árbol Git local (commits, ramas, tags) para correlacionar tareas y releases sin alterar el repositorio ni requerir permisos especiales. Modo sugerencia asistida.

**Criterios de Aceptación:**
- [ ] #1 Lector pasivo de Git usando child_process.execFile con sanitización estricta y timeout
- [ ] #2 Mapeo de tags de release semánticos a entidades Release de DevBoard
- [ ] #3 Detección de commits asociados a tareas mediante regex sobre mensajes de commit
- [ ] #4 Indicador de estado Git no invasivo en la UI (asistente de sugerencias, sin mutación forzada)
- [ ] #5 Garantía estricta de cero comandos de escritura de Git en cumplimiento con .agents/rules/git-approval.md

---

#### [DEV-057] Centro de Gestión de Releases: Inspección de Release Notes, Conjunto de Cards y Sincronización con Git
- **Prioridad**: `high` | **Tipo**: `feature`

Evolución integral del módulo de Releases hacia un centro de control y auditoría de entregas:
1. **Inspección de Releases:** Permitir visualizar en la aplicación la lista completa de releases gestionados con DevBoard, incluyendo:
   - Resumen y notas de release generadas (Markdown renderizado con títulos, mejoras y fixes).
   - Tabla interactiva con el conjunto exacto de tarjetas asociadas a esa versión (con código, título, autor y estado).
2. **Sincronización Pasiva con Git (Dependencia DEV-039):**
   - Correlacionar los releases declarados en DevBoard con los tags y commits reales del repositorio Git local mediante la inspección no invasiva de DEV-039.
   - Detectar discrepancias (ej: un release con tareas marcadas como listas pero sin tag Git generado, o commits en la rama que hacen referencia a tareas aún abiertas).
3. **Exportación de Changelog:** Botones de copia rápida en Markdown y exportación para GitHub Releases o actualización de `CHANGELOG.md`.

**Criterios de Aceptación:**
- [ ] #1 Vista de detalle por release con notas de cambio completas en Markdown renderizado
- [ ] #2 Listado filtrable de todas las tarjetas asociadas a cada versión gestionada
- [ ] #3 Correlación y badge de coherencia con tags locales de Git proveniente de la integración DEV-039
- [ ] #4 Asistente para detectar discrepancias entre código tageado y tareas asociadas
- [ ] #5 Botón de copiado en un click del changelog formateado para GitHub Releases

---

#### [DEV-134] El Serializador No Canonicaliza el Estado en el Frontmatter: Done/Done vs done/done Acumulados
- **Prioridad**: `low` | **Tipo**: `chore`

El frontmatter de las tareas escribe el estado **tal como viene**, sin
canonicalizarlo. Como el read path sí normaliza (`normalizeStatus` mapea `Done` a
`done`, `Draft` a `draft`), el sistema funciona, pero el dato persistido queda
inconsistente para siempre.

**Estado real de los 132 archivos de `backlog/tasks/`:**

| Valor escrito | Cantidad |
|---|---|
| `Done` (mayúscula) | 93 |
| `Draft` (mayúscula) | 3 |
| `done` (minúscula) | 12 |
| `draft` (minúscula) | 10 |
| `ready` | 8 |
| `review` | 6 |

Es decir, **96 de 132 tareas (73%) tienen el estado con mayúscula inicial**, y
esas 96 son exactamente las más antiguas: el proyecto empezó escribiéndose a mano
con `Done` y `Draft`, y desde que `normalizeStatus` existe el write path no
corrige lo que ya quedó.

**Por qué no rompe nada**: `normalizeStatus` se aplica al leer, así que la UI y
el MCP ven `done` correctamente. El costo es de higiene del dato versionado, y
crece: cada guardado reescribe el archivo con el valor que venga, de modo que la
divergencia se congela en vez de resolverse.

**Mismo patrón que DEV-127, otra dimensión**: DEV-127 eliminó que el serializador
fabricara contenido que el usuario nunca escribió. Acá no fabrica, pero tampoco
**normaliza**: escribe un valor no canónico. En ambos casos el write path debería
garantizar que lo que llega al disco es la forma canónica del modelo.

**Consecuencia práctica más grave que la estética**: cualquier herramienta que lea
el frontmatter de forma directa sin pasar por el parser ve dos valores distintos
para el mismo estado. Un `grep '^status: done'` sobre los archivos devuelve 12
resultados de 105 tareas completadas.

**Criterios de Aceptación:**
- [ ] #1 `serializeBacklogMd` escribe el estado usando la forma canónica en minúscula, independientemente de cómo llegue en el objeto de entrada
- [ ] #2 Verificar con un round-trip que una tarea creada con `status: "Done"` se persiste como `status: "done"` y se relee como `done`
- [ ] #3 Se agrega un test de regresión en `scripts/test-parser.js` que cubra las variantes con mayúscula inicial (`Done`, `Draft`, `In Progress`, `Ready`, `Testing`, `Review`)
- [ ] #4 Se normalizan los 96 archivos existentes que tienen el estado con mayúscula, sin alterar su contenido más allá del campo `status`
- [ ] #5 La normalización preserva cualquier otro campo del frontmatter, incluidos los no canónicos (`labels`, `assignees`) y los nombres de sección
- [ ] #6 Se documenta en el plan el criterio: en el write path, todo campo del modelo que tenga forma canónica se escribe en forma canónica, nunca "tal como vino"
- [ ] #7 `npx tsc --noEmit` finishes con código 0
- [ ] #8 `npm test` finishes con código 0
- [ ] #9 `npm run backlog:check` finishes con código 0

---

#### [DEV-136] Sistema de Estimación en Settings Activación Selector Fibonacci vs Tshirt y Configuración Persistente
- **Prioridad**: `high` | **Tipo**: `feature`

Proveer en DevBoard la capacidad de configurar el sistema de estimación de tareas a nivel de proyecto desde la vista de Configuración (SettingsView).

### Requerimientos Clave:
1. **Activación / Desactivación Soberana:** El usuario debe poder activar o desactivar la estimación de ítems mediante un toggle principal en Settings.
2. **Selección de Método de Estimación:** Cuando la estimación está activa, el usuario puede elegir entre dos metodologías canónicas de la industria:
   - **Story Points (Fibonacci):** Escala numérica estándar [0, 1, 2, 3, 5, 8, 13, 21].
   - **T-Shirt Sizes:** Escala cualitativa por tallas [XS, S, M, L, XL, XXL].
3. **Previsualización Interactiva:** La UI de configuración debe mostrar una vista previa visual de la escala elegida (pills con badges de colores/estilos del sistema).
4. **Persistencia Reactiva:** La preferencia se almacena en el archivo `.devboard/config.json` dentro del campo `estimation` y se propaga en tiempo real al estado global del cockpit.
5. **No Destructividad:** Desactivar la estimación oculta la funcionalidad en la UI pero preserva los valores asignados previamente en los archivos Markdown locales.

**Criterios de Aceptación:**
- [ ] #1 Definir tipos canónicos en src/types.ts: EstimationMethod ('fibonacci' | 'tshirt'), EstimationConfig ({ enabled: boolean, method: EstimationMethod }) y extender DevBoardConfig con estimation?: EstimationConfig
- [ ] #2 Inicializar la configuración de estimación con valores seguros por defecto (enabled: false, method: 'fibonacci') para garantizar retrocompatibilidad total
- [ ] #3 Crear sección dedicada 'Estimación de Ítems' en src/components/SettingsView.tsx con un switch/toggle accesible e intuitivo para activar o desactivar la funcionalidad
- [ ] #4 Implementar selector interactivo de método entre 'Story Points (Fibonacci)' y 'T-Shirt Sizes (Tallas de Remera)' con descripción y previsualización gráfica de las escalas correspondientes
- [ ] #5 Persistir los cambios en .devboard/config.json mediante onSaveConfig y sincronizar reactivamente el estado en App.tsx sin recargar la aplicación
- [ ] #6 Asegurar preservación de datos no destructiva: si la estimación se desactiva en Settings, las estimaciones existentes en los archivos Markdown no se borran ni modifican
- [ ] #7 Soportar reversión limpia de cambios mediante el botón 'Deshacer cambios' de Settings restaurando el estado previo de configuración

---

#### [DEV-137] Persistencia y Modelo de Estimación en Markdown Frontmatter y Soporte MCP
- **Prioridad**: `high` | **Tipo**: `feature`

Incorporar el soporte del atributo de estimación en el motor de almacenamiento de DevBoard, garantizando persistencia soberana en archivos Markdown individuales (backlog/tasks/*.md), el archivo consolidado (BACKLOG.md) y los contratos de herramientas MCP.

### Requerimientos Técnicos:
1. **Modelo de Dominio Tipado:**
   - Añadir `estimate?: string | number;` en `BacklogItem` (`src/types.ts`) y `BacklogMdTask` (`scripts/backlogMdParser.ts`).
   - Normalización de valores: Story Points numéricos (0, 1, 2, 3, 5, 8, 13, 21) o strings de tallas canónicas (XS, S, M, L, XL, XXL).
2. **Parser y Serializador Markdown (backlogMdParser.ts):**
   - Lectura defensiva de `estimate:` en frontmatter YAML.
   - Serialización limpia: si `task.estimate` está definido, escribir `estimate: ${val}` respetando el formato YAML.
   - Preservación en sincronización y regeneración de `BACKLOG.md`.
3. **Contratos API y Middleware (vite.config.ts):**
   - Propagar `estimate` en endpoints de tareas sin descarte de payload.
4. **Herramientas MCP (scripts/mcp-server.ts y bin/devboard-mcp.js):**
   - Permitir asignar o modificar la estimación desde `devboard_create_task` y `devboard_update_task`.
   - Exponer `estimate` en las consultas de `devboard_get_task` y `devboard_list_tasks`.
5. **Idempotencia y Retrocompatibilidad:**
   - Tareas preexistentes sin estimación continúan funcionando sin errores (`estimate: undefined`).

**Criterios de Aceptación:**
- [ ] #1 Extender la interfaz BacklogItem en src/types.ts y BacklogMdTask en scripts/backlogMdParser.ts con el campo opcional estimate?: string | number
- [ ] #2 El parser parseBacklogMd extrae de forma robusta el atributo estimate del frontmatter YAML tanto para números (Story Points) como para cadenas (T-Shirt sizes)
- [ ] #3 El serializador serializeBacklogMd serializa de forma canónica y limpia el campo estimate: en el frontmatter de backlog/tasks/*.md y BACKLOG.md
- [ ] #4 Actualizar los endpoints en vite.config.ts (/api/tasks, /api/backlog) para propagar el campo estimate en lecturas y escrituras sin pérdida de atributos
- [ ] #5 Extender las herramientas MCP devboard_create_task y devboard_update_task para aceptar y procesar el parámetro estimate de forma nativa
- [ ] #6 Exponer el valor de estimate en devboard_get_task y devboard_list_tasks para consumo eficiente por agentes de IA
- [ ] #7 Añadir tests de regresión en scripts/test-parser.js verificando parseo, serialización e idempotencia de tareas con y sin estimación

---

#### [DEV-138] Selector de Estimación en ItemModal y Badges Visuales en Tarjetas Kanban
- **Prioridad**: `medium` | **Tipo**: `ux`

Diseñar e implementar la experiencia de usuario (UX) para la asignación y visualización de estimaciones en la interfaz gráfica del cockpit:

### 1. Edición y Asignación en ItemModal (src/components/ItemModal.tsx):
- Visualización condicional: el selector de estimación sólo es visible si `config.estimation?.enabled === true`. Si está desactivado, el campo no se dibuja, manteniendo el modal limpio y sin distracciones.
- Control interactivo moderno:
  - **Modo Story Points (Fibonacci):** Segmented control o fila de botones tipo pill con los valores canónicos [0, 1, 2, 3, 5, 8, 13, 21], destacando con estilo activo el punto seleccionado.
  - **Modo T-Shirt Sizes:** Pills interactivas con las tallas estándar [XS, S, M, L, XL, XXL].
  - Botón o acción de reseteo (`Sin estimar`) para desasignar la estimación de la tarea con un solo click.
- Integración en `populateFromItem` y transmisión en el payload de guardado `onSave`.

### 2. Visualización en Tarjetas Kanban (src/components/ItemCard.tsx):
- Badge discreto y elegante en el pie o encabezado de la tarjeta Kanban.
- Representación contextual:
  - Para Fibonacci: ej. `5 pts` o badge con icono sutil de estimación + número.
  - Para T-Shirt: ej. badge con `M`, `L`, etc. con estilo distintivo.
- Compatibilidad perfecta con Dark Mode y Light Mode (tokens Tailwind existentes en el proyecto).
- Zero Layout Shifts: dimensiones estables para no alterar la altura ni el drag-and-drop de las tarjetas en el tablero.

**Criterios de Aceptación:**
- [ ] #1 En ItemModal.tsx, mostrar el campo y control de estimación únicamente si config.estimation?.enabled es true
- [ ] #2 Renderizar un selector ergonómico adaptativo según el método configurado: pills/botones para Fibonacci (0, 1, 2, 3, 5, 8, 13, 21) o T-Shirt Sizes (XS, S, M, L, XL, XXL)
- [ ] #3 Permitir asignar, cambiar o desasignar (limpiar estimación) con feedback visual inmediato y persistencia en onSave hacia el backend
- [ ] #4 En ItemCard.tsx, renderizar un badge compacto de estimación en la tarjeta Kanban únicamente si la estimación está habilitada y el ítem tiene un valor asignado
- [ ] #5 Diseñar el badge de ItemCard con tokens semánticos del sistema, excelente contraste en Light y Dark Mode y cero saltos de layout (Zero-CLS)
- [ ] #6 Garantizar que al desactivar la estimación desde Settings, los elementos visuales en ItemModal e ItemCard se oculten inmediatamente sin alterar los datos persistidos en disco

---

#### [DEV-139] Métricas Agregadas en SprintView Tabla de Backlog y Filtros por Estimación
- **Prioridad**: `medium` | **Tipo**: `feature`

Incorporar inteligencia analítica ágil y visibilidad consolidada en DevBoard a través de métricas agregadas de estimación en la vista de Sprints (SprintView), vista tabular de Backlog y filtros avanzados:

### 1. Métricas Agregadas en SprintView (src/components/SprintView.tsx):
- **Modo Story Points (Fibonacci):**
  - Conteo total de Story Points del sprint (capacidad comprometida).
  - Story points completados / listos (avance en puntos vs avance en tarjetas).
  - Porcentaje de velocidad/avance ponderado por puntos.
- **Modo T-Shirt Sizes:**
  - Resumen visual de distribución por tallas (ej. `2 XS · 3 S · 5 M · 1 L`).
- Visibilidad condicional: estas métricas solo se renderizan si `config.estimation?.enabled === true`.

### 2. Columna de Estimación en Vista Tabular:
- En la tabla de tareas de Sprints y Backlog, incluir columna "Estimación" que muestre el valor con su formato adecuado (badge compacto).
- Soportar ordenamiento por estimación (numérico para Fibonacci, orden jerárquico canónico XS < S < M < L < XL < XXL para T-Shirt).

### 3. Filtros Avanzados (src/components/FilterBar.tsx y AdvancedFiltersPopover.tsx):
- Permitir filtrar por estimación cuando esté activa.
- Selector multi-talla para T-Shirt sizes o rangos de Story Points.
- Los filtros operan de manera 100% ortogonal respecto a sprint, release, prioridad y tipo.

**Criterios de Aceptación:**
- [ ] #1 En SprintView.tsx, calcular y visualizar el rollup de Story Points (puntos totales planificados, puntos completados o en ready, y puntos pendientes) cuando el método es Fibonacci
- [ ] #2 En SprintView.tsx, calcular y visualizar el desglose cuantitativo por tallas (ej: 2 XS, 4 M, 1 XL) cuando el método es T-Shirt Sizes
- [ ] #3 Agregar columna 'Estimación' en la tabla de tareas de SprintView y vista de Backlog, con capacidad de ordenamiento ascendente y descendente
- [ ] #4 Incorporar filtro por estimación en AdvancedFiltersPopover.tsx para filtrar tarjetas por tallas o rangos de Story Points cuando la estimación esté habilitada
- [ ] #5 Garantizar recálculo reactivo automático de métricas y totales en tiempo real ante modificaciones de estado o estimación en las tareas
- [ ] #6 Respetar el Principio de Ortogonalidad de Dimensiones: las métricas de estimación complementan pero nunca reemplazan ni interfieren con los conteos de tareas por estado ni con las dimensiones de sprint o release

---

#### [DEV-142] Activos Visuales y Storytelling del README: Hero Screenshot, Galería y Propuesta de Valor
- **Prioridad**: `high` | **Tipo**: `docs`

Para una herramienta visual e interactiva como DevBoard, la presencia de capturas de alta calidad y un pitch narrativo inmediato es el factor #1 de conversión y comprensión en la comunidad de código abierto. Esta tarea abarca la creación de assets gráficos y la mejora del storytelling en el README bilingüe.

**Criterios de Aceptación:**
- [ ] #1 Crear carpeta `docs/screenshots/` para almacenar imágenes y capturas optimizadas del cockpit
- [ ] #2 Capturar o generar imágenes del Kanban Board en Dark Mode y Light Mode con datos de demo limpios
- [ ] #3 Capturar vistas clave: Sprint Hub con métricas y Release Assembler con notas de versión compiladas
- [ ] #4 Insertar hero image en la parte superior de README.md y README.es.md con badge de demostración visual
- [ ] #5 Agregar sección 'Capturas de Pantalla' / 'Screenshots' bilingüe en ambos READMEs con descripciones concisas
- [ ] #6 Fortalecer el storytelling y propuesta de valor inicial: 'Tu hoja de ruta no debería vivir en servidores ajenos' y destacar la soberanía local-first con agentes IA

---

#### [DEV-164] Code-Splitting del Bundle de Producción con React.lazy y manualChunks en Rollup
- **Prioridad**: `medium` | **Tipo**: `refactor`

El bundle de producción actual de la aplicación se compila en un único chunk monolítico de 647.44 kB (`dist/assets/index-CBy5mJyL.js`), provocando la advertencia de Vite / Rollup:
`(!) Some chunks are larger than 500 kB after minification.`

### Diagnóstico de Causa Raíz

1. **Cero `React.lazy` / import dinámico en la UI:** Componentes de gran porte como `SettingsView` (1.993 líneas) y `ReleaseAssembler` (1.202 líneas) se importan sincrónicamente en el arranque de `src/App.tsx`, a pesar de que el usuario no los necesita durante la carga inicial del tablero.
2. **Ausencia de `manualChunks`:** No hay partición de dependencias de terceros (`vendor`) en `vite.config.ts`, por lo que `react`, `react-dom` y librerías auxiliares se fusionan en el mismo chunk de la aplicación, invalidando el cacheo eficiente de navegadores entre releases.

### Objetivo

Implementar carga perezosa (`React.lazy` con `Suspense`) para vistas no críticas, reduciendo el trabajo de transformación que el servidor de desarrollo realiza en el arranque en frío.

> [!CAUTION]
> **Corrección de premisa (2026-10-05):** la mitad de esta tarea optimiza un artefacto que el producto **no sirve**. Verificado:
>
> ```
> bin/gripm.js:219   createServer({ root: PKG_ROOT, configFile: 'vite.config.ts' })
> index.html:56      <script type="module" src="/src/main.tsx">   ← NO /assets/
> ```
>
> El CLI arranca un **dev server de Vite contra `src/`**, no un servidor de estáticos sobre `dist/`. En consecuencia:
>
> - `dist/` viaja en el tarball pero **nadie lo carga** (752 KB de peso muerto en el paquete).
> - `manualChunks` modifica el output de `npm run build`, que **no es lo que el usuario recibe**. Configurarlo no cambia la experiencia de nadie.
> - La advertencia de Vite sobre chunks >500 kB aparece en el output de `build`, no en el arranque real del producto.
>
> **Lo que sí es válido:** `React.lazy` reduce los módulos que el dev server debe transformar bajo demanda en el arranque en frío. Ese es un efecto real y medible.
>
> **Lo que queda por decidir fuera de esta tarea:** si el producto debe servir estáticos (`vite preview`) en vez de dev server. Es una decisión de arquitectura con trade-offs reales (HMR y source maps gratis contra cold start más lento y tarball más chico) y **no** corresponde tomarla dentro de un refactor de code-splitting.

### Objetivo (corregido)

Reducir el trabajo de transformación en el arranque en frío de la interfaz mediante carga diferida de vistas no críticas.

**Criterios de Aceptación:**
- [ ] #1 Implementar carga diferida (`React.lazy` y `<Suspense fallback={...}>`) en `src/App.tsx` para `SettingsView` y `ReleaseAssembler`
- [ ] #2 Verificar que el arranque en frío transforma menos módulos que antes: el conteo de módulos bajo demanda servidos en la carga inicial disminuye respecto de la línea de base medida al inicio de la tarea
- [ ] #3 Medir y registrar la línea de base y el resultado del AC #2 en las notas de la tarea, con los comandos usados — sin ese registro el AC no es verificable
- [ ] #4 ~~Configurar `manualChunks`~~ **retirado**: no afecta el artefacto que el producto sirve (ver la corrección de premisa)
- [ ] #5 ~~El chunk principal se reduce por debajo de 450 kB~~ **retirado**: mide `dist/`, que no se sirve
- [ ] #6 La suite de pruebas `npm test` y el check de publicación `npm run publish:check` pasan con exit code 0

---

#### [DEV-165] Modularización de vite.config.ts y Extracción de Capa de Servidor a server/
- **Prioridad**: `medium` | **Tipo**: `refactor`

`vite.config.ts` se ha convertido en un monolito de 2.530 líneas y 110 KB. Además de la configuración del bundler y plugins de Vite, contiene la API HTTP completa del producto, middleware de seguridad, lógica de Server-Sent Events (SSE), registro de proyectos multi-repo, watchers de disco y un parser embebido de Markdown.

### Problema

1. **Fricción para contribuidores de código abierto:** Un archivo de configuración de más de 2.500 líneas intimida a nuevos contribuidores y dificulta el code review y la trazabilidad de cambios en PRs.
2. **Distribución en el tarball:** El archivo viaja directamente en el tarball publicado en npm (`package.json: files`), mezclando la configuración del compilador con el backend embebido.
3. **Violación de Responsabilidad Única (SRP):** Configuración de empaquetado, lógica de base de datos Markdown y endpoints REST residen en el mismo archivo.

### Objetivo

Extraer la capa de backend a módulos dedicados bajo un directorio `server/` (o `src/server/`):
- `server/middleware/security.ts`: Validaciones de CSRF (Origin), Host (DNS Rebinding) y Content-Type.
- `server/routes/api.ts`: Endpoints REST (`/api/data`, `/api/tasks`, `/api/sprints`, `/api/releases`, etc.).
- `server/routes/sse.ts`: Gestión de clientes de Server-Sent Events y notificaciones de live reload.
- `server/services/registry.ts`: Detección y persistencia de proyectos multi-repo.
- Reducir `vite.config.ts` a un archivo esbelto de configuración de plugins y montaje de middleware.

**Criterios de Aceptación:**
- [ ] #1 Extraer middleware de seguridad (CSRF, DNS Rebinding, Content-Type) a `server/middleware/security.ts`
- [ ] #2 Modularizar rutas de API REST en submódulos temáticos (`server/routes/`)
- [ ] #3 Desacoplar la gestión de Server-Sent Events (SSE) a `server/sse/`
- [ ] #4 Reducir `vite.config.ts` a menos de 300 líneas de código
- [ ] #5 La suite completa de tests de seguridad (`scripts/test-api-security.js`) y de SSE (`scripts/verify-sse.js`) pasan con exit code 0
- [ ] #6 `npm test`, `npm run backlog:check` y `npm run publish:check` pasan sin regresiones

---

#### [DEV-167] Erradicación de 52 any en src/ y Alineación Estricta con Skill Principal Engineer
- **Prioridad**: `low` | **Tipo**: `refactor`

En la base de código de `src/` persisten aproximadamente 52 a 55 anotaciones explícitas de tipo `any`, a pesar de que el compilador TypeScript opera con `"strict": true` y la directiva técnica `principal-engineer` exige tipado riguroso sin evasiones de linter.

### Diagnóstico de Causa Raíz

1. **Manejo de excepciones:** Más de 25 ocurrencias provienen del patrón `catch (err: any)` en `src/App.tsx`, `ReleaseAssembler.tsx`, `SettingsView.tsx` y diversos modales, donde luego se accede a `err.message`.
2. **Callbacks genéricos en vistas:** Parámetros como `retroData?: any` en `handleCompleteSprint` (`App.tsx`, `SprintView.tsx`) y `value: any` en `handleUpdateColumnField` (`SettingsView.tsx`) y `updateItemField` (`ImportWizardModal.tsx`).
3. **Manejadores de eventos y red:** Propiedades como `data: any`, `items?: any[]` y `(evt: any)` en `src/api.ts`.

### Problema

La presencia de `any` debilita el contrato de tipos en tiempo de compilación y contradice el guardrail de la skill `principal-engineer`, restándole credibilidad normativa al sistema de diseño y arquitectura.

### Objetivo

Refactorizar los tipos en `src/` para eliminar las anotaciones `any`:
- Migrar cláusulas de captura a `catch (err: unknown)` usando asistentes seguros de extracción de mensaje (ej. `getErrorMessage(err)`).
- Tipar formalmente `retroData` (interfaz `SprintRetroData`), payloads de Server-Sent Events y campos dinámicos de formularios.
- Lograr que `grep -rn --include="*.ts" --include="*.tsx" ": any" src/` devuelva cero ocurrencias.

**Criterios de Aceptación:**
- [ ] #1 Reemplazar `catch (err: any)` por `catch (err: unknown)` con validación defensiva en `src/App.tsx` y modales
- [ ] #2 Tipar estrictamente `retroData`, payloads SSE y firmas de actualización en `src/api.ts`, `SettingsView.tsx` y `SprintView.tsx`
- [ ] #3 `grep -rn --include="*.ts" --include="*.tsx" ": any" src/` retorna 0 coincidencias
- [ ] #4 `npx tsc --noEmit` compila limpiamente con 0 errores de tipado estricto
- [ ] #5 La suite unificada de tests `npm test` pasa íntegra con exit code 0

---

#### [DEV-172] Cobertura de Tests para la Capa de UI: Lógica Derivada y Accesibilidad de Componentes
- **Prioridad**: `high` | **Tipo**: `chore`

La suite de verificación cubre parser, API, seguridad de red, MCP, CLI, SSE, locking optimista e importación. **Ninguno de los 9 scripts importa un componente React.** Para ~14.000 líneas de `src/` con 6 componentes de más de 1.100 líneas cada uno, la única cobertura de la interfaz es `audit:ux`, que es un análisis estático de clases Tailwind.

### Evidencia (verificada sobre `6a50230`)

```
$ grep -rln "ItemCard\|KanbanBoard\|SprintView" scripts/*.js scripts/*.ts
(vacío)

$ grep -E "test|jest|vitest|playwright|jsdom|testing-library" package.json
(vacío — no hay framework de test instalado)
```

### Consecuencia

Una regresión en el drag-and-drop del Kanban, en el ordenamiento de tarjetas, en el focus trap de un modal o en la normalización de estados que se renderiza **pasa la suite en verde**. El gate más caro del proyecto (`npm test`, 9 scripts) no cubre la capa donde el usuario pasa el 100 % del tiempo.

### Tension real con el proyecto

El producto sostiene una filosofía zero-deps: los tests son scripts con `node:assert`, sin framework. Introducir Vitest + Testing Library contradice esa filosofía. La tarea debe resolver esa tensión explícitamente, no ignorarla.

### Enfoque propuesto en dos etapas

**Etapa 1 (sin framework, coherente con la filosofía actual):** extraer la lógica determinista de los componentes a módulos puros en `src/utils/` y cubrirla con `node:assert`. El precedente ya existe: `src/utils/statusMeta.ts` (DEV-162) extrajo `normalizeStatus()` y la tabla de estilos como módulo puro testeable. `KanbanBoard`, `SprintView` e `ItemCard` consumen hoy los datos a través de ese módulo, de modo que las funciones de derivación de columna, agrupación y filtrado son candidatas directas.

**Etapa 2 (requiere decisión de stack):** cubrir comportamiento de render e interacción. Implica elegir framework y documentar el trade-off en `AGENTS.md`.

### Objetivo

Que una regresión en la lógica que alimenta la UI falle la suite, sin adoptar un stack de testing que contradiga la filosofía del producto sin antes haberlo decidido y documentado.

**Criterios de Aceptación:**
- [ ] #1 Existe al menos un archivo en `scripts/` que importe desde `src/utils/` o `src/components/` y ejecute aserciones con `node:assert`, y está conectado a la cadena de `npm test`
- [ ] #2 La lógica de derivación de columnas y agrupación del Kanban está extraída a un módulo puro en `src/utils/` y cubierta por tests: una entrada known que produce una salida incorrecta hace fallar el test
- [ ] #3 La normalización de estados legacy→canónico de `src/utils/statusMeta.ts` tiene test que ejercita los 4 aliases (`backlog`, `in_progress`, `testing_qa`, `finish`) contra `normalizeStatus()`
- [ ] #4 Existe un test que verifica que las etiquetas de estado renderizadas provienen de `status.*` y no de literales: ante una locale alternativa, la etiqueta cambia
- [ ] #5 Si la Etapa 2 queda fuera de alcance, la tarea documenta explícitamente en sus notas que la cobertura de render no existe y cuál fue la razón — **no se deja implícito**
- [ ] #6 Si se introduce un framework de test en la Etapa 2, la decisión queda registrada en `AGENTS.md` con el trade-off explícito frente a la filosofía zero-deps
- [ ] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0 y `npm run build` sin errores

---

#### [DEV-180] Evaluación y Migración Arquitectónica de Dependencias Core a React 19 y Tooling Moderno
- **Prioridad**: `medium` | **Tipo**: `improvement`

Planificar y ejecutar la migración arquitectónica integral de las dependencias principales del stack hacia sus versiones mayores modernas (React 19, TypeScript moderno y plugins actualizados de Vite).

**Contexto del parche temporal:**
Durante el monitoreo automatizado de dependencias (DEV-175), Dependabot intentó actualizar automáticamente `react`/`react-dom` a v19.x y `typescript`/`@types/node` a versiones mayores. Esto provocó fallos en el pipeline de CI debido a incompatibilidades de tipos en `vite.config.ts` (TS2769: sobrecargas incompatibles de `@vitejs/plugin-react`) y diferencias en las definiciones de tipos de React 19. Para preservar la estabilidad de la rama `main` en producción, se aplicó una regla de contención en `.github/dependabot.yml` ignorando actualizaciones `semver-major`.

**Alcance de la resolución de fondo:**
1. **Auditoría de compatibilidad de React 19:**
   - Evaluar soporte y compatibilidad de `@vitejs/plugin-react`, `lucide-react` y Tailwind CSS con React 19.
   - Revisar tipado estricto en componentes (adaptar definiciones de `FC`, `ReactNode`, eventos sintéticos y ref handling nativo de React 19).
2. **Actualización de Vite y Tooling:**
   - Evaluar actualización coordinada de Vite (`vite` v6+) y sus plugins asociados.
   - Alinear `@types/react`, `@types/react-dom` y `@types/node` a las versiones meta.
3. **Validación de Rendimiento y Cero Regresiones:**
   - Comprobar compatibilidad con el sistema de portales (`createPortal` en `ConfirmModal` y menús contextuales).
   - Verificar estabilidad de renderizado en Kanban y vistas de tabla (Zero-CLS y 60 FPS).
4. **Desbloqueo de Dependabot:**
   - Retirar las reglas de `ignore` en `.github/dependabot.yml` una vez consolidado el nuevo baseline arquitectónico.

**Criterios de Aceptación:**
- [ ] #1 Auditar matriz de breaking changes de React 19 y compatibilidad con el catálogo de dependencias del proyecto
- [ ] #2 Actualizar react, react-dom, @types/react y @types/react-dom en package.json resolviendo contratos de tipos
- [ ] #3 Actualizar vite.config.ts y @vitejs/plugin-react garantizando compilación estricta (npx tsc --noEmit con 0 errores)
- [ ] #4 Verificar suite de pruebas completa (npm test), build de producción y empaquetado standalone (binarios bin/)
- [ ] #5 Remover los ignores de semver-major en .github/dependabot.yml para React y sus tipos

---

#### [DEV-184] Endurecimiento del Playbook: Consistencia de Estados T0-T5, Opt-outs en audit:ux y Reglas Multilínea
- **Prioridad**: `medium` | **Tipo**: `improvement`

Resolver las inconsistencias menores identificadas en el marco de trabajo `gripm-playbook` (hallazgos R8, R9 y R12 del informe de auditoría):

1. **Consistencia de Transiciones (R9):** Alinear los IDs de transición en `docs/sprints/SPRINT_SPEC_TEMPLATE.md` y `TEAM_PLAYBOOK.md` para coincidir de forma unívoca con `STATE_MACHINE.md` (T0 a T5, eliminando la referencia ficticia a T6).
2. **Soporte de Opt-outs (R8):** Implementar la propiedad `exclude` documentada en `.uxaudit.json` dentro de `audit-ux-code.cjs`, o limpiar la documentación en caso de ser redundante.
3. **Robustez en Motor de Reglas UX (R12):** Corregir el contador de delimitadores en `buildUnits` para ignorar flechas de funciones (`=>`) y prevenir falsos positivos de UX-001 en inputs multilínea.

**Criterios de Aceptación:**
- [ ] #1 Corregir IDs de transición en SPRINT_SPEC_TEMPLATE.md y TEAM_PLAYBOOK.md alineándolos con STATE_MACHINE.md
- [ ] #2 Implementar soporte de exclude en audit-ux-code.cjs o unificar la especificación en la documentación
- [ ] #3 Corregir la heurística de cierre de etiquetas en buildUnits para evitar falsos positivos con arrow functions multilínea
- [ ] #4 Agregar test fixture multilínea en la suite de tests del playbook
- [ ] #5 Validar que npm run check:all pase en verde en gripm-playbook

---

#### [DEV-186] Refactor de Tipos Core: Renombrar DevBoardConfig a GripmConfig y Unificar Interfaces
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

Renombrar la interfaz canónica DevBoardConfig a GripmConfig en src/types.ts y propagar el cambio en los ~10 módulos consumidores (src/App.tsx, SettingsView.tsx, api.ts, etc.) manteniendo retrocompatibilidad mediante un type alias deprecated export type DevBoardConfig = GripmConfig;. Esto completa la unificación de identidad de tipos post-rebranding sin romper contratos externos.

**Criterios de Aceptación:**
- [ ] #1 Definir GripmConfig como la interfaz canónica de configuración en src/types.ts
- [ ] #2 Exportar export type DevBoardConfig = GripmConfig como alias con anotación @deprecated para retrocompatibilidad total
- [ ] #3 Actualizar las referencias e importaciones en src/App.tsx, src/components/SettingsView.tsx, src/api.ts y demás módulos hacia GripmConfig
- [ ] #4 Verificar que npx tsc --noEmit pase con 0 errores en modo estricto
- [ ] #5 Validar que npm test y npm run backlog:check pasen con código 0

---

#### [DEV-188] Migración al motor de audit:ux upstream: fin del fork, baseline y pérdida de INVARIantes locales
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Dar de baja el fork local de `scripts/audit-ux-code.cjs` y adoptar el motor de
`@gripm/playbook` como consumidora común. Es la última pieza de la deuda que dejó
DEV-166, que forkeó el motor para poder meter baselining antes de que existiera
upstream.

### Estado actual del fork

`gripm/scripts/audit-ux-code.cjs` está excluido de `playbook:sync` de forma deliberada
(`scripts/sync-playbook.mjs`, nota de DEV-166). Divergencia medida contra upstream:

- **270 líneas** que solo existen en `gripm`
- **358 líneas** que solo existen en upstream

La divergencia no es cosmética: el fork tiene el sistema de baselining completo
(`fingerprint`, multiplicidad, ERROR-nunca-absorbido) y los invariantes `ENV-001` y
`ENV-002`, ninguno de los cuales existe upstream todavía.

El riesgo del fork no es técnico sino de contrato: **`.agents/skills/` sí se sincroniza,
así que el skill documenta un comportamiento que el motor que corre no tiene.** Un
fork se salta por construcción el control que `validate-repo.mjs` upstream existe para
aplicar.

### Qué resuelve upstream

`@gripm/playbook` ya aterrizo las tres piezas:

1. **Rediseño de `buildUnits`** con anidamiento real y tres granularidades por unidad (`text`, `ownContent`, `scopeText`). Resuelve la causa raíz de UX-010: el segmentador viejo contaba `<` contra `>` como caracteres y no distinguía un self-closing de un elemento con hijos.
2. **Eliminación del `break` por archivo.** Resultó ser la causa del bug de `needsContent`: cortaba el recorrido antes del segundo caso, lo que hacía el fixture de 2 casos incomprobable.
3. **Baselining como capacidad del auditor**, con `fingerprint` idéntico al local.

### Decisión tomada con upstream

- `ENV-001` (gutter de scrollbar) **no se promueve**: ya está cubierto por el test 6.3 de `scripts/test-parser.js`, que lee `src/index.css` directamente y es independiente del fork. Solo hay que desacoplar los 4 asserts de 6.2 que sí dependen del archivo bifurcado.
- `ENV-002` (`truncate` en diálogo) queda en discusión upstream; se promueve a firma propia cuando lo decidan.
- **La Tarea 1 (dejar de preservar el archivo) NO está bloqueada por `ENV-002`.** Está bloqueada porque el auditor upstream no expone API, así que no hay forma de componer sin bifurcar. Upstream libera la extensión en **2.2.0**.
- **Mientras tanto: seguir bifurcado, con fecha de fin.**

### Riesgo de la migración

El baseline actual quedó construido sobre una señal no confiable: UX-010 tenía
~101 falsos positivos sobre 191 candidatos. Esas entradas están lockeadas y
`audit:ux` reporta 0, así que nadie las va a limpiar jamás.

**No se debe correr `--update-baseline` a ciegas sobre las 487 observaciones.** Eso
dejaría el gate verde con 101 supresiones falsas y congelaría el problema.

**Criterios de Aceptación:**
- [ ] #1 Registrar la fecha de fin del fork: dejar de preservar `scripts/audit-ux-code.cjs` en `sync-playbook.mjs` cuando `@gripm/playbook@2.2.0` esté publicado, y quitar la nota que lo justifica
- [ ] #2 Mover `scripts/audit-ux-baseline.json` a la raíz del proyecto (`./audit-ux-baseline.json`), que es donde upstream lo ancla vía `path.join(ROOT, BASELINE_NAME)`
- [ ] #3 Agregar el script `audit:ux:baseline` a `package.json`; hoy no existe y la guía upstream lo invoca
- [ ] #4 Desacoplar los 4 asserts de la sección 6.2 de `scripts/test-parser.js` que dependen de la existencia de `ENV_GUTTER` y `auditEnvInvariants`, conservando 6.1 (UX-009 acotado a diálogos) y 6.3 (gutter leído del CSS)
- [ ] #5 Regenerar el baseline **con revisión manual de los hallazgos**, no con `--update-baseline` ciego: separar lo genuino de los falsos positivos de UX-010 antes de snapshotear
- [ ] #6 Confirmar que `ENV-002` (truncate en diálogo) queda promovido upstream o, si no, reimplementarlo localmente después del sync, con su opt-out `audit-ux:allow-ENV-002` y las dos supresiones de `FolderPickerModal.tsx`
- [ ] #7 Verificar que la contraparte de UX-010 en el motor nuevo reporte el conteo **real** de botones sin nombre accesible, y que ese número sea el que se use para cerrar AC #4 de DEV-173
- [ ] #8 `npm run audit:ux` en verde con exit 0, `npx tsc --noEmit` con 0 errores, `npm test` y `npm run backlog:check` con código 0

---

### ✅ Done / Deployed (165)

#### [DEV-001] Interoperabilidad nativa con Backlog.md y motor Markdown
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.2.0

Implementar soporte nativo para el estándar Backlog.md (MrLesk/Backlog.md) en DevBoard.
Permite almacenar cada ítem del backlog como un archivo Markdown individual en `backlog/tasks/*.md`
con YAML frontmatter y delimitadores estandarizados, resolviendo conflictos de Git concurrentes.

**Criterios de Aceptación:**
- [x] #1 Parser y serializador en TypeScript sin dependencias externas
- [x] #2 Normalización bidireccional de estados a vocabulario limpio (draft, doing, review, ready, done)
- [x] #3 Soporte dual de persistencia (JSON y Backlog.md) en la API de Vite
- [x] #4 Herramienta de migración 1-click y exportación consolidada a BACKLOG.md

---

#### [DEV-002] Modales de confirmación amables y eliminación de proyectos
- **Prioridad**: `high` | **Tipo**: `ux`
- **Sprint / Milestone**: v1.1.0

Reemplazar todas las alertas y confirmaciones nativas del navegador (`alert()` y `confirm()`)
por un modal in-app (`ConfirmModal`) con estética premium Linear/Raycast dark-mode.
Solucionar el fallo en el tacho de basura al eliminar o desvincular proyectos (incluso el demo).

**Criterios de Aceptación:**
- [x] #1 Crear componente `ConfirmModal.tsx` con variantes danger/warning/info y atajos de teclado
- [x] #2 Reemplazar confirms en Header, ItemCard, ItemModal, SprintView y ArchiveView
- [x] #3 Reemplazar alerts por banners de error inline y toasts
- [x] #4 Permitir eliminar/desvincular proyectos y restaurar proyecto Demo

---

#### [DEV-003] Explorador visual de carpetas y compatibilidad multiplataforma
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.1.0

Permitir a los desarrolladores explorar el sistema de archivos local de su máquina visualmente
sin tener que escribir manualmente la ruta del repositorio. Asegurar compatibilidad multiplataforma
con Windows (`\`), macOS (`/`) y Linux (`/`).

**Criterios de Aceptación:**
- [x] #1 Implementar endpoint `GET /api/fs/browse` con normalización multiplataforma
- [x] #2 Crear componente `FolderPickerModal.tsx` con navegación jerárquica y badges Git/Backlog.md
- [x] #3 Integrar botón "Explorar" en `ProjectModal.tsx` con autocompletado y detección de motor
- [x] #4 Detectar si la carpeta seleccionada ya es un repositorio Git o tiene tareas Backlog.md

---

#### [DEV-004] Servidor MCP y Skills para Agentes de IA
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.1.0

Construir un servidor MCP (Model Context Protocol) sobre stdio y una Skill documental para que
agentes de IA y LLMs (Claude Code, Cursor, Antigravity, Gemini) puedan inspeccionar, crear,
actualizar y completar tareas del backlog de forma autónoma y sin fricciones.

**Criterios de Aceptación:**
- [x] #1 Crear script `scripts/mcp-server.ts` con protocolo JSON-RPC 2.0 stdio
- [x] #2 Implementar tools MCP: list_projects, list_tasks, get_task, create_task, update_task, export_backlog
- [x] #3 Añadir comando npm `npm run mcp` en package.json
- [x] #4 Crear `.agents/skills/devboard/SKILL.md` con documentación y guía de flujo para agentes

---

#### [DEV-005] Release v1.1.0 y changelog automatizado
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.1.0

Empaquetar todas las mejoras del ciclo actual (Backlog.md, modales UX amables, explorador de carpetas,
dogfooding y servidor MCP) en el Release v1.1.0 utilizando el Release Assembler de DevBoard.

**Criterios de Aceptación:**
- [x] #1 Probar empaquetado del release con las tareas DEV completadas
- [x] #2 Generar changelog formateado con resumen de cambios para el usuario
- [x] #3 Validar paso de tareas de ready a done al archivar el release

---

#### [DEV-006] Sistema de Configuración y Settings Persistentes (.devboard/config.json y UI)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Crear un sistema integral de configuración persistente para que el usuario pueda personalizar su experiencia en DevBoard.
Permite definir qué opciones visuales y funcionales están activas (densidad visual, tema por defecto, visibilidad de columna Ideas, WIP limits, columnas personalizadas).
La configuración debe guardarse en el repositorio local en un archivo JSON predeterminado (`.devboard/config.json`) con valores por defecto bien estructurados.
El usuario debe tener la flexibilidad de modificar las opciones tanto editando directamente el archivo JSON como desde una interfaz gráfica de Settings accesible desde la UI.

**Criterios de Aceptación:**
- [x] #1 Diseñar el esquema y valores predeterminados para el archivo local `.devboard/config.json`
- [x] #2 Implementar endpoints `GET /api/settings` y `POST /api/settings` en la API local de Vite
- [x] #3 Crear componente modal `SettingsModal.tsx` accesible desde un botón de engranaje en el Header
- [x] #4 Implementar hot-reload o sincronización cuando el usuario modifica `.devboard/config.json` directamente en el editor
- [x] #5 Permitir alternar preferencias visuales (modo compacto, tema predeterminado, animaciones) y funcionales desde la UI

---

#### [DEV-007] Optimización de UX Responsive y Mobile para Pantallas Pequeñas
- **Prioridad**: `high` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Optimizar de forma integral la experiencia de usuario (UX/UI) de DevBoard en dispositivos móviles y pantallas pequeñas (< 768px).
Actualmente la interfaz sufre de desbordamientos horizontales, la cabecera se satura de botones, las múltiples columnas del Kanban se comprimen haciéndose ilegibles y los modales se salen de los límites de la pantalla.
Se requiere un diseño adaptativo mobile-first: navegación colapsable en Header, selector de columna por tabs o scroll-snap para el tablero Kanban, y modales que se transformen en bottom-sheets o vistas de pantalla completa en mobile.

**Criterios de Aceptación:**
- [x] #1 Adaptar Header para mobile: menú colapsable (hamburguesa/drawer) o barra inferior para selector de proyectos y acciones
- [x] #2 Implementar vista mobile para el Kanban: selector de columna tipo tabs/pills o swipe horizontal con snap para ver una columna a la vez
- [x] #3 Adaptar modales (`ItemModal`, `ProjectModal`, `ConfirmModal`, `SettingsModal`) a modo bottom-sheet o pantalla completa en pantallas < 640px
- [x] #4 Garantizar áreas táctiles mínimas de 44x44px para botones e interactivos en mobile
- [x] #5 Eliminar cualquier scroll horizontal indeseado a nivel de ventana (`overflow-x-hidden` seguro en layout principal)

---

#### [DEV-008] Simplificación de Vista Kanban: Columna Ideas Opcional y Oculta por Defecto
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Simplificar la vista simplificada del Kanban distinguiendo claramente entre el backlog crudo de "Ideas" (sin discovery, sin refinamiento ni priorización) y el verdadero "Backlog" de trabajo listo (filtrado, priorizado y en refinamiento).
En la vista simplificada, la columna de "Ideas" debe permanecer oculta por defecto para evitar ruido cognitivo. La vista simplificada por defecto mostrará el flujo esencial de 3 columnas: `Backlog` -> `In Progress / Doing` (agrupando review) -> `Done`.
Si el usuario desea incorporar o visualizar las Ideas, podrá hacerlo explícitamente a través de un botón/toggle dedicado (ej. "+ Mostrar Ideas" o switch en toolbar).
El selector de vistas existente de la barra superior debe mantenerse intacto con sus 2 modos ("Simple" y "Ampliada") sin añadir más opciones al selector principal.

**Criterios de Aceptación:**
- [x] #1 Ocultar por defecto la columna de Ideas al entrar en la vista Simplificada
- [x] #2 Mantener intacto el selector de 2 opciones (Simple / Ampliada) en la barra superior
- [x] #3 Renderizar por defecto las columnas base: Backlog, In Progress (Doing + Review) y Done en vista Simple
- [x] #4 Añadir un botón o toggle explícito accesible (ej. en la cabecera del Kanban o toolbar) para mostrar/ocultar la columna Ideas a demanda
- [x] #5 Persistir la preferencia de visibilidad de Ideas (en local storage o en `.devboard/config.json`)

---

#### [DEV-009] Personalización de Columnas Kanban: Reordenar, Renombrar, Mapeo de Estados y WIP Limits
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Permitir a los usuarios personalizar dinámicamente la configuración del tablero Kanban:
1. Renombrar el título de las columnas.
2. Reordenar las columnas según la preferencia del equipo.
3. Configurar qué estados canónicos (`draft`, `doing`, `review`, `ready`, `done`) pertenecen a cada columna visual.
4. Validar y alertar al usuario si algún estado queda desasignado o huérfano (para evitar que tareas existentes desaparezcan visualmente del tablero).
5. Configurar límites de trabajo en progreso (WIP Limits) por columna (ejemplo: máximo 10 cards en 'Doing'), mostrando indicadores de capacidad y alertas visuales al superar el umbral.

**Criterios de Aceptación:**
- [x] #1 Configuración dinámica de columnas con título editable y orden personalizable
- [x] #2 Asignación flexible de estados a columnas visuales
- [x] #3 Validación de estados huérfanos: mostrar banner de advertencia si algún estado activo no está asignado a ninguna columna
- [x] #4 Soporte para WIP Limits numéricos por columna (ej. `doing: 10`, `review: 5`)
- [x] #5 Indicadores visuales en la cabecera de la columna cuando se alcanza o sobrepasa el WIP limit (ej. badge amarillo/rojo `11/10 WIP`)
- [x] #6 Guardado de la configuración en `.devboard/config.json` o settings del proyecto

---

#### [DEV-010] Fix de Desplazamiento Horizontal Inestable en Selector de Navegación de Pestañas
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.3.0

Resolver el defecto visual en la barra superior (`Header.tsx`) donde el bloque central de navegación por pestañas (Tablero, Sprint & Priorización, Releases, Archivo) se desplaza horizontalmente (layout shift) de forma errática:
1. Al cambiar de proyecto: la longitud variable del nombre del proyecto y los badges ('Backlog.md' vs 'JSON' vs 'Demo') cambian el ancho del contenedor izquierdo. Como la barra utiliza `flex justify-between`, el cambio de ancho en la izquierda empuja o tira del contenedor central de pestañas.
2. Al cambiar de pestaña: cuando la pestaña activa es 'Tablero', se muestra el selector de modo de vista (Simple / Ampliada) en el contenedor derecho; al cambiar a 'Sprint', 'Releases' o 'Archivo', dicho selector desaparece, reduciendo el ancho del bloque derecho en ~120px y provocando que el selector central de pestañas pegue un salto horizontal notable.
La navegación debe permanecer centrada o fija sin saltos visuales molestos al interactuar con proyectos o pestañas.

**Criterios de Aceptación:**
- [x] #1 Estabilizar el layout del Header mediante un sistema de 3 columnas fijas (ej. CSS Grid `grid-cols-[1fr_auto_1fr]` o flexboxes balanceados)
- [x] #2 Garantizar que el selector central de navegación (`<nav>`) no se mueva horizontalmente al cambiar de proyecto (independientemente de la longitud de su nombre o badge)
- [x] #3 Garantizar que el selector central de navegación (`<nav>`) permanezca completamente estático al cambiar entre pestañas (Tablero, Sprint, Releases, Archivo)
- [x] #4 Preservar la visibilidad y estética de los botones de acciones y selectores en desktop y mobile

---

#### [DEV-011] Redistribución Visual y Secciones Colapsables en Editor de Card (ItemModal)
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Mejorar la distribución visual, ergonomía y aprovechamiento del espacio en el modal de edición/creación de tarjetas (`ItemModal.tsx`).
Actualmente, el modal apila todos los campos verticalmente en un único scroll largo:
- Varios campos del modelo de datos (`risk` y `fix`) ni siquiera se muestran en pantalla por falta de espacio.
- Cuando una tarea tiene múltiples Criterios de Aceptación (AC) o un Plan de Implementación técnico detallado, la altura del modal desborda la pantalla obligando al usuario a realizar scrolls excesivos.
- Se debe reestructurar el formulario con una jerarquía visual limpia:
  1. Cabecera compacta con Título, Código, Tipo, Prioridad, Estado y Proyecto en grilla balanceada.
  2. Secciones colapsables tipo acordeón (o pestañas internas) para:
     - **Criterios de Aceptación (AC)**: con contador en cabecera (ej. `3/5 cumplidos`) y colapsar/expandir.
     - **Plan de Implementación & Plan Guard**: colapsable para desarrollo técnico y agentes de IA.
     - **Metadatos Técnicos**: archivo impactado, sprint/release objetivo, riesgos (`risk`) y solución propuesta (`fix`).

**Criterios de Aceptación:**
- [x] #1 Implementar secciones colapsables (acordeón o tabs) con estado recordado para AC, Plan Técnico y Metadatos
- [x] #2 Incorporar inputs editables para campos omitidos actualmente (`risk` y `fix`)
- [x] #3 Mostrar indicador resumen en el encabezado de la sección de AC (ej. "3 de 5 criterios completados")
- [x] #4 Mejorar el aprovechamiento horizontal en pantallas medianas y grandes con un layout en 2 columnas o panel lateral
- [x] #5 Mantener atajos de teclado (`⌘+Enter` para guardar, `Esc` para cancelar)

---

#### [DEV-012] Generalización de Re-sync Docs para Modalidad Dual (JSON y Backlog.md)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Generalizar la funcionalidad de sincronización y reimportación de documentación ("Re-sync /docs") para que no dependa exclusivamente de un repositorio legado con ruta hardcodeada ni del formato JSON único.
Actualmente:
- El endpoint `POST /api/import` en `vite.config.ts` buscaba hardcodeado un proyecto legado específico y ejecutaba `runMigration(docsPath, ...backlog.json)`.
- En proyectos con almacenamiento `backlog-md` (como el propio DevBoard) o en cualquier proyecto nuevo, presionar el botón "Re-sync /docs" falla o afecta al proyecto equivocado.
Se debe contextualizar la sincronización:
1. Permitir que cada proyecto configure opcionalmente su ruta de documentación o fuente de importación.
2. Soportar la sincronización tanto hacia archivos `backlog/tasks/*.md` individuales (`backlog-md`) como hacia `.devboard/backlog.json` (`json`).
3. Ocultar o deshabilitar elegantemente el botón en el Header si el proyecto activo no tiene configurada una carpeta de documentación externa para sincronizar.

**Criterios de Aceptación:**
- [x] #1 Parametrizar el endpoint `POST /api/import` para recibir `projectId` del proyecto activo
- [x] #2 Implementar lógica de importación hacia archivos Markdown individuales para proyectos con `storageType: 'backlog-md'`
- [x] #3 Ocultar o desactivar el botón "Re-sync /docs" en `Header.tsx` si el proyecto seleccionado no tiene docs vinculados
- [x] #4 Proporcionar retroalimentación visual al usuario (toast o banner) indicando qué proyecto se sincronizó y cuántas tareas se actualizaron

---

#### [DEV-013] Estandarización de storageType a 'markdown' para desacoplar de Backlog.md
- **Prioridad**: `medium` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: v1.2.0

Renombrar y estandarizar el identificador `storageType` del motor de persistencia a exclusivamente `'markdown' | 'json'`.
Al ser el almacenamiento gestionado integralmente por DevBoard sin dependencias externas, no existe necesidad de mantener múltiples valores o alias (`md`, `backlog-md`).
Esto evita cualquier confusión conceptual con proyectos externos (como la herramienta Backlog.md) y simplifica el código en frontend, backend y servidor MCP.

**Criterios de Aceptación:**
- [x] #1 Definir estrictamente `StorageType = "json" | "markdown"` en `src/types.ts`
- [x] #2 Actualizar `data/projects-registry.json` con `"storageType": "markdown"`
- [x] #3 Simplificar funciones en `vite.config.ts` (`isBacklogMdProject`, `detectProjectStorage`) a `'json' | 'markdown'`
- [x] #4 Actualizar componentes UI (`Header.tsx`, `ProjectModal.tsx`, `FolderPickerModal.tsx`) con etiquetas "Markdown" y "MD"
- [x] #5 Actualizar `scripts/mcp-server.ts` y suite de tests

---

#### [DEV-014] Sincronización en vivo en la UI ante cambios en disco (Live File Watcher / SSE)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.3.0

Permite que la interfaz web abierta en el navegador actualice el tablero en tiempo real cuando un agente de IA o un comando git modifique archivos Markdown en disco, evitando que el usuario trabaje sobre datos obsoletos o genere colisiones.

**Criterios de Aceptación:**
- [x] #1 Configurar watcher activo en backend (Vite middleware / server) monitoreando archivos en backlog/tasks/*.md y .devboard/
- [x] #2 Establecer canal de eventos reactivo (SSE en /api/events o WebSocket HMR) para notificar cambios de disco a la UI
- [x] #3 El frontend React escucha los eventos y actualiza silenciosamente los datos sin perder filtros ni posición de scroll
- [x] #4 Mostrar notificación o badge visual no intrusivo ('Sincronizado con disco') confirmando la actualización externa

---

#### [DEV-015] Distribución Zero-Install vía CLI (npx dev-board)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.3.0

Publicar y empaquetar DevBoard como herramienta de línea de comandos para que cualquier desarrollador pueda ejecutar 'npx dev-board' dentro de cualquier repositorio y visualizar/gestionar su backlog al instante sin dependencias previas.

**Criterios de Aceptación:**
- [x] #1 Configurar punto de entrada CLI ejecutable (bin/devboard.js) con shebang y declaración en package.json
- [x] #2 Detectar automáticamente el proyecto objetivo en process.cwd() (soporte de backlog/tasks/*.md y .devboard/backlog.json)
- [x] #3 Iniciar servidor HTTP estático y de API en un puerto disponible sin requerir clonación del repositorio dev-board
- [x] #4 Abrir automáticamente el navegador web predeterminado al estar listo el servidor

---

#### [DEV-016] Empaquetado y distribución simplificada del servidor MCP (npx devboard-mcp)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.3.0

Empaquetar el servidor MCP para eliminar la necesidad de configurar rutas locales absolutas y flags experimentales en los archivos mcp_config.json de los IDEs, permitiendo integración de agentes con un único comando agnóstico.

**Criterios de Aceptación:**
- [x] #1 Empaquetar scripts/mcp-server.ts a un ejecutable autónomo en JavaScript (dist/mcp-server.cjs o bin/mcp.js) sin requerir flags experimentales de node
- [x] #2 Habilitar ejecución directa vía npx devboard-mcp sobre stdio para integración transparente en IDEs (Antigravity, Cursor, Claude Code)
- [x] #3 Detectar automáticamente el repositorio actual o aceptar argumento --repo / -p con la ruta del proyecto
- [x] #4 Actualizar documentación y Skill de devboard para reflejar la configuración simplificada de una sola línea

---

#### [DEV-017] Optimistic Locking y prevención de sobreescrituras silenciosas (ETag / Mtime)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.3.0

Implementar un mecanismo de control de concurrencia optimista para evitar que ediciones concurrentes entre usuarios de la UI y agentes de IA en disco se pisen silenciosamente sin advertencia.

**Criterios de Aceptación:**
- [x] #1 Incluir timestamp de modificación (mtime) o hash en la respuesta de /api/data para cada tarea del backlog
- [x] #2 Comprobar en PUT /api/items/:id si el archivo en disco cambió después de la fecha en que la UI leyó los datos
- [x] #3 Retornar código HTTP 409 Conflict si se detecta modificación concurrente externa
- [x] #4 Mostrar diálogo amigable de resolución de conflicto en la UI permitiendo al usuario ver cambios o recargar datos frescos sin perder su edición local

---

#### [DEV-018] Asistente de importación nativo para repositorios legacy (Import Wizard)
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: v1.3.0

Proveer un asistente visual e interactivo en la interfaz para importar proyectos legacy que actualmente gestionan su backlog en un único archivo plano (BACKLOG.md o TODO.md), convirtiéndolos al estándar atómico distribuido.

**Criterios de Aceptación:**
- [x] #1 Crear parser heurístico capaz de procesar archivos Markdown planos tipo TODO.md o BACKLOG.md estructurados con listas de tareas (- [ ] Título) y encabezados
- [x] #2 Diseñar modal 'Importar Backlog Legacy' en la UI con soporte para carga de archivo y previsualización de ítems detectados antes de confirmar
- [x] #3 Generar archivos atómicos en backlog/tasks/<CODE> - <Title>.md respetando la convención de almacenamiento Markdown distribuido
- [x] #4 Integrar las tareas importadas al tablero y al registro del proyecto en tiempo real sin reiniciar el servidor

---

#### [DEV-019] Resiliencia y reconciliación ante tareas Markdown huérfanas o renombradas
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: v1.2.0

Hacer que el servidor MCP y la API de DevBoard sean tolerantes a fallos si un desarrollador renombra manualmente un archivo de tarea en su editor (ej. VS Code), reconciliando la tarea a través del ID declarado en su frontmatter YAML.

**Criterios de Aceptación:**
- [x] #1 Escanear el frontmatter YAML ('id:' o 'code:') para localizar tareas en disco cuando el nombre de archivo no coincide con el prefijo esperado
- [x] #2 Actualizar el servidor MCP (devboard_get_task, devboard_update_task) para encontrar tareas independientemente del nombre del archivo en backlog/tasks/
- [x] #3 Actualizar la API backend (PUT /api/items/:id, DELETE /api/items/:id) para reconciliar por frontmatter si falla la coincidencia por nombre de archivo
- [x] #4 Normalizar y renombrar el archivo en disco automáticamente al estándar '<ID> - <Title>.md' al guardar la tarea para mantener el repositorio ordenado

---

#### [DEV-020] Optimización de MCP y CLI para exploración eficiente del Backlog por Agentes de IA
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.2.0

Los agentes de IA suelen recurrir a scripts ad-hoc 'node -e' para filtrar y listar tareas abiertas en consola, arriesgando romper el storage Markdown/JSON y desperdiciando tokens. Esta tarea dota al MCP y al CLI de herramientas ergonómicas de consulta compacta y paginada.

**Criterios de Aceptación:**
- [x] #1 Añadir parámetros 'openOnly' (excluye done/dismissed), 'limit', 'search' y 'format: compact | detailed' en devboard_list_tasks
- [x] #2 Implementar comando CLI nativo (ej: 'npm run devboard:list' o 'npx devboard list --open') para agentes que operan en consola
- [x] #3 Garantizar respuesta token-efficient en formato compacto de 1 línea por ítem tanto para almacenamiento Markdown como JSON
- [x] #4 Actualizar SKILL.md documentando el uso de devboard_list_tasks con filtros compactos y desaconsejando scripts ad-hoc 'node -e'

---

#### [DEV-021] Mutaciones Masivas y Actualizaciones por Lote en MCP y CLI (devboard_bulk_update_tasks)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.2.0

Permite a los agentes de IA realizar actualizaciones masivas de estado y metadatos sobre decenas de tareas en una única llamada, evitando decenas de llamadas individuales lentas o la necesidad de escribir scripts de consola ad-hoc.

**Criterios de Aceptación:**
- [x] #1 Implementar tool 'devboard_bulk_update_tasks' en MCP para actualizar múltiples tareas por 'taskIds: string[]' o por condición de filtro ('prefix', 'status')
- [x] #2 Permitir mutaciones simultáneas de estado ('status'), milestone, etiquetas ('labels') y notas técnicas
- [x] #3 Incorporar comando por lotes en CLI ('npm run tasks -- --update-status <estado> --ids <id1,id2>' o '--prefix <prefijo>')
- [x] #4 Garantizar consistencia y actualización atómica tanto en almacenamiento Markdown distribuido como en JSON

---

#### [DEV-022] Métricas, Estadísticas y Agrupación por Prefijo (devboard_get_stats y CLI --stats)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.2.0

Provee herramientas nativas para que los agentes y desarrolladores obtengan métricas de salud del backlog y desgloses por tipología de tarea sin necesidad de parsear y agrupar manualmente mediante scripts de consola.

**Criterios de Aceptación:**
- [x] #1 Implementar tool 'devboard_get_stats' en MCP retornando total, abiertos, cerrados, porcentaje completado y distribución por estado y prioridad
- [x] #2 Calcular agrupación y recuento automático por prefijo de código (ej: APP-P, APP-BUG, APP-FEAT, APP-SPEC)
- [x] #3 Extender 'devboard_list_tasks' para soportar filtros por 'prefix' y lista explícita de 'taskIds'
- [x] #4 Implementar flag '--stats' en CLI ('npm run tasks -- --stats') mostrando un resumen gráfico y métricas en terminal

---

#### [DEV-023] Gestión e Inspección de Releases en MCP (devboard_list_releases)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.3.0

Permitir a los agentes de IA consultar releases y contrastar tareas terminadas contra versiones publicadas de forma nativa a través del protocolo MCP.

**Criterios de Aceptación:**
- [x] #1 Implementar tool 'devboard_list_releases' en MCP para consultar versiones publicadas, fechas y notas de versión estructuradas
- [x] #2 Permitir consultar tareas asociadas a una versión específica o release planificado
- [x] #3 Documentar devboard_list_releases en SKILL.md para permitir contraste directo con release notes

---

#### [DEV-024] Resiliencia ante errores de permisos (EPERM) en repositorios locales y banner en UI
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: v1.3.0

Manejo tolerante a fallos en la lectura de tareas Markdown de repositorios locales:
1. Envolver la lectura de carpetas backlog/tasks en try/catch para evitar que excepciones de permisos (EPERM/EACCES) o paths inaccesibles hagan colapsar el endpoint GET /api/data con status 500.
2. Propagar el estado de error (error?: string) en la metadata del proyecto (ProjectMeta y Project).
3. Notificar visualmente en el frontend (banner de advertencia con explicación y comando de solución) cuando un proyecto seleccionado no pueda leer sus archivos por restricciones de permisos o sandbox.
4. Soporte para liberar puertos retenidos e iniciar servidores limpios.

**Criterios de Aceptación:**
- [x] #1 Blindar readProjectBacklog en vite.config.ts para capturar excepciones de lectura de carpetas y no tumbar /api/data
- [x] #2 Declarar error?: string en tipos ProjectMeta (vite.config.ts, mcp-server.ts) y Project (src/types.ts)
- [x] #3 Renderizar banner de diagnóstico amigable en App.tsx ante errores de acceso a repositorios
- [x] #4 Documentar la resolución de conflictos de puertos y compatibilidad con entornos sandbox

---

#### [DEV-025] Integración Formal del Agentic Team Playbook, Guardrails de IA y Guía de Distribución
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: v1.2.0

Formalizar la metodología del Agentic Team Playbook dentro de DevBoard, definiendo roles, guardrails de ejecución para LLMs, matrices de verificación y documentando de punta a punta la arquitectura de distribución open-source (npm link, npx devboard-mcp, npx dev-board y publicación en npmjs.com).

**Criterios de Aceptación:**
- [x] #1 Crear docs/AGENTIC_PLAYBOOK.md formalizando roles, fases del ciclo de vida ágil con IA y guardrails anti-alucinación
- [x] #2 Crear docs/DISTRIBUTION.md explicando npm link, npx devboard-mcp, configuración en IDEs y publicación a npmjs.com
- [x] #3 Actualizar README.md y AGENTS.md integrando la metodología Playbook y la guía rápida de inicio
- [x] #4 Verificar integridad del sistema y validar con npm run backlog:check

---

#### [DEV-026] Unificación de Nombres Binarios CLI (devboard / devboard-mcp) y Limpieza de isDemo en Registry
- **Prioridad**: `high` | **Tipo**: `chore`
- **Sprint / Milestone**: v1.2.0

Unificar la convención de nomenclatura de binarios en package.json eliminando la asimetría entre dev-board y devboard-mcp (estableciendo devboard y devboard-mcp como comandos canónicos y soportando alias retrocompatibles). Eliminar la propiedad ruidosa isDemo: false del archivo data/projects-registry.json tratándola como false por defecto si está ausente.

**Criterios de Aceptación:**
- [x] #1 Configurar bin en package.json con devboard y devboard-mcp como principales, y alias compatibles
- [x] #2 Limpiar data/projects-registry.json eliminando isDemo: false innecesario
- [x] #3 Actualizar vite.config.ts para que saveRegistry y la creación de proyectos no serialicen isDemo cuando sea falsy
- [x] #4 Actualizar referencias en README.md a devboard y devboard-mcp
- [x] #5 Validar con npm run backlog:check y npm run build

---

#### [DEV-027] Integración de Agent Skills, Reglas y Playbook Operativo (repositorios de referencia)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Transferir y adaptar las mejores skills, reglas y herramientas de automatización de repositorios de referencia hacia dev-board para erradicar ineficiencias de desarrollo, inconsistencias de UX y falta de rigor en QA.

**Criterios de Aceptación:**
- [x] #1 Crear regla estricta de aprobación de Git en .agents/rules/git-approval.md
- [x] #2 Adaptar e incorporar skills operativas en .agents/skills/ (code-level-ux-auditor, rigorous-qa-auditor, worldclass-product-designer, principal-engineer, market-researcher, list-views-filters)
- [x] #3 Crear playbook operativo multi-agente en .agents/TEAM_PLAYBOOK.md con matriz de decision y directrices de subagentes
- [x] #4 Incorporar script scripts/audit-ux-code.cjs y añadir comando npm run audit:ux a package.json
- [x] #5 Validar integridad ejecutando npm run audit:ux, npm run build y npm run backlog:check

---

#### [DEV-030] Persistencia del Último Proyecto Activo y Fallback Seguro
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.3.0

Al iniciar o recargar la aplicación en el navegador, DevBoard seleccionaba por defecto el proyecto inicial del registro o un repositorio por defecto, ignorando en qué proyecto estuvo trabajando el usuario por última vez.
Dado que el proyecto es el filtro de contexto por excelencia en DevBoard, la interfaz debe recordar el último proyecto activo seleccionado para que el usuario mantenga su contexto de trabajo entre recargas y sesiones.
Se debe almacenar la preferencia en `localStorage` y sincronizarla con `projects-registry.json` mediante la API. Si el proyecto guardado fue desvinculado o su ruta ya no existe, el sistema debe aplicar un fallback seguro al primer proyecto válido disponible sin provocar estados inconsistentes ni fallos de renderizado.

**Criterios de Aceptación:**
- [x] #1 Guardar el último `projectId` seleccionado en `localStorage` ('devboard_active_project_id') ante cada cambio en el selector de proyectos
- [x] #2 Restaurar automáticamente el último proyecto activo al cargar o recargar la aplicación en `App.tsx`
- [x] #3 Validar existencia del proyecto: aplicar fallback seguro al primer proyecto disponible si el ID guardado fue eliminado o no existe
- [x] #4 Sincronizar el campo `activeProjectId` en `data/projects-registry.json` a través del endpoint de selección de proyectos
- [x] #5 Garantizar que los componentes de navegación (Header, Kanban, Sprint, Releases) rendericen directamente con el proyecto restaurado sin parpadeos

---

#### [DEV-031] Vistas de Flujo de Trabajo: Alternar entre Kanban Global y Sprint/Release Board Acotado
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

DevBoard debe responder de forma flexible a los dos paradigmas de trabajo ágil más extendidos:
1. **Kanban Puro (Flujo Continuo):** Visualiza todo el backlog del proyecto activo a lo largo de las columnas, permitiendo gestionar el flujo constante de trabajo continuo sin cortes artificiales.
2. **Scrum / Kanban Acotado:** Cuando el equipo trabaja enfocado en un objetivo acotado (Sprint) o en un paquete de entrega (Release), el tablero Kanban debe restringirse exclusivamente a las tareas comprometidas para ese objetivo.

Actualmente, el componente Kanban renderiza indiscriminadamente todas las tareas del proyecto y la pestaña "Sprint & Priorización" se limita a una lista vertical plana.
Esta tarea introduce la capacidad de alternar el alcance del tablero Kanban entre la visión global del proyecto y un tablero acotado al Sprint o Release seleccionado, incorporando indicadores de progreso hacia el objetivo del ciclo.

**Criterios de Aceptación:**
- [x] #1 Incorporar selector de alcance de flujo en el Kanban: opción "Todo el Backlog" (Kanban continuo) y "Sprint / Release Objetivo" (Scrum)
- [x] #2 Permitir seleccionar qué Sprint o Milestone activo visualizar en el modo acotado mediante un selector desplegable
- [x] #3 Filtrar las tarjetas del tablero para mostrar exclusivamente las tareas que coincidan con el `milestone` o `targetSprint` seleccionado
- [x] #4 Mostrar un banner de resumen del ciclo con título del Sprint/Release, contador de tareas completadas y barra de progreso porcentual
- [x] #5 Permitir añadir tareas al sprint activo directamente desde el selector o arrastre sin perder el contexto del proyecto
- [x] #6 Persistir el modo de alcance y el último sprint seleccionado en `localStorage`

---

#### [DEV-032] Planificación de Releases con Target Dinámico y Personalizable
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

En la gestión ágil de producto, los releases no deben funcionar únicamente como un historial estático o un empaquetador automático de tareas que ya alcanzaron el estado `ready`. Los equipos necesitan planificar sus entregas con anticipación, proyectando objetivos y monitoreando el avance hacia ellos.
Esta tarea introduce la figura de **Planned Releases** con target editable:
1. Capacidad de crear y configurar un Release en estado de planificación (ej: versión target `0.3.0`, fecha objetivo y resumen de alcance).
2. Vinculación de tareas planificadas a dicho release a través del campo `milestone`.
3. Dashboard visual de seguimiento en `ReleasesView.tsx` mostrando el porcentaje de cumplimiento del target, tareas en progreso y riesgos detectados.
4. Flexibilidad para actualizar y reprogramar el target a medida que el ciclo de desarrollo evoluciona (modificar fecha estimada, ajustar alcance o transferir tareas).
5. Transición fluida a publicación y empaquetado formal cuando se alcance el 100% de los criterios del release.

**Criterios de Aceptación:**
- [x] #1 Extender el modelo de datos `Release` para incluir estado (`planned` vs `released`), fecha target (`targetDate`) y alcance proyectado
- [x] #2 Incorporar formulario / modal para crear y editar Releases Planificados con versión target, fecha límite y descripción
- [x] #3 Mostrar en `ReleasesView.tsx` una sección destacada de 'Releases en Planificación' con medidor de avance hacia el target (% de tareas completadas)
- [x] #4 Permitir actualizar dinámicamente la fecha y atributos del target desde la interfaz gráfica
- [x] #5 Permitir asociar o desvincular tareas del release target directamente desde la vista de releases o desde `ItemModal`
- [x] #6 Persistir los releases en `backlog/releases.json` manteniendo retrocompatibilidad con las herramientas MCP y scripts de auditoría

---

#### [DEV-033] Refactorización Conceptual y UX: Desacople Sprint/Release, Rediseño ItemModal y Ergonomía de Vistas
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Refactorización profunda de conceptos de dominio, navegación y experiencia de usuario:
- Separación tajante entre Sprint (ciclo de trabajo iterativo) y Release (etiqueta o hito de despliegue a producción).
- Rediseño de ItemModal a layout de dos columnas estilo Linear (contenido principal a la izquierda, metadatos y contexto a la derecha).
- Limpieza radical del selector de proyectos (retirar exportaciones e importaciones) y centralizarlas en Configuración.
- Disminuir el protagonismo del Archivo a un botón sutil en el Header.
- Configuración de vistas activas y vista por defecto persistente.
- Ordenamiento y ergonomía de visualización en la vista de Sprints & Backlog.

**Criterios de Aceptación:**
- [x] #1 Desacoplar semánticamente Sprint vs Release/Versión en datos y UI, eliminando prefijo 'target'
- [x] #2 Rediseñar ItemModal a layout ergonómico de 2 columnas estilo Linear con panel 'Detalles y Contexto' a la derecha
- [x] #3 Limpiar menú de proyectos y reubicar Importación/Exportación en Settings -> Datos y Herramientas
- [x] #4 Reubicar Archivo como acción secundaria sutil con icono en el Header en lugar de pestaña principal
- [x] #5 Añadir selector de vista por defecto y habilitación de vistas en Settings (.devboard/config.json)
- [x] #6 Ordenar semántica y cronológicamente los grupos en SprintView con reasignación ágil

---

#### [DEV-034] Reubicación del Selector de Columnas (Simple/Ampliada) al Contenedor del Tablero Kanban
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Reubicar el conmutador de modo de columnas ("Simple" vs "Ampliada") desde el Header principal hacia la barra de herramientas interna del contenedor del Tablero Kanban:
- En el Header, este control contamina la navegación global y no tiene sentido fuera del contexto del Tablero Kanban.
- En el contenedor de KanbanBoard, se sitúa de forma contextualmente coherente en la barra superior junto al botón de "+ Mostrar Ideas", logrando una jerarquía visual limpia y ergonómica.

**Criterios de Aceptación:**
- [x] #1 Retirar el conmutador de modo de vista (Simple / Ampliada) de Header.tsx tanto en versión de escritorio como en el menú móvil
- [x] #2 Incorporar el selector de columnas (Simple / Ampliada) en la barra de herramientas superior de KanbanBoard.tsx junto al botón de Mostrar Ideas
- [x] #3 Asegurar respuesta responsiva y diseño visual consistente (tokens de color, bordes, estados activos)
- [x] #4 Validar compilación con `npm run build` y sincronización con `npm run backlog:check`

---

#### [DEV-035] Transformación de Configuración a Vista de Página Completa (SettingsView)
- **Prioridad**: `urgent` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Reemplazar el modal comprimido de configuración (`SettingsModal.tsx`) por una vista de página completa (`SettingsView.tsx`):
- El crecimiento de opciones (vistas por defecto, pestañas del header, límites WIP de columnas, importación/exportación, apariencia, editor de configuración JSON) desbordaba el tamaño de un modal emergente.
- La nueva vista de página completa adopta un patrón maestro-detalle estándar de herramientas de clase mundial (Linear / GitHub Settings): sidebar lateral de categorías, panel amplio de configuración, botón de retorno ágil al tablero y barra de guardado con atajo ⌘S.

**Criterios de Aceptación:**
- [x] #1 Crear componente SettingsView.tsx con layout maestro-detalle (sidebar lateral de categorías + panel amplio de contenido)
- [x] #2 Migrar e integrar todas las secciones: Flujo & Vistas, Tablero Kanban, Apariencia, Datos & Herramientas, y Avanzado (JSON)
- [x] #3 Integrar navegación a Settings en App.tsx como pestaña/vista completa ('settings') con botón de retorno al Tablero
- [x] #4 Actualizar el botón de Settings en Header.tsx para alternar la vista completa y reflejar estado activo
- [x] #5 Validar compilación con `npm run build` y sincronización con `npm run backlog:check`

---

#### [DEV-036] Ergonomía Integral: Creación de Sprints, Navegación Home en Logo, Edición Inline de Columnas y Estabilidad de Botón Ideas
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Refinamientos críticos de usabilidad y feedback de producto:
1. Vista Sprint & Priorización: Agregar botón '+ Nuevo Sprint' con sugerencia automática de nombre y soporte de grupo vacío receptor para arrastrar tarjetas.
2. Navegación Header: Hacer que el logo de DevBoard conduzca al Home / Tablero principal al hacer clic.
3. Tablero Kanban: Habilitar la edición de títulos de columnas directamente desde la cabecera del tablero (edición inline con persistencia automática).
4. Toolbar del Tablero: Estabilizar el botón de Ideas para que permanezca accesible y coherente sin desaparecer ni provocar saltos de layout entre modos.

**Criterios de Aceptación:**
- [x] #1 El logo de DevBoard en el Header conduce a la vista principal (Tablero o defaultView) con cursor pointer y hover feedback
- [x] #2 Incorporar botón '+ Nuevo Sprint' en SprintView que permita definir una nueva iteración y muestre drop zone receptora aunque no tenga tarjetas iniciales
- [x] #3 Habilitar edición inline de títulos de columna en KanbanBoard directamente desde cada cabecera con persistencia automática
- [x] #4 Mantener estable y visible el control de Ideas en la toolbar de KanbanBoard sin saltos entre modos Simple y Ampliada
- [x] #5 Validar con `npm run build` y sincronizar con `npm run backlog:check`

---

#### [DEV-037] Reasignación Dinámica y Visual de Estados a Columnas Kanban (Modo Simple y Ampliado)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Permitir a los usuarios y equipos reasignar qué estados del ciclo de vida de una tarea pertenecen a cada columna del tablero Kanban:
1. Vista Simple por Defecto: Mapear `ready` y `finish` a la columna `Done` en `SIMPLIFIED_BASE_COLUMNS` (dejando In Progress con `doing`, `in_progress`, `review`, `testing_qa`).
2. Configuración Visual en Settings: En la sección 'Tablero Kanban' de Ajustes, permitir agregar y remover estados en cada columna interactivamente (chips con botón 'x' y selector '+ Estado') y elegir el dropTargetStatus.
3. Soporte Dual Simple/Ampliada: Permitir personalizar las columnas tanto de la vista Simple (`simplifiedColumns`) como de la vista Ampliada (`columns`).

**Criterios de Aceptación:**
- [x] #1 En la vista simple por defecto, el estado 'ready' (y 'finish') mapea a la columna 'Done' (col-done)
- [x] #2 En SettingsView pestaña 'Tablero Kanban', permitir reasignar estados a cada columna mediante badges interactivos (remover y agregar estados disponibles)
- [x] #3 Soportar edición de dropTargetStatus por columna para definir el estado destino al arrastrar tarjetas
- [x] #4 Soportar personalización y persistencia de columnas tanto para modo Simple como Ampliado en .devboard/config.json
- [x] #5 Validar con `npm run build` y sincronizar con `npm run backlog:check`

---

#### [DEV-038] Soporte de Metodología de Proyecto (Kanban vs Scrum) en Settings para Liberar la Interfaz
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Diferenciación conceptual y visual estricta entre metodologías de proyecto (Kanban Continuo, Scrum Puro y Scrumban Híbrido), con ajuste de vistas por defecto y libertad de personalización manual para el usuario:
1. **Scrum Puro**:
   - Por definición, el tablero de flujo continuo es Kanban. En Scrum Puro NO hay vista de tablero por defecto (`enabledTabs.kanban = false`, `defaultView = 'sprint'`).
   - El centro de operaciones es la vista de Sprints & Priorización / Backlog.
   - El logo de DevBoard y navegación redirigen a 'Sprint & Priorización'.
2. **Scrumban (Híbrido)**:
   - Fusión de Scrum y Kanban: El Tablero es **únicamente del Sprint Goal / Sprint Activo** en curso (no de todo el backlog).
   - Identificación visual clara: `Sprint Board (Scrumban)` con selector de Sprint Goal, progreso de la iteración y empty state si el sprint no tiene tareas.
   - La priorización y grooming general se realiza en 'Sprint & Priorización'.
3. **Kanban Continuo**:
   - Tablero continuo de todo el backlog sin iteraciones.
   - Oculta pestaña de Sprints y campos de Sprint en cards.
4. **Personalización Manual**:
   - El usuario puede cambiar la metodología y luego conmutar manualmente cualquier pestaña (`enabledTabs`) según su preferencia.

**Criterios de Aceptación:**
- [x] #1 En Scrum Puro, deshabilitar la vista Tablero por defecto y establecer 'Sprint & Priorización' como vista principal
- [x] #2 En Scrumban, el Tablero debe ser exclusivamente del Sprint Goal / Sprint Activo, sin conmutador de 'Todo el Backlog'
- [x] #3 En Kanban Continuo, el Tablero muestra todo el backlog sin referencias a sprints y oculta la pestaña de Sprints
- [x] #4 En SettingsView, permitir seleccionar la metodología aplicando presets inteligentes pero permitiendo al usuario activar/desactivar pestañas manualmente
- [x] #5 En Header, navegación móvil y redirección inicial, sincronizar la visibilidad de pestañas y destino del logo según la configuración
- [x] #6 Validar tipado y build con `npm run build` y auditar visualmente con subagente de navegador

---

#### [DEV-040] Arquitectura Autocontenida (Embedded-First) y Configuración Local en .devboard/
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Desacoplar la configuración de DevBoard del registro central global (data/projects-registry.json), permitiendo que toda la configuración de columnas, metodología, vistas y preferencias viva autocontenida en .devboard/config.json dentro del repositorio del proyecto.

**Criterios de Aceptación:**
- [x] #1 Almacenar configuraciones de vista, columnas y metodología en .devboard/config.json dentro del repositorio del proyecto
- [x] #2 Priorizar lectura y escritura de configuración local sobre el registro central data/projects-registry.json
- [x] #3 Garantizar que al clonar el repositorio en otra máquina o entorno, DevBoard cargue la configuración de .devboard/config.json sin pasos manuales
- [x] #4 Mantener compatibilidad hacia atrás con proyectos existentes y proyectos con múltiples carpetas

---

#### [DEV-041] Simplificación de UX/UI en Modo Proyecto Único (Eliminación de Ruido Multi-Proyecto)
- **Prioridad**: `high` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.4.0

Simplificar radicalmente la navegación y la cabecera cuando DevBoard se ejecuta en un repositorio único, eliminando el ruido de selectores de proyectos globales, modales de importación y cambio de repositorios, ofreciendo una experiencia enfocada y limpia similar a Storybook o Prisma Studio.

**Criterios de Aceptación:**
- [x] #1 Detectar modo monoproyecto (Single-Project Mode) cuando devboard se ejecuta apuntando a un único repositorio local
- [x] #2 Ocultar selector desplegable de proyectos en la cabecera cuando se ejecuta en modo monoproyecto
- [x] #3 Ocultar botones y modales de 'Añadir Proyecto' e 'Importar Proyecto' en la navegación principal en modo monoproyecto
- [x] #4 Mostrar en la cabecera el nombre del repositorio activo con un indicador sutil de estado local
- [x] #5 Reservar la interfaz multi-proyecto completa para cuando se invoque explícitamente con flag --hub o --multi

---

#### [DEV-042] Empaquetado y DX como devDependency (Cero Fricción con npm i -D y npx)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Optimizar la experiencia de desarrollador (DX) y empaquetado para que DevBoard pueda ser consumido limpiamente como devDependency en cualquier proyecto Node/TypeScript, levantando el cockpit local y el servidor MCP con cero fricción.

**Criterios de Aceptación:**
- [x] #1 Habilitar instalación local mediante npm i -D devboard (o package runner) con script de inicio 'devboard'
- [x] #2 Soporte para comando rápido de inicialización 'npx devboard --init' que prepare .devboard/ y carpetas base si no existen
- [x] #3 Configuración automática o asistida de scripts en package.json del proyecto anfitrión (ej: "board": "devboard")
- [x] #4 Verificar funcionamiento como devDependency aislada sin interferir con dependencias de React/Vite del proyecto anfitrión

---

#### [DEV-043] Evolutivo de Marca e Identidad: Cockpit Ágil Multidisciplinario (Naming Simple y Disponibilidad)
- **Prioridad**: `medium` | **Tipo**: `feature`

Evolucionar la identidad y el nombre del proyecto y de la aplicación hacia una plataforma integral de gestión ágil para equipos multidisciplinarios (producto, diseño, arquitectura, Scrum Masters y desarrolladores) y agentes de IA:
1. Trascender la denominación "dev-board" hacia un nombre simple, distintivo, con personalidad y agradable al oído, lejos de clichés corporativos o compuestos que terminen en "Board" o "App".
2. Validar disponibilidad en npm/npx y repositorios públicos (GitHub) para asegurar un namespace limpio y ejecutable sin fricción.
3. Planificar una estrategia de migración no destructiva con soporte de binarios duales/alias en `package.json` para garantizar que `npx devboard` siga funcionando mientras se adopta el nuevo comando.
4. Actualizar identidad visual mínima (isotipo, favicon, splash y playbooks de colaboración).

**Criterios de Aceptación:**
- [x] #1 Realizar relevamiento y matriz de disponibilidad pública en npm/npx y GitHub de nombres candidatos con personalidad
- [x] #2 Definir el nombre definitivo del producto y aplicación alineado con la visión de cockpit ágil para todo el equipo
- [x] #3 Configurar soporte de alias/binarios duales en package.json (retrocompatibilidad con npx devboard y adopción del nuevo comando)
- [x] #4 Actualizar referencias de marca en documentación técnica (README.md, AGENTS.md, docs/)

---

#### [DEV-044] Fix: Persistencia de Prioridad P0 en Backlog Markdown y Dirty Checking en Edición de Campos
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.3.0

Corrección de dos problemas críticos de sincronización y persistencia en la vista de Backlog:
1. **Fix de Prioridad P0 (Causa Raíz):** En `scripts/backlogMdParser.ts`, la función `formatPriorityForMd(p)` mapeaba `p === 'p0'` a `'high'`. Al re-parsear el Markdown, `'high'` era normalizado de vuelta a `'p1'`. Por esta razón, cuando el usuario seleccionaba P0 en el dropdown de prioridad, se mostraba el mensaje de éxito pero el valor se revertía inmediatamente a P1 en disco y en la interfaz. Corregir el mapeo a `'urgent'` o `'critical'` tanto en `formatPriorityForMd` como en el parser.
2. **Dirty Checking en Edición de Campos:** Al editar valores en celdas, nombres de columna o dropdowns con autoguardado, verificar si el nuevo valor difiere del preexistente (`newValue !== oldValue`). Si el valor es idéntico, abortar la llamada a la API y no emitir eventos redundantes.

**Criterios de Aceptación:**
- [x] #1 En scripts/backlogMdParser.ts, formatPriorityForMd('p0') serializa a 'urgent' o 'critical' y parseBacklogMd normaliza a 'p0'
- [x] #2 Al cambiar la prioridad a P0 desde el selector en la vista de Backlog, el valor persiste en disco sin revertirse a P1 tras refrescar
- [x] #3 Implementar dirty checking estricto en edición rápida de celdas y nombres de columnas (abortar si el valor no cambia)
- [x] #4 Añadir tests unitarios en scripts/test-parser.js verificando ida y vuelta de todas las prioridades (p0, p1, p2, p3)

---

#### [DEV-045] Estabilidad Visual del Botón de Ideas (Cero CLS) y Estado Destino por Defecto a 'Ready' en Vista Simplificada
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Mejora de estabilidad visual y coherencia del ciclo de vida en el tablero Kanban:
1. **Prevención de Layout Shift (CLS) en Botón de Ideas:** En `KanbanBoard.tsx`, el botón de alternar visibilidad de ideas cambiaba de texto dinámicamente (`Ideas Visibles` vs `+ Mostrar Ideas`), lo que alteraba su ancho intrínseco y desplazaba horizontalmente los botones adyacentes de selector de vista (`simplificada` / `ampliada`). El botón debe mantener un ancho o etiqueta fija (ej. icono con texto "Ideas" y dot/badge de estado) para que la barra de controles permanezca perfectamente estática al interactuar.
2. **Estado al Soltar por Defecto en Vista Simplificada:** En `SIMPLIFIED_BASE_COLUMNS`, el `dropTargetStatus` de la columna `Done` debe ser `ready` en lugar de `done`. El paso formal a `done` depende de la liberación o release del software, no únicamente de finalizar la etapa de desarrollo/QA.

**Criterios de Aceptación:**
- [x] #1 Mantener ancho fijo o etiqueta invariable en el botón de toggle de ideas para garantizar cero Cumulative Layout Shift (CLS)
- [x] #2 Los botones adyacentes de vista simplificada/ampliada no experimentan ningún desplazamiento al conmutar la visibilidad de ideas
- [x] #3 En SIMPLIFIED_BASE_COLUMNS, configurar dropTargetStatus: 'ready' en la columna Done (col-done)
- [x] #4 Al arrastrar una tarjeta a la columna Done en vista simplificada, su estado se actualiza a 'ready' por defecto

---

#### [DEV-046] Renombrar Agrupador 'Sin Sprint' a 'Backlog' y Guardado Condicional al Mover Tarjetas entre Agrupadores
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.0

Ajustes conceptuales y de eficiencia en la vista de Sprints y Priorización:
1. **Renombrar a 'Backlog':** El contenedor de tareas no asignadas a ninguna iteración debe llamarse **"Backlog"** (en lugar de "Sin Sprint" o "Sin Asignar"), alineándose con los estándares metodológicos ágiles y Scrum.
2. **Guardado Condicional Estricto (Dirty Check en D&D):** Al arrastrar y soltar una tarjeta dentro de un sprint o dentro del contenedor Backlog, comprobar previamente si el valor de asignación de la tarjeta cambió (`item.sprint !== targetSprintVal`). Si la tarjeta se suelta dentro de su mismo contenedor actual, no disparar mutaciones a la API ni alterar los archivos Markdown en disco.
3. **Posicionamiento:** El contenedor "Backlog" debe situarse siempre como el último bloque en la vista agrupada de Sprints.

**Criterios de Aceptación:**
- [x] #1 En SprintView.tsx, renombrar el grupo de tarjetas no asignadas a 'Backlog' con icono representativo
- [x] #2 Al soltar una tarjeta en un contenedor, comprobar si el sprint destino es idéntico al actual y abortar la mutación si no hay cambios
- [x] #3 Asegurar que el contenedor Backlog se ubica de forma consistente como el último agrupador en la vista
- [x] #4 En los selectores rápidos de la tabla de SprintView, la opción vacía muestra 'Backlog' en lugar de 'Sin Sprint'

---

#### [DEV-047] Soporte Jerárquico de Alcance Mayor: Épicas e Iniciativas con Agrupación y Progreso Consolidado
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Incorporación de entidades de gestión de alto nivel (Épicas e Iniciativas) para estructurar y agrupar tarjetas con un alcance o visión estratégica mayor:
1. **Tipos de Alto Nivel:** Extender `ItemType` para soportar `'epic'` e `'initiative'`, otorgándoles representación visual distinguida (badges con colores e iconos propios).
2. **Cálculo de Progreso Consolidado (Rollup Metrics):** Cada Épica o Iniciativa calcula dinámicamente el progreso de completitud (% completado, conteo de items cerrados vs abiertos) según el estado de las tareas hijas que la componen.
3. **Vistas Agrupadas y Filtros:** Permitir agrupar la vista de Backlog por Épica o filtrar el tablero Kanban por una Épica seleccionada.
4. **Almacenamiento Compatible:** Las Épicas e Iniciativas se almacenan como archivos `.md` estándar en `backlog/tasks/` manteniendo compatibilidad Backlog.md (`type: epic`, `type: initiative`).

**Criterios de Aceptación:**
- [x] #1 Extender ItemType y esquemas con 'epic' e 'initiative' con estilo visual propio (icono, bordes y badges)
- [x] #2 Las cards de tipo épica/iniciativa muestran barra de progreso porcentual consolidada según sus tareas hijas
- [x] #3 Permitir agrupar la vista Backlog por Épica en el selector 'Agrupar por'
- [x] #4 En FilterBar, añadir selector para filtrar todo el tablero por Épica/Iniciativa
- [x] #5 Sincronización bidireccional limpia con frontmatter Markdown (type: epic, type: initiative)

---

#### [DEV-048] Grafo de Relaciones entre Cards: Jerarquías Verticales (Padre/Hijo Estricto 1-a-N) y Enlaces Horizontales (Bloquea/Depende/Relacionado)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Modelado completo de relaciones entre tarjetas tanto a nivel vertical como horizontal:
1. **Jerarquías Verticales (Padre / Hijo Estricto):** Un ítem solo puede tener un único padre (`parentId` / `parent`), pero un padre puede tener múltiples tareas hijas. Permite asociar cualquier tarea a una Épica o Historia contenedora.
2. **Relaciones Horizontales entre Vecinos / Hermanos:** Soporte para enlaces cruzados entre tarjetas del backlog:
   - `blocks` / `blocked_by`: Card A bloquea a Card B (y recíprocamente Card B está bloqueada por Card A).
   - `related_to`: Tareas relacionadas conceptualmente sin dependencia dura.
   - `depends_on`: Dependencia funcional.
3. **Indicadores de Bloqueo Visual:** Si una tarea tiene dependencias no resueltas (tareas bloqueantes en `doing`, `draft` o `review`), mostrar un badge visual de advertencia roja ("Bloqueada por DEV-XXX") en la tarjeta Kanban y en el detalle.
4. **Persistencia Frontmatter:** Almacenamiento directo en frontmatter Markdown (`parent: 'DEV-010'`, `blocks: ['DEV-020']`, `dependencies: ['DEV-015']`).

**Criterios de Aceptación:**
- [x] #1 Un ítem solo puede tener asignado un único padre (parentId), con selector modal interactivo
- [x] #2 Soporte de relaciones horizontales bidireccionales automáticas (blocks <-> blocked_by, related_to)
- [x] #3 Badge indicador en tarjetas Kanban que señala dependencias bloqueadas y advertencias de precedencia
- [x] #4 En ItemModal, sección interactiva 'Relaciones y Dependencias' para vincular y desvincular ítems
- [x] #5 Persistencia transparente en frontmatter Markdown sin pérdida de datos en hot-reload

---

#### [DEV-049] Ciclo de Vida Seguro: Papelera (Soft Delete), Doble Confirmación de Purga y Protección contra Borrado en 'Done'
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Mecanismos de protección anti-destructiva y gestión segura del ciclo de vida de tarjetas:
1. **Protección contra Borrado en 'Done':** Las tareas en estado `done` constituyen el registro histórico y la justificación técnica de cambios en el código. Se bloquea terminantemente su eliminación física o accidental directa desde la interfaz (botón de borrar deshabilitado con tooltip explicativo).
2. **Flujo de Papelera (Soft Delete):** Al eliminar una tarea activa (no-done), el sistema no borra el archivo físico de disco de inmediato; realiza un Soft Delete asignándole `status: 'dismissed'`, `isDeleted: true` y `deletedAt: ISOString`, moviéndola a la sección o pestaña "Papelera".
3. **Restauración y Purga Definitiva con Doble Confirmación:** Dentro de la Papelera:
   - Los ítems pueden ser restaurados a su estado previo en 1 click ("Restaurar ítem").
   - La eliminación física y purgado de disco requiere un modal de doble confirmación con advertencia de seguridad explícita ("Escribe CONFIRMAR para eliminar irreversiblemente").

**Criterios de Aceptación:**
- [x] #1 Deshabilitar el botón de eliminación en tarjetas con estado 'done' con tooltip de protección histórica
- [x] #2 La acción de eliminar tarjetas activas ejecuta un Soft Delete enviándolas a la Papelera con metadato deletedAt
- [x] #3 Vista o filtro de Papelera accesible para consultar y restaurar tarjetas descartadas
- [x] #4 La purga física definitiva de una tarjeta desde la papelera exige un modal de doble confirmación de seguridad
- [x] #5 Integración con scripts/backlogMdParser.ts para preservar o archivar el archivo de forma resiliente

---

#### [DEV-050] Reordenamiento Drag & Drop en Backlog / Sprint y Priorización con Setting de Ranking Manual Condicional
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Soporte integral para reordenamiento manual de ítems en la vista de Backlog y Sprint & Priorización:
1. **Drag & Drop en Backlog:** Permitir arrastrar y soltar verticalmente filas de la tabla de Backlog para priorizarlas interactivamente, al igual que se hace entre columnas del tablero Kanban.
2. **Ranking Manual Condicional (Setting de Proyecto):** Incorporar en Settings el interruptor `rankingEnabled` (Habilitar Ranking Manual):
   - **Cuando está ACTIVADO:** El usuario puede reubicar libremente las filas mediante drag & drop, persistiendo el orden manual (`order` / `ranking`).
   - **Cuando está DESACTIVADO:** Se bloquea el reordenamiento manual; la tabla respeta estrictamente el orden predefinido (ej. por prioridad descendente o por fecha) y oculta los controles de arrastre para evitar alteraciones accidentales.
3. **Persistencia en Frontmatter:** El valor numérico de ranking se conserva en frontmatter Markdown (`order: 10`, `order: 20`, espaciado para reordenamiento sin colisiones).

**Criterios de Aceptación:**
- [x] #1 Soporte de Drag & Drop vertical fluido para reordenar filas en la tabla de Backlog y contenedores de sprint
- [x] #2 Setting 'rankingEnabled' en SettingsView para activar o desactivar el ranking manual
- [x] #3 Cuando el ranking está desactivado, el arrastre manual queda bloqueado y se respeta el orden estricto de columnas
- [x] #4 Al reordenar filas con ranking activo, se actualiza el campo 'order' y se persiste en los archivos Markdown
- [x] #5 Rendimiento optimizado a 60 FPS durante la interacción de arrastre en listas largas

---

#### [DEV-051] Configuración y Parametrización de Columnas Visibles en la Vista de Backlog
- **Prioridad**: `low` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.4.0

Permitir a los usuarios personalizar qué columnas de información se muestran en la tabla de la vista de Backlog:
1. **Selector de Columnas:** Añadir un menú desplegable/popover "Columnas" en la barra superior de la vista de Backlog con checkboxes para activar u ocultar campos.
2. **Campos Parametrizables:** Posibilidad de alternar:
   - Columnas base: Prioridad, Código, Título, Estado, Tipo.
   - Columnas opcionales: Módulo, Archivo Impactado, Épica/Padre, Dependencias, Release/Versión, Sprints, Fecha de Creación.
3. **Persistencia Local:** Guardar las preferencias de columnas visibles en la configuración local del proyecto (`.devboard/config.json`) para que se mantengan entre sesiones y recargas.
4. **Ergonomía:** Asegurar layout elástico sin scrolls horizontales rotos al alternar columnas.

**Criterios de Aceptación:**
- [x] #1 Popover interactivo 'Columnas' en la barra de herramientas de la vista Backlog
- [x] #2 Capacidad de conmutar visibilidad de columnas opcionales (módulo, parent, release, dependencias, etc.)
- [x] #3 Las columnas obligatorias (código, título) permanecen ancladas para preservar usabilidad mínima
- [x] #4 Persistencia de las columnas activas en .devboard/config.json
- [x] #5 La tabla adapta su distribución de anchos de celda de forma fluida sin romper el layout

---

#### [DEV-052] Zonas de Soltado Multi-Estado (Drop Targets Específicos) en Columnas Kanban Agrupadas
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.4.0

Resolución del problema de asignación de estados cuando una columna Kanban agrupa más de un estado:
1. **Limitación Actual:** Actualmente, si una columna agrupa varios estados (por ejemplo, la columna In Progress agrupa `doing`, `in_progress`, `review`, `testing_qa`), al soltar una tarjeta se le asigna de forma fija el `dropTargetStatus` por defecto de la columna, lo cual es solo un fallback insuficiente y no cubre todos los casos de uso reales.
2. **Subzonas de Soltado Dinámicas:** Cuando el usuario arrastra una tarjeta sobre una columna que tiene múltiples estados asignados (`statuses.length > 1`), la interfaz debe desplegar bloques o zonas de soltado (drop zones) claramente diferenciadas para cada uno de los estados mapeados (ej: bloque para `doing`, bloque para `review`, etc.).
3. **Selección Directa y Fallback:**
   - Si el usuario suelta la tarjeta dentro de una subzona específica, la tarjeta asume inmediatamente ese estado exacto.
   - Si el usuario suelta en el cuerpo general de la columna fuera de las subzonas, se utiliza el `dropTargetStatus` como fallback seguro.

**Criterios de Aceptación:**
- [x] #1 Detectar columnas Kanban con más de un estado mapeado (statuses.length > 1)
- [x] #2 Al sobrevolar la columna con una tarjeta arrastrada, desplegar subzonas de drop claramente delimitadas con el nombre de cada estado
- [x] #3 Soltar sobre una subzona específica transiciona la tarjeta a ese estado exacto
- [x] #4 Soltar en la zona neutra de la columna aplica dropTargetStatus como fallback
- [x] #5 Animación fluida de apertura de subzonas sin provocar jank ni saltos bruscos en el scroll

---

#### [DEV-053] Configuración Visual de Tablero por Drag & Drop en Settings (Arrastre de Estados entre Columnas)
- **Prioridad**: `low` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.4.0

Evolución de la experiencia de usuario en la configuración del tablero en `SettingsView`:
1. **Experiencia Actual:** La asignación de estados a columnas se realiza mediante badges estáticos y selectores desplegables '+ Estado'.
2. **Experiencia por Drag & Drop:** Permitir que los badges de estado sean arrastrables (`draggable`) entre las tarjetas de columnas. El usuario puede tomar un estado (ej. `review`) de una columna y arrastrarlo visualmente hacia otra (ej. de "In Progress" a una columna "Testing"), reasignándolo instantáneamente de manera intuitiva.
3. **Soporte Dual:** Funcionamiento tanto en la pestaña de configuración del Modo Simple (3 columnas) como del Modo Ampliado (5 columnas).
4. **Validaciones:** Prevenir estados huérfanos y asegurar que cada columna conserve un `dropTargetStatus` coherente con sus estados contenidos.

**Criterios de Aceptación:**
- [x] #1 En SettingsView (pestaña Tablero Kanban), los chips de estados son arrastrables entre columnas
- [x] #2 Indicador visual claro del contenedor destino durante el arrastre (hover highlight)
- [x] #3 Al soltar un estado en otra columna, se actualiza la configuración en memoria y se persiste en .devboard/config.json
- [x] #4 Soporte para reconfigurar tanto columnas en modo Simple como en modo Ampliado
- [x] #5 Validación para garantizar que todos los estados esenciales pertenezcan a al menos una columna

---

#### [DEV-054] Rediseño Ergonómico y Expansión del Modal de Crear y Editar Card (Layout de 2 Columnas)
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.2

Rediseño integral de ergonomía y distribución visual en el modal de creación y edición de tarjetas (`ItemModal.tsx`):
1. **Problema de Espacio:** El modal actual es angosto y verticalmente apretado para la alta densidad de información que maneja (criterios de aceptación dinámicos, descripción técnica, plan de implementación, contexto, dependencias y metadatos).
2. **Arquitectura de 2 Columnas (Estilo Linear / GitHub Projects):**
   - **Columna Principal (Izquierda ~65-70%):** Área amplia y despejada dedicada al contenido sustantivo: Título grande, Descripción con soporte enriquecido, Criterios de Aceptación con espacio cómodo de escritura por ítem, y Plan Técnico de Implementación.
   - **Sidebar Lateral de Atributos (Derecha ~30-35%):** Panel lateral estilizado con selectores rápidos y limpios para metadatos: Tipo de Card, Prioridad, Estado, Épica/Padre, Sprints, Release, Enlaces/Dependencias, Etiquetas, Módulo y Archivo Impactado.
3. **Dimensiones:** Ampliar el ancho del modal a `max-w-6xl` en pantallas de escritorio con scrolls independientes para evitar saltos.
4. **Mobile First:** Mantenimiento de la experiencia como bottom-sheet táctil fluido en pantallas pequeñas.

**Criterios de Aceptación:**
- [x] #1 Modal expandido a max-w-6xl en escritorio con distribución moderna de 2 columnas
- [x] #2 Panel principal izquierdo espacioso para título, descripción, criterios de aceptación y plan técnico
- [x] #3 Sidebar lateral derecha compacta y alineada para atributos clave (tipo, prioridad, estado, padre, sprint, release)
- [x] #4 Entradas de criterios de aceptación con altura cómoda y auto-creación fluida
- [x] #5 Adaptación responsive elegante a bottom-sheet en pantallas móviles

---

#### [DEV-055] Ciclo de Vida Integral de Sprints: Objetivo, Fechas con Presets, Estados y Autofiltrado
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Formalización del ciclo de vida y metadatos de los Sprints como entidad ágil de primera clase:
1. **Metadatos Enriquecidos:** Cada Sprint debe contar con:
   - Nombre o identificador (ej: "Sprint 1", "Sprint 2").
   - Descripción / Objetivo del Sprint (Sprint Goal, notas de alcance y acuerdos de la iteración).
   - Fechas de Inicio y Fin con presets rápidos de cálculo automático:
     - 1 semana
     - 2 semanas (estándar común)
     - 3 semanas
     - 4 semanas
     - Personalizado (fechas manuales).
2. **Ciclo de Vida (Estados):** Un sprint transiciona por los estados `planned` (planificado), `active` (en curso) y `completed` (finalizado).
   - Botón "Iniciar Sprint" (con restricción estricta de máximo 1 sprint activo por proyecto).
   - Botón "Completar Sprint" con resumen de cierre.
3. **Autofiltrado en Sprint Board (Scrumban):** Al conmutar a la vista de Tablero de Sprint, el tablero autofiltra su contenido exclusivamente a las tarjetas dentro del alcance del sprint activo.
4. **Orden Cronológico:** Los agrupadores de sprint deben mostrarse predeterminadamente ordenados del más viejo al más nuevo, finalizando siempre en el contenedor "Backlog".

**Criterios de Aceptación:**
- [x] #1 Entidad Sprint estructurada con id, nombre, objetivo/descripción, fechas inicio/fin y estado (planned, active, completed)
- [x] #2 Presets de duración en formulario de sprint (1, 2, 3, 4 semanas y custom) que calculan automáticamente la fecha de fin
- [x] #3 Acciones de 'Iniciar Sprint' (máximo 1 activo a la vez) y 'Completar Sprint'
- [x] #4 En modo Scrumban, el Tablero de Sprint se autofiltra automáticamente al Sprint Activo
- [x] #5 En la vista de Sprints y Priorización, los sprints se ordenan cronológicamente del más viejo al más nuevo, con 'Backlog' al final

---

#### [DEV-056] Releases Multi-Versión y Modelo Unificado de Sprints Jira-Style
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Evolución del modelo de datos para Sprints y Releases en las tarjetas, adoptando un diseño unificado y sin redundancias:
1. **Modelo Unificado de Sprints (Jira-Style):** 
   - Se unifica en un único campo array: `sprints?: string[]`.
   - **Regla de Negocio:** Una tarjeta solo puede tener **1 sprint activo** asignado en curso a la vez.
   - **Historial de Cierres:** Cuando finaliza una iteración asociada a la tarjeta, el sprint permanece guardado en el array `sprints` como registro histórico de sprints finalizados (comportamiento idéntico al estándar de Jira). Se evita la creación de campos paralelos o duplicados como `sprintHistory`.
2. **Releases Multi-Versión:**
   - Una tarjeta puede estar asociada a múltiples versiones a lo largo de su ciclo de vida o en despliegues concurrentes (ej: release de hotfix en `0.2.1` y de release general en `0.3.0`).
   - Se amplía el campo a `releases?: string[]` manteniendo compatibilidad con `release?: string`.
3. **Persistencia Frontmatter:** Almacenamiento limpio en Markdown (`sprints: ['Sprint 1', 'Sprint 2']`, `releases: ['0.2.1', '0.3.0']`).

**Criterios de Aceptación:**
- [x] #1 BacklogItem unifica los sprints en un único campo array 'sprints?: string[]' sin campos paralelos de historial
- [x] #2 Regla de negocio que valida máximo 1 sprint en estado activo asociado a la tarjeta a la vez
- [x] #3 Al completar un sprint, las tarjetas asociadas conservan el sprint finalizado en su lista 'sprints'
- [x] #4 Soporte para asociar múltiples versiones/releases por tarjeta (releases?: string[])
- [x] #5 Sincronización y persistencia transparente en frontmatter Markdown sin pérdida de datos

---

#### [DEV-058] Política de Visualización Limpia en Tablero: Ocultamiento por Defecto de Cards en 'Done' y Toggle de Histórico
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.2

Optimización de la visualización de tareas finalizadas en el tablero Kanban (especialmente en la vista simplificada y en el tablero de sprint goal):
1. **Problema de Acumulación:** En tableros ágiles, acumular decenas de tarjetas históricas cerradas en la columna `Done` no aporta valor operativo al día a día del equipo y satura la pantalla, provocando desorden y lentitud de renderizado.
2. **Ocultamiento por Defecto:**
   - En la vista simplificada y tableros acotados a sprint, ocultar por defecto las tarjetas en `done` que pertenezcan a iteraciones pasadas o finalizadas hace más de un intervalo configurable.
   - Mostrar un indicador limpio y sutil al tope de la columna Done con el conteo de tarjetas históricas archivadas (ej: "+18 tareas completadas anteriormente").
3. **Toggle Bajo Demanda (Estilo Ideas):** Incorporar un botón o selector interactivo (similar al de Ideas) para mostrar u ocultar el histórico de Done cuando el usuario explícitamente desee auditarlo.

**Criterios de Aceptación:**
- [x] #1 En vista simplificada, no acumular tareas finalizadas históricas en la columna Done por defecto
- [x] #2 Indicador visual sutil al tope de la columna con el conteo de tareas completadas ocultas
- [x] #3 Botón interactivo o toggle para revelar el histórico completo de Done bajo demanda
- [x] #4 Persistencia de la preferencia de visualización en Settings (.devboard/config.json)
- [x] #5 Reducción comprobable del número de nodos DOM y mejora en fluidez de render

---

#### [DEV-059] Administración y Personalización de Tipos de Cards y Flujos de Trabajo por el Usuario (Admin Soberano)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Otorgar soberanía total y personalización al usuario/admin para definir y gestionar la taxonomía de tipos de tarjeta y flujos de trabajo de su proyecto:
1. **Soberanía Administrativa:** Aunque DevBoard incluye tipos predeterminados (`feature`, `bug`, `tech_debt`, `ux`, etc.), el usuario es el dueño de su proyecto y flujo. Debe poder crear nuevos tipos personalizados (ej. `spike`, `research`, `design`, `meeting`, `infra`), editar los existentes (nombre, color semántico, icono) o eliminar los que no utilice.
2. **Editor de Tipos en Settings:** Incorporar en `SettingsView` una sección dedicada "Tipos de Tarjeta y Taxonomía" donde se listen los tipos actuales con acciones de edición inline, cambio de paleta cromática, asignación de icono de Lucide y botón "+ Nuevo Tipo".
3. **Integración Universal:** Los nuevos tipos creados deben poblarse automáticamente en los modales de creación y edición (`ItemModal.tsx`), filtros de búsqueda (`FilterBar.tsx`) y badges de las tarjetas (`ItemCard.tsx`).
4. **Persistencia Local:** Almacenamiento directo en `.devboard/config.json` bajo `config.customItemTypes`.

**Criterios de Aceptación:**
- [x] #1 Sección 'Tipos de Tarjeta' en SettingsView con gestión CRUD completa (crear, editar, eliminar)
- [x] #2 Formulario de configuración de tipo: identificador clave, nombre legible, color semántico e icono
- [x] #3 Los tipos personalizados se reflejan automáticamente en los selectores de ItemModal y FilterBar
- [x] #4 Los badges de ItemCard renderizan adecuadamente el color e icono del tipo personalizado
- [x] #5 Persistencia automática y aislada en .devboard/config.json sin romper esquemas preexistentes

---

#### [DEV-060] Internacionalización Total (i18n): Cobertura 100% en Inglés y Español sin Textos Hardcodeados y Selector en Settings
- **Prioridad**: `high` | **Tipo**: `feature`

Infraestructura completa de internacionalización (i18n) para soportar navegación fluida en Español e Inglés con cobertura total de la interfaz:
1. **Cero Textos Hardcodeados:** Extracción sistemática de todos los textos presentes en componentes, cabeceras, botones, badges, modales, tooltips, toasts de feedback, empty states y páginas de ajustes hacia archivos de localización estructurados (`locales/es.json` y `locales/en.json`).
2. **Selector de Idioma en Settings:** Incorporar en `SettingsView` (pestaña General) un selector interactivo para alternar entre Español e Inglés, con persistencia instantánea en la configuración del proyecto (`config.locale`).
3. **Detección Automática:** Detección inicial inteligente basada en las preferencias de idioma del navegador (`navigator.language`), con fallback seguro a Español o Inglés.
4. **Tipado Estricto de Claves:** Provisión de un hook o helper reactivo `useTranslation()` con autocompletado y validación TypeScript de claves de traducción para prevenir claves inexistentes en tiempo de compilación.

**Criterios de Aceptación:**
- [x] #1 Diccionarios de traducción completos para Español (es) e Inglés (en) cubriendo el 100% de los textos en pantalla
- [x] #2 Hook o contexto useTranslation() fuertemente tipado con cambio de idioma reactivo sin recarga de página
- [x] #3 Selector interactivo de idioma en SettingsView con persistencia en .devboard/config.json
- [x] #4 Detección automática inicial del idioma del navegador
- [x] #5 Auditoría estricta de código para validar ausencia de strings de texto visibles hardcodeadas

---

#### [DEV-062] Separación de Versiones en Unreleased (Dev) y Released (Producción) en Release Hub y Modelo de Datos
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.0

Corrección conceptual integral del ciclo de vida de versiones: una versión en desarrollo (staging/dev) es 'unreleased' independientemente de si tiene tareas listas o commits. Solo pasa a 'released' (histórico inmutable) al ser explícitamente promovida/desplegada a producción.

**Criterios de Aceptación:**
- [x] #1 Soporte explícito para status 'unreleased' en Release y migración de v0.3.0 de released a unreleased en releases.json
- [x] #2 vite.config.ts no asigna releasedAt ni fuerza status done salvo que la versión sea explícitamente 'released'
- [x] #3 ReleaseAssembler.tsx divide claramente 'Unreleased / En Preparación' de 'Releases Históricos (Producción)'
- [x] #4 Botón 'Guardar Borrador Unreleased' para actualizar changelog continuo en dev sin sellar histórico
- [x] #5 Modal/Acción deliberada 'Liberar a Producción' que solicita confirmación antes de marcar como 'released' y registrar releasedAt
- [x] #6 MCP server (devboard_list_releases) expone el campo status ('unreleased' | 'released' | 'planned') de cada versión

---

#### [DEV-063] Fix: Estabilidad de Scroll, Tie-Breakers Deterministas y Normalización al Ordenar en Vista Sprint
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.3.0

Corrección del comportamiento de salto vertical, parpadeo y desplazamiento involuntario de la pantalla al ordenar por columnas (especialmente Prioridad) en `SprintView.tsx`:
1. **Comparador Débil y Valores No Normalizados:** Al ordenar por prioridad, si las prioridades coinciden o contienen valores textuales no estándar (`urgent`, `high`, `undefined`), el comparador produce `0` o `NaN`, corrompiendo la estabilidad del ordenamiento y alterando aleatoriamente las alturas de los bloques. Se debe normalizar la prioridad y utilizar un tie-breaker secundario determinista (desempate por `code`).
2. **Preservación de Scroll del Viewport:** Al hacer click en un header de ordenamiento en una tabla ubicada más abajo en la página (ej. Backlog), el reordenamiento de los grupos superiores altera la altura total y el navegador resetea o desplaza bruscamente `window.scrollY`. Se debe anclar o restaurar de forma fluida e instantánea la posición relativa del viewport al cambiar de orden.

**Criterios de Aceptación:**
- [x] #1 Normalizar prioridades y aplicar tie-breaker determinista por código en el ordenamiento por prioridad
- [x] #2 Aplicar tie-breaker determinista por código en el ordenamiento por estado
- [x] #3 Preservar de forma instantánea y fluida la posición de scroll (`window.scrollY`) antes y después del ordenamiento
- [x] #4 Prevenir saltos de layout o scroll anchoring errático en las tablas de SprintView
- [x] #5 Verificación interactiva en navegador confirmando cero saltos de scroll al ordenar

---

#### [DEV-064] Hardening de MCP Server: Sanitización de Prefijo, Cálculo Robusto de IDs Secuenciales y Herramienta devboard_sync_backlog
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.1

Hardening integral del servidor MCP (`scripts/mcp-server.ts` y binario standalone `bin/devboard-mcp.js`):
1. **Sanitización de Prefijos de Proyecto:** Eliminar caracteres no alfanuméricos en `codePrefix` (ej. `dev-board` extraía `"DEV-"`, produciendo dobles guiones `DEV--060`). Limpiar con `.replace(/[^A-Z0-9]/g, '')`.
2. **Cálculo Robusto de IDs Secuenciales:** Reemplazar `tasks.length + 1` por una búsqueda de `max(num) + 1` parseando los códigos existentes mediante regex para evitar colisiones numéricas cuando hay tareas eliminadas o no correlativas.
3. **Herramienta `devboard_sync_backlog`:** Nueva tool JSON-RPC que reconcilia tareas y genera `BACKLOG.md` sin requerir que agentes de IA ejecuten comandos de shell sueltos (`npm run backlog:sync`).

**Criterios de Aceptación:**
- [x] #1 Sanitización de prefijo en mcp-server.ts impidiendo dobles guiones en IDs generados
- [x] #2 Cálculo de nuevo ID basado en max(existentes) + 1 con fallback seguro
- [x] #3 Implementación de tool devboard_sync_backlog en el servidor MCP
- [x] #4 Reconstrucción del binario standalone bin/devboard-mcp.js y validación con scripts/verify-mcp-binary.js

---

#### [DEV-065] Actualización de Skills de Agentes: Guía Estricta Anti-Scripts de Terminal y Ciclo de Vida Unreleased vs Released
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.1

Actualización y enriquecimiento de las Skills del repositorio (`.agents/skills/devboard`, `.agents/skills/rigorous-qa-auditor`, `AGENTS.md`):
1. **Regla Anti-Scripts Sueltos:** Establecer como principio fundamental que los agentes de IA NO deben ejecutar scripts ad-hoc de Node (`node -e ...`) ni comandos bash destructivos (`mv`, `rm` sobre el backlog) cuando operan en DevBoard. Si una operación falta, debe usarse o proponerse una herramienta MCP.
2. **Ciclo de Vida de Releases:** Documentar la distinción canónica entre `unreleased` (paquete activo en desarrollo, mutable, changelog vivo) y `released` (histórico inmutable en producción con `releasedAt`).
3. **Auditoría de Identificadores:** Instrucciones para que el auditor de QA verifique la integridad de prefijos (`DEV-XXX`), evitando duplicidades o formatos corruptos.

**Criterios de Aceptación:**
- [x] #1 Actualizar .agents/skills/devboard/SKILL.md con las reglas anti-scripts y el flujo unreleased vs released
- [x] #2 Actualizar .agents/skills/rigorous-qa-auditor/SKILL.md con guardrails de integridad de IDs
- [x] #3 Reflejar las directivas clave en AGENTS.md

---

#### [DEV-066] Simplificación Conceptual de Releases: Lista Unificada (En Preparación vs Implementado) y Detalle Progresivo
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.3.1

Refactorización y simplificación radical del modelo y la interfaz de Releases:
1. **Unificación Conceptual:** 'Planning', 'Target' y 'Unreleased' son conceptualmente lo mismo: una versión **En Preparación**. Eliminar la división artificial en bloques separados redundantes.
2. **Modelo Binario Puro:**
   - **En Preparación (Unreleased / Dev):** Trabajo activo, editable, mutable.
   - **Implementado / Entregado (Released / Prod):** Desplegado a producción, histórico e inmutable.
3. **Ergonomía de Lista y Detalle Progresivo:** Presentar las versiones en una lista limpia y concisa (vista compacta / feed simple). Desplegar metadatos extensos, notas de cambio y edición únicamente cuando el usuario selecciona o expande una versión específica.

**Criterios de Aceptación:**
- [x] #1 Unificar los estados del modelo de Release a exclusivamente 'unreleased' y 'released'
- [x] #2 Rediseñar ReleaseAssembler.tsx hacia una vista tipo lista compacta y clara sin divisiones redundantes
- [x] #3 Implementar panel de detalle progresivo (drawer o split-view) para inspección y edición bajo demanda

---

#### [DEV-067] Arquitectura Unificada de Filtros: Filtro General de Estados (Inclusión/Exclusión), Quick Filters y Popover Multiselect
- **Prioridad**: `urgent` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.3.3

Evolución integral del sistema de filtrado de DevBoard hacia un modelo limpio, escalable y unificado:
1. **Filtro General de Estados (Inclusión / Exclusión):** Unificación de la visibilidad de estados activos (draft, doing, review, ready), tareas completadas (done) y tareas de descarte/cancelación (dismissed, cancelled).
   - Política predeterminada: tareas activas y completadas de la iteración actual incluidas; completadas de iteraciones pasadas y descartadas/canceladas excluidas por defecto.
   - Flexibilidad total: activación bajo demanda para auditar descartadas o consultar completadas históricas sin cambiar de pestaña.
2. **Estrategia Dual de Interfaz:**
   - **Quick Filters en Encabezado:** Acceso inmediato con un clic a búsquedas (⌘K), selector de Sprint Goal, toggles de estado (✓ Completadas anteriores, ✕ Descartadas) y pills rápidas.
   - **Popover de Filtros Avanzados (Filtros ▾ (N)):** Panel desplegable extensible con soporte multiselect para Tipos, Prioridades, Estados, Sprints, Releases y Módulos.
   - **Chips Activos Descartables y Reset:** Visualización de chips con ✕ y botón universal de 'Limpiar filtros'.

**Criterios de Aceptación:**
- [x] #1 Extender FilterState en types.ts para soportar multiselect (types, priorities) y filtro general de estados (includePreviousDone, includeDismissedCancelled)
- [x] #2 Implementar AdvancedFiltersPopover.tsx con interfaz multiselect por categorías y contador de filtros activos
- [x] #3 Actualizar FilterBar.tsx para incorporar el botón desplegable de Filtros y Quick Filters en el encabezado con chips activos
- [x] #4 Actualizar lógica central en App.tsx para procesar la inclusión/exclusión de estados y multiselect
- [x] #5 Refactorizar KanbanBoard.tsx eliminando botones ad-hoc y vinculando la columna Done y las completadas anteriores al filtro unificado
- [x] #6 Verificación con npm run build y sincronización limpia del backlog

---

#### [DEV-068] Fix: devboard_list_tasks — Filtro por Sprint Retorna Todos los Tasks
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

El filtro `{ "sprint": "Sprint 3" }` en `devboard_list_tasks` no filtra por sprint: retorna todos los tasks del proyecto. Esto genera confusión en auditorías de sprint y obliga al agente a filtrar manualmente el JSON.

**Root cause posible:** El campo `sprint` en el frontmatter Markdown puede estar bajo nombres alternativos (`targetSprint`, `milestone`) que el parser no mapea al filtro `sprint` de la API.

**Fix esperado:** El filtro `sprint` en `devboard_list_tasks` debe matchear los campos `sprint`, `targetSprint`, y el frontmatter `sprint:` del archivo Markdown.

**Criterios de Aceptación:**
- [x] #1 devboard_list_tasks con { sprint: 'Sprint 3' } retorna solo tasks cuyo frontmatter contiene sprint: Sprint 3
- [x] #2 El filtro también matchea el campo targetSprint cuando coincide con el valor buscado
- [x] #3 Test con proyecto dev-board: filtrar por Sprint 3 retorna exactamente DEV-047, DEV-049, DEV-051, DEV-052, DEV-053, DEV-055, DEV-067 y nada más
- [x] #4 Documentar el filtro corregido en el schema MCP
- [x] #5 La corrección es backwards-compatible con el CLI devboard list

---

#### [DEV-069] Fix: devboard_update_task — Ignorar status dentro del objeto updates silenciosamente
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

Cuando se pasa `{ "taskId": "DEV-001", "updates": { "status": "ready" } }`, el servidor MCP ignora el campo `status` dentro de `updates` sin retornar error. El task mantiene su estado anterior.

Esto genera un bug silencioso muy difícil de detectar: el agente cree que actualizó el status, pero el archivo Markdown no cambia.

**Fix esperado:** El servidor MCP debe aceptar `status` tanto como campo top-level como dentro de `updates`, O retornar un error claro indicando que `status` no es válido dentro de `updates` para evitar la confusión.

**Criterios de Aceptación:**
- [x] #1 devboard_update_task acepta status dentro de updates Y lo aplica correctamente
- [x] #2 O bien: devboard_update_task retorna un warning/error cuando se detecta status dentro de updates (para que el agente pueda corregirlo)
- [x] #3 Documentar claramente en el schema MCP el campo correcto para cambiar status
- [x] #4 Añadir test unitario que valide ambas formas de pasar el status

---

#### [DEV-070] Feature: Retro Automática al Cerrar Sprint — Template y Checklist Integrado
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Implementar soporte nativo para Sprint Retrospectivas en DevBoard.

**Motivación:** Las retros manuales al final de cada sprint son valiosas pero se omiten cuando el sprint se cierra rápidamente. Se necesita un mecanismo que las haga obligatorias y estructuradas.

**Funcionalidad esperada:**
1. Al marcar el último item de un sprint como `ready` o al ejecutar 'Completar Sprint', DevBoard muestra un prompt de retro.
2. El template de retro incluye las 4 dimensiones: Problemas, Eficiencia, Fortalezas, Acciones.
3. Las acciones concretas de la retro se convierten automáticamente en nuevas tareas del backlog.
4. La retro queda guardada como archivo en `backlog/retros/sprint-N-retro.md`.
5. El MCP expone `devboard_create_retro` y `devboard_list_retros`.

**Criterios de Aceptación:**
- [x] #1 Al completar un sprint, CompleteSprintModal incluye paso de retro opcional pero promovido
- [x] #2 Template de retro con secciones: ¿Qué salió bien?, ¿Qué mejorar?, ¿Qué cambiar?, Acciones concretas
- [x] #3 Las acciones se pueden convertir en tasks con un click (Create Task from Action)
- [x] #4 La retro se persiste en backlog/retros/ como archivo Markdown estándar
- [x] #5 devboard_list_retros MCP tool lista las retros guardadas con resumen
- [x] #6 La retro aparece en el timeline de la Release Notes si el sprint tiene release asociado

---

#### [DEV-071] Fix: Aislamiento estricto de Sprints por Proyecto y Prevención de Fugas Cross-Project
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

En instalaciones multi-proyecto, los sprints registrados en otros proyectos se filtraban hacia el proyecto activo (dev-board), generando agrupadores de sprints vacíos con badge 'Activo' ('Sprint Temático A', 'Performance y Escala', etc.) que no existen en el sprints.json local y no pueden ser eliminados.

**Criterios de Aceptación:**
- [x] #1 Garantizar que readProjectBacklog en backend asigne siempre projectId a cada sprint cargado desde sprints.json
- [x] #2 En App.tsx, derivar projectSprints filtrando boardData.sprints estrictamente por selectedProjectId
- [x] #3 Pasar projectSprints y availableSprints contextuales a SprintView, KanbanBoard y selectores de modal
- [x] #4 En handleDeleteSprint y mutaciones de sprints, enviar el projectId específico del sprint para permitir su eliminación adecuada
- [x] #5 Eliminar la fuga de sprints de proyectos foráneos en la vista Sprint & Priorización

---

#### [DEV-072] Integración de CodeGraph MCP, Codegraph Studio y Guía de Arquitectura de Código
- **Prioridad**: `high` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: 0.4.0

Integración de la extensión CodeGraph MCP (Andrey Gavrilov) y Codegraph Studio en el entorno de desarrollo para agilizar el análisis semántico de código, reducir consumo de tokens y prevenir regresiones antes del Sprint 4. Incluye la documentación canónica de arquitectura y reglas de navegación para agentes.

**Criterios de Aceptación:**
- [x] #1 Configurar el servidor CodeGraph MCP en mcp_config.json apuntando a http://localhost:6010/mcp
- [x] #2 Crear docs/ARCHITECTURE.md con la topología integral del proyecto (Vite backend, Vistas React, Storage y MCP)
- [x] #3 Crear regla en .agents/rules/codebase-navigation.md para guiar la navegación de agentes con CodeGraph y el mapa arquitectónico
- [x] #4 Verificar que los tipos y el build continúen pasando sin regresiones

---

#### [DEV-073] Documentación técnica de CodeGraph MCP y refinamiento de skills de ingeniería
- **Prioridad**: `medium` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: 0.4.0

Refinar la documentación y skills de DevBoard incorporando las herramientas de CodeGraph MCP, sus comandos de consulta semántica, el gotcha de activación del Language Server de TypeScript y la estrategia de fallback con docs/ARCHITECTURE.md.

**Criterios de Aceptación:**
- [x] #1 Documentar el servidor CodeGraph MCP y su gotcha de activación en AGENTS.md
- [x] #2 Actualizar la regla .agents/rules/codebase-navigation.md con el protocolo de fallback inteligente
- [x] #3 Actualizar el skill .agents/skills/principal-engineer/SKILL.md con las directivas de análisis semántico e impacto antes de refactors
- [x] #4 Validar compilación tsc y sincronización de backlog

---

#### [DEV-074] Botón Deshacer Cambios en Settings (Restablecer Estado no Guardado)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.4.0

Al lado del botón 'Guardar Cambios' en la vista de configuración (`SettingsView.tsx`), agregar un botón 'Deshacer Cambios' que permita descartar la configuración editada en el formulario y restablecer todas las preferencias locales al estado guardado en disco (`config`), evitando guardar modificaciones no deseadas.

**Criterios de Aceptación:**
- [x] #1 Mostrar botón 'Deshacer Cambios' al lado de 'Guardar Cambios' en SettingsView cuando existan modificaciones no guardadas (isDirty)
- [x] #2 Al hacer clic en 'Deshacer Cambios', restablecer inmediatamente todos los estados locales al valor persistido en config
- [x] #3 Deshabilitar u ocultar el botón 'Deshacer Cambios' cuando no haya cambios pendientes (!isDirty)
- [x] #4 Proporcionar feedback visual y toast confirmando el restablecimiento de los ajustes

---

#### [DEV-075] Mostrar/ocultar sprint como columna en SprintView
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

Permitir que la activación/desactivación de la columna Sprint en el popover de Columnas refleje visualmente la columna en la tabla tanto en agrupamiento por sprint como en otros agrupamientos.

**Criterios de Aceptación:**
- [x] #1 Eliminar el bloqueo condicional groupBy !== 'sprint' para los encabezados y celdas de la columna Sprint en SprintView
- [x] #2 Asegurar que cuando visibleCols incluya 'sprint', la columna Sprint se visualice con su selector/etiqueta interactiva
- [x] #3 Verificar que al desmarcar 'sprint' en el popover de columnas, la columna se oculte adecuadamente
- [x] #4 Validar compilación con tsc --noEmit

---

#### [DEV-076] Sanitización de prefijo y cálculo max+1 al crear ítems en la API web
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

Corregir POST /api/items en vite.config.ts para sanitizar codePrefix (evitar dobles guiones DEV--) y calcular el correlativo usando max+1 sobre backlog.items y archivos en disco, alineándolo con el MCP server.

**Criterios de Aceptación:**
- [x] #1 Sanitizar codePrefix en data/projects-registry.json (remover guión final) y en vite.config.ts
- [x] #2 Implementar cálculo max+1 sobre tareas existentes y archivos en disco en POST /api/items de vite.config.ts
- [x] #3 Sanitizar generateTaskFilename en scripts/backlogMdParser.ts para prevenir dobles guiones accidentales
- [x] #4 Validar creación de tareas y consistencia con npm run test:backlog y tsc --noEmit

---

#### [DEV-077] Mejora selectores sprints y releases en modal de card
- **Prioridad**: `low` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.5.0

Para el campo sprint el listado de sprint debiera ser con un UX/UI similar a la app / modal, no debiera parecer un listado de autocompletado del navegador sin personalidad. Para el campo release, las sugerencias debieran ser por defecto las versiones creadas y en estado unreleased, ya que si no se acumulan históricamente sin límite. Al completar el campo manualmente esta bien que permita incluir tanto unreleased como released versiones, pero no sugerirlas.

**Criterios de Aceptación:**
- [x] #1 Diseñar un selector/dropdown con estética coherente con la UI de DevBoard para el campo de Sprint en ItemModal
- [x] #2 Filtrar las sugerencias por defecto del campo Release mostrando únicamente versiones en estado unreleased
- [x] #3 Permitir la entrada o selección manual de versiones released si el usuario lo requiere expresamente

---

#### [DEV-078] Separación estricta de Sprint y Estado en columnas filtros y datos
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.4.0

Garantizar la independencia total y estricta entre Sprint y Estado: agregar Estado como columna configurable en SprintView, desacoplar la opción 'Backlog' cambiándola a 'Sin Sprint' en selectores de Sprint, y eliminar etiquetas cruzadas en modales y filtros.

**Criterios de Aceptación:**
- [x] #1 Incluir 'estado' en ALL_OPTIONAL_COLS y en el selector de columnas de SprintView
- [x] #2 Hacer condicional el renderizado de la columna Estado en encabezado y celdas de SprintView según visibleCols.has('estado')
- [x] #3 Reemplazar la opción 'Backlog' por 'Sin Sprint' en el selector de Sprint de SprintView y filtros
- [x] #4 Remover sufijo '(Backlog)' en ItemModal, KanbanBoard y AdvancedFiltersPopover para desacoplar Estado y Sprint
- [x] #5 Verificar compilación limpia con tsc --noEmit

---

#### [DEV-079] mejora en columnas / sumar mas campos
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.5.0

Permitir agregar y ocultar columnas adicionales de tareas en la vista de Sprints y Backlog. Específicamente, incorporar campos estructurados no extensos: Criterios de Aceptación (ACs ratio/progreso), Responsables/Asignados (assignees), Etiquetas (labels) y Épica (epic). Cada columna puede activarse u ocultarse dinámicamente desde el popover de Columnas.

**Criterios de Aceptación:**
- [x] #1 El popover de Columnas permite activar/desactivar Criterios de Aceptación (acProgress), Asignados (assignees), Etiquetas (labels) y Épica (epic).
- [x] #2 Cada nueva columna cuenta con su celda th en el encabezado y su renderizado correspondiente con diseño visual pulido en las filas de tareas.
- [x] #3 Las selecciones de columnas se persisten de forma transparente en localStorage y se sincronizan al modificar opciones.

---

#### [DEV-080] la retro no es del release
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

la retro debe estar asignada al sprint no al release, es un error conceptual

**Criterios de Aceptación:**
- [x] #1 Eliminar la pestaña errónea de Retrospectivas en el Drawer de Releases (`ReleaseAssembler.tsx`), desacoplando conceptualmente la ceremonia de sprint del release.
- [x] #2 Incorporar en `SprintView.tsx` un botón "Ver Retrospectiva" en la cabecera de sprints completados (`status === 'completed'`).
- [x] #3 Diseñar modal para visualizar el acta Markdown de la retrospectiva del sprint completado correspondiente.

---

#### [DEV-081] cambios pendientes apenas al entrar a config
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al ingresar a la vista de Configuración (SettingsView), aparece de inmediato el banner de cambios pendientes y el botón "Deshacer cambios" sin que el usuario haya modificado ningún ajuste. Esto se debe a que `isDirty` realiza un `JSON.stringify` ingenuo donde `builtConfig.customItemTypes` es `[]` mientras que en `config.json` dicha propiedad es `undefined`, produciendo un falso positivo permanente.

**Criterios de Aceptación:**
- [x] #1 Al ingresar a Configuración sin editar nada, el banner de cambios pendientes y botón 'Deshacer' deben permanecer ocultos (isDirty = false).
- [x] #2 La función de detección de dirty state debe normalizar propiedades opcionales/vacías (customItemTypes, wipLimits, tabs) para evitar discrepancias estructurales.
- [x] #3 Al modificar efectivamente cualquier valor de configuración, el banner de cambios pendientes debe activarse y responder correctamente a Guardar y Deshacer.

---

#### [DEV-082] Soporte de campo sprint en mutaciones MCP y marcado masivo de criterios de aceptación (ACs)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.5.0

Requerimiento de usuario originado desde un proyecto consumidor externo.

Como consumidores del servidor MCP de DevBoard al gestionar tareas bajo el estándar Backlog.md, encontramos las siguientes oportunidades de mejora para su evaluación:
1. Poder asignar o mover tareas de sprint directamente vía MCP (actualmente `devboard_update_task` y `devboard_bulk_update_tasks` no admiten el campo `sprint`).
2. Permitir marcar todos los criterios de aceptación en una sola llamada (actualmente sólo existe `toggleAcIndex` individual, lo que en tareas con muchos ACs genera lentitud y riesgo de race conditions).
3. Asegurar que el filtro `sprint` en `devboard_list_tasks` restrinja correctamente las tareas devueltas.
4. Robustecer el formateo de frontmatter cuando los títulos incluyen comillas o tags como `<input ...>`.

Queda a total consideración y diseño del equipo de DevBoard.

**Criterios de Aceptación:**
- [x] #1 El servidor MCP permite actualizar el campo sprint en devboard_update_task y devboard_bulk_update_tasks
- [x] #2 Se dispone de un parámetro (ej: checkAllAcs: true) para alternar todos los ACs en una sola operación sin requerir múltiples tool calls secuenciales
- [x] #3 El filtro sprint en devboard_list_tasks filtra adecuadamente por la propiedad sprint del frontmatter
- [x] #4 El serializador de frontmatter YAML maneja defensivamente caracteres especiales y comillas en títulos

---

#### [DEV-083] backlog no es un sprint
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

En la vista de Sprints y Backlog (SprintView), los ítems sin sprint asignado (grupo Backlog) no deben indicar porcentaje de completitud ni barra de progreso. El Backlog es un inventario continuo y abierto de tareas no planificadas o pendientes, por lo que mostrar métricas de avance de iteración (ej: '0/14 (0%)') es conceptualmente erróneo.

**Criterios de Aceptación:**
- [x] #1 El bloque de Backlog (ítems sin sprint) no debe mostrar indicador de porcentaje ni barra de progreso.
- [x] #2 El encabezado del Backlog debe indicar el conteo de ítems totales sin métricas de finalización de sprint.
- [x] #3 Los sprints formales continúan mostrando su barra de progreso y ratio de completitud normalmente.

---

#### [DEV-084] incluir soporte para BDD (historias y criterios de aceptacion)
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.5.0

incluir la posibilidad de que se completen los requerimientos en formato historia de usuario con el framework BDD

Historia de usurario / Feature / Requerimiento > COMO (rol) QUIERO (necesidad) PARA (beneficio)
Criterios de aceptacion > Scenario/GIVEN/WHEN/THEN

**Criterios de Aceptación:**
- [x] #1 Agregar botón/atajo en ItemModal para insertar plantilla de Historia de Usuario BDD en la Descripción: COMO (rol) / QUIERO (acción) / PARA (beneficio).
- [x] #2 Agregar botón/atajo en ItemModal para insertar Criterios de Aceptación con formato BDD Scenario: DADO (contexto) / CUANDO (evento) / ENTONCES (resultado).
- [x] #3 Mantener compatibilidad total con texto libre y criterios existentes.

---

#### [DEV-085] La tabla de tareas en la vista de Sprints/Backlog no muestra columnas de Tipo, Estado y Release
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

En la vista de Sprints y Backlog, al desplegar la lista de tareas del Backlog (o de un sprint), la tabla solo mostraba las columnas `#`, `Prio`, `Código` y `Título`. Las columnas `Tipo`, `Estado` y `Release` no se renderizaban en navegadores con un `localStorage` antiguo porque la migración solo forzó la inclusión de `estado`. Se requiere una inicialización defensiva que garantice que las columnas núcleo estén visibles por defecto y un botón de restablecimiento.

**Criterios de Aceptación:**
- [x] #1 La tabla de tareas en Sprints y Backlog renderiza por defecto las columnas Tipo, Estado y Release sin requerir configuración manual.
- [x] #2 Se implementa migración defensiva para usuarios existentes con localStorage desfasado garantizando la visualización de columnas esenciales.
- [x] #3 El popover de Columnas incluye la opción de 'Restablecer por defecto' para recuperar la configuración canónica en un solo clic.

---

#### [DEV-086] Visibilidad de Sprints planificados vacíos en vista de Sprint & Priorización
- **Prioridad**: `urgent` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al crear un nuevo Sprint en estado 'planned' (como Sprint 5 recien creado), no se visualiza en la vista de Sprint & Priorización porque el filtro de agrupación excluye sprints planned con 0 tareas, impidiendo planificar y arrastrar o asignar tareas al nuevo sprint.

**Criterios de Aceptación:**
- [x] #1 Los sprints en estado planned vacíos deben mostrarse en la vista de Sprint & Priorización con su drop zone para permitir la planificación.
- [x] #2 El selector inline de sprints en las filas del backlog debe listar todos los sprints disponibles incluyendo sprints planificados.
- [x] #3 El nuevo Sprint 5 debe renderizarse inmediatamente en la vista y permitir arrastrar y soltar tareas desde el Backlog.

---

#### [DEV-087] veo releases en los atributos del item que no existen en la tab release
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

ej. vv1.1.0, vSprint 4, etc no son releases ni en preparacion ni finalizados

**Criterios de Aceptación:**
- [x] #1 No extraer valores arbitrarios o desalineados de `item.release`/`targetRelease` para las sugerencias de versiones; tomar como fuente canónica las versiones declaradas en `releases.json` (`boardData.releases`).
- [x] #2 En el selector/chips de versiones en `ItemModal`, mostrar únicamente versiones oficiales existentes, priorizando por defecto las versiones `unreleased` (en preparación).
- [x] #3 Permitir tipeo manual libre si el usuario necesita especificar una versión nueva o no listada aún.

---

#### [DEV-088] No es posible cambiar un item a Idea / Discovery
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al seleccionar un item del backlog, el cambio de "estado" a Idea no se persiste y por ende no se visualiza el item en la columna de ideas / discovery. CanonicalStatus y normalizeStatus en backlogMdParser normalizaban ideas a draft, impidiendo su almacenamiento y visualización en la columna col-ideas del tablero Kanban.

**Criterios de Aceptación:**
- [x] #1 CanonicalStatus y normalizeStatus en backlogMdParser.ts reconocen ideas, idea y discovery como estado 'ideas', y formatStatusForMd formatea 'Ideas'.
- [x] #2 Al cambiar el estado a '💡 Idea / Discovery' desde ItemModal.tsx o arrastrando en KanbanBoard, el estado 'ideas' se persiste en memoria y disco sin degradarse a 'draft'.
- [x] #3 Los items en estado 'ideas' son correctamente filtrados y visibles en la columna 'Ideas' (col-ideas) del KanbanBoard al activar la visualización de ideas.

---

#### [DEV-089] Persistencia del campo sprint al guardar desde ItemModal
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al seleccionar un sprint y guardar desde el modal de edición de tarea (ItemModal), el item no persiste el campo de sprint en disco ni se refleja correctamente en la vista de Sprints & Priorización, quedando ubicado en Backlog. Debe asegurarse la serialización atómica y bidireccional de sprint/sprints tanto en ItemModal, la API y el parser de Backlog.md.

**Criterios de Aceptación:**
- [x] #1 ItemModal envía el valor de sprint y targetSprint (y limpia adecuadamente si se desasigna el sprint) hacia la API PUT /api/items/:id.
- [x] #2 La API y saveBacklogMdItem sincronizan taskData.sprint, targetSprint y taskData.sprints, escribiendo correctamente la propiedad sprint en el frontmatter del archivo Markdown.
- [x] #3 readProjectBacklog y parseBacklogMd resuelven de forma robusta el sprint activo ya sea desde sprint, targetSprint o sprints array.
- [x] #4 Al cambiar el sprint desde ItemModal y recargar la vista, el ítem permanece en la columna del sprint asignado en la vista de Sprints y en el selector del modal.

---

#### [DEV-090] Sincronización bidireccional de tareas en releases y rediseño UX/UI del drawer
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Inconsistencia entre tareas con release asignado en Sprint/Backlog y el panel de releases (se mostraba 0 tareas asociadas en el drawer y métrica divergente en la tarjeta). Adicionalmente, el popup/drawer de releases presenta deficiencias graves de UX/UI: el desenfoque de fondo no cubre el 100% de la pantalla (deja la barra de navegación expuesta) y la disposición/alineación de elementos dentro del drawer es deficiente.

**Criterios de Aceptación:**
- [x] #1 Sincronización bidireccional estricta de tareas asociadas a releases: tareas con release/targetRelease v0.5.0 se reflejan inmediatamente en la pestaña de Tareas del drawer y en rel.itemCodes.
- [x] #2 Consistencia en métricas de alcance y progreso del release card con las tareas realmente asociadas al paquete en el drawer y sprint backlog.
- [x] #3 Rediseño UX/UI del drawer de releases: overlay con backdrop-blur 100% viewport (createPortal), cabecera estilizada, tabs modernas y ergonomía refinada de tarjetas y botones de vinculación.

---

#### [DEV-091] Control formal de versiones en ItemModal y persistencia simétrica al desasignar releases
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Bug en ItemModal: el input de releases agregaba cada prefijo intermedio a selectedReleases en cada pulsación de tecla ('v0', 'v0.', 'v0.6', etc.), inventando versiones que persistían en la UI. Además, al intentar remover un release de una tarea y guardar, el backend restauraba el valor previo ignorando la modificación debido a fallbacks que no contemplaban la desasignación explícita, y existían versiones fantasma (0.6.0) no dadas de alta en releases.json.

**Criterios de Aceptación:**
- [x] #1 Selector de releases controlado en ItemModal: Dropdown y chips basados estrictamente en el registro oficial de versiones (releases.json), eliminando la generación de versiones intermedias por cada tecla pulsada.
- [x] #2 Persistencia simétrica al desasignar: al remover el release de un ítem, el guardado limpia explícitamente release, targetRelease, releases y milestone sin restaurar valores anteriores desde existingTask.
- [x] #3 Sanitización de tareas: eliminación de versiones fantasma no registradas (ej. 0.6.0 en DEV-043, DEV-057, DEV-060, DEV-061), garantizando que solo existan releases formalmente registrados en el Centro de Releases.

---

#### [DEV-092] Alineación de métricas de progreso de Sprint: Ready como estado terminal del desarrollo en KanbanBoard
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

En KanbanBoard.tsx, el banner de Sprint Goal calculaba el progreso considerando únicamente status === 'done' y clasificaba erróneamente 'ready' como 'inProgress', arrojando 0/14 (0%) de progreso y 14 en curso cuando todas las tareas estaban terminadas en 'ready'. En la metodología ágil de DevBoard, 'ready' es el estado terminal del desarrollo en el sprint (Ready for Release), mientras que 'done' pertenece exclusivamente a las tareas ya liberadas en producción.

**Criterios de Aceptación:**
- [x] #1 sprintStats en KanbanBoard.tsx contabiliza como terminadas las tareas con estado ready, done o finish (alineado con App.tsx y SprintView.tsx).
- [x] #2 Tareas en estado ready son excluidas de inProgress en el banner de Sprint Goal, reflejando exclusivamente el trabajo activo en doing o review.
- [x] #3 El indicador porcentual, la barra de progreso y la insignia Objetivo cumplido reflejan fielmente el 100% al alcanzarse el desarrollo completo en ready.

---

#### [DEV-093] Desacople de scroll horizontal en columnas y preservación de sprint al togglear Ideas en KanbanBoard
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Dos defectos de UX en KanbanBoard: 1) El contenedor principal con overflow-x-auto arrastraba la barra de herramientas, selector de sprint, toggle de vistas y banner de progreso al hacer scroll horizontal para ver columnas derechas (ej. Ready y Done). 2) Al encender o apagar la columna de Ideas, un useEffect con dependencias inestables sobreescribía la selección del usuario (ej. 'all') forzando la vuelta al sprint activo.

**Criterios de Aceptación:**
- [x] #1 El scroll horizontal del tablero Kanban queda encapsulado exclusivamente en el contenedor de columnas, manteniendo fija la barra superior (Sprint Goal, selector de sprint, vista Simple/Ampliada, toggle Ideas) y el banner de progreso sin desplazarse con el scroll.
- [x] #2 La selección del selector de sprint (ej. 'all' / Todos los ítems) se preserva estrictamente al activar o desactivar la columna de ideas, eliminando el re-filtrado forzado al sprint activo.
- [x] #3 Eliminación de anchos mínimos artificiales (md:min-w-[960px]) en la barra superior y banner para que ocupen fluidamente el 100% del ancho del viewport.

---

#### [DEV-094] Estabilización de layout, scrollbar-gutter y alineación de márgenes al alternar Ideas y filtros
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Eliminación de saltos visuales de layout (jank) al activar/desactivar Ideas o aplicar filtros: 1) Scrollbar layout shift solucionado con scrollbar-gutter: stable en html. 2) Contenedor KanbanBoard alineado con max-w-[1680px] mx-auto. 3) FilterBar desacoplada para no contabilizar includeIdeas como filtro activo. 4) Ancho estable del botón Ideas en la barra de herramientas.

**Criterios de Aceptación:**
- [x] #1 Estabilidad global de scrollbar: incorporar scrollbar-gutter: stable en html para evitar el salto de layout (15px) al filtrar o variar la altura de las tarjetas.
- [x] #2 Alineación de contenedor en KanbanBoard: agregar max-w-[1680px] mx-auto para que coincida exactamente con Header, FilterBar y SprintView, eliminando desfasajes de márgenes en pantallas medianas y anchas.
- [x] #3 Eliminación de sobrecarga semántica en FilterBar: aislar includeIdeas para que no altere hasCustomStatuses ni inserte el botón Limpiar (1) que desplazaba la fila de filtros rápidos.
- [x] #4 Dimensionado estable del botón Ideas en el toolbar de KanbanBoard mediante conteo independiente de ideas disponibles, evitando cambios de ancho y saltos de controles adyacentes.

---

#### [DEV-095] Solución integral de estabilidad de layout en FilterBar ante activación de filtros (Zero-CLS)
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Eliminación integral de desplazamientos de controles en FilterBar al activar cualquier filtro: 1) Badge numérico de filtros activos desacoplado con position: absolute en la esquina superior derecha del botón Filtros, manteniendo su ancho estrictamente constante y evitando empujar la botonera de filtros rápidos (Todos, Bug, Feature, etc.). 2) Supresión de saltos de ancho por cambio de font-weight en píldoras rápidas de tipo y prioridad (uso de font-medium uniforme). 3) Prevención de salto vertical de FilterBar mediante contenedor nowrap con control de overflow horizontal.

**Criterios de Aceptación:**
- [x] #1 Badge absoluto en botón Filtros: posicionar el contador de filtros activos con position: absolute (-top-1.5 -right-1.5) para que el botón mantenga un ancho idéntico (cero píxeles de desplazamiento hacia los controles de la derecha).
- [x] #2 Estabilidad métrica en píldoras de tipo y prioridad: mantener font-medium tanto en estado activo como inactivo, diferenciando la selección mediante fondo, borde y sombra sin alterar el ancho del texto ni desfasar botones adyacentes.
- [x] #3 Prevención de wrap vertical en FilterBar: contenedor de barra configurado para prevenir que la aparición de Limpiar fuerce salto a una segunda línea o altere la altura del toolbar.
- [x] #4 Botón Limpiar desacoplado: asegurar que el botón Limpiar no altere el alineamiento de los filtros rápidos a su izquierda al montarse o desmontarse.

---

#### [DEV-096] Unificación conceptual de borrado: separación ortogonal de Descartar vs Papelera y persistencia de soft-delete
- **Prioridad**: `high` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.5.0

Resolver la inconsistencia conceptual y de UX en la eliminación de tareas (Opción A):
1. Separación ortogonal estricta entre la dimensión de Estado de Producto ('dismissed' / Descartada) y el Ciclo de Vida Físico ('isDeleted' / Papelera).
2. Eliminar el laberinto de 3 instancias (Backlog -> Archivo -> Papelera -> Purgar): el botón de eliminar envía directo a la Papelera sin pasar por Descartada.
3. Reparar el bug en readProjectBacklog (vite.config.ts) que omitía isDeleted/deletedAt/previousStatus provocando el rebote de tareas a 'Descartada'.
4. En la Papelera, permitir Restaurar al estado original o Purgar definitivamente de forma directa con 1 confirmación.

**Criterios de Aceptación:**
- [x] #1 1. Backend readProjectBacklog mapea de forma determinista isDeleted, deletedAt y previousStatus desde el frontmatter Markdown.
- [x] #2 2. La acción de descartar (status: dismissed) es exclusivamente un cambio de estado de producto sin modales de advertencia destructiva.
- [x] #3 3. El botón de eliminar (tachito) envía directamente a la Papelera (isDeleted: true) con mensaje claro y sin mutar el status a dismissed ni pasar por la vista de Descartados.
- [x] #4 4. En la vista de Archivo y Papelera se resuelven los bucles: la Papelera permite Restaurar al estado anterior o Purgar definitivamente con 1 confirmación.
- [x] #5 5. Limpieza de datos en dev-060 y compatibilidad case-insensitive con claves de frontmatter isdeleted / isDeleted.

---

#### [DEV-097] Simplificación de vistas: Papelera como vista directa y gestión de descartadas desde Backlog y Filtros
- **Prioridad**: `high` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.5.0

Simplificar la arquitectura de vistas eliminando la duplicidad entre Archivo y Backlog:
1. Las tareas descartadas/canceladas (status: dismissed/cancelled) viven naturalmente en el Backlog y Tablero Kanban, ocultas por defecto y visibles activando el filtro de estados.
2. La vista dedicada en la cabecera pasa a ser exclusivamente la 'Papelera' (TrashView), con acceso directo sin subpestañas artificiales.
3. Se remueve la vista redundante ArchiveView.tsx.

**Criterios de Aceptación:**
- [x] #1 1. En Header.tsx, reemplazar el botón de 'Archivo' por acceso directo a 'Papelera' (ícono Trash2 y badge con conteo de elementos en papelera).
- [x] #2 2. En App.tsx, transformar la vista 'archive' en 'trash' dedicada, renderizando directamente TrashView sin subpestañas redundantes.
- [x] #3 3. Garantizar que las tareas 'dismissed' / 'cancelled' se gestionen y visualicen exclusivamente desde Backlog (SprintView) y Kanban (KanbanBoard) gobernadas por filtros de estado (ocultas por defecto).
- [x] #4 4. Limpieza y remoción de ArchiveView.tsx y del estado archiveSubTab.
- [x] #5 5. Validación con npx tsc --noEmit, npm test y npm run backlog:check con 0 errores.

---

#### [DEV-098] Estabilización de layout de scrollbar: eliminación de layout shift en Header entre vistas Home y Papelera
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al alternar entre vistas que tienen scroll vertical (como Home/Tablero o Configuración) y vistas cuyo contenido entra completamente en el viewport sin desbordar (como Papelera cuando tiene pocos o ningún elemento), la aparición y desaparición de la barra de desplazamiento vertical de la ventana altera el ancho disponible del viewport (`window.innerWidth - scrollbarWidth`). Esto provocaba un desplazamiento ("layout shift" horizontal) hacia la derecha del encabezado superior (`Header`), el cual está centrado con `max-w-[1680px] mx-auto`.

Causa raíz:
1. `html` contaba con `scrollbar-gutter: stable`, pero sin `overflow-y: scroll`, los navegadores en macOS/Windows con mouse clásico o scrollbars persistentes liberan el espacio del gutter cuando el contenedor no tiene overflow activo.
2. `TrashView` no contaba con el contenedor canónico `max-w-[1680px] mx-auto w-full px-4 sm:px-6` presente en el Header y el Tablero.

**Criterios de Aceptación:**
- [x] #1 Configurar `overflow-y: scroll` en `html` (combinado con `scrollbar-gutter: stable`) en `src/index.css` para garantizar que el ancho del layout viewport permanezca 100% invariable entre todas las vistas.
- [x] #2 Alinear el contenedor de `TrashView` en `App.tsx` y `TrashView.tsx` con el estándar `max-w-[1680px] mx-auto w-full px-4 sm:px-6`.
- [x] #3 Resolver advertencias y variables sin usar en `src/App.tsx` y `src/components/Header.tsx` asegurando compilación TypeScript estricta con 0 errores (`npx tsc --noEmit`).
- [x] #4 Verificar ausencia total de layout shift horizontal del `Header` y validar integridad del backlog con `npm run backlog:check` y `npm test`.

---

#### [DEV-099] Desacople estricto de Sprint vs Release: eliminación de versión falsa vSprint5 y prevención de label smuggling
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.5.0

Al crear o leer tareas pertenecientes a un sprint (como Sprint 5), se producía una sobrecarga semántica ("label smuggling") donde el valor del sprint se propagaba indebidamente a las propiedades `milestone` y `release`. Esto provocaba que en la UI (tablas de `SprintView`, badges de `ItemCard` y selectores de `ItemModal`) apareciera una versión falsa `vSprint 5` / `vSprint5` como si fuera un release oficial, en lugar de dejar la versión vacía (`—`) hasta que el usuario decida formalmente en qué versión se liberará la tarea.

Causa raíz:
1. En `backlog/tasks/dev-096*.md` y `dev-097*.md`, el agente escribió `milestone: "Sprint 5"` en el frontmatter, violando la ortogonalidad entre Sprint y Release.
2. En `vite.config.ts` (`readProjectBacklog`), existía un fallback `milestone: task.milestone || releaseVal || sprintVal`, asignando el `sprintVal` como `milestone` por defecto. A su vez, `releaseVal` leía `task.milestone`, contaminando `release`, `targetRelease` y `releases` con nombres de sprint.
3. El formateo de releases en la interfaz anteponía prefijos `v` indiscriminadamente sobre cualquier texto (`vSprint 5`).

**Criterios de Aceptación:**
- [x] #1 Corregir `vite.config.ts` eliminando cualquier fallback de `sprintVal` a `milestone` o `releaseVal`, y garantizando que valores que contengan "sprint" nunca sean interpretados ni guardados como versiones de release.
- [x] #2 Limpiar `milestone: "Sprint 5"` de los archivos de tareas en `backlog/tasks/` (`DEV-096`, `DEV-097`, etc.) dejando sus campos de release vacíos.
- [x] #3 Asegurar que las tarjetas en `ItemCard`, la columna Release en `SprintView` y el selector de `ItemModal` muestren `—` (sin versión asignada) cuando un ítem no tenga release formal.
- [x] #4 Validar compilación (`npx tsc --noEmit`), suite de pruebas (`npm test`) y sincronización (`npm run backlog:check`).

---

#### [DEV-100] Eliminación de confirmación nativa del navegador en vista de Releases y UX de Promoción a Producción
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.5.0

Al presionar "Liberar" o "Eliminar borrador" en el Centro de Releases (`ReleaseAssembler.tsx`), se invocaba la función nativa del navegador `window.confirm()`. Este diálogo gris del sistema operativo rompía por completo la coherencia estética, diseño y accesibilidad de la aplicación.

Solución:
1. Se clarificó la función del botón "Liberar": promueve una versión en estado 'unreleased' (en preparación) a 'released' (inmutable y desplegada en producción), sella la fecha de publicación oficial y promueve las tareas en 'ready' al estado final 'done'.
2. Se incorporó la variante 'success' en `ConfirmModal` (con icono `Rocket` y paleta esmeralda) para confirmaciones de publicación formal.
3. Se reemplazaron todos los llamados a `window.confirm()` en `ReleaseAssembler.tsx` por instancias de `ConfirmModal` con títulos, mensajes explicativos y detalles precisos del impacto.
4. Se corrigió el contenedor de detalle en `ConfirmModal` removiendo `truncate` y permitiendo multilínea fluida (`break-words text-[11px]`), sintetizando el copy para que sea conciso y armonioso con el espacio.

**Criterios de Aceptación:**
- [x] #1 Extender `ConfirmModal` con la variante 'success' (icono Rocket, acento esmeralda) manteniendo soporte accesible de teclado (Escape/Enter).
- [x] #2 Reemplazar el `window.confirm` de "Liberar" en `ReleaseAssembler.tsx` por `ConfirmModal` descriptivo que aclare que la versión pasará a ser inmutable y promoverá las tareas en 'ready' a 'done'.
- [x] #3 Reemplazar el `window.confirm` de "Eliminar borrador" en `ReleaseAssembler.tsx` por `ConfirmModal` (variante 'danger').
- [x] #4 Ajustar `ConfirmModal` para permitir multilínea sin recorte por `truncate` y sintetizar los textos para óptima proporción visual.
- [x] #5 Validar compilación TypeScript (`npx tsc --noEmit`), suite de pruebas (`npm test`) y sincronización viva (`npm run backlog:check`).

---

#### [DEV-101] Extensión de script audit:ux con detección estática de anti-patrones UX-009 y UX-010
- **Prioridad**: `medium` | **Tipo**: `ux`

Tras los aprendizajes de la retrospectiva de Sprint 5, se requiere enriquecer la herramienta de análisis estático local `scripts/audit-ux-code.cjs` para detectar preventivamente el uso de `truncate` en textos explicativos de diálogos y verificar que los estilos globales mantengan la reserva de espacio de la barra de desplazamiento para evitar layout shifts (CLS).

**Criterios de Aceptación:**
- [x] #1 Incorporar regla UX-009 en scripts/audit-ux-code.cjs para reportar warning si se detecta 'truncate' en componentes modales o de diálogo (ej: *Modal.tsx).
- [x] #2 Incorporar regla UX-010 en scripts/audit-ux-code.cjs para verificar la presencia de 'overflow-y: scroll' y 'scrollbar-gutter: stable' en el archivo principal CSS.
- [x] #3 Ejecutar npm run audit:ux y comprobar que no genere falsos positivos en celdas de tabla o headers.
- [x] #4 UX-009 se acota a archivos cuyo nombre contiene 'Modal' o 'Dialog', de modo que el uso legítimo de `truncate` en celdas de tabla y headers de SprintView y KanbanBoard no se ve afectado
- [x] #5 Los dos casos legítimos de `truncate` dentro de un diálogo (nombre de carpeta y ruta en FolderPickerModal) quedan documentados con un opt-out que exige motivo escrito, en lugar de degradar la severidad de la regla
- [x] #6 UX-010 se reporta con severidad ERROR porque su ausencia reintroduce CLS horizontal, y verifica las dos propiedades dentro del bloque `html` de index.css (no en cualquier parte del archivo)
- [x] #7 Se agrega un test de regresión en `scripts/test-parser.js` que verifica que UX-009 y UX-010 están conectadas y disparan, para evitar el caso del linter que no reporta nada porque no mira nada
- [x] #8 `npx tsc --noEmit` finishes con código 0
- [x] #9 `npm test` finishes con código 0
- [x] #10 `npm run backlog:check` finishes con código 0

---

#### [DEV-102] Actualización integral de documentación y verificación automatizada de coherencia en releases
- **Prioridad**: `high` | **Tipo**: `docs`
- **Sprint / Milestone**: 0.6.0

Actualización integral de toda la documentación del repositorio dev-board para armonizarla con el estado de v0.5.0 y el Sprint 5 recién completado, e incorporación de salvaguarda automatizada pre-release en verify-backlog-sync.js y reglas de calidad para asegurar que ante cada release la documentación sea auditada y actualizada obligatoriamente.

**Criterios de Aceptación:**
- [x] #1 Actualizar README.md a v0.5.0 (Features Overview, 12 herramientas MCP, 100+ tareas, atajos con Papelera y eliminación de Quick Start duplicado).
- [x] #2 Actualizar docs/ARCHITECTURE.md incorporando TrashView.tsx, ruta trash y registro de persistencia (releases.json, sprints.json, retros/).
- [x] #3 Armonizar docs/AGENTIC_PLAYBOOK.md y .agents/rules/backlog-dogfooding.md con el límite canónico en ready (prohibido done en sprint) y scripts/backlogMdParser.ts.
- [x] #4 Actualizar skills en .agents/skills/ (devboard con 12 tools, code-level-ux-auditor con 10 firmas, principal-engineer, rigorous-qa-auditor y list-views-filters).
- [x] #5 Extender scripts/verify-backlog-sync.js con auditoría automática de coherencia de documentación y formalizar el guardrail pre-release en AGENTS.md y QA auditor.

---

#### [DEV-103] Compatibilidad canónica de sincronización y exportación con estándar Backlog.md
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.6.0

Adaptar el motor de sincronización y exportación de tareas en dev-board para que sea 100% compatible con el estándar canónico de Backlog.md: nombres de archivo canónicos con ID en mayúsculas y espacios (sin slugify a minúsculas), sobreescritura de archivos existentes por ID, serialización de status estrictamente en minúsculas (sin 'Ideas'), mapeo de sprints exclusivamente a nombres registrados en sprints.json (sin inventar 'backlog-futuro') y preservación absoluta de itemCodes en releases.json.

**Criterios de Aceptación:**
- [x] #1 Nombres de archivo canónicos en backlogMdParser.ts (${task.id.toUpperCase()} - ${task.title}.md) preservando mayúsculas y espacios sin slugify forzado a minúsculas.
- [x] #2 Sobreescritura in-place de archivos existentes por ID en vite.config.ts, mcp-server.ts y devboard-cli.ts sin generar nombres slug duplicados ni borrar el archivo previo.
- [x] #3 Serialización de status estrictamente en minúsculas (draft, doing, review, ready, done, dismissed) mapeando Ideas/Backlog a draft y prohibiendo mayúsculas o 'Ideas' en frontmatter YAML.
- [x] #4 Mapeo de sprint exclusivamente al name legible registrado en sprints.json (activo/planificado), omitiendo el campo si no pertenece a un sprint válido y eliminando creación de sprints espurios como 'backlog-futuro'.
- [x] #5 Preservación estricta del array itemCodes en releases.json en lecturas, escrituras y mutaciones de tareas en vite.config.ts.
- [x] #6 Validación con suite de tests de parser, integración y verificación de coherencia de backlog (npm test, npm run backlog:check).

---

#### [DEV-104] Estándar XDG y Home Directory para Registro Multi-Proyecto en CLI
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.6.0

Migrar la persistencia del registro global de proyectos del Hub desde el árbol de archivos del paquete instalado (PKG_ROOT/data/projects-registry.json) al directorio del usuario (~/.devboard/registry.json), cumpliendo con estándares XDG y FHS para herramientas de CLI open-source.

**Criterios de Aceptación:**
- [x] #1 Persistir registry de proyectos en ~/.devboard/registry.json (o XDG_CONFIG_HOME) en lugar de PKG_ROOT/data/projects-registry.json.
- [x] #2 Fallback y migración transparente de proyectos existentes desde PKG_ROOT/data/projects-registry.json si existen.
- [x] #3 Garantizar que instalaciones globales (npm i -g) o npx devboard no fallen con EACCES por intentar escribir en node_modules.
- [x] #4 Preservar el repositorio de dev-board limpio sin mutaciones de projects-registry.json al gestionar proyectos externos.

---

#### [DEV-105] Aislamiento Estricto de Datos en Modo Mono-Proyecto (Single-Project Mode)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.6.0

Garantizar que la ejecución de DevBoard en un repositorio único limite estrictamente las consultas de la API, el estado y el socket SSE al repositorio actual, evitando que tareas de otros repositorios previamente registrados en el Hub se mezclen o transfieran al cliente web.

**Criterios de Aceptación:**
- [x] #1 En modo monoproyecto (ejecutado sin --hub o con DEVBOARD_MODE=single), la API /api/data debe retornar únicamente el proyecto activo local y sus tareas.
- [x] #2 Evitar la carga y el cómputo en memoria de tareas de repositorios externos cuando no se esté en modo Hub.
- [x] #3 Asegurar que Header.tsx renderice el badge local sin desplegar el dropdown de proyectos cuando singleProject es true.
- [x] #4 Preservar el comportamiento multi-proyecto íntegro e intacto cuando se invoque con --hub o --multi.

---

#### [DEV-106] Higiene de Código Abierto: Erradicación de Fallbacks Residuales Propietarios
- **Prioridad**: `medium` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: 0.6.0

Limpieza de código para eliminar residuos y fallbacks hardcodeados con nombres de proyectos privados ('dom') presentes en el frontend, asegurando que la resolución de proyecto activo sea 100% neutral y dinámica para cualquier usuario de la comunidad open-source.

**Criterios de Aceptación:**
- [x] #1 Reemplazar todos los fallbacks al string literal 'dom' en src/App.tsx por resolución dinámica neutral (activeProjectId || projects[0]?.id).
- [x] #2 Reemplazar fallbacks 'dom' en src/components/ItemModal.tsx.
- [x] #3 Reemplazar fallbacks 'dom' en src/components/ImportWizardModal.tsx.
- [x] #4 Garantizar que ningún identificador de proyecto privado quede hardcodeado en la base de código abierta.

---

#### [DEV-107] Verificador y Notificador de Actualizaciones Estilo Supabase CLI
- **Prioridad**: `medium` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.6.0

Implementar un sistema de notificación de versiones disponibles similar a Supabase CLI o Homebrew, que verifique en segundo plano si existe un release más nuevo en GitHub, cachee el resultado por 24 horas y notifique al desarrollador en consola y en la interfaz visual sin retrasar el tiempo de respuesta.

**Criterios de Aceptación:**
- [x] #1 Verificación no bloqueante en background al ejecutar bin/devboard.js y bin/devboard-mcp.js consultando la versión más reciente en GitHub Releases.
- [x] #2 Almacenamiento en caché local de la última verificación (TTL: 24 horas) en ~/.devboard/update-cache.json para no demorar el inicio del CLI ni saturar la API.
- [x] #3 Mostrar un banner informativo y amigable en terminal cuando exista una versión más reciente con instrucciones claras de actualización.
- [x] #4 Exponer endpoint o flag de actualización para mostrar un badge sutil en el Header de la UI cuando haya una versión nueva.
- [x] #5 Permitir silenciar la verificación mediante variable de entorno (DEVBOARD_NO_UPDATE_CHECK=1).

---

#### [DEV-108] Resolución Absoluta de Rutas en Tailwind y Bundler para Ejecución Global del CLI
- **Prioridad**: `urgent` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.6.0

Corregir la resolución de rutas en tailwind.config.js y la carga de configuración de Vite en bin/devboard.js para usar rutas absolutas ancladas a PKG_ROOT. Esto evita que al ejecutar el CLI desde repositorios externos, Tailwind busque clases en la carpeta del repositorio host en lugar del paquete DevBoard, lo que provocaba el colapso visual de la cabecera y la desestilización del layout.

**Criterios de Aceptación:**
- [x] #1 Resolver rutas absolutas para content en tailwind.config.js usando fileURLToPath y path.join(__dirname, ...), garantizando que escanee los componentes de DevBoard independientemente de process.cwd().
- [x] #2 Configurar explícitamente configFile: path.resolve(PKG_ROOT, 'vite.config.ts') en createServer dentro de bin/devboard.js para evitar colisiones con bundlers o configuraciones del repositorio host.
- [x] #3 Verificar que al ejecutar devboard desde cualquier carpeta externa en el sistema operativo, la UI compile y renderice todas las clases utilitarias de Tailwind con fidelidad completa (sin colapso de cabecera ni inputs planos).
- [x] #4 Validar que el modo dark aplique correctamente en inputs, columnas y contenedores al ejecutar en directorios remotos.

---

#### [DEV-109] Asistente Interactivo de Inicialización y Scaffolding Personalizable (devboard --init)
- **Prioridad**: `high` | **Tipo**: `feature`
- **Sprint / Milestone**: 0.6.0

Implementar un asistente interactivo y personalizable en 'devboard --init' (con soporte interactivo mediante readline nativo y flags no interactivas --yes / --defaults). El asistente permite al usuario elegir: (1) Modo de operación: Single Project (autocontenido y aislado) o Multi-Project (registrado en el Hub global ~/.devboard/registry.json), (2) Inclusión de la skill de agente (.agents/skills/devboard/SKILL.md), (3) Inclusión de reglas de gobernanza AGENTS.md, (4) Inclusión de scripts en package.json ('board', 'mcp'), (5) Reglas preventivas en .gitignore. Todo el proceso debe ser idempotente, no destructivo y permitir re-ejecución para modificar preferencias en el mismo dispositivo.

**Criterios de Aceptación:**
- [x] #1 Asistente interactivo en 'devboard --init' con preguntas claras (modo single vs hub, skills, AGENTS.md, package.json scripts, .gitignore) y flag no interactiva '--yes' / '-y'.
- [x] #2 Soporte de selección de modo: en single project mode no registra en el Hub y configura .devboard/config.json con 'mode: single'; en multi project mode registra en ~/.devboard/registry.json.
- [x] #3 Scaffolding opcional y limpio de '.agents/skills/devboard/SKILL.md' con la documentación canónica de herramientas MCP y mejores prácticas de agente.
- [x] #4 Scaffolding opcional de 'AGENTS.md' con reglas de gobernanza adaptadas para el proyecto anfitrión.
- [x] #5 Configuración opcional de scripts en package.json ('board': 'devboard', 'mcp': 'devboard-mcp') e inclusión defensiva de reglas en .gitignore sin duplicados.
- [x] #6 Idempotencia y no destructividad: si el proyecto ya fue inicializado, permite cambiar opciones sin alterar ni borrar tareas existentes en backlog/tasks/.

---

#### [DEV-110] Actualización de Documentación del CLI y Especificación Canónica del Modelo de Datos
- **Prioridad**: `medium` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: 0.6.0

Actualización integral de la documentación del proyecto DevBoard para reflejar las capacidades de empaquetado, scaffolding interactivo y ejecución del CLI introducidas durante el Sprint 6, junto con la especificación canónica del modelo de datos de tareas en la arquitectura.

**Criterios de Aceptación:**
- [x] #1 Actualizar README.md con las nuevas capacidades del CLI de Sprint 6 (devboard --init interactivo y flag -y, modos --single y --hub, parámetro --port, y verificador de actualizaciones) manteniendo la versión en desarrollo en el sprint
- [x] #2 Documentar en docs/ARCHITECTURE.md el Modelo de Datos Canónico completo (YAML frontmatter, secciones Markdown delimitadas y mapeo con TypeScript y UI)
- [x] #3 Documentar en docs/ARCHITECTURE.md los nuevos módulos de persistencia y configuración (initScaffold.js, registryConfig.js, updateChecker.js y estándar XDG)
- [x] #4 Validar que npm run backlog:check y npm test pasen con código 0

---

#### [DEV-111] Soporte Interactivo de Visualización y Edición de Labels y Assignees en ItemModal
- **Prioridad**: `medium` | **Tipo**: `ux`
- **Sprint / Milestone**: 0.6.0

Completitud de UX en el modal de ítem (ItemModal): permitir la visualización y edición interactiva de etiquetas (labels) y personas/agentes asignados (assignees), cerrando la brecha entre el modelo de persistencia Markdown y la interfaz gráfica.

**Criterios de Aceptación:**
- [x] #1 Permitir visualizar y editar etiquetas (labels) en ItemModal mediante input de tags y chips eliminables con click
- [x] #2 Permitir visualizar y editar asignados (assignees) en ItemModal mediante chips con botón de remover
- [x] #3 Transmitir labels y assignees en el payload de onSave hacia la API de backend sin perder datos en disco
- [x] #4 Validar que los ítems con labels y assignees se persistan correctamente en backlog/tasks/*.md y se reflejen en la UI

---

#### [DEV-112] Resiliencia en Script Prepare de Package.json para npx e Instalación Directa
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.6.1

Al intentar ejecutar o instalar DevBoard directamente desde GitHub según la guía de inicio rápido (Profile 1: `npx github:pablojavierrodriguez/dev-board --init` o `npm install -g github:pablojavierrodriguez/dev-board`), la ejecución aborta inmediatamente con Exit Code 128.

Causa raíz:
En package.json el script de ciclo de vida `"prepare": "git config core.hooksPath .githooks"` se ejecuta automáticamente cuando npm extrae el paquete desde un repositorio Git en una carpeta temporal de cache. Al no existir un árbol de trabajo .git válido en ese entorno temporal, git config arroja error fatal (exit code 128: fatal: not in a git directory) y npm aborta la instalación por completo.

Solución:
Hacer condicional y resiliente el script prepare para que valide la existencia de un worktree git antes de invocar git config o ignore de forma segura el fallo si no se encuentra en la raíz de un repo git:
`git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git config core.hooksPath .githooks 2>/dev/null || true`

**Criterios de Aceptación:**
- [x] #1 El script prepare en package.json valida la presencia de un worktree Git antes de ejecutar git config o implementa fallback seguro con `|| true` para no romper entornos temporales de npm.
- [x] #2 Probar que la ejecución de `npx github:pablojavierrodriguez/dev-board --help` o `--init` funciona sin arrojar Exit Code 128.
- [x] #3 Probar que la instalación global `npm install -g github:pablojavierrodriguez/dev-board` completa exitosamente sin abortos de ciclo de vida.

---

#### [DEV-113] Resiliencia en Scripts Generados por Scaffolding y Banner de Onboarding
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 0.6.1

Cuando un usuario inicializa un repositorio con `npx github:pablojavierrodriguez/dev-board --init`, el asistente genera scripts `"board": "devboard"` y `"mcp": "devboard-mcp"` en el `package.json` consumidor y finaliza sugiriendo `(o npx devboard)`.

Dado que el paquete se distribuye directamente vía GitHub y aún no está publicado en el registro público de npm (npmjs.com) bajo el nombre `devboard`:
1. `npx devboard` aborta con `npm error could not determine executable to run`.
2. Si el usuario no ejecutó previamente la instalación global `npm install -g github:pablojavierrodriguez/dev-board`, ejecutar `npm run board` en el repo consumidor falla con `sh: devboard: command not found`.
3. Al invocar `devboard` o `npx github:...`, Node.js falla con `Cannot find package 'vite'` porque `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer` y `typescript` estaban clasificados como `devDependencies` en `package.json`, y npm los omite al instalar paquetes vía npx o de forma global para consumidores.

Solución:
1. En `scripts/initScaffold.js`, generar scripts resilientes en el `package.json` consumidor que intenten invocar el binario global/local y, si no existe en PATH, hagan fallback transparente a npx sobre el repo de GitHub:
   `"board": "devboard 2>/dev/null || npx -y github:pablojavierrodriguez/dev-board"`
   `"mcp": "devboard-mcp 2>/dev/null || npx -y -p github:pablojavierrodriguez/dev-board devboard-mcp"`
2. Promover `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer` y `typescript` a `dependencies` en `package.json` de dev-board para que se instalen siempre en el cache de npx o globalmente.
3. Actualizar el banner final de éxito en `scripts/initScaffold.js` para indicar con precisión los comandos funcionales.
4. Actualizar la Agent Skill embebida (`getSkillTemplate`) en `scripts/initScaffold.js` y `.agents/skills/devboard/SKILL.md` para reflejar la configuración MCP canónica con fallback y con binario global.
5. Resolver el problema de pantalla en blanco al ejecutar en repositorios externos: registrar PostCSS y Tailwind CSS con resolución absoluta explícita en `vite.config.ts` y `postcss.config.js` para evitar fallos de pre-transformación de estilos (`Cannot read properties of undefined (reading 'get')`).
6. Añadir `RootErrorBoundary` e inline fallback en `src/main.tsx` e `index.html` para erradicar pantallas en blanco ante excepciones de renderizado.
7. Unificar y homogeneizar todo el flujo de onboarding (asistente CLI, banner, skills y `README.md`) al español coherente, eliminando fragmentos e inconsistencias en inglés.
8. Corregir importación en `src/main.tsx`: sustituir la importación de default inválida `import ReactDOM from 'react-dom/client'` por la importación canónica con nombre `import { createRoot } from 'react-dom/client'` y configurar `optimizeDeps.include` y `resolve.dedupe` en `vite.config.ts`.

**Criterios de Aceptación:**
- [x] #1 `initScaffold.js` genera scripts "board" y "mcp" en el `package.json` consumidor con fallback automático a `npx -y github:pablojavierrodriguez/dev-board` si `devboard` no está instalado globalmente.
- [x] #2 El banner final de `devboard --init` muestra los comandos exactos de ejecución sin asumir publicación en npmjs.org e instruye la instalación global opcional (`npm install -g ...`).
- [x] #3 La plantilla de Agent Skill (`getSkillTemplate`) en `initScaffold.js` y `.agents/skills/devboard/SKILL.md` documenta la configuración MCP compatible con ejecución directa y vía GitHub.
- [x] #4 Validar mediante suite de integración (`npm test`, `npm run backlog:check`) que el asistente genera la nueva configuración resiliente y los tests pasan al 100%.
- [x] #5 Promover paquetes de servidor Vite (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `typescript`) a `dependencies` en `package.json` para que npx e instalación global no fallen por dependencias faltantes.
- [x] #6 Configurar PostCSS y Tailwind con rutas absolutas explícitas en `vite.config.ts` y `postcss.config.js`, erradicando el fallo de pre-transformación de estilos y pantalla en blanco al iniciar el servidor desde repositorios externos.
- [x] #7 Unificar el asistente de onboarding, banners y plantillas de skills en español coherente y profesional, y desacoplar la documentación oficial con `README.md` (inglés para la comunidad internacional) y `README.es.md` (español nativo) con selector bilingüe.
- [x] #8 Implementar `RootErrorBoundary` en `src/main.tsx` y fallback inline en `index.html` garantizando tolerancia ante fallos y cero pantallas en blanco.
- [x] #9 Corregir importación canónica de `createRoot` desde `react-dom/client` (`import { createRoot } from 'react-dom/client'`) y configurar `optimizeDeps.include` y `resolve.dedupe` en `vite.config.ts`, erradicando el fallo de sintaxis por falta de export default en ESM.

---

#### [DEV-114] Internacionalización Integral (i18n): Selector de Idioma en CLI (--init), Diccionarios Cockpit UI y Templates Bilingües
- **Prioridad**: `high` | **Tipo**: `feature`

Implementar soporte formal y arquitectónico de internacionalización (i18n) en todo el ecosistema de DevBoard:

1. **Selector de Idioma en Onboarding CLI (`devboard --init`):**
   - Preguntar al usuario en el paso 1 si desea configurar su repositorio en Español (es) o Inglés (en).
   - Generar la configuración de idioma en `.devboard/config.json` o `package.json` (`"language": "es" | "en"`).
   - Desplegar las plantillas de gobernanza (`AGENTS.md`) y Agent Skills (`.agents/skills/devboard/SKILL.md`) en el idioma seleccionado por el usuario.

2. **Capa de Internacionalización en Cockpit UI (Frontend):**
   - Diseñar sistema liviano y sin dependencias pesadas de i18n (o usando un micro-store tipado en TypeScript con diccionarios `src/locales/en.json` y `src/locales/es.json`).
   - Selector visual de idioma (🌐 EN / ES) en la barra superior o configuración del cockpit.
   - Persistencia de la preferencia en `localStorage` con detección automática inicial del idioma del navegador (`navigator.language`).
   - Tipado estricto de claves de traducción para evitar cadenas hardcodeadas o claves faltantes en tiempo de compilación (`t('header.sprint')`, `t('modal.confirm')`, etc.).

3. **Templates Bilingües y Documentación:**
   - Mantener simetría estricta entre la documentación en inglés (`README.md`) y español (`README.es.md`).
   - Soportar generación de Backlog y Releases en el idioma configurado para el proyecto.

**Criterios de Aceptación:**
- [x] #1 Asistente `devboard --init` solicita la selección de idioma (`[1] Español (es) / [2] English (en)`) y persiste la elección en la configuración local del proyecto.
- [x] #2 `scripts/initScaffold.js` genera los templates de `AGENTS.md` y `.agents/skills/devboard/SKILL.md` en el idioma seleccionado (ES o EN).
- [x] #3 Diseñar arquitectura de diccionarios tipados `src/locales/{en,es}.json` y hook `useTranslation()` / `t(key)`.
- [x] #4 Implementar selector de idioma en la barra de navegación del Cockpit con persistencia en `localStorage` y detección de `navigator.language`.
- [x] #5 Migrar las vistas principales (`KanbanBoard`, `SprintView`, `ItemModal`, `BacklogTable`, `ConfirmModal`) al sistema de traducción, erradicando textos hardcodeados.
- [x] #6 Validar tipado TypeScript estricto de las claves de traducción (`npx tsc --noEmit` sin errores) y suite de tests unitarios/integración.

---

#### [DEV-115] Comando CLI de Desinstalación y Eject Seguro Inteligente (devboard --uninstall)
- **Prioridad**: `medium` | **Tipo**: `feature`

Implementar un comando `devboard --uninstall` (o `devboard --clean` / `--eject`) inteligente y con discriminación contextual de alcance, permitiendo al usuario decidir con precisión quirúrgica si desea desacoplar DevBoard exclusivamente del repositorio actual o erradicarlo por completo de todas sus instancias locales en el dispositivo.

**Capacidades y Flujo Inteligente del Comando:**

1. **Detección Contextual del Entorno:**
   - Analiza la configuración local en `.devboard/config.json` (modo `single` o `multi`).
   - Inspecciona el registro central global en `~/.devboard/registry.json` para determinar si existen otros repositorios registrados en la máquina.

2. **Selector Interactivo de Alcance (Scope):**
   Si se detectan múltiples instancias o registros globales, el asistente presenta un menú claro:
   - **[1] Desacoplar sólo este proyecto (Recomendado):**
     - Si es Mono-Proyecto (`single`), limpia únicamente la carpeta local `.devboard/` y los scripts `"board"` / `"mcp"` en `package.json`. No toca ningún archivo global ni afecta a otros repositorios.
     - Si pertenecía al Hub global (`multi`), desvincula únicamente la entrada de este repositorio en `~/.devboard/registry.json`, dejando intactos los demás proyectos.
   - **[2] Erradicación completa del dispositivo (Global Purge):**
     - Desacopla el repositorio actual.
     - Limpia o elimina el directorio central de registro `~/.devboard/`.
     - Ofrece opcionalmente desvincular los scripts inyectados en los demás repositorios que estaban registrados en el Hub.
     - Instruye la desinstalación del binario global si estuviese instalado (`npm uninstall -g dev-board`).

3. **Pregunta Opcional por Artefactos de Agente:**
   - Pregunta si desea remover la Agent Skill (`.agents/skills/devboard/SKILL.md`) y la guía `AGENTS.md` o si prefiere conservarlas para colaborar con agentes de IA.

4. **Garantía Inviolable de Cero Pérdida de Información:**
   - En **cualquiera** de las opciones elegidas, el directorio `backlog/` (`backlog/tasks/`, `releases.json`, `BACKLOG.md`) **permanece 100% intacto y legible**.

5. **Modo No Interactivo / CI:**
   - Soporte de flags `--yes` / `-y` (desacopla el proyecto actual por defecto) y `--global` / `--all` (para purga total desatendida).

**Criterios de Aceptación:**
- [x] #1 Soporte para flags `devboard --uninstall` y `devboard --clean` en `bin/devboard.js`, con el handler ejecutándose **antes** del registro de proyecto para no re-registrar el repo que se está desacoplando
- [x] #2 Detección automática del modo local (`single` vs `multi`) e inspección de `~/.devboard/registry.json` para saber si hay otras instalaciones en el sistema
- [x] #3 Menú interactivo con selección de alcance: `[1] Desacoplar sólo este proyecto` vs `[2] Erradicar de todas las instancias locales`
- [x] #4 Reversión segura de scripts `"board"` y `"mcp"` en `package.json`: sólo se revierten los valores que DevBoard inyectó, y un script propio del usuario llamado `board` se preserva
- [x] #5 En purga global, desregistro de repositorios en `~/.devboard/registry.json` y limpieza de registros huérfanos, con advertencia y confirmación explícita del número de proyectos afectados
- [x] #6 Preservación estricta del directorio `backlog/` y del archivo `BACKLOG.md` en todos los repositorios involucrados, garantizada por construcción
- [x] #7 Soporte de flags `--yes` / `-y` y `--global` / `--all` para automatización sin intervención humana
- [x] #8 Tests de integración automatizados en `scripts/verify-integration.js` que validan el aislamiento mono-proyecto y la preservación del backlog y de los scripts propios
- [x] #9 Guarda de integridad contra path traversal: `removeIfExists` sólo borra rutas contenidas en el repo, además de rechazar las protegidas
- [x] #10 La reversión del `.gitignore` quita también el comentario de encabezado que DevBoard agregó, para no dejar `# DevBoard local cache` huérfano
- [x] #11 Flag `--remove-agents` para eliminar `.agents/skills/devboard` y `AGENTS.md`, que por defecto se preservan
- [x] #12 Módulo tipado: `scripts/uninstall.d.ts` declara las firmas sin `any`
- [x] #13 El comando se documenta en `README.md` y `README.es.md` con su tabla de flags y las garantías
- [x] #14 Regresión: el nombre de la opción coincide entre el CLI (`removeAgentArtifacts`) y la función; el test falla si vuelve a desalinearse
- [x] #15 `npx tsc --noEmit` finishes con código 0
- [x] #16 `npm test` finishes con código 0
- [x] #17 `npm run build` finishes con código 0
- [x] #18 `npm run backlog:check` finishes con código 0

---

#### [DEV-116] Detección Multi-Stack de Puertos Libres y Aislamiento de Origen en Single-Project Mode
- **Prioridad**: `high` | **Tipo**: `bug`

Corregir la colisión de puertos ("sockets fantasma") y secuestro de tráfico HTTP cuando coexisten múltiples instancias de DevBoard en modo Single-Project (ej. `instancia-b` en `[::1]:4100` y `dev-board` en `*:4100`).

**Problema Identificado:**
1. En macOS Darwin, un proceso que enlaza `host: 'localhost'` (`[::1]:4100`) y otro que enlaza `host: true` (`*:4100`) coexisten en el kernel sin arrojar `EADDRINUSE`.
2. Vite con `strictPort: false` no detecta que el puerto 4100 está tomado y no salta a 4101.
3. El navegador resuelve `localhost` por IPv6 y entrega todo el tráfico a la otra instancia (`instancia-b`).
4. Al compartir origen (`localhost:4100`), `localStorage` (`devboard_active_project_id`) contamina el proyecto activo y sobreescribe `~/.devboard/registry.json`.

**Solución Técnica:**
- Detección proactiva multi-stack (IPv4 `127.0.0.1` + IPv6 `::1`) para hallar el primer puerto libre (4100, 4101, 4102...).
- Unificar `host: 'localhost'` por defecto en `vite.config.ts` y `bin/devboard.js`.
- Blindar `src/App.tsx` en `singleProject: true` para ignorar `localStorage` residual de otros proyectos y no disparar `setActiveProjectApi` prematuramente.

**Criterios de Aceptación:**
- [x] #1 AC1: Implementar función de detección multi-stack `isPortAvailable(port)` que verifique conexión y bind en `127.0.0.1` y `::1`.
- [x] #2 AC2: Resolver automáticamente el puerto disponible (4100 -> 4101 -> ...) en `vite.config.ts` y `bin/devboard.js` ante puertos ocupados.
- [x] #3 AC3: Reemplazar `host: true` por `host: 'localhost'` (respetando `--host` o `DEVBOARD_HOST`) en `vite.config.ts`.
- [x] #4 AC4: Bloquear `selectedProjectId` en `src/App.tsx` cuando `boardData.singleProject` es `true`, previniendo sobreescritura de `activeProjectId` en `registry.json`.
- [x] #5 AC5: Eliminar el proceso duplicado/colgado actual de `dev-board` (PID 51522).
- [x] #6 AC6: Verificar tipado estricto (`npx tsc --noEmit`), suite de pruebas (`npm test`) y sincronización de backlog (`npm run backlog:check`).

---

#### [DEV-117] Resolución Canónica de Identidad de Proyecto y Ciclo de Vida de Sprints Temáticos
- **Prioridad**: `high` | **Tipo**: `bug`

Resolver la confusión estructural entre el nombre del directorio en el sistema de archivos (`path.basename`, ej: `"my-repo"`) y el nombre real del proyecto o aplicación (definido en `package.json` o `.devboard/config.json`, ej: `"MyApp"`), así como la invisibilidad de botones de ciclo de vida (Iniciar/Completar Sprint) y del selector "Ver completados" en sprints temáticos no numerados.

**Causas Raíz Identificadas:**
1. **Confusión de Identidad Directorio vs Producto:** `bin/devboard.js`, `initScaffold.js` y `vite.config.ts` asumían ciegamente `path.basename(targetRepo)` como nombre e ID del proyecto. Si un repositorio `MyApp` se clonó en una carpeta `my-repo`, DevBoard registraba el proyecto como `my-repo`, generando una discrepancia de IDs entre el proyecto activo y las tareas/sprints del backlog.
2. **Ciclo de Vida Roto para Sprints Temáticos:** La auto-inicialización de sprints en `vite.config.ts` intentaba extraer un número (`parseInt(name.replace(/\D/g, ''), 10)`). En sprints temáticos (ej. *"Integridad Financiera"*, *"Performance y Escala"*), esto arrojaba `0`, provocando que todos se marcaran simultáneamente como `active`.
3. **Omisión de Botones en SprintView:** Si un sprint no estaba explícitamente dado de alta en `sprints.json`, `SprintView.tsx` no generaba `sprintObj`, ocultando completamente las insignias de estado y los botones de acción (`Completar Sprint`, `Ver Retrospectiva`). Además, el contador `completedSprintsCount` no detectaba grupos con 100% de tareas completadas, ocultando el botón "Ver completados".
4. **Filtro Estricto de ProjectId en Single-Project:** En `App.tsx`, las listas `allProjectItems`, `projectSprints` y `projectReleases` filtraban rígidamente por `projectId === selectedProjectId`, descartando elementos si había disparidad entre el ID de carpeta y el ID del paquete.

**Criterios de Aceptación:**
- [x] #1 Implementar `resolveProjectIdentity(repoPath)` con cascada canónica: 1) `.devboard/config.json`, 2) `package.json` (`productName`, `displayName`, `name`), 3) `path.basename(repoPath)`.
- [x] #2 Integrar `resolveProjectIdentity` en `bin/devboard.js`, `scripts/initScaffold.js`, `getRegistry()`, `readProjectBacklog()` y resolución de `activeProject` en `vite.config.ts`.
- [x] #3 En `initScaffold.js`, permitir al usuario confirmar o personalizar el nombre del proyecto en el asistente interactivo y persistirlo en `.devboard/config.json`.
- [x] #4 En `vite.config.ts`, eliminar la deducción numérica regex de sprints y auto-reconciliar el estado a `'completed'` cuando el 100% de las tareas estén en `done`, `ready` o `finish`.
- [x] #5 En `SprintView.tsx`, calcular `completedSprintsCount` considerando tanto `sprints.json` como grupos de tareas 100% completadas, y proveer fallback dinámico para `sprintObj` asegurando renderizado de insignias y botones de ciclo de vida.
- [x] #6 En `App.tsx`, asegurar que en `singleProject` (o `projects.length <= 1`), las colecciones `allProjectItems`, `projectSprints` y `projectReleases` no descarten elementos por discrepancias de `projectId`.
- [x] #7 Validar tipado TypeScript estricto (`npx tsc --noEmit`), suite de pruebas (`npm test`) y chequeo de integridad (`npm run backlog:check`).

---

#### [DEV-118] Erradicación de Rutas Absolutas Personales y Referencias a Proyectos Privados
- **Prioridad**: `urgent` | **Tipo**: `bug`

Eliminar todas las rutas absolutas hardcodeadas (`/Users/<usuario>/<ruta-personal>`), referencias a proyectos privados y directorios locales de todos los archivos rastreados por Git. Garantizar que ningún dato personal o de proyectos privados se filtre al hacer público el repositorio.

Archivos afectados:
- `scripts/migrate-to-target-repo.js` — eliminar (script personal)
- `scripts/import-docs.js` — eliminar (script de migración personal)
- `vite.config.ts` L113 — ruta hardcodeada `/Users/<usuario>/<ruta-personal>`
- `data/projects-registry.json` — destrackear de Git (ya en .gitignore)
- `.agents/rules/codebase-navigation.md` — links `file:///Users/<usuario>/<ruta-personal>` → rutas relativas

**Criterios de Aceptación:**
- [x] #1 Eliminar `scripts/migrate-to-target-repo.js` del repositorio (script de uso personal, no del producto) — verificado que nada lo importa
- [x] #3 Limpiar `vite.config.ts`: se eliminó el bloque `if (project.id === 'dom')` con la ruta absoluta hardcodeada. La función `getProjectDocsPath` vuelve a devolver `null` cuando no encuentra docs
- [x] #4 `data/projects-registry.json` destrackear de Git — **ya cumplido de facto**: el archivo está en `.gitignore` (línea 30) y nunca fue trackeado. `git ls-files --error-unmatch` lo confirma. No había nada que ejecutar
- [x] #5 Reescribir los links `file:///` a rutas relativas
- [x] #6 Verificar con grep sobre archivos rastreados que no queda ninguna ruta absoluta personal (verificación ejecutada con el patrón completo, y el propio criterio redactado para que la comprobación sea satisfacible)
- [x] #7 Verificar que `npx tsc --noEmit` y `npm test` pasan correctamente post-limpieza
- [x] #8 **AMPLIACIÓN**: sanitizar `scripts/import-docs.js` en vez de eliminarlo (3 puntos). El módulo fue renombrado después en DEV-135, al dejar de ser un script personal y pasar a ser superficie del producto
- [x] #9 **AMPLIACIÓN**: limpiar los 47 links `file:///` de `docs/ARCHITECTURE.md` y `docs/AGENTIC_PLAYBOOK.md`, ausentes del alcance original
- [x] #10 **AMPLIACIÓN**: redactar con placeholders las rutas personales citadas en las descripciones de DEV-118 y DEV-119, para que el AC #6 sea alcanzable sin destruir el sentido de las tareas
- [x] #11 `npm run build` sigue funcionando tras la eliminación del script y el cambio en `vite.config.ts`
- [x] #12 `npm run audit:ux` sigue con 0 errores y 0 advertencias

---

#### [DEV-120] Sanitización del Backlog: Anonimización de Referencias a Proyectos Externos Privados
- **Prioridad**: `high` | **Tipo**: `chore`

Revisar y anonimizar las tareas del backlog que contienen referencias explícitas al proyecto privado `DOM`, al directorio `m3` o a `c3admin`. Preservar el valor técnico de la documentación de cada tarea sin exponer información de proyectos ajenos a DevBoard.

Tareas afectadas: DEV-116, DEV-117, dev-012, dev-022, dev-024, dev-027

**Criterios de Aceptación:**
- [x] #1 Sanitizar DEV-116: reemplazar referencias a `m3` por `instancia-b` o `another-project` en el contexto de colisión de puertos
- [x] #2 Sanitizar DEV-117: reemplazar referencias a `m3` y `DOM` por ejemplos genéricos (`my-app`, `ProjectName`)
- [x] #3 Sanitizar dev-012: generalizar la referencia a `dom` y `m3/docs` como `external-project`
- [x] #4 Sanitizar dev-022: reemplazar `DOM-P, DOM-BUG, DOM-FEAT, DOM-SPEC` por `APP-P, APP-BUG, APP-FEAT, APP-SPEC`
- [x] #5 Sanitizar dev-024: reemplazar `proyecto DOM` por `proyecto externo`
- [x] #6 Sanitizar dev-027: reemplazar `m3 y c3admin` en el título por `repositorios externos`
- [x] #7 Verificar con grep que cero tareas del backlog contienen referencias privadas a DOM, m3 o c3admin (excepto en contexto técnico web estándar como DOM API)

---

#### [DEV-121] Metadatos Completos de package.json y Reorganización de Dependencias
- **Prioridad**: `high` | **Tipo**: `chore`

Completar los metadatos del `package.json` según mejores prácticas de npm y OSS, mover dependencias de build-time a `devDependencies`, agregar campo `engines` con versión mínima de Node, y agregar `files` para controlar qué se incluye en `npm pack`.

Actualmente el package.json tiene `"private": true` (bloquea npm publish) y le faltan todos los metadatos estándar.

**Criterios de Aceptación:**
- [x] #1 Remover `"private": true` del package.json
- [x] #2 Agregar campos: `description`, `repository` (type+url), `homepage`, `bugs`, `keywords` (≥10 keywords), `author`, `license: "MIT"` (configurado apuntando a https://github.com/pablojavierrodriguez/dev-board)
- [x] #3 Mover `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer` de `dependencies` a `devDependencies`
- [x] #4 Agregar `"engines": { "node": ">=22.6.0" }` requerido por `--experimental-strip-types`
- [x] #5 Agregar `"files": ["bin", "dist", "data/demo-backlog.json", "LICENSE", "README.md", "README.es.md"]` para controlar el contenido de npm pack
- [x] #6 Verificar que `npm pack --dry-run` lista solo los archivos esperados (sin `src/`, `scripts/`, `backlog/`)
- [x] #7 Verificar que `npm install` y `npm run build` siguen funcionando correctamente
- [x] #8 `lucide-react` también se mueve a `devDependencies`: es build-time igual que el resto, y los binarios publicados sólo importan built-ins de Node
- [x] #9 `dependencies` queda vacío: el paquete publicado no requiere ninguna dependencia en runtime (verificado: `bin/devboard.js` y `bin/devboard-mcp.js` sólo importan `node:*`)
- [x] #10 `author` se escribe como "DevBoard Contributors", en línea con el copyright del `LICENSE` y sin nombre propio
- [x] #11 `npx tsc --noEmit` finishes con código 0
- [x] #12 `npm test` finishes con código 0
- [x] #13 `npm run backlog:check` finishes con código 0

---

#### [DEV-122] Archivos Comunitarios Estándar: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY y CHANGELOG
- **Prioridad**: `high` | **Tipo**: `docs`

Crear los archivos comunitarios estándar que todo proyecto open-source de calidad profesional debe incluir. Seguir las convenciones de la industria adaptadas al flujo de trabajo único de DevBoard (dogfooding, MCP, pair programming con IA).

**Criterios de Aceptación:**
- [x] #1 Crear `CONTRIBUTING.md` con: requisitos de entorno (Node ≥22.6), pasos de setup (clone→npm install→npm run dev), guía de branching, cómo correr tests, cómo usar DevBoard para trackear contribuciones, y sección AI contributors con MCP tools
- [x] #2 Crear `CODE_OF_CONDUCT.md` basado en Contributor Covenant v2.1 completo
- [x] #3 Crear `SECURITY.md` con política de disclosure responsable: scope de vulnerabilidades, cómo reportar, expectativas de respuesta y contact
- [x] #4 Crear `CHANGELOG.md` en formato Keep a Changelog (keepachangelog.com) con todas las versiones v0.2.0 a v0.6.1 generado a partir de releases.json
- [x] #5 Agregar links a CONTRIBUTING.md y CODE_OF_CONDUCT.md desde README.md y README.es.md en una nueva sección `## 🤝 Contributing`
- [x] #6 Verificar que todos los archivos tienen formato Markdown válido y links internos correctos
- [x] #7 El CHANGELOG se genera con `npm run changelog` (script declarado `scripts/generate-changelog.cjs`) y es idempotente: no puede desviarse de `releases.json` por edición manual
- [x] #8 El generador normaliza los `markdownContent` que traen la secuencia literal `\n` en lugar de saltos de línea reales, sin lo cual 3 de las 6 releases se renderizaban como un único párrafo
- [x] #9 El encabezado `## [x.y.z] — fecha` usa el formato que el servidor MCP ya sabe releer de `CHANGELOG.md` como fuente alternativa (`scripts/mcp-server.ts`, fallback de notas de release), de modo que el archivo nuevo no rompe ese fallback
- [x] #10 `SECURITY.md` usa el canal privado de reporte de vulnerabilidades del repositorio en lugar de un correo personal, y no incluye URLs personales (coherente con el AC #2 parcial de DEV-121, que espera la identidad canónica del repo)
- [x] #11 `npx tsc --noEmit` finishes con código 0
- [x] #12 `npm test` finishes con código 0
- [x] #13 `npm run backlog:check` finishes con código 0
- [x] #14 Se regulariza `releases.json`: la release `0.2.0` carecía de campo `status` y figuraba bajo `Unreleased` pese a ser la release fundacional. Se promovió a `released` por orden explícita del usuario, con la auditoría previa que exige `AGENTS.md` (100% de las tareas con esa versión asignada en estado `done`: 1/1, DEV-001)

---

#### [DEV-123] GitHub Actions CI/CD Pipeline y Templates de Issues y Pull Requests
- **Prioridad**: `high` | **Tipo**: `feature`

Establecer pipeline de Integración Continua en GitHub Actions y templates de Issues/PR que garanticen calidad en contribuciones externas y automaticen verificación del build en cada PR.

**Criterios de Aceptación:**
- [x] #1 Crear `.github/workflows/ci.yml` que ejecute: `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run build` en Node 22.x sobre ubuntu-latest
- [x] #2 Crear `.github/ISSUE_TEMPLATE/bug_report.yml` (formulario YAML) con campos: descripción, pasos para reproducir, comportamiento esperado vs actual, versión de Node, SO, storage engine
- [x] #3 Crear `.github/ISSUE_TEMPLATE/feature_request.yml` (formulario YAML) con campos: problema que resuelve, solución propuesta, alternativas, relevancia para pair programming con IA
- [x] #4 Crear `.github/PULL_REQUEST_TEMPLATE.md` con checklist: descripción, tipo de cambio, task del backlog referenciada, `tsc --noEmit` pasa, `npm test` pasa, screenshots si aplica
- [x] #5 Crear `.github/ISSUE_TEMPLATE/config.yml` configurando el selector de issues y link a CONTRIBUTING.md
- [x] #6 Verificar sintaxis YAML válida en todos los archivos del directorio `.github/`

---

#### [DEV-124] Paridad Total de Light Mode y Transicion de Tema Sin Jank
- **Prioridad**: `high` | **Tipo**: `bug`

<!-- SECTION:DESCRIPTION:BEGIN -->
Light mode se renderiza roto en el modal de ítems, la tab de Releases (vista y drawer de detalle) y el asistente de importación, y el switch Dark -> Light se percibe tosco.

Causa raíz: `ItemModal.tsx`, `ReleaseAssembler.tsx` e `ImportWizardModal.tsx` fueron escritos con paleta 100% dark-only y contienen **cero** variantes `dark:`, a diferencia de los otros 15 componentes del cockpit que usan el patron `base-claro + dark:`.

Agravante en `ItemModal.tsx:353`: el panel usa `glass-panel` (que sí tiene override claro en `index.css`) combinado con `bg-[#0d1322]/95`. Como el override de `.glass-panel` esta declarado fuera de `@layer`, le gana a la utilidad de Tailwind, por lo que el fondo vira a blanco mientras todo el texto interior permanece en `text-slate-100/200/400` -> texto blanco sobre blanco. En dark nunca se manifesto porque ambos fondos son oscuros.

`ReleaseAssembler.tsx` es mas severo: no usa `glass-panel`, tiene `bg-[#0c121e]` y `bg-slate-900/80` hardcodeados, por lo que el panel completo permanece negro mientras el chrome superior esta en claro.

Sobre la transicion: `App.tsx` combina `startViewTransition` + `flushSync` con las transiciones CSS siempre activas de `.glass-panel` / `.glass-card` / `.kanban-col` (`transition: background-color 200ms`). Ambas animaciones compiten y se dispara un repintado masivo del snapshot sobre tableros con 100+ items.

**Criterios de Aceptación:**
- [x] #1 `ItemModal.tsx` deja de ser dark-only: todos los textos, fondos, bordes e inputs tienen variante `dark:` y son legibles en ambos temas
- [x] #2 `ReleaseAssembler.tsx` (vista de Releases y drawer de detalle) deja de ser dark-only: superficie, chrome, tarjetas, badges y botones legibles en ambos temas
- [x] #3 `ImportWizardModal.tsx` deja de ser dark-only: superficie, pasos, formularios y botones legibles en ambos temas
- [x] #4 Eliminar el solapaje entre el crossfade de View Transitions y las transiciones CSS siempre activas, de modo que la transicion Dark -> Light no ejecute doble animacion
- [x] #5 Respetar `prefers-reduced-motion: reduce` deshabilitando la animacion de cambio de tema
- [x] #6 Corregir el subtitulo de columna del Kanban (`KanbanBoard.tsx:624`) agregando su variante `dark:` faltante
- [x] #7 `npx tsc --noEmit` finishes con codigo 0
- [x] #8 `npm test` finishes con codigo 0
- [x] #9 `npm run backlog:check` finishes con codigo 0
- [x] #10 Auditar y corregir los cambios de un intento previo en `ProjectModal.tsx` y `Toast.tsx` (no incluidos en el alcance original): superficie raiz con `bg-[#0d1322]/95` compitiendo con el override de `glass-panel`, y 4 tokens de texto huerfanos sin variante `dark:`
- [x] #11 Convertir a theme-aware los 38 `<option>` nativos de `ItemModal.tsx` que llevaban `bg-[#0e1626]` hardcodeado (se ignoraban en light mode, con el desplegable dark sobre panel claro)
- [x] #12 Confirmar por build que las 38 clases `dark:bg-[#0e1626]` se generan efectivamente en el bundle CSS de Tailwind
- [x] #13 **Títulos `text-white` invisibles en light mode** (contraste 1:1 sobre panel blanco), reportados por el usuario tras la primera entrega: `ReleaseAssembler` L371, L705, L1077 e `ImportWizardModal` L136, L254
- [x] #14 **`<option>` nativos sin clase de fondo** en el selector de Sprint Goal del Kanban (`KanbanBoard.tsx` L854/862/867): el desplegable se renderiza con el tema del SO, no el de la app
- [x] #15 **Ruido visual por exceso de superficies grises** en `ItemModal`: 24 inputs en `slate-100` y 6 contenedores en `slate-50` sobre panel blanco. Re-escalados a `slate-50` (superficie) con `slate-100` solo en hover y chips, restituyendo la sutileza del original basado en alfas
- [x] #16 **Persistencia del tema al recargar**: `index.html` hardcodeaba `<html class="dark">` y un `style` inline oscuro en `<body>`, que revertian al tema oscuro en cada carga. Eliminados y reemplazados por un script anti-flash inline que aplica `devboard-theme` antes del primer paint
- [x] #17 `loadSettings` prioriza la eleccion explicita del usuario (`localStorage`) sobre `config.theme`, que antes revertia el tema en cada recarga
- [x] #18 Auditar contraste real (WCAG AA) de los 18 componentes en light mode con un verificador basado en luminancia relativa, en lugar de heuristicas de tokens
- [x] #19 **Bordes de las secciones AC y Plan de Implementacion en gris oscuro** (reportado por el usuario): los `<select>` nativos dibujan su propio borde con el estilo del SO, que se superpone al `border-slate-200` del tema. Agregar `appearance-none` a los 10 `<select>` de `ItemModal` y a los 9 restantes del proyecto (`AdvancedFiltersPopover`, `ImportWizardModal`, `SettingsView`, `SprintView`)
- [x] #20 Los 3 `<option>` de los `<datalist>` (assignees, labels, modulos) de `ItemModal` no tenian fondo theme-aware: el desplegable de autocompletado se renderizaba con el tema del SO
- [x] #21 Verificar por build que la clase compartida `appearance-none` se emite en el bundle CSS
- [x] #22 **Fondos `bg-black/10` sin variante `dark:`** en los cuerpos de los acordeones de AC, Plan de Implementacion y Relaciones (`ItemModal` L539, L611, L657): introducidos por el refactor original, dejaban un velo gris sobre el panel blanco. Corregidos a `bg-slate-50 dark:bg-black/10`
- [x] #23 **Tab activo "Todas" invisible** en `ReleaseAssembler.tsx:419`: `bg-white/10 text-white` = texto blanco sobre blanco en light mode. Corregido a `bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white`
- [x] #24 Reemplazar el handle movil `bg-white/20` de `ProjectModal` (invisible sobre panel claro) por `bg-slate-300 dark:bg-white/20`
- [x] #25 `ReleaseAssembler.tsx:957` usaba `bg-black/20 border-white/[0.04]` sin variante: corregido a `bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/[0.04]`
- [x] #26 **Selects sin indicador visual**: al agregar `appearance-none` se elimino la flecha nativa del navegador sin agregar su reemplazo. Los 10 selects de `ItemModal` ahora envueltos en `relative` con `ChevronDown` del tema y `pr-8` para reservar el espacio
- [x] #27 `<option>` de prioridad en `SprintView` con tonos `-500` ilegibles sobre blanco: elevados a `-600` con `dark:-400`, alineados con `priorityConfig` de `ItemCard`
- [x] #28 **Hover del titulo de release ilegible**: `group-hover:text-white` sin variante (blanco sobre blanco al hacer hover) -> `group-hover:text-slate-900 dark:group-hover:text-white`
- [x] #29 **Tabs internas del filtro de Releases**: el contenedor era `bg-black/30` (velo negro al 30% sobre el panel blanco, el gris oscuro de la captura) -> `bg-slate-50 dark:bg-white/[0.03]`
- [x] #30 **Buscador de Releases**: `bg-black/20` sin variante -> `bg-white dark:bg-white/[0.04]`
- [x] #31 **10 campos de formulario con fondo gris oscuro** en el drawer y el popup de Crear Version: `bg-black/30|40` + `text-white` sin `dark:` (blanco sobre gris). Corregidos a superficie clara con texto tematico
- [x] #32 **4 `hover:text-white` huerfanos** mas (blanco sobre blanco al hover) en `ReleaseAssembler` y `ImportWizardModal` -> `hover:text-slate-900 dark:hover:text-white`
- [x] #33 **Campos `input[type=date]` con icono del sistema operativo**: el icono de calendario se dibuja con los colores del SO e ignora el tema. Resuelto globalmente con `color-scheme` en `html.dark` / `html:not(.dark)`, sin necesidad de `appearance-none` ni datepicker propio

---

#### [DEV-125] Correccion de Raiz del Pre-Commit Hook: Verificar Sin Mutar el Indice de Git
- **Prioridad**: `high` | **Tipo**: `bug`

El pre-commit hook de DevBoard modifica el indice de git, lo que provoca que
cualquier tarea sin trackear entre silenciosamente en commits de tematica
diferente.

**Sintoma observado**: al committear el fix de light mode (DEV-124) con 14
archivos stageados selectivamente, el commit resulto con 20 archivos. Las 6
tareas DEV-118 a DEV-123 (rutas personales, GitHub Actions, sanitizacion,
docs comunitarios) quedaron incluidas, pese a no tener relacion con el cambio.
El mensaje del commit describia un tema que no correspondia con su contenido.

**Causa raiz** (`scripts/verify-backlog-sync.js`, lineas 172-183):

```js
execSync(`node --experimental-strip-types "${exportScript}" export`, ...);
if (isHookMode) {
  execSync(`git add BACKLOG.md backlog/`, ...);   // <-- stagea el directorio completo
}
```

Tres defectos en un mismo mecanismo:

1. **El hook muta el indice.** Un hook debe verificar, no escribir en el
   indice. `git add backlog/` stagea TODO el directorio, incluyendo archivos
   que el usuario no selecciono. Convierte el stageo selectivo en imposible.
2. **El exportador se ejecuta antes de validar.** Si el commit va a ser
   rechazado por un error de release, igual ya reescribio `BACKLOG.md` como
   efecto secundario.
3. **El mensaje de error sugiere `--no-verify`.** El propio hook se ofrece
   como escape, con lo cual el usuario queda obligado a saltarse la
   verificacion que el hook deberia garantizar.

**El caso de uso es legitimo y debe preservarse**: durante el desarrollo se
crean tareas y el consolidado `BACKLOG.md` queda desfasado, por lo que
conviene garantizar que se entregue regenerado. Lo que esta mal es el
mecanismo, no la intencion.

**Criterios de Aceptación:**
- [x] #1 `verify-backlog-sync.js` deja de ejecutar `git add` en cualquier rama de ejecucion (eliminar el bloque `isHookMode` que stagea `BACKLOG.md backlog/`)
- [x] #2 El hook sigue regenerando y verificando `BACKLOG.md`, pero NO escribe en el indice de git en ningun caso
- [x] #3 Si el hook detecta que `BACKLOG.md` quedo desfasado, RECHAZA el commit con un mensaje que indique el comando exacto a ejecutar para regenerarlo
- [x] #4 El mensaje de rechazo deja de sugerir `git commit --no-verify`, ya que con el hook corregido el stageo selectivo funciona sin evasión
- [x] #5 El exportador no debe escribir en disco cuando el commit sera rechazado: reordenar la ejecucion para validar antes de mutar
- [x] #6 Verificar que un commit con stageo selectivo ya no arrastra tareas sin trackear de otra tematica (regresion sobre DEV-124)
- [x] #7 Actualizar `.githooks/pre-commit` para reflejar el nuevo contrato (verificar y reportar, sin mutar)
- [x] #8 Documentar el contrato corregido en el mensaje del hook y en `AGENTS.md` si corresponde
- [x] #9 `npx tsc --noEmit` finishes con codigo 0
- [x] #10 `npm test` finishes con codigo 0
- [x] #11 `npm run backlog:check` finishes con codigo 0

---

#### [DEV-126] Pulido de ItemModal: Tipografía Unificada, Badge de Atributos y Flash de Hidratación
- **Prioridad**: `medium` | **Tipo**: `ux`

Tres defectos menores de UX/UI reportados por el usuario al abrir el `ItemModal`,
tanto en modo edición como en modo creación.

**1. Tipografía inconsistente en la sidebar "Atributos del Ítem"**

Los controles de la sidebar usan `text-xs` sans de forma mayoritaria (Estado,
Prioridad, Tipo, Módulo, Proyecto), pero cuatro de ellos rompen el patrón con
`font-mono`:

- `ItemModal.tsx:1133` — `<select>` de Release
- `ItemModal.tsx:1401` — input de Código
- `ItemModal.tsx:947` — input manual de Sprint (modo "Escribir manual")
- `ItemModal.tsx:1414` — input de Archivo Impactado

El resultado es que dos campos visualmente contiguos (Release y Código) se leen
con una tipografía distinta a la de sus vecinos, lo que rompe la percepción de
rejilla unificada.

**2. El badge "2 atributos" miente**

`ItemModal.tsx:848-852` muestra un contador junto al encabezado de la sidebar
que se calcula sobre una lista hardcodeada de 8 campos (`module`, `impactedFile`,
`sprint`, `release`, `risk`, `fix`, `labels`, `assignees`) — ver
`ItemModal.tsx:336-345`. La sidebar renderiza muchos más campos que eso
(proyecto, tipo, prioridad, estado, etiquetas, asignados, plan, criterios...),
por lo que el número mostrado no representa la cantidad real de atributos del
ítem y desinforma al usuario.

**3. Flash de hidratación: el modal pinta contenido anterior a sí mismo**

`ItemModal` está montado de forma permanente en `App.tsx:1379`; sólo se
togglea `isOpen`. Todo el estado del formulario vive en `useState` dentro del
componente y se puebla mediante un `useEffect` (`ItemModal.tsx:152-206`) que
depende de `isOpen` e `item`.

Los `useEffect` se ejecutan **después** del paint del navegador. Al abrir el
modal, React renderiza y pinta un primer frame con el estado residual de la
sesión anterior del modal (el último ítem editado) o con valores vacíos, y sólo
en el frame siguiente —tras el efecto— se repinta con los datos reales del ítem
o los defaults de creación. El usuario percibe un salto de contenido de ~1s al
abrir cualquier modal.

**Causa raíz común**: el estado derivado de las props se inicializa en un
`useEffect` en lugar de inicializarse sincrónicamente antes del primer paint.

**4. El placeholder del Título del Ítem usaba un ejemplo hardcodeado**

`ItemModal.tsx:432` mostraba `Ej: Interoperabilidad nativa con Backlog.md...`.
Ese texto no es un ejemplo inventado: es el título literal de DEV-001, la
primera tarea del propio backlog de DevBoard. En un ítem en blanco, un placeholder
que coincide exactamente con una tarea real se lee como contenido precargado en
lugar de como ayuda, y más aún en un producto cuyo propósito es la gestión del
backlog. Se reemplaza por una instrucción general en el mismo tono del
placeholder de Descripción.

**5. Mismo defecto en el Plan de Implementación y en los Criterios de Aceptación**

- `ItemModal.tsx:612` (Plan) mostraba `1. Modificar tipos en types.ts... /
  2. Actualizar layout en ItemModal.tsx... / 3. Comprobar build y tests...`. Aquí
  la estructura numerada sí aporta valor (enseña el formato esperado de un plan),
  pero los archivos nombrados pertenecen a una tarea histórica concreta y se
  leen como un plan ya hecho. Se conserva la estructura de pasos y se interpola el
  campo "Archivo Impactado" cuando ya está informado, con redacción genérica
  cuando no lo está.
- `ItemModal.tsx:558` (AC) mostraba `Ej: El layout se mantiene estable al alternar
  vistas...`. Acá el ejemplo sí le aporta mucho al usuario: muestra qué es un AC y
  cómo se redacta. El problema no es el ejemplo, sino que sea **uno solo y fijo**:
  induce a repetir literalmente la misma forma de criterio en cada ítem, que es lo
  contrario de un criterio de aceptación útil.

**Decisión de producto: ejemplos de AC dinámicos por Tipo, no placeholder conceptual**

Entre las dos alternativas que se pusieron sobre la mesa, se implementa la de ejemplos dinámicos,
porque conserva el valor pedagógico del ejemplo (que es real y señalado por el
usuario) y le suma una dimensión: cada Tipo de trabajo muestra cómo se redacta un
AC *de esa clase*, y el ejemplo se transforma solo al cambiar el Tipo en la sidebar.
Un placeholder conceptual ("Describe un resultado verificable...") habría perdido
precisamente la señal que el usuario declara que más le ayuda.

Implementación: `AC_EXAMPLES_BY_TYPE` mapea los 6 tipos estándar a una plantilla
función, `buildCriterionExample(type, title, module)` recorta la referencia a 40
caracteres y la interpola, y un `Proxy` defensivo sobre un target invocable
resuelve cualquier tipo personalizado del usuario hacia `AC_EXAMPLE_FALLBACK`.

**Criterios de Aceptación:**
- [x] #1 El `<select>` de Release, el input de Código, el input manual de Sprint y el input de Archivo Impactado dejan de usar `font-mono` en sus clases
- [x] #2 La sidebar "Atributos del Ítem" queda tipográficamente homogénea: todos sus inputs y selects usan `text-xs` sans
- [x] #3 El uso de `font-mono` se conserva (y sólo se conserva) donde el valor es genuinamente código: textarea del plan de implementación, índice de criterios de aceptación, badges de código/versión, etc.
- [x] #4 El badge "N atributos" se elimina del encabezado de la sidebar junto con el cálculo `contextCount` que lo alimentaba
- [x] #5 La población del formulario al abrir el modal ocurre antes del primer paint: el modal ya se renderiza con los datos del ítem (o los defaults de creación) en su primer frame visible
- [x] #6 No existen saltos de contenido ni parpadeos al abrir el modal en modo edición ni en modo creación — **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO** (el navegador de escritorio no estaba conectado a la sesión; la garantía de no-flash proviene del orden de fases de React, pero el gate exige confirmación visual)
- [x] #7 El modal sigue re-sincronizándose correctamente al cambiar de ítem objetivo sin arrastrar estado residual del ítem anterior
- [x] #8 `npx tsc --noEmit` finishes con código 0
- [x] #9 `npm test` finishes con código 0
- [x] #10 `npm run backlog:check` finishes con código 0
- [x] #11 El placeholder del campo "Título del Ítem" deja de usar un ejemplo hardcodeado (que era literalmente el título de DEV-001, una tarea real del backlog) y pasa a una instrucción general, alineada con el tono del placeholder de Descripción
- [x] #12 El placeholder del textarea "Plan de Implementación" deja de hardcodear archivos concretos de una tarea histórica (`types.ts`, `ItemModal.tsx`) y conserva la estructura de pasos numerados, interpolando el campo "Archivo Impactado" cuando ya está informado
- [x] #13 El placeholder de cada Criterio de Aceptación se deriva dinámicamente del Tipo del ítem (bug, feature, tech_debt, ux, epic, initiative) y del Título/Módulo del ítem, y se recalcula en vivo al cambiar cualquiera de esos campos
- [x] #14 Los tipos personalizados del usuario (y cualquier clave arbitraria de `ItemType`) reciben un ejemplo por defecto válido vía Proxy defensivo, sin romper el render del placeholder
- [x] #15 El ejemplo de AC degrada a una redacción genérica cuando el ítem aún no tiene título ni módulo, sin renderizar comillas vacías
- [x] #16 El placeholder del campo "Asignados" deja de sugerir un nombre de persona real (`Ej: Antigravity, Pablo...`) y pasa a sugerir asistentes de código, harnesses de agentes e IDEs (`Ej: Claude Code, Cursor, Copilot, Antigravity...`), en línea con el uso real del board como herramienta de pair programming con IA
- [x] #17 Al eliminar el badge de atributos se ajusta el encabezado de la sidebar de `flex items-center justify-between` a `flex items-center`, ya que queda con un único hijo y el `justify-between` sobra

---

#### [DEV-127] Erradicación de la Inyección de Contenido Fabricado en los Archivos .md de Tareas
- **Prioridad**: `high` | **Tipo**: `bug`

<!-- SECTION:DESCRIPTION:BEGIN -->
Crear una tarea escribiendo únicamente su título no deja la tarea vacía: el
serializador de Markdown le **fabrica** tres secciones y las escribe en el archivo
`.md` versionado del repositorio.

Al crear el ítem `DEVB-125 - Pruebaa` con el texto `"Pruebaa"` como único
contenido, el archivo resultante quedó así:

```markdown

---

#### [DEV-128] Regla de Trazabilidad Total y Auditoría de Alcance del Feedback en Caliente
- **Prioridad**: `medium` | **Tipo**: `ux`

Durante la sesión de pulido de `ItemModal` (DEV-126) y de corrección de la
inyección de contenido en los `.md` (DEV-127), el usuario señaló un defecto de
proceso: **cualquier extensión del alcance de una tarea en curso debe quedar
registrada en esa tarea o en una nueva**, incluso cuando el cambio se atiende
"de paso" como respuesta a un feedback en caliente.

La regla que ya existía en `AGENTS.md` ("los refinements UX van al tope de la
cola") ordenaba **atender** el feedback rápido, pero no exigía **registrarlo**.
Esa asimetría es exactamente la que abre la fuga: el agente hace el cambio,
considera que es "parte" de un AC vecino, y no deja rastro. Para quien lea el
historial del proyecto después, un cambio de código sin AC es indistinguible de
un cambio accidental, y ambos cuestan lo mismo de revertir.

**Auditoría aplicada a la sesión en curso.** Se contrastó `git diff --stat` contra
la lista de ACs de DEV-126 y DEV-127 y se encontraron **dos cambios sin AC**:

1. El placeholder del campo "Asignados" de `ItemModal.tsx` pasó de
   `Ej: Antigravity, Pablo...` a `Ej: Claude Code, Cursor, Copilot, Antigravity...`
   a pedido explícito del usuario. El cambio estaba hecho y verificado, pero
   nunca se registró.
2. Al eliminar el badge de atributos se ajustó el encabezado de la sidebar de
   `flex items-center justify-between` a `flex items-center` (el `justify-between`
   quedó huérfano al quedar un solo hijo). Un one-liner de CSS sin registro.

Ambos quedaron regularizados como ACs #16 y #17 de DEV-126.

**Criterios de Aceptación:**
- [x] #1 `AGENTS.md` incorpora una regla explícita de trazabilidad total: todo cambio de código, incluidos los refinamientos en caliente, debe quedar registrado como AC de la tarea en curso o como tarea nueva
- [x] #2 La regla enumera los casos que irresistiblemente se hacen "de paso" sin registro (cambiar un placeholder, regenerar un bundle versionado, ajustar clases de layout huérfanas), porque son los que más se escapan
- [x] #3 La regla define un protocolo de cierre verificable: contrastar `git diff --stat` contra los ACs de la tarea antes de darla por terminada
- [x] #4 Se audita la sesión en curso y se regulariza el placeholder de "Asignados" como AC #16 de DEV-126
- [x] #5 Se audita la sesión en curso y se regulariza el ajuste de layout del encabezado de la sidebar como AC #17 de DEV-126
- [x] #6 Se confirma que el resto de los cambios de la sesión ya tenían respaldo: `bin/devboard-mcp.js` (DEV-127 #6), `package.json` (DEV-127 #7), `scripts/backlogMdParser.ts` (DEV-127 #1..#4), `scripts/test-parser.js` (DEV-127 #14), `src/components/PlanGuardModal.tsx` (DEV-127 #16..#18)
- [x] #7 La propia tarea que introduce la regla queda registrada, para que la regla no arranque con una excepción propia
- [x] #8 `npm run backlog:check` finishes con código 0

---

#### [DEV-129] Menú Contextual de ItemCard se Monta Detrás de la Tarjeta Siguiente
- **Prioridad**: `medium` | **Tipo**: `bug`

El menú contextual que aparece al tocar los 3 puntos de una tarjeta (`ItemCard`)
queda **por detrás de la tarjeta siguiente** de la columna. Es intermitente:
depende de la posición de la tarjeta en la columna y del estado de hover del mouse
al abrirlo.

**Causa raíz: un stacking context no intencionado creado por el hover.**

`src/index.css:166` y `:178` aplican un transform al hacer hover de la tarjeta:

```css
html.dark .glass-card:hover  { transform: translateY(-1px); ... }
html:not(.dark) .glass-card:hover { transform: translateY(-1px); ... }
```

Un `transform` computado es uno de los factores que **crean un stacking context**
en CSS. El elemento raíz de la tarjeta es `position: relative`, así que, al
hoverar, la tarjeta pasa de ser un simple descendiente posicionado a ser **su
propio contexto de apilamiento** con `z-index: auto`.

Según el orden de pintado de CSS 2.1 (Apéndice E), todos los descendientes
posicionados con `z-index: auto` se pintan en el mismo paso (paso 8) **en orden de
documento**. El menú, con `position: absolute; z-index: 40` (`ItemCard.tsx:308`),
sólo puede superar a los hermanos si **no hay un stacking context entre él y la
columna**: en ese caso sube al paso 9 (z-index positivo) y gana contra todas las
tarjetas. Pero al hoverear la tarjeta, ese contexto intermedio aparece y el menú
queda **atrapado dentro de la caja de la tarjeta**, pintado en la posición del
documento de la tarjeta. La tarjeta siguiente, que viene después en el DOM, se
pinta encima.

Por eso el síntoma es intermitente y no constante: el bug se manifiesta cuando la
tarjeta está hovereada, que es precisamente el estado natural al abrir el menú
desde el botón, y cuando existe una tarjeta siguiente que lo tape.

**Problema secundario, de la misma familia**: la lista de tarjetas de cada columna
tiene `overflow-y-auto` (`KanbanBoard.tsx:759`). Aunque el stacking se arreglara
con un z-index más alto, un menú `absolute` seguiría **recortado** por los bordes
del contenedor con scroll, especialmente en la última tarjeta de una columna.

**Por qué subir el z-index no resuelve nada**: `z-40` ya es mayor que cualquier
z-index de las tarjetas (que son `auto`). El problema no es la magnitud del
z-index, es que el menú está **encerrado** en un stacking context que no puede
escapar. Subirlo a `z-[9999]` no cambia absolutamente nada.

> [!NOTE]
> **El mismo `transform` produce un segundo bug, distinto**: además del stacking
> context, un `transform` computado convierte al ancestro en *containing block*
> para sus descendientes `position: fixed`. Eso rompía el `ConfirmModal` que
> `ItemCard` renderiza inline dentro de la tarjeta, y se corrigió aparte en
> **DEV-130**. La moraleja: un `transform` en hover es un generador de bugs
> silenciosos y hay que auditar los dos efectos por separado, porque se
> manifiestan con síntomas opuestos — "quedó atrás" frente a "se dibuja en el
> lugar equivocado".

**Solución: portal a `document.body` con posicionamiento `fixed`.** Es el patrón
que el propio proyecto ya usa en `ReleaseAssembler.tsx:636` y `:1063` con
`createPortal`. El menú se renderiza fuera del árbol de la tarjeta, positioned
con coordenadas calculadas desde el `getBoundingClientRect()` del disparador, y
con `z-index` por encima de toda la app. Así escapa tanto del stacking context
como del recorte del `overflow`.

**Criterios de Aceptación:**
- [x] #1 El menú contextual de `ItemCard` se renderiza en un portal sobre `document.body` en lugar de dentro de la tarjeta
- [x] #2 El menú se posiciona con `position: fixed` usando el `getBoundingClientRect()` del botón disparador, manteniendo la alineación a la derecha que tenía con `right-0`
- [x] #3 El menú queda por encima de todas las tarjetas, de la columna y del `sticky header` en ambos temas (claro y oscuro)
- [x] #4 Si no hay espacio suficiente debajo del disparador, el menú se abre hacia arriba en lugar de desbordarse por el borde inferior de la ventana
- [x] #5 El menú se reposiciona al hacer scroll (incluyendo el scroll interno de las columnas del Kanban) y al redimensionar la ventana, en lugar de quedar anclado a una posición obsoleta
- [x] #6 El submenú anidado "Cambiar estado" sigue funcionando y se posiciona correctamente respecto al menú padre ahora que el menú vive en un portal
- [x] #7 El clic dentro del menú portaleado no dispara el `onClick` de la tarjeta (no debe abrir el `ItemModal` al elegir una opción del menú)
- [x] #8 El clic fuera sigue cerrando el menú, contemplando tanto el disparador como el panel portaleado (el `contains()` sobre el ref de la tarjeta ya no alcanza para el menú)
- [x] #9 El menú no queda recortado por el `overflow-y-auto` de la columna en la última tarjeta de una columna
- [x] #10 `npx tsc --noEmit` finishes con código 0
- [x] #11 `npm test` finishes con código 0
- [x] #12 `npm run backlog:check` finishes con código 0
- [x] #13 Validación visual en navegador: abrir el menú de una tarjeta que tenga al menos una tarjeta debajo, en tema claro y oscuro — **VERIFICADO POR EL USUARIO** ("ahí puedo ver el menu ok")

---

#### [DEV-130] ConfirmModal Roto dentro de ItemCard: Popup Duplicado y Parpadeo por Containing Block
- **Prioridad**: `high` | **Tipo**: `bug`

Al presionar **"Papelera"** en el menú contextual de una tarjeta, el diálogo de
confirmación aparecía **duplicado** y la pantalla empezaba a **parpadear**.

**Síntoma reportado por el usuario**: "el popup apareció duplicado y empezó a
parpadear la pantalla".

**Causa raíz: `position: fixed` resuelto contra la tarjeta en vez del viewport.**

`ItemCard` renderizaba el `ConfirmModal` **inline, dentro de la propia tarjeta**
(`ItemCard.tsx:592-601`), dentro del `<div className="group relative glass-card">`.
Y `src/index.css:166` y `:178` aplican:

```css
html.dark .glass-card:hover       { transform: translateY(-1px); ... }
html:not(.dark) .glass-card:hover { transform: translateY(-1px); ... }
```

Un `transform` computado no sólo crea un stacking context: además convierte al
elemento en **containing block para sus descendientes `position: fixed`**. El
overlay del `ConfirmModal` es `fixed inset-0` (`ConfirmModal.tsx:111`), por lo que
mientras la tarjeta estuviera hovereada pasaba a medirse contra **la caja de la
tarjeta** y no contra el viewport: el fondo oscurecido y el diálogo aparecían
encajados dentro de la tarjeta, no centrados en la pantalla.

**Por eso parpadeaba en vez de simplemente verse feo**: el tamaño y la posición del
diálogo dependían del estado de hover, y el hover dependía de dónde estuviera el
puntero, que a su vez dependía de dónde estuviera el diálogo. Eso cierra un ciclo
de retroalimentación:

1. Puntero sobre la tarjeta → `hover` activo → `transform` aplicado → el modal se
   dibuja **pequeño, dentro de la tarjeta**.
2. El puntero sale de la tarjeta para alcanzar el modal → `hover` se pierde → el
   `transform` desaparece → el `fixed` vuelve a medirse contra el **viewport** → el
   modal **salta** a su tamaño real, centrado.
3. Al volver a mover el puntero sobre la tarjeta, el ciclo se repite.

El "popup duplicado" era el mismo diálogo dibujándose alternadamente en las dos
posiciones, y el parpadeo era el vaivén entre ambas.

**Relación con DEV-129**: es la **misma familia de bug** que el del menú
contextual (stacking context por `transform`), pero con un síntoma distinto porque
aquí el `transform` no afecta el orden de pintado sino el **containing block**.
DEV-129 ya había corregido el primer efecto de este mismo `transform` en el
menú contextual, pero no el segundo: son efectos distintos y no se detectan
con el mismo síntoma.

**Por qué se arregla en `ConfirmModal` y no en `ItemCard`**: `ConfirmModal` tiene 8
consumidores (`ItemCard`, `Header` ×3, `ReleaseAssembler` ×2, `SprintView` ×2,
`TrashView`, `ItemModal`). Todos lo renderizan inline, así que todos son
potencialmente víctimas de la misma trampa de `containing block` en cuanto se
agregue un ancestro con `transform`/`filter`/`backdrop-filter`. Montar el overlay
en un portal sobre `document.body` dentro del propio componente lo hace inmune de
una vez a todos, sin depender de que cada consumidor recuerde la regla.

**Criterios de Aceptación:**
- [x] #1 `ConfirmModal` monta su overlay en un portal sobre `document.body` en lugar de renderizarse inline donde lo consume su ancestro
- [x] #2 El overlay `fixed inset-0` se mide siempre contra el viewport, con independencia de cualquier `transform`, `filter`, `backdrop-filter`, `will-change` u `overflow` de los ancestros
- [x] #3 El diálogo de "Mover a la Papelera" aparece centrado y a tamaño completo, sin parpadeo ni oscilación de posición al mover el puntero
- [x] #4 Los 8 consumidores de `ConfirmModal` quedan corregidos por el cambio (`ItemCard`, `Header` ×3, `ReleaseAssembler` ×2, `SprintView` ×2, `TrashView`, `ItemModal`)
- [x] #5 El clic en el fondo sigue cerrando el modal y el clic dentro del diálogo no lo cierra (`stopPropagation` preservado)
- [x] #6 El atajo de teclado (Esc para cerrar, Enter para confirmar) y el estado de `loading` del botón de confirmación siguen funcionando
- [x] #7 `npx tsc --noEmit` finishes con código 0
- [x] #8 `npm test` finishes con código 0
- [x] #9 `npm run backlog:check` finishes con código 0
- [x] #10 Validación visual: abrir el menú de una tarjeta → Papelera y comprobar que el diálogo aparece centrado, estable y sin parpadeo, en tema claro y oscuro — **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO**

---

#### [DEV-131] Definición del Goal de Sprint 7 y Ampliación de Alcance del Sprint en Curso
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

El usuario señaló —en sarcasmo, y con razón— que **el Sprint 7 se había creado sin
`goal`**, a diferencia de los otros siete sprints del proyecto, que sí lo tienen
definido desde su creación. Es decir: el campo no es opcional en la práctica, se
respeta en todos los casos salvo en este, y su ausencia era un defecto de
definición, no una libertad de alcance.

Un sprint sin goal no pierde sólo una etiqueta: pierde **la única señal que indica
cuándo está terminado**. Sin ella, el criterio de "llenar el sprint" degenera en
"meter lo que aparezca", y el backlog deja de priorizar.

**Goal redacto para Sprint 7**, derivado de lo que el sprint efectivamente es hoy
(12 tareas, 4 en `ready`, 5 en `review`, 2 en `draft`):

> Integridad del dato y corrección de fallos silenciosos: hooks de verificación que
> no mutan el repositorio, paridad de temas, identidad de proyecto, y eliminación
> de los defectos que no fallaban de forma visible (contenido fabricado en los
> `.md`, stacking context y containing block en overlays, y pulido de ItemModal).

El eje común que unifica las 12 tareas es precisamente ese: **ninguno de esos
defectos fallaba de forma visible**. El serializador no fallaba, escribía texto de
más. El Plan Guard no fallaba, no se disparaba nunca. El menú no fallaba, se
tapaba. El `ConfirmModal` no fallaba, se dibujaba en el lugar equivocado y
parpadeaba. Son fallos silenciosos, y esa es la línea que justifica el sprint.

**Ampliación de alcance.** Con el goal definido, el usuario señaló además tareas de bajo
esfuerzo y alto valor que ya existían en el backlog sin asignar. Se incorporan
**DEV-118, DEV-119, DEV-120, DEV-121 y DEV-122** al Sprint 7. **DEV-115 y DEV-101**
ya pertenecían al sprint, por lo que no se reassignan.

**Defecto de formato corregido en DEV-101**: su Implementation Plan tenía los
saltos de línea como la secuencia literal `\n` en vez de saltos reales, lo que se
renderiza como un solo bloque corrido en la UI. Corregido.

**Criterios de Aceptación:**
- [x] #1 Se verifica si el goal vacío de Sprint 7 es un defecto puntual o una costumbre del proyecto, auditando el campo `goal` de los 8 sprints
- [x] #2 Sprint 7 recibe un `goal` que describe su alcance real, en `backlog/sprints.json`
- [x] #3 DEV-118 queda asignada a Sprint 7
- [x] #4 DEV-119 queda asignada a Sprint 7
- [x] #5 DEV-120 queda asignada a Sprint 7
- [x] #6 DEV-121 queda asignada a Sprint 7
- [x] #7 DEV-122 queda asignada a Sprint 7
- [x] #8 DEV-115 y DEV-101 se verifican como ya pertenecientes al sprint (no se reasignan)
- [x] #9 Se revisa la definición de DEV-101 y se corrige el defecto de formato de su plan (saltos de línea literales `\n`)
- [x] #10 Se registra el riesgo de DEV-119 (reescritura de historial git) antes de ejecutarla: es irreversible y afecta a todo el repo
- [x] #11 `npm run backlog:check` finishes con código 0
- [x] #12 Se incorpora en `AGENTS.md` el gate de cierre de sprint: no se cierra con tareas en `draft`, `doing` o `review`, y el agente no debe proponer ni anticipar el cierre de un sprint incompleto
- [x] #13 Se fija el ritmo de trabajo: resolver las tareas de a una y pasar a la siguiente sólo con la confirmación del usuario de que la anterior quedó bien

---

#### [DEV-132] El Parser No Detecta Marcadores de Sección Literales en Descripciones y Falla en Silencio
- **Prioridad**: `high` | **Tipo**: `bug`

El parser de archivos de tarea extrae las secciones delimitadas tomando la
**primera coincidencia** de cada marcador, en orden de documento. Consecuencia: si
la descripción de una tarea contiene los marcadores literales del formato —algo
perfectamente natural en una tarea que **documenta el propio formato**— el parser
lee esa copia como si fuera la sección real, y la tarea se parsea con datos
equivocados, **sin ningún error visible**.

**Caso real, encontrado en el propio backlog**: la descripción de DEV-127 incluye,
para mostrar un `.md` contaminado, un bloque de código con los marcadores literales
de sección. Como la descripción va antes que las secciones reales, el regex de
extracción capturaba desde el `AC:BEGIN` de la descripción hasta el `AC:END` real,
es decir medio documento. Los **18 ACs de DEV-127 eran invisibles para el parser**.

**El agravante: el guard de integridad no lo puede detectar.** `npm run
backlog:check` lee y escribe con el mismo parser. Si el parser interpreta
consistentemente el bloque equivocado, la relectura produce el mismo error y el
guard reporta "100% sincronizado". Un error autoconsistente se valida como
verdadero, que es la peor clase de fallo en una herramienta cuyo propósito es
justamente dar confianza sobre el estado del backlog.

**Por qué importa más de lo que parece**: la serie DEV-101 a DEV-131 es,
precisamente, la que documenta y modifica el formato de los archivos de tarea
(serialización, secciones, plan guard, campos, sanitización). Es un tipo de tarea
que va a seguir apareciendo en cada iteración del producto, y todas ellas corren
riesgo de caer en esta trampa. Cuantas más tareas documenten el formato, mayor es
la probabilidad de que una corrompa silenciosamente su propia lectura.

**Mitigación parcial ya aplicada**: en DEV-127 los marcadores del ejemplo se
reescribieron como texto neutro (`[marcador AC:BEGIN]`) en lugar de su forma
literal. Eso corrige **ese** archivo, pero no previene el próximo.

**Criterios de Aceptación:**
- [x] #1 Se agrega al guard de integridad (`npm run backlog:check`) un detector que falle de forma explícita cuando un archivo de tarea contiene más de un marcador `BEGIN` por sección, en lugar de dejar que el error pase inadvertido
- [x] #2 El detector reporta el archivo, la línea y el marcador duplicado, para que el autor pueda localizarlo sin buscar a ciegas
- [x] #3 El detector no produce falsos positivos: los archivos legítimos con secciones adicionales como `SECTION:TECHNOTES` se validan sin error
- [x] #4 El write path deja de propagar el problema: al serializar, los marcadores que aparezcan literalmente dentro de texto libre del usuario se neutralizan o se escapan
- [x] #5 El write path nunca altera los marcadores reales de la estructura del archivo
- [x] #6 Una tarea cuya descripción contenga los marcadores literales se relee con sus ACs, plan y descripción reales, y no con los de la descripción
- [x] #7 Se agrega un test de regresión en `scripts/test-parser.js` que construya una tarea con marcadores literales en la descripción y verifique que el round-trip conserva los ACs y el plan reales
- [x] #8 El test cubre también el caso de un marcador literal en el plan y en las notas técnicas
- [x] #9 `npx tsc --noEmit` finishes con código 0
- [x] #10 `npm test` finishes con código 0
- [x] #11 `npm run backlog:check` finishes con código 0
- [x] #12 Se documenta en `AGENTS.md` la prohibición de escribir marcadores de sección literales dentro de descripciones, y el motivo

---

#### [DEV-133] package-lock.json Desincronizado en 0.1.0: el Lockfile No se Regenera desde el 16/09
- **Prioridad**: `low` | **Tipo**: `bug`

`package-lock.json` declara `"version": "0.1.0"` mientras `package.json` declara
`"version": "0.6.1"`. El lockfile **no se regenera desde el 16/09/2026**, cuando el
proyecto atravesó las versiones 0.2.0, 0.3.0, 0.4.0, 0.5.0, 0.6.0 y 0.6.1.

**Cómo se detectó**: al buscar por qué `releases.json` no tenía entrada para
`0.1.0`, la única referencia a esa versión en todo el repositorio apareció en el
lockfile. La evidencia de que `0.1.0` fue un bump real pero informal: los commits
`e0029b7` y `ed91943` (ambos del 16/09) tienen `version=0.1.0` en `package.json`,
y horas después `f4ce6ae` ya sube a `0.2.0`. No hay tag `v0.1.0` — el más antiguo
es `v0.2.0` — ni entrada en `releases.json` ni tarea asignada a esa versión.

**Por qué importa, aunque no rompa nada hoy**: npm reconcilia el desfase en el
momento de instalar, así que el proyecto funciona. El problema es de higiene del
repositorio y de trazabilidad: es un dato que afirma una versión que no existe
como release, en un archivo versionado que cualquier agente o persona puede leer
como si fuera verdad. Es exactamente la clase de dato desincronizado que este
sprint viene limpiando (DEV-127 eliminó contenido fabricado de los `.md`).

Un segundo problema Observable: el lockfile congelado implica que las
dependencias transitivas instaladas pueden no coincidir con las que se resuelven
hoy, y la diferencia no queda registrada en el historial.

**Criterios de Aceptación:**
- [x] #1 `package-lock.json` declara una `version` igual a la de `package.json`
- [x] #2 El lockfile se regenera con `npm install`, actualizando el árbol de dependencias transitivas
- [x] #3 Se verifica que `npm ci` funciona con el lockfile regenerado
- [x] #4 Se verifica que `npm run build` sigue funcionando tras la regeneración
- [x] #5 Se documenta en el plan el criterio para futuras promociones de versión: subir `package.json` y regenerar el lockfile en el mismo commit, para que la desincronización no vuelva a ocurrir
- [x] #6 `npm test` finishes con código 0
- [x] #7 `npm run backlog:check` finishes con código 0
- [x] #8 La regeneración resultó quirúrgica: **únicamente** cambió el campo `version` del root (0.1.0 → 0.6.1). Cero cambios en las 185 entradas del árbol y cero paquetes agregados o eliminados, lo que confirma que la única desincronización era el campo de versión
- [x] #9 Se verifica el árbol de dependencias de forma explícita: las 12 dependencias declaradas (uniendo `dependencies` y `devDependencies`) coinciden en nombre con las del root del lockfile, sin faltantes ni sobrantes
- [x] #10 `npx tsc --noEmit` finishes con código 0

---

#### [DEV-135] El Motor de Importación está Hardcodeado a un Proyecto Privado: Genericizar import-docs.js
- **Prioridad**: `high` | **Tipo**: `bug`

El motor de importación de documentación —`runMigration` en
`scripts/import-docs.js`, invocado por el endpoint de importación del dev
server en `vite.config.ts:2324` y `:2353`— está **hardcodeado a un proyecto de
finanzas personales concreto**. No es un script personal descartable: es código de
producto con un supuesto privado incrustado.

**Elementos hardcodeados, tras la sanitización de rutas de DEV-118:**

| Línea | Contenido |
|---|---|
| `scripts/import-docs.js:78-84` | `name: '<Private Project>'`, `codePrefix: '<PREFIX>'`, `description` de finanzas personales |
| `scripts/import-docs.js:159` | `const code = \`<PREFIX>-${rawId}\`` |
| `scripts/import-docs.js:279` | `code: \`<PREFIX>-${rawId}\`` |
| `scripts/import-docs.js:319,322` | `let code = \`<PREFIX>-${...}\`` y `<PREFIX>-SPEC-${n}` |

Además, el **nombre del archivo y el script de npm** heredan el supuesto:
`import-docs.js` y `"import:docs": "node scripts/import-docs.js"`.

**Por qué importa más allá de la privacidad**: cualquier proyecto importado por
otro usuario recibe identificadores con prefijo hardcodeado, que colisionan con el
prefijo real del proyecto y con el de cualquier otro. El `codePrefix` que el
proyecto declara se ignora por completo en la generación de códigos.

**Lo que hace el refactor viable**: `runMigration` ya recibe `projectMeta` y lo usa
para asignar `item.projectId`. Sólo hay que extender ese mismo objeto a la
generación de códigos y eliminar el objeto de proyecto embebido.

**Lo que ya se corrigió en DEV-118 y no hay que repetir**: la ruta absoluta
personal (`<DOCS_DIR>` con valor por defecto embebido) y el objeto `projectMeta`
de respaldo. Ahora ambos se exigen en vez de inventarse.

**Criterios de Aceptación:**
- [x] #1 La generación de códigos usa `projectMeta.codePrefix` en lugar de un literal hardcodeado, en los cuatro sitios de `import-docs.js`
- [x] #2 Un proyecto sin `codePrefix` falla de forma explícita antes de importar, en lugar de generar códigos sin prefijo
- [x] #3 El script se renombra a un nombre sin supuesto privado (`scripts/import-docs.js`) y se actualizan el import en `vite.config.ts` y el script de npm
- [x] #4 Ninguna cadena del módulo contiene identificadores hardcodeados ni descripciones de proyectos privados. El único prefijo restante es el recibido por configuración
- [x] #5 El script de npm deja de exponer el supuesto: `import:dom` pasa a `import:docs`
- [x] #6 El contexto (`codePrefix` + `projectId`) se resuelve **una sola vez** en el entrypoint y se propaga a los cuatro parsers, en lugar de pasar el prefijo suelto en cada llamada
- [x] #7 El `.d.ts` del módulo se renombra junto con el archivo y se tipa en lugar de usar `any`: define `ImportProjectMeta` con `codePrefix` obligatorio
- [x] #8 Se agrega un test de regresión en `scripts/test-parser.js` que falla si el módulo vuelve a incrustar un proyecto o un prefijo privado hardcodeado, o si alguno de los cuatro parsers deja de recibir el contexto
- [x] #9 `npx tsc --noEmit` finishes con código 0
- [x] #10 `npm test` finishes con código 0
- [x] #11 `npm run build` finishes con código 0
- [x] #12 `npm run backlog:check` finishes con código 0
- [x] #13 `npm run audit:ux` sigue con 0 errores y 0 advertencias
- [x] #14 Las referencias al nombre viejo (`import-dom-docs.js`, `import:dom`) se actualizan en todos los archivos rastreados, incluidas las descripciones de DEV-118 y DEV-135, y `BACKLOG.md` se regenera

---

#### [DEV-140] Configuración de Linting y Formatting: ESLint Flat Config, Prettier y EditorConfig
- **Prioridad**: `high` | **Tipo**: `feature`

Establecer configuración de linting y formateo homogénea para que contribuidores externos mantengan la consistencia del código. Usar ESLint flat config con soporte TypeScript y React, Prettier para formateo y EditorConfig para editores sin Prettier nativo.

**Criterios de Aceptación:**
- [x] #1 Sincerado en DEV-152: eliminación del stub inerte `eslint.config.js` para evitar falsas garantías; la rigurosidad estricta la provee `npx tsc --noEmit` y el pre-commit hook
- [x] #2 Crear `.prettierrc` con configuración de estilo unificada (singleQuote, semi, trailingComma, printWidth) y `.prettierignore` para excluir dist/, bin/, node_modules/ y archivos markdown de backlog/
- [x] #3 Crear `.editorconfig` con reglas de indentación (2 espacios), UTF-8 y saltos de línea LF
- [x] #4 Scripts `"lint": "tsc --noEmit"` y `"format": "node scripts/verify-backlog-sync.js"` vinculados a las salvaguardas nativas del proyecto
- [x] #5 Verificar que `npm run lint` y `npm run format` se ejecutan correctamente sin romper el build

---

#### [DEV-141] Requisitos de Entorno de Ejecución: .nvmrc, .node-version y Node Engine en package.json
- **Prioridad**: `medium` | **Tipo**: `chore`

Fijar la versión mínima requerida de Node.js mediante archivos estándar (.nvmrc, .node-version), metadato engines en package.json y documentación clara para que cualquier desarrollador clone y ejecute sin fallos por versiones no compatibles.

**Criterios de Aceptación:**
- [x] #1 Crear archivo `.nvmrc` con `22.6.0` (versión requerida para flag `--experimental-strip-types`)
- [x] #2 Crear archivo `.node-version` con `22.6.0` para gestores alternativos (fnm, volta, asdf)
- [x] #3 Verificar que `package.json` incluye `"engines": { "node": ">=22.6.0" }`
- [x] #4 Documentar en CONTRIBUTING.md la versión requerida de Node y el motivo técnico de `--experimental-strip-types`
- [x] #5 Agregar badge de versión mínima de Node en README.md y README.es.md

---

#### [DEV-143] Investigación y Matriz de Naming para Rebranding: Análisis de Mercado, Storytelling y Disponibilidad
- **Prioridad**: `high` | **Tipo**: `feature`

Llevar a cabo una investigación de mercado profunda de branding e identidad para superar la denominación genérica 'dev-board'. Diseñar una matriz de evaluación exhaustiva analizando storytelling, fonética, resonancia con la visión de cockpit ágil para humanos y agentes IA, y disponibilidad técnica en npm y GitHub.

**Criterios de Aceptación:**
- [x] #1 Auditar patrones lingüísticos y convenciones de marcas líderes (Linear, Plane, Height, Zed, Warp, Cursor, Raycast, Graphite)
- [x] #2 Evaluar exhaustivamente las propuestas pre-seleccionadas (GRIP, AgentBoard) y generar al menos 8 alternativas originales adicionales de alto calibre
- [x] #3 Construir matriz comparativa evaluando: fonética, memorabilidad, storytelling de soberanía/agentes, disponibilidad en npm y colisiones en GitHub
- [x] #4 Desarrollar el storytelling y justificación narrativa profunda para los 3 finalistas más prometedores
- [x] #5 Presentar el informe de naming estructurado al usuario para deliberación y toma de decisión informada

---

#### [DEV-144] Migración Integral de Rebranding: Renombrado de Binarios, Documentación y Alias Retrocompatibles
- **Prioridad**: `high` | **Tipo**: `feature`

Una vez seleccionado y aprobado el nombre definitivo del producto, ejecutar la migración técnica integral de la identidad: package.json, binarios CLI, aliases retrocompatibles, componentes visuales de UI y suite completa de documentación.

**Criterios de Aceptación:**
- [x] #1 Actualizar `package.json` con el nuevo nombre y configurar binarios duales para retrocompatibilidad total (`bin: { "nuevo-nombre": "...", "devboard": "..." }`)
- [x] #2 Actualizar textos de marca, logos y encabezados en la UI (`src/components/Header.tsx`, `SettingsView.tsx`, etc.)
- [x] #3 Actualizar toda la documentación técnica: README.md, README.es.md, AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md, AGENTIC_PLAYBOOK.md
- [x] #4 Actualizar scripts de scaffolding (`initScaffold.js`), binarios CLI y updateChecker con las nuevas referencias y aliases
- [x] #5 Verificar que `npx tsc --noEmit`, `npm test` y `npm run build` pasan sin errores con el nuevo nombre

---

#### [DEV-145] Apertura Automática del Navegador en npm run dev y npm run board
- **Prioridad**: `high` | **Tipo**: `feature`

Configurar la apertura automática del navegador en localhost:4100 (o el puerto disponible) tanto al ejecutar npm run dev como npm run board, agregando el script board en package.json y configurando server.open en vite.config.ts de forma coordinada con bin/devboard.js.

**Criterios de Aceptación:**
- [x] #1 Agregar script "board": "node bin/devboard.js" en package.json
- [x] #2 Configurar server.open: true en vite.config.ts para apertura automática de localhost:4100 (o puerto resuelto) en npm run dev
- [x] #3 Prevenir apertura duplicada en bin/devboard.js pasando open: false a createServer y preservando el flag --no-open
- [x] #4 Verificar tipado estricto con npx tsc --noEmit, pruebas con npm test y auditoría con npm run backlog:check

---

#### [DEV-146] Desacople Canónico de Sprint vs Release, Gobernanza de Ciclo de Vida y Release v0.7.0
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Desacople canónico de Sprint vs Release, actualización de directivas de gobernanza ágil en AGENTS.md, consolidación del paquete v0.7.0 con 25 tareas completadas, bump de versión y publicación en main de GitHub.

**Criterios de Aceptación:**
- [x] #1 Actualizar AGENTS.md reflejando el desacople conceptual entre Sprint y Release (releases por valor entregado y no atadas al sprint)
- [x] #2 Actualizar AGENTS.md definiendo el ciclo de vida de Sprint por timeboxing y ampliación de alcance sin bloqueos artificiales
- [x] #3 Tildar ACs validados pendientes (#6 en DEV-126 y #10 en DEV-130)
- [x] #4 Registrar la versión formal v0.7.0 en backlog/releases.json con sus release notes y los 25 itemCodes completados
- [x] #5 Promover a status done las tareas incluidas en la release v0.7.0
- [x] #6 Incrementar versión en package.json a 0.7.0
- [x] #7 Actualizar README.md y README.es.md con Features Overview (v0.7.0) y conteo real de tareas dogfooding
- [x] #8 Ejecutar npm run build para regenerar dist/ y binarios ejecutables
- [x] #9 Ejecutar npm test y npm run backlog:check verificando 0 errores
- [x] #10 Comitear, crear tag v0.7.0 y pushear a origin/main con tags en GitHub

---

#### [DEV-147] Empaquetado y Distribución CLI: Servidor de Producción, Dependencias Runtime y Smoke Test de npm pack
- **Prioridad**: `urgent` | **Tipo**: `bug`

Resolver el crash crítico detectado en auditoría externa al instalar `gripm` como paquete npm global o ejecutarlo con `npx gripm`.
Actualmente `package.json` incluye en `files` únicamente `bin/`, `dist/`, `data/demo-backlog.json` y READMEs, omitiendo `scripts/` y `vite.config.ts`, mientras `bin/gripm.js` intenta importar `../scripts/*.js` y levantar el servidor dev de Vite con `dependencies` completamente vacío.

Esta tarea aborda:
1. Asegurar que `bin/gripm.js` cuente con todos los scripts necesarios o un servidor Node de producción autónomo que sirva `dist/` y el API sin depender del servidor de desarrollo de Vite.
2. Mover las dependencias esenciales de ejecución a `dependencies` en `package.json` o empaquetar de forma autocontenida.
3. Incorporar un smoke test automatizado en `npm test` que ejecute `npm pack`, extraiga el tarball en un directorio temporal y verifique que `node package/bin/gripm.js --help` ejecute sin errores.

**Criterios de Aceptación:**
- [x] #1 `package.json` incluye en `files` todos los archivos y carpetas requeridos en tiempo de ejecución (`scripts`, `dist`, etc.) o empaqueta un bundle autónomo
- [x] #2 Las dependencias requeridas en tiempo de ejecución por `bin/gripm.js` están correctamente declaradas en `dependencies`
- [x] #3 `bin/gripm.js` no arroja `ERR_MODULE_NOT_FOUND` al ejecutarse desde un tarball empaquetado con `npm pack`
- [x] #4 Implementar script de smoke test (`scripts/test-package-smoke.js`) que empaquete, extraiga y pruebe `--help` del CLI
- [x] #5 Integrar el smoke test en `npm test` para prevenir regresiones en CI y antes de cualquier release
- [x] #6 `npm test`, `npx tsc --noEmit` y `npm run backlog:check` pasan con código 0

---

#### [DEV-148] Seguridad del API Local: Mitigación de CSRF, DNS Rebinding, Validación de Host/Origin y Protección de Browse
- **Prioridad**: `urgent` | **Tipo**: `bug`

Mitigar las vulnerabilidades de seguridad identificadas en la auditoría externa en el API local (`vite.config.ts` / `apiMiddleware`):
1. **CSRF y DNS Rebinding:** Validar estrictamente los encabezados `Host` y `Origin` permitiendo únicamente `localhost`, `127.0.0.1`, `[::1]` o el host explícito configurado.
2. **Métodos Mutantes:** Exigir `Content-Type: application/json` en métodos `POST`, `PUT`, `DELETE` para impedir envíos ciegos tipo "simple request" sin preflight CORS desde sitios de terceros.
3. **CORS Abierto:** Eliminar `Access-Control-Allow-Origin: *` de `/api/events` (SSE) y restringirlo a orígenes locales verificados.
4. **Protección de `/api/fs/browse`:** Validar que el directorio explorado pertenezca a directorios seguros del usuario o restringir navegación arbitraria del sistema de archivos.
5. **Advertencia de Red:** Emitir advertencia de seguridad en la consola si el servidor se enlaza a `--host 0.0.0.0` o a interfaces públicas sin token de acceso.

**Criterios de Aceptación:**
- [x] #1 `apiMiddleware` rechaza peticiones con cabeceras `Origin` no coincidentes con el host local o autorizado
- [x] #2 `apiMiddleware` valida la cabecera `Host` para prevenir ataques de DNS Rebinding
- [x] #3 Peticiones mutantes (`POST`, `PUT`, `DELETE`, `PATCH`) rechazan payloads que no especifiquen `Content-Type: application/json`
- [x] #4 `/api/events` no expone `Access-Control-Allow-Origin: *`
- [x] #5 `/api/fs/browse` implementa salvaguardas y rechaza navegación fuera de límites de usuario permitidos
- [x] #6 Tests automatizados verifican el rechazo de peticiones cross-origin no autorizadas

---

#### [DEV-149] Rebranding Canónico y Erradicación de Deuda Técnica: MCP gripm_*, Directorio .gripm y Variables GRIPM_*
- **Prioridad**: `urgent` | **Tipo**: `tech_debt`

Culminar el rebranding de forma definitiva antes de la publicación del repositorio público `gripm`:
Como el proyecto se lanza como un repositorio nuevo en GitHub (`pablojavierrodriguez/gripm`) con versión 1.0.0 y sin usuarios externos heredados, no existe justificación para arrastrar alias y dualidad de nombres (`devboard_*`, `.devboard/`, `DEVBOARD_*`) que perpetúen una deuda técnica como contrato público.

Esta tarea abarca:
1. **MCP Canónico:** Canonizar las herramientas bajo el prefijo `gripm_*` (`gripm_list_tasks`, `gripm_get_task`, etc.) en `scripts/mcp-server.ts`.
2. **Directorio de Configuración:** Utilizar `.gripm/` como carpeta estándar del proyecto, con soporte de migración transparente o fallback si existe `.devboard/`.
3. **Variables de Entorno:** Estandarizar en `GRIPM_*` (`GRIPM_PORT`, `GRIPM_HOST`, `GRIPM_MODE`), aceptando `DEVBOARD_*` únicamente como fallback suave.
4. **Almacenamiento Global:** Estandarizar en `~/.gripm/` para el registro global de proyectos y caché.
5. **Licencia y Notificaciones:** Actualizar `LICENSE` a "gripm Contributors" y limpiar menciones residuales de DevBoard en cabeceras y guardrails.

**Criterios de Aceptación:**
- [x] #1 `scripts/mcp-server.ts` expone formalmente las herramientas canónicas `gripm_*`
- [x] #2 La aplicación detecta y utiliza `.gripm/config.json` de forma nativa, migrando automáticamente `.devboard/` si existe
- [x] #3 Las variables de entorno canónicas son `GRIPM_PORT`, `GRIPM_HOST`, `GRIPM_MODE`, `GRIPM_HOME`
- [x] #4 El archivo `LICENSE` nombra a "gripm Contributors" en concordancia con `package.json`
- [x] #5 Los guardrails de pre-commit y banners de consola muestran `[gripm Guard]`
- [x] #6 Tests e integración pasan con código 0

---

#### [DEV-150] Subcomando CLI gripm mcp, Tooling Real de Calidad y Optimización de Assets
- **Prioridad**: `high` | **Tipo**: `feature`

Pulido y robustecimiento de ergonomía de adopción y estándares de desarrollo:
1. **Subcomando CLI `gripm mcp`:** En `bin/gripm.js`, si el primer argumento es `mcp`, derivar inmediatamente al servidor MCP (`bin/gripm-mcp.js`), permitiendo la sintaxis documentada en el README `npx gripm mcp`.
2. **Descripciones MCP en Inglés:** Proporcionar descripciones en inglés para las herramientas MCP en `scripts/mcp-server.ts`, asegurando una comprensión óptima por LLMs y agentes de usuarios internacionales.
3. **Tooling Real (ESLint / Prettier / Backlog Check):**
   - Eliminar el bypass silencioso `|| echo '...'` en los scripts de linting y formateo.
   - Instalar dependencias reales de ESLint y Prettier o documentar los comandos correspondientes.
   - Ajustar `backlog:check` para que sea de solo lectura en CI y falle si hay diferencias en lugar de reescribir `BACKLOG.md` silenciosamente.
4. **Optimización de Assets:** Generar favicon SVG o PNG optimizado (~5 KB) en reemplazo del PNG de 462 KB actual.
5. **Higiene de Datos:** Limpiar tareas de prueba en `backlog/archive/` (`dev--028`, `dev--029`, `dev--065`) y sanitizar referencias residuales privadas en scripts y tests.

**Criterios de Aceptación:**
- [x] #1 `node bin/gripm.js mcp` ejecuta el servidor MCP en stdio en lugar de abrir el navegador
- [x] #2 Las herramientas MCP en `scripts/mcp-server.ts` presentan descripciones claras en inglés para agentes IA
- [x] #3 `npm run lint` y `npm run format` cuentan con tooling operativo real o scripts coherentes sin mensajes falsos
- [x] #4 `npm run backlog:check` opera en modo estricto de solo lectura para CI
- [x] #5 Favicon optimizado a tamaño liviano (< 20 KB)
- [x] #6 Limpieza de tareas de prueba en archive y sanitización de cadenas residuales

---

#### [DEV-151] Fuga de Datos Personales en el Tarball de Publicación npm (registry allowlist vs .gitignore)
- **Prioridad**: `critical` | **Tipo**: `bug`

Fuga confirmada de datos personales privados dentro del artefacto que se publica en npm, que impedía lanzar el repositorio público sin exponer información del autor.

`data/projects-registry.json` contiene rutas absolutas del entorno local del autor y el nombre de un repositorio privado. El archivo está correctamente excluido de Git mediante `.gitignore`, **pero se publicaba igual en el tarball de npm**, porque el campo `files` de `package.json` es una *allowlist* que tiene precedencia sobre `.gitignore` e incluía el directorio completo `data`.

Contenido filtrado (3 ocurrencias) :
- `repoPath` de un repositorio de trabajo del autor (ruta absoluta bajo el home del usuario).
- `repoPath` de un proyecto privado referred por nombre (`code/m3`).

**Causa raíz (por qué sobrevivió al saneamiento previo):** DEV-118 AC #4 dio la fuga por resuelta argumentando que el archivo *"ya estaba en `.gitignore` y nunca fue trackeado"*. La verificación se hizo contra el modelo de amenaza equivocado: `.gitignore` protege el repositorio **Git**, pero no tiene efecto sobre el canal de distribución **npm**. La tarea se cerró `done` sin comprobar nunca el tarball real. Los AC #5 a #10 de DEV-118 fueron correctos; el punto ciego fue exactamente la frontera de empaquetado.

**Impacto:** cualquier persona podía ejecutar `npm pack` y obtener las rutas privadas del autor y el nombre de un repo no público, sin necesidad de acceso al repositorio.

**Resolución:** angostar el campo `files` para incluir únicamente el archivo de demostración que sí es necesario en runtime (`data/demo-backlog.json`) en lugar del directorio `data` completo. Se preference esta vía sobre `.npmignore` porque `files` es la allowlist canónica y elimina la ambigüedad de precedencia entre ambos mecanismos, haciendo el resultado determinista e irreversible.

**Criterios de Aceptación:**
- [x] #1 `npm pack --dry-run` no lista `data/projects-registry.json` entre los archivos del tarball
- [x] #2 El campo `files` de `package.json` referencia `data/demo-backlog.json` de forma explícita en lugar del directorio `data`
- [x] #3 `data/demo-backlog.json` sigue presente en el tarball (el proyecto demo functionality no se rompe)
- [x] #4 Verificación de contenido sobre el tarball real extraído: cero coincidencias de `/Users/`, del nombre de usuario del autor, de `Pablo/code` y de los nombres de proyectos privados
- [x] #5 `npm test` pasa, incluido el smoke test de empaquetado que valida la ejecución de `bin/gripm.js` desde el tarball extraído
- [x] #6 `npx tsc --noEmit` sin errores y `npm run backlog:check` en 100% tras el cambio
- [x] #7 Corregir el AC #4 de DEV-118 para que refleje el modelo de amenaza real (npm vs Git) y no.close la tarea con una verificación que solo cubre Git
- [x] #8 Agregar al CI un gate que falle si `npm pack` incluye archivos no permitidos por una allowlist explícita (`npm run publish:check`, verificado con exit 1 al reintroducir la fuga y exit 0 tras el fix)

---

#### [DEV-152] Saneamiento de ESLint Inerte y Erradicacion de Strings i18n Hardcodeados
- **Prioridad**: `high` | **Tipo**: `bug`

Cierre de los dos hallazgos de prioridad alta (P1) detectados en la auditoría pre-lanzamiento open-source (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md` §6.1 y §6.2):

1. **Saneamiento de ESLint Inerte:** `eslint.config.js` existía como un archivo de 17 líneas sin parser de TypeScript ni plugins reales, con sus únicas dos reglas en `off` y sin `eslint` en dependencias. Se elimina el archivo de configuración muerto y se ajustan los ACs de DEV-140 para reflejar con honestidad que la garantía estricta de código la provee `tsc --noEmit` junto con el hook pre-commit y el nuevo guard de publicación.
2. **Erradicación de Strings Hardcodeados en i18n:** Conectar todos los textos y placeholders literales de la interfaz a `t()` en `App.tsx` (navegación móvil 'Tablero', 'Sprint', 'Releases', 'Papelera', toasts), `SprintView.tsx` ('Sin Sprint', diálogos), `ProjectModal.tsx`, `CompleteSprintModal.tsx`, `SprintModal.tsx`, `ReleaseAssembler.tsx`, `ImportWizardModal.tsx`, `PlanGuardModal.tsx` y `FolderPickerModal.tsx`. Garantizar paridad total de claves entre `src/locales/es.json` y `src/locales/en.json`.

**Criterios de Aceptación:**
- [x] #1 Eliminar el archivo inerte `eslint.config.js` y ajustar los criterios de DEV-140
- [x] #2 Conectar la navegación móvil y toasts de `src/App.tsx` a `t()`
- [x] #3 Reemplazar textos y selectores 'Sin Sprint', tooltips y confirmaciones en `src/components/SprintView.tsx` por llamadas a `t()`
- [x] #4 Internacionalizar `src/components/ProjectModal.tsx` incorporando el hook `useTranslation`
- [x] #5 Internacionalizar placeholders y modales de `CompleteSprintModal.tsx`, `SprintModal.tsx`, `ReleaseAssembler.tsx`, `PlanGuardModal.tsx`, `ImportWizardModal.tsx` y `FolderPickerModal.tsx`
- [x] #6 Paridad estricta 1:1 en las claves añadidas en `src/locales/es.json` y `src/locales/en.json`
- [x] #7 `npx tsc --noEmit` con 0 errores y pirámide de verificación en verde (`npm test`, `npm run backlog:check`, `npm run publish:check`)

---

#### [DEV-153] Cobertura Total de i18n y Erradicacion de 37 Strings Literales Restantes
- **Prioridad**: `high` | **Tipo**: `bug`

Cierre definitivo de la internacionalización para resolver el hallazgo P1 §4 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

1. **Unificación incondicional de pestañas principales:** Pestaña 1 debe ser 'Tablero' (ES) / 'Board' (EN) sin sobreescrituras condicionales por metodología Scrumban, Pestaña 2 'Sprints y Backlog' (ES) / 'Sprints & Backlog' (EN) y Pestaña 3 'Versiones' (ES) / 'Releases' (EN).
2. **Erradicación de los 37 strings literales restantes en componentes:**
   - `SprintView.tsx` (10 strings): 'Iniciar Sprint', 'Completar Sprint', 'Ver Retrospectiva', 'Fecha de registro:', textos fallback de retro, contadores 'ítems'.
   - `ImportWizardModal.tsx` (6 strings): 'Contenido Markdown Plano', 'Subir archivo (.md)', etc.
   - `CompleteSprintModal.tsx` (4 strings): 'Completar {sprint}', 'Completadas', 'Pendientes', 'tareas cerradas con éxito', 'tareas no finalizadas', 'Mover tareas pendientes a:', 'Backlog General', 'Devolver tareas al backlog para repriorizarlas'.
   - `ReleaseAssembler.tsx` (4 strings): 'Fecha de Lanzamiento', 'Fecha Objetivo (Target Date)', 'Estado del Paquete', 'Implementado en Producción', 'En Preparación (Unreleased)', 'Resumen Ejecutivo (Summary)', 'Notas de Alcance / Definición de Hito'.
   - `SprintModal.tsx` (3 strings): 'Nombre del Sprint *', 'Objetivo del Sprint (Sprint Goal)', 'Duración Estimada', presets de semanas, 'Fecha de Inicio', 'Fecha de Fin'.
   - `PlanGuardModal.tsx` (2 strings): 'Plan de Implementación / Criterios de Aceptación', '¿Vas a resolver esto con un Agente IA?'.
   - `ItemCard.tsx`, `KanbanBoard.tsx`, `SettingsView.tsx`: Erradicar los residuos literales identificados.
3. Garantizar paridad 1:1 estricta entre `src/locales/es.json` y `src/locales/en.json`.

**Criterios de Aceptación:**
- [x] #1 Pestaña 1 muestra 'Tablero' en ES y 'Board' en EN de forma incondicional en `Header.tsx` y `App.tsx`
- [x] #2 Reemplazar los 10 textos literales en `src/components/SprintView.tsx` por claves de traducción en `t()`
- [x] #3 Reemplazar textos y etiquetas literales en `src/components/CompleteSprintModal.tsx` por claves de traducción en `t()`
- [x] #4 Reemplazar textos y etiquetas literales en `src/components/ReleaseAssembler.tsx` por claves de traducción en `t()`
- [x] #5 Reemplazar textos y etiquetas literales en `src/components/SprintModal.tsx`, `ImportWizardModal.tsx` y `PlanGuardModal.tsx`
- [x] #6 Reemplazar textos y etiquetas literales restantes en `ItemCard.tsx`, `KanbanBoard.tsx` y `SettingsView.tsx`
- [x] #7 Paridad 1:1 estricta verificada entre `src/locales/es.json` y `src/locales/en.json` (0 claves faltantes en ambos)
- [x] #8 Pirámide de verificación en verde (`tsc`, `npm test`, `npm run backlog:check`, `npm run publish:check`)

---

#### [DEV-154] Reparacion y Conexion de Suite de Verificacion Huerfana a npm test
- **Prioridad**: `high` | **Tipo**: `bug`

Resolución del hallazgo P1 §3 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

Existen 5 scripts de verificación en `scripts/` creados en tareas históricas que no están conectados a `npm test` y que fallan con exit code 127 o errores de importación al ser invocados:
1. `scripts/verify-optimistic-locking.js` (DEV-017): Prueba crítica de integridad de datos para control de concurrencia y prevención de sobrescrituras accidentales. Falla buscando el plugin Vite con un shape antiguo.
2. `scripts/verify-sse.js` (DEV-014): Prueba de eventos server-sent y watcher en tiempo real. Falla por resolución de plugin.
3. `scripts/verify-legacy-import.js`: Prueba de importación de backlogs Markdown antiguos. Falla por resolución de plugin.
4. `scripts/verify-mcp-binary.js`: Prueba del catálogo de tools del servidor MCP. Falla porque busca `devboard_sync_backlog` en lugar del nombre canónico post-rebranding `gripm_sync_backlog`.
5. `scripts/verify-resilience-and-cli.js`: Falla intentando ejecutar `npm run tasks` (comando inexistente).

Se deben reparar o refactorizar estos scripts para que funcionen con la arquitectura actual del backend/Vite y cablearlos formalmente dentro de `npm test` para que corran en CI y localmente en cada validación.

**Criterios de Aceptación:**
- [x] #1 `scripts/verify-optimistic-locking.js` reparado y validando exitosamente el control de concurrencia con código 0
- [x] #2 `scripts/verify-sse.js` reparado y validando eventos SSE con código 0
- [x] #3 `scripts/verify-legacy-import.js` reparado y validando importación legacy con código 0
- [x] #4 `scripts/verify-mcp-binary.js` actualizado para comprobar las 12 tools con prefijo `gripm_*` con código 0
- [x] #5 `scripts/verify-resilience-and-cli.js` adaptado a los scripts reales del CLI o depurado limpiamente
- [x] #6 `npm test` ejecuta todos los scripts de verificación activos de forma secuencial y finaliza con código 0
- [x] #7 `npm run publish:check` se ejecuta en CI y valida la limpieza total del paquete

---

#### [DEV-155] Saneamiento de Artefactos de Distribucion Shims de Binarios DTS Obsoletos y Residuos de Marca
- **Prioridad**: `medium` | **Tipo**: `chore`

Resolución de los hallazgos de empaquetado e higiene reportados en la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md` §5.1, §5.3, §5.4, §5.5, §5.8, §5.10):

1. **Renombrado/Alias de Skill de Agentes:** `.agents/skills/devboard/` todavía contiene la denominación previa a rebranding y es instalada en repositorios externos durante `--init`. Se debe migrar a `.agents/skills/gripm/` manteniendo alias retrocompatible si fuera necesario.
2. **Shims en Binarios Duplicados:** `bin/devboard.js` y `bin/devboard-mcp.js` son duplicados exactos (~195 KB) de `bin/gripm.js` y `bin/gripm-mcp.js`. Deben convertirse en wrappers ligeros de 3 líneas que importen el binario canónico correspondiente.
3. **Eliminación de `.d.ts` Obsoletos:** Eliminar los 6 archivos `.d.ts` en `scripts/` (`import-docs.d.ts`, `initScaffold.d.ts`, `portUtils.d.ts`, `registryConfig.d.ts`, `uninstall.d.ts`, `updateChecker.d.ts`) y agregarlos a `.gitignore` dado que `tsconfig` opera con `"noEmit": true`.
4. **Deriva de Versión:** Corregir el fallback `let appVersion = '0.5.0'` en `vite.config.ts:31` para que coincida con `1.0.0` y actualizar targets hardcodeados en `scripts/import-docs.js`.
5. **Residuo de Marca en Demo Backlog:** Actualizar `data/demo-backlog.json` para reemplazar menciones residuales de "DevBoard" por "gripm".
6. **Configuración local `.gripm/config.json`:** Sanear opciones personales commiteadas y unificar subtítulos de columnas.

**Criterios de Aceptación:**
- [x] #1 Renombrar `.agents/skills/devboard/` a `.agents/skills/gripm/` y actualizar el asistente `--init` para instalar `gripm`
- [x] #2 `bin/devboard.js` y `bin/devboard-mcp.js` convertidos en shims ligeros que reexportan/importan `bin/gripm.js` y `bin/gripm-mcp.js`
- [x] #3 6 archivos `.d.ts` en `scripts/` eliminados del árbol de trabajo y `*.d.ts` ignorado en `.gitignore`
- [x] #4 Fallback de `appVersion` en `vite.config.ts` actualizado a `1.0.0` y `scripts/import-docs.js` actualizado
- [x] #5 `data/demo-backlog.json` libre de menciones a DevBoard
- [x] #6 `.gripm/config.json` saneado y estandarizado
- [x] #7 `npm run publish:check` y `npm test` finalizan con código 0

---

#### [DEV-157] Integracion de Logo y Splash en Pantalla de Carga y Unificacion de Favicon
- **Prioridad**: `high` | **Tipo**: `feature`

La aplicación presenta dos inconsistencias visuales y de branding:
1. El favicon vectorial `public/favicon.svg` conserva un isotipo de dos barras horizontales heredado del prototipo anterior a gripm, que los navegadores modernos priorizan sobre `public/favicon.png`.
2. La carga inicial de la aplicación muestra una pantalla en blanco antes de montar React (`<div id="root"></div>` vacío en `index.html`), y una vez montado React, se muestra un spinner genérico circular sin el logo ni la identidad de gripm en `src/App.tsx`.

Esta tarea unifica la identidad visual en todos los puntos de entrada:
- Actualización de `public/favicon.svg` y configuración de meta tags en `index.html` para mostrar la "G" oficial de gripm.
- Splash screen instantáneo (0ms) en `index.html` con CSS inline ligero y anti-flash.
- Pantalla de carga en `src/App.tsx` con el isotipo de gripm, halo/anillo orbital y estado tipográfico sobrio.

**Criterios de Aceptación:**
- [x] #1 Unificar favicon en public/favicon.svg reflejando el logo oficial 'G' de gripm y actualizar meta tags en index.html
- [x] #2 Incorporar splash screen instantaneo (0ms) en index.html dentro de #root con logo centrado, soporte anti-flash y cero CLS
- [x] #3 Implementar pantalla de carga estilizada en App.tsx con logo oficial de gripm, animacion orbital/halo y mensaje de estado
- [x] #4 Superar la piramide de verificacion (tsc, npm test, backlog:check, build) sin interferir con cambios de otros agentes

---

#### [DEV-158] Sincronizador Universal del Agentic Team Playbook y Documentacion de Arquitectura de Skills
- **Prioridad**: `medium` | **Tipo**: `feature`

Incorporar soporte de primera clase en gripm para sincronizar y operacionalizar el Agentic Team Playbook preservando las configuraciones del proyecto:
1. **Script de sincronización universal (`scripts/sync-playbook.mjs`):** Descarga e instala las skills canónicas y directivas desde upstream (`pablojavierrodriguez/agentic-team-playbook`), bajo el principio de separación de capas (Framework vs Proyecto), garantizando que `AGENTS.md` y `backlog/` nunca se sobreescriban.
2. **Subcomando CLI `gripm playbook sync`:** Añadido en `bin/gripm.js` y `bin/devboard.js` para que cualquier repositorio (sea Node, Python, Go, Rust, etc.) pueda ejecutar `npx gripm playbook sync`.
3. **Script de conveniencia en `package.json`:** `"playbook:sync": "node scripts/sync-playbook.mjs"`.
4. **Documentación de arquitectura ("Under the Hood"):** Actualización de `docs/AGENTIC_PLAYBOOK.md` explicando por qué los agentes son skills modulares con *role-swapping* y *progressive disclosure* en lugar de enjambres asíncronos (swarms), agregando matriz comparativa y guía de sincronización de capas.
5. **Tip Pro en READMEs:** Actualización de `README.md` y `README.es.md` con el comando universal de sincronización.

**Criterios de Aceptación:**
- [x] #1 Script `scripts/sync-playbook.mjs` implementado con manejo defensivo de red y preservación estricta de `AGENTS.md`
- [x] #2 Subcomando `gripm playbook sync` operativo y documentado en `--help` de los binarios CLI
- [x] #3 Script `playbook:sync` agregado en `package.json`
- [x] #4 `docs/AGENTIC_PLAYBOOK.md` actualizado con sección de arquitectura de skills vs swarms y separación de capas
- [x] #5 Referencias y pro tips agregados en `README.md` y `README.es.md`
- [x] #6 Pirámide de verificación validada (`tsc`, `npm test`, `npm run backlog:check`, `npm run build`) con código de salida 0

---

#### [DEV-159] Validacion Condicional en Pre-Commit Hook por Archivos de Backlog en el Indice de Git
- **Prioridad**: `medium` | **Tipo**: `feature`

Implementación de validación condicional en el hook pre-commit (scripts/verify-backlog-sync.js --hook y .githooks/pre-commit). El hook solo ejecuta la verificación de coherencia si el índice de Git (git diff --cached --name-only) contiene archivos de backlog (BACKLOG.md o tareas en backlog/tasks/). Si el commit no toca el backlog, se omite con código 0 preservando commits atómicos. Si toca el backlog, valida coherencia e impide tareas fantasma o desfase sin mutar el índice.

**Criterios de Aceptación:**
- [x] #1 scripts/verify-backlog-sync.js --hook inspecciona git diff --cached --name-only para detectar archivos de backlog stageados
- [x] #2 Si no hay archivos de backlog stageados en el commit, el hook omite la validación y retorna código 0 permitiendo commits de solo código o documentación
- [x] #3 Si hay tareas stageadas en backlog/tasks/, verifica que BACKLOG.md también esté stageado y sincronizado con las mismas
- [x] #4 Si BACKLOG.md está stageado, verifica que ninguna tarea referenciada sea un archivo fantasma inexistente en Git o en el commit
- [x] #5 El hook opera de forma estrictamente no invasiva sin mutar el índice ni ejecutar git add automático
- [x] #6 Pirámide de verificación en verde (tsc, npm test, backlog:check, publish:check, build) con código 0

---

#### [DEV-160] Soporte de Primera Clase para Estado Ideas y Aislamiento de Test MCP en Sincronizacion de Backlog
- **Prioridad**: `urgent` | **Tipo**: `bug`

Esta tarea aborda dos anomalías críticas reportadas en el cierre de Sprint 8:

1. **Error al marcar ítems como "ideas":**
   - En `scripts/backlogMdParser.ts`, la función `formatStatusForMd` degradaba silenciosamente `ideas` a `draft`, violando la regla de AGENTS.md §6.6 (*"Estado ideas de primera clase: NUNCA normalizar o degradar ideas a draft en parsers o vistas"*).
   - En `scripts/mcp-server.ts`, los esquemas JSON-RPC de las herramientas de mutación (`gripm_update_task`, `devboard_update_task`, `gripm_create_task`, `gripm_bulk_update_tasks`) omitían `'ideas'` de su lista de valores permitidos (`enum`), provocando errores de validación de esquema en clientes y agentes MCP.
   - En `src/components/SprintView.tsx`, el selector de estado en la tabla carecía de la opción `<option value="ideas">`.

2. **Mutación del árbol de trabajo en `npm test` (Hallazgo §13.5 del Auditor):**
   - El script `scripts/verify-mcp-binary.js` ejecutaba la tool mutante `gripm_sync_backlog` directamente sobre el repositorio activo.
   - Dicha herramienta inyectaba `targetSprint` en `milestone`, violando la ortogonalidad y generando un `BACKLOG.md` desfasado respecto al comando canónico `npm run backlog:sync`.
   - Se debe desacoplar sprint de milestone y garantizar que `npm test` deje el árbol de trabajo completamente limpio.

**Criterios de Aceptación:**
- [x] #1 Corregir formatStatusForMd en scripts/backlogMdParser.ts para preservar 'ideas' como estado canonico de primera clase
- [x] #2 Incorporar 'ideas' en los enums de esquema de mutacion de scripts/mcp-server.ts (update, create y bulk_update)
- [x] #3 Actualizar SprintView.tsx y KanbanBoard.tsx para soportar y seleccionar 'ideas' sin degradaciones visuales
- [x] #4 Eliminar la inyeccion de sprint en milestone en scripts/mcp-server.ts para alinear gripm_sync_backlog con el CLI export
- [x] #5 Preservar el estado limpio de BACKLOG.md en scripts/verify-mcp-binary.js para que npm test no ensucie el arbol de trabajo
- [x] #6 Recompilar binarios con build-binaries.js y validar suite completa (tsc, npm test, backlog:check) en verde

---

#### [DEV-161] Corte Limpio de Identidad: Eliminar Alias de Marca Previos al Rebranding (gripm)
- **Prioridad**: `high` | **Tipo**: `chore`

Eliminar la superficie de compatibilidad hacia atrás de los nombres previos al rebranding (`devboard`, `dev-board`), **conservando la compatibilidad de lectura** de datos legacy.

### Contexto: por qué ahora

El rebranding de DevBoard a gripm construyó alias retrocompatibles bajo el supuesto de que existirían usuarios heredados que migrar. Ese supuesto **no se sostiene para el lanzamiento público**: el repositorio público es un proyecto nuevo, sin usuarios externos, y el único conjunto de consumidores real son los proyectos del propio autor.

Un alias público no es código descartable: es un **contrato que ya no puede quitarse** sin romper a alguien, y que obliga a documentarlo en cada README, CONTRIBUTING, issue y respuesta de soporte. Mantenerlo sin usuarios que migren es deuda pura.

Este es el mismo análisis que ya quedó registrado en `BACKLOG.md:3117` al decidir la bifurcación de repositorio, y que nunca se ejecutó sobre el código.

### Qué se elimina (identidad instalada — lo que el usuario ve y escribe)

1. **Entradas `bin` redundantes en `package.json`.** Hoy hay seis: `gripm`, `gripm-mcp`, `devboard`, `devboard-mcp`, `dev-board`, `dev-board-mcp`. Solo deben sobrevivir las dos canónicas.
2. **Alias de herramientas MCP.** `scripts/mcp-server.ts:442` normaliza `devboard_*` → `gripm_*` en la entrada. Eliminar esa línea.
3. **Skill duplicado `.agents/skills/devboard/`.** `--init` instala hoy dos directorios de skills: el canónico `gripm/` y un alias `devboard/`. Es el **único punto donde la marca vieja se propaga activamente** al repositorio del consumidor.
4. **Shims de binarios `bin/devboard.js` y `bin/devboard-mcp.js`**, y su generación en `scripts/build-binaries.js`.
5. **Fallbacks `devboard 2>/dev/null ||` en los scripts scaffoldeados** por `scripts/initScaffold.js`.
6. **Menciones del nombre anterior en documentación** (README, README.es, CONTRIBUTING, AGENTS, docs, templates de skills), reemplazadas por el nombre canónico o por formulación neutra.

### Qué se conserva (compatibilidad de lectura — invisible y protectora)

**No tocar** las lecturas de rutas legacy. Son costo cero (el nombre no se muestra al usuario) y valor real: Protegen los proyectos locales del autor que aún tengan datos en directorios anteriores.

- `vite.config.ts`: resolución de `.devboard/config.json` y `.devboard/backlog.json` (líneas ~140, ~220, ~231, ~255, ~1113, ~1892).
- Migración automática `.devboard/config.json` → `.gripm/config.json` en `vite.config.ts`.
- Detección de `.devboard/` como repo con backlog al inicializar.

> [!NOTE]
> La distinción es: **eliminamos la marca vieja como identidad pública y la conservamos como formato de lectura.** Quien tenga datos legacy los conserva; quien instale el producto solo conoce `gripm`.

### Caso particular: el alias MCP

Merece justificación propia porque es el más costoso y el menos útil.

- **No se anuncia.** `tools/list` expone únicamente las 12 herramientas `gripm_*`. Ningún agente puede descubrir que el alias existe.
- **Pero sí funciona.** `scripts/verify-mcp-binary.js` lo valida explícitamente (`✅ [6/6] Alias retrocompatible devboard_get_stats OK`).

Es decir: código que se mantiene y tests que lo cubren, a cambio de **cero beneficio descubrible**. Y si se anunciara, el costo sería peor: el catálogo pasaría de **12 a 24 herramientas**, duplicando el contexto de schemas que cada agente LLM carga en cada sesión — exactamente lo contrario del objetivo de eficiencia con agentes que declara el producto.

### Impacto esperado

- Bundle de binarios distribuido: se eliminan dos shims redundantes.
- Superficie pública de nombres: de 6 bins a 2.
- `.agents/skills/` instalado por `--init`: de 2 directorios a 1.
- Sin impacto funcional: no hay usuarios externos que migren.

**Criterios de Aceptación:**
- [x] #1 `node -e "console.log(Object.keys(require('./package.json').bin).join(' '))"` devuelve exactamente `gripm gripm-mcp` (verificación: el comando debe imprimir solo esos dos, sin `devboard`, `devboard-mcp`, `dev-board` ni `dev-board-mcp`)
- [x] #2 `ls bin/` NO lista `devboard.js` ni `devboard-mcp.js`, y `scripts/build-binaries.js` ya no los genera
- [x] #3 `grep -n "replace(/^devboard_" scripts/mcp-server.ts` no devuelve ninguna coincidencia (el alias de normalización fue eliminado)
- [x] #4 `grep -c "name: 'devboard_" scripts/mcp-server.ts` devuelve `0`, y `grep -c "name: 'gripm_" scripts/mcp-server.ts` devuelve `12` (el catálogo canónico queda intacto)
- [x] #5 `scripts/verify-mcp-binary.js` actualizado para dejar de validar el alias `devboard_*` y sigue validando en verde las 12 herramientas `gripm_*`
- [x] #6 `scripts/initScaffold.js` instala **solo** `.agents/skills/gripm/` en el repositorio destino; el directorio `.agents/skills/devboard/` del paquete fue eliminado y su lectura como fallback removida del código
- [x] #7 `grep -rn "devboard 2>/dev/null" scripts/initScaffold.js` devuelve `0` (sin fallbacks de nombre antiguo en los scripts scaffoldeados)
- [x] #8 Las rutas legacy de **lectura** siguen intactas: `grep -c "\.devboard" vite.config.ts` devuelve un valor `>= 6` (verificación negativa explícita: NO se deben borrar las resoluciones de `.devboard/config.json` ni `.devboard/backlog.json`)
- [x] #9 `npm run backlog:sync` tras la tarea y `npm run backlog:check` en verde
- [x] #10 `npx tsc --noEmit` con 0 errores
- [x] #11 `npm test` con exit 0 (suite completa de 9 scripts)
- [x] #12 `npm run publish:check` en verde
- [x] #13 `npm run build` sin errores y `node bin/gripm.js --help` ejecutable desde el tarball
- [x] #14 `grep -rniE "devboard|dev-board" README.md README.es.md CONTRIBUTING.md AGENTS.md docs/*.md .github/` devuelve únicamente coincidencias justificadas por la compatibilidad de lectura o por historia de releases, sin alias prescriptivos en la documentación de usuario

---

#### [DEV-162] Consolidación de Fuente Única de Estados useStatusMeta y Erradicación de Mapas Hardcodeados
- **Prioridad**: `high` | **Tipo**: `refactor`

Consolidar una fuente única de verdad para el consumo de metadatos y traducción de estados (`useStatusMeta`), eliminando los mapas de estados divergentes hardcodeados en cliente (`SprintView.tsx`, `KanbanBoard.tsx`, `ItemCard.tsx`).

### Problema

1. **Mapas duplicados y divergentes a nivel de módulo:**
   - `SprintView.tsx` definía `statusLabels: Record<ItemStatus, { label: string; color: string }>` con `dismissed: 'Descartado'` y `cancelled: 'Cancelado'`.
   - `KanbanBoard.tsx` definía y exportaba `STATUS_META: Record<string, { label, dot, bg, border }>` con `dismissed: 'Descartado'` y `cancelled: 'Cancelado'`.
   - `ItemCard.tsx` definía `statusLabels: Record<string, string>` en inglés puro, con `ideas: 'Ideas (Discovery)'`.
2. **Fugas de idioma (Language Leakage):**
   - En la interfaz en inglés, `SprintView` y `KanbanBoard` renderizaban 'Descartado' y 'Cancelado' en español.
   - En la interfaz en español, `ItemCard` renderizaba 'Draft', 'Doing', 'Review', 'Ready', 'Done' en inglés dentro del menú contextual de cambio de estado.
3. **Inconsistencia de nomenclatura:**
   - La etiqueta para `ideas` divergía entre `'Ideas'` (en Kanban y Sprint) e `'Ideas (Discovery)'` (en ItemCard y diccionario).

### Solución

1. Crear `src/utils/statusMeta.ts` exponiendo `useStatusMeta()` y `getStatusMeta(status, t)` conectado a `useTranslation()` y a las 8 claves canónicas `status.*`.
2. Unificar la normalización de estados legacy (`backlog` → `draft`, `in_progress` → `doing`, `testing_qa` → `review`, `finish` → `ready`).
3. Reemplazar los 3 mapas locales en `SprintView.tsx`, `KanbanBoard.tsx` e `ItemCard.tsx` por el consumo unificado de `useStatusMeta()`.
4. Unificar en diccionarios `src/locales/en.json` y `src/locales/es.json` la clave `status.ideas` a `"Ideas"`.

**Criterios de Aceptación:**
- [x] #1 Crear hook y utilidad `src/utils/statusMeta.ts` con normalización legacy y soporte para los 8 estados canónicos
- [x] #2 Unificar clave `status.ideas` a `"Ideas"` en `src/locales/en.json` y `src/locales/es.json`
- [x] #3 Refactorizar `src/components/SprintView.tsx` eliminando `statusLabels` y consumiendo `useStatusMeta()`
- [x] #4 Refactorizar `src/components/KanbanBoard.tsx` eliminando `STATUS_META` y consumiendo `useStatusMeta()`
- [x] #5 Refactorizar `src/components/ItemCard.tsx` eliminando `statusLabels` y consumiendo `useStatusMeta()`
- [x] #6 Cero ocurrencias de mapas hardcodeados de etiquetas de estados en componentes clientes
- [x] #7 Verificación ejecutable de no-regresión: `npx tsc --noEmit` y `npm test` en verde

---

#### [DEV-163] Pulido Final de Marca gripm-cli y Gobernanza Canónica de Tabs
- **Prioridad**: `high` | **Tipo**: `chore`

Cierre de los dos últimos residuos identificados en la auditoría final de lanzamiento (Rev 4 de `docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

1. **Renombrar `scripts/devboard-cli.ts` a `scripts/gripm-cli.ts`:**
   - Actualizar el banner y texto de ayuda en `printUsage()` para decir `📋 gripm CLI - Gestión, Auditoría y Mutaciones de Backlog` y `gripm [comando]`.
   - Actualizar las referencias en `package.json` (`scripts.tasks`), `scripts/verify-backlog-sync.js` y `scripts/verify-resilience-and-cli.js`.
2. **Gobernanza Canónica de Tabs en `.gripm/config.json`:**
   - Restaurar `"sprint": true` dentro de `enabledTabs` en `.gripm/config.json` para que los clones públicos del repositorio no nazcan con pestañas de primer orden artificialmente desactivadas.
   - Actualizar la regla de gobernanza #17 en `AGENTS.md` para cubrir explícitamente `enabledTabs`.

**Criterios de Aceptación:**
- [x] #1 Renombrar `scripts/devboard-cli.ts` a `scripts/gripm-cli.ts` y actualizar referencias en `package.json`, `verify-backlog-sync.js` y `verify-resilience-and-cli.js`
- [x] #2 Actualizar banner de `printUsage()` en `scripts/gripm-cli.ts` a "📋 gripm CLI" y "gripm [comando]"
- [x] #3 Restaurar `enabledTabs.sprint: true` en `.gripm/config.json`
- [x] #4 Explicitar `enabledTabs` en la Regla 17 de `AGENTS.md`
- [x] #5 Pirámide de verificación en verde (`tsc`, `npm test`, `npm run backlog:check`, `npm run publish:check`, `npm run build`)

---

#### [DEV-166] Implementación de Baseline en audit:ux para Detección de Regresiones en CI
- **Prioridad**: `low` | **Tipo**: `chore`

El auditor estático de ergonomía y UX `npm run audit:ux` (`scripts/audit-ux-code.cjs`) analiza el código fuente en busca de problemas de touch targets, colisiones de scroll y legibilidad.

### Diagnóstico de Causa Raíz

Actualmente el paso en CI produce:
`Resumen: 0 errores, 0 advertencias, 313 sugerencias.`
La gran mayoría de estas 313 sugerencias corresponden a micro-tipografías deliberadas (`text-[10px]` y `text-[11px]`) utilizadas en badges, metadatos y vistas de densidad compacta.

### Problema

El pipeline de integración continua (`.github/workflows/ci.yml`) ejecuta `npm run audit:ux`. Al emitir sistemáticamente más de 300 observaciones y finalizar siempre con código 0, la herramienta pierde su valor informativo: acostumbra al equipo a ignorar la salida y sepulta posibles regresiones reales introducidas en PRs entre cientos de líneas de ruido.

### Objetivo

Implementar un mecanismo de baselining para `scripts/audit-ux-code.cjs`:
1. Permitir registrar o cargar un baseline de observaciones conocidas y aceptadas (ej. `scripts/audit-ux-baseline.json`).
2. En ejecución estándar (CI y local), comparar los hallazgos contra el baseline y reportar únicamente las diferencias (nuevas violaciones).
3. Proveer una bandera CLI `--update-baseline` para renovar deliberadamente el snapshot cuando se agreguen o modifiquen componentes intencionalmente.
4. Convertir el linter en un gate de calidad estricto que alerte ante regresiones genuinas sin requerir silenciadores manuales invasivos en cada línea.

**Criterios de Aceptación:**
- [x] #1 Diseñar el formato de snapshot y persistencia de baseline para `scripts/audit-ux-code.cjs`
- [x] #2 Implementar la opción `--update-baseline` para capturar el conjunto actual de 313 observaciones
- [x] #3 En ejecución normal sin argumentos, `npm run audit:ux` debe reportar 0 observaciones no baselineadas y terminar con código 0
- [x] #4 Si se introduce una regresión no catalogada en el baseline, el script debe reportarla con precisión de archivo y línea
- [x] #5 La suite completa `npm test` y el workflow de CI ejecutan limpiamente sin advertencias espurias

---

#### [DEV-168] Migración de Claves de localStorage a Prefijo Canónico gripm con Retrocompatibilidad
- **Prioridad**: `low` | **Tipo**: `chore`

En `src/App.tsx`, varias claves persistidas en el almacenamiento local del navegador (`localStorage`) continúan utilizando prefijos heredados de la marca previa:
- `devboard-theme`
- `devboard_active_tab`
- `devboard_kanban_show_ideas`
- `devboard_active_project_id`

### Diagnóstico de Causa Raíz

Durante la fase de rebranding (DEV-161), se priorizó limpiar la identidad pública, los binarios CLI y la documentación, preservando intencionalmente la compatibilidad para evitar resetear las preferencias de desarrolladores que ya usaban la herramienta.

### Problema

Seguir escribiendo valores nuevos con prefijos `devboard_*` es un residuo de deuda técnica: nuevos usuarios terminan con claves obsoletas en su navegador y el código conserva referencias discordantes con el nombre `gripm`.

### Objetivo

Crear un módulo unificado de persistencia local (`src/utils/storage.ts`) que adopte el prefijo canónico `gripm_*`:
1. **Escritura canónica:** Todas las escrituras deben guardarse bajo el nuevo prefijo (ej. `gripm_theme`, `gripm_active_tab`, `gripm_kanban_show_ideas`, `gripm_active_project_id`).
2. **Lectura resiliente con auto-migración:** Al solicitar una clave, se consulta la nueva clave canónica; si no existe, se busca la clave legacy `devboard_*` y, de encontrarse, se migra de forma transparente escribiéndola en la nueva clave.
3. Preservar intacta la experiencia de usuario y sus preferencias de interfaz sin provocar pérdida de estado.

**Criterios de Aceptación:**
- [x] #1 Diseñar e implementar utilitario de almacenamiento seguro `src/utils/storage.ts` con fallback y auto-migración de claves
- [x] #2 Reemplazar accesos directos a `localStorage` en `src/App.tsx` por el nuevo utilitario canónico
- [x] #3 Las nuevas escrituras se realizan exclusivamente bajo las claves `gripm_*`
- [x] #4 Usuarios con claves existentes `devboard_*` conservan sus ajustes sin interrupción
- [x] #5 `npx tsc --noEmit` y `npm test` pasan íntegros con código de salida 0

---

#### [DEV-169] Unificar el Bind de Red con la Allowlist Anti-DNS-Rebinding: el servidor escucha solo en IPv6
- **Prioridad**: `medium` | **Tipo**: `bug`

El servidor HTTP embebido enlaza a un único host, pero el middleware anti-DNS-rebinding acepta un conjunto de hosts loopback más amplio que el que realmente está escuchando. El resultado es que una URL que la política de seguridad considera válida puede ser rechazada a nivel de conexión.

### Evidencia (verificada sobre `6a50230`, macOS)

```
$ lsof -nP -iTCP:4178 -sTCP:LISTEN
node    38378   ...   IPv6  0x5ed9abc27bf44872   TCP [::1]:4178 (LISTEN)   ← único listener

$ curl -o /dev/null -w "%{http_code}" http://localhost:4178/    → 200
$ curl -o /dev/null -w "%{http_code}" http://[::1]:4178/        → 200
$ curl -o /dev/null -w "%{http_code}" http://127.0.0.1:4178/    → 000  (connection refused)
```

### Causa raíz

`bin/gripm.js:104` defaultea `host = 'localhost'` y lo pasa directamente a Vite. Node resuelve `localhost` según la plataforma: en macOS resuelve a `::1` primero, por lo que el bind queda restringido a IPv6.

Mientras tanto, la política de hosts permitidos en `vite.config.ts:1159` (y la de origins en `:1175`) incluye:

```js
['localhost', '127.0.0.1', '::1', '[::1]']
```

Es decir: **la allowlist de seguridad es más amplia que el bind real**. El código acepta `127.0.0.1` como loopback legítimo en el header `Host`, pero no hay nada escuchando en esa familia de direcciones.

### Impacto

- **No rompe el flujo documentado**: el README indica `http://localhost:4100`, que funciona porque el navegador resuelve `localhost` a `::1` en macOS y a `127.0.0.1` en la mayoría de Linux/Windows.
- **Sí produce fallas cruzadas**: cualquier herramienta, script o documentation que apunte explícitamente a `127.0.0.1:4100` recibe connection refused en plataformas donde `localhost` resuelve a IPv6.
- La inconsistencia es una latente de seguridad: si en el futuro se agrega una ruta que confíe en la allowlist sin considerar el bind, la suposición sería falsa.

### Objetivo

Que el bind real coincida con la allowlist de loopback, sin abrir exposição de red no intencional ni romper la advertencia de seguridad existente para `0.0.0.0`.

**Criterios de Aceptación:**
- [x] #1 `grep -n "let host" bin/gripm.js` devuelve una línea cuyo default resuelve a una dirección que cubre explícitamente el loopback IPv4 (`127.0.0.1`) y no a `localhost`
- [x] #2 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" http://localhost:<puerto>/` devuelve `200` (no `000`)
- [x] #3 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" http://127.0.0.1:<puerto>/` devuelve `200` (no `000`) — este es el AC que hoy falla
- [x] #4 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" "http://[::1]:<puerto>/"` devuelve `200` o, si la decisión es hacer bind solo IPv4, la allowlist de `vite.config.ts:1159` y `:1175` se reduce a los hosts realmente escuchados
- [x] #5 La advertencia de seguridad de `bin/gripm.js:110-112` para `--host 0.0.0.0` se conserva sin cambios
- [x] #6 El middleware anti-DNS-rebinding sigue rechazando un header `Host` no loopback: un request con `Host: evil.example.com` recibe rechazo
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0

---

#### [DEV-170] Alinear el Idioma por Defecto de --init con la Configuración Canónica OSS
- **Prioridad**: `low` | **Tipo**: `chore`

El scaffolder `--init` tiene `es` como idioma por defecto, mientras que la configuración canónica OSS declarada en `AGENTS.md` §6.17 fija `en`. Un proyecto nuevo inicializado en modo no interactivo queda con configuración, skill y onboarding en español.

### Evidencia (verificada sobre `6a50230`, tarball instalado)

```
$ gripm --init -y
  ✅ Skill para agentes instalada en .agents/skills/gripm/SKILL.md (es)
  ✅ Guía de gobernanza generada en AGENTS.md (es)
  [banner de bienvenida íntegramente en español]

$ cat .gripm/config.json
  "language": "es"
```

### Causa raíz

Dos lugares fijan español:

1. **`scripts/initScaffold.js:58`** — default del modo no interactivo:
   ```js
   let language = (options.language || options.lang || 'es').toLowerCase();
   ```
   Con `-y` no se pregunta, así que siempre cae en `'es'`.

2. **`scripts/initScaffold.js:90`** — la opción por defecto del prompt interactivo es `[1]` (Español), y `scripts/initScaffold.js:14` y `:37` usan `language = 'es'` como default de las plantillas.

### Relación con la regla de gobernanza

`AGENTS.md` §6.17 declara la configuración canónica del **repositorio** con `"language": "en"`, y prohíbe preferencias personales. El repositorio cumple. Pero el **producto** contradice esa declaración en el momento de crear un proyecto nuevo: el primer artefacto que ve un usuario ajeno ya viene en español.

No es un bug funcional ni una contradicción con el gotcha (que gobierna el repo, no el scaffolding). Es una inconsistencia de posicionamiento: el README es bilingüe con inglés primero, y el primer output del producto es español.

### Objetivo

Que el idioma por defecto del scaffolding sea coherente con la configuración canónica OSS declarada, sin perder la capacidad de elegir español de forma explícita.

**Criterios de Aceptación:**
- [x] #1 `grep -n "options.language || options.lang" scripts/initScaffold.js` devuelve `'en'` como default en lugar de `'es'`
- [x] #2 `scripts/initScaffold.js:14` y `:37` usan `'en'` como default de `getSkillTemplate` y `getAgentsMdTemplate`
- [x] #3 El prompt interactivo de `scripts/initScaffold.js:90` ofrece English como opción por defecto (la que se aplica con Enter vacío)
- [x] #4 `gripm --init -y` en un repositorio limpio genera `.gripm/config.json` con `"language": "en"` (verificación: `grep '"language"' .gripm/config.json` devuelve `"en"`)
- [x] #5 `gripm --init -y --language es` sigue produciendo `"language": "es"`, skill y AGENTS.md en español — la override explícita se respeta
- [x] #6 `.gripm/config.json` del propio repositorio sigue cumpliendo `AGENTS.md` §6.17: `grep -E '"language"|"sprint"' .gripm/config.json` devuelve `"en"` y `"sprint": true`
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0

---

#### [DEV-171] El tarball npm no incluye `.agents/`: `gripm --init` instala stubs en vez de las plantillas canónicas
- **Prioridad**: `high` | **Tipo**: `bug`

El directorio `.agents/` no está declarado en el array `files` de `package.json`, por lo que **no viaja en el tarball de npm**. Los scaffolders `getSkillTemplate()` y `getAgentsMdTemplate()` de `scripts/initScaffold.js` resuelven sus rutas fuente contra `PKG_ROOT`, que en una instalación real no contiene ese directorio. Ante la ausencia, ambos caen a su fallback hardcodeado y escriben **stubs de una línea** en el repositorio del consumidor.

### Evidencia (verificada sobre `6a50230` + árbol de trabajo, instalación limpia)

```
$ node -e "require('./package.json').files.some(x=>x.includes('.agents'))"
false

$ tar -tzf gripm-1.0.0.tgz | grep -c "\.agents"
0
```

En un consumidor nuevo (`npm install gripm-1.0.0.tgz` → `gripm --init -y`):

| Artefacto | Tamaño esperado | Tamaño real |
| :--- | ---: | ---: |
| `.agents/skills/gripm/SKILL.md` | 2.425 B (en) / 13.896 B (es) | 🔴 **20 B** |
| `AGENTS.md` | 1.702 B (en) / 1.846 B (es) | 🔴 **80 B** |

Contenido literal instalado hoy:

```
# gripm Agent Skill
```

```
# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **demo**.
```

### Por qué es crítico

El README vende exactamente esta función:

> *"AI Agent Skill: Installs `.agents/skills/gripm/SKILL.md` so Cursor, Antigravity, and Claude Code know how to manage tasks."*

Después de `npx gripm --init`, el agente recibe una línea vacía y **no conoce ninguna de las 12 herramientas MCP**. El onboarding para agentes está silenciosamente roto para el 100 % de los consumidores, y el síntoma es invisible: el comando reporta éxito.

### Pre-existente, y no detectado por los guards

- **Pre-existente**: `files` nunca incluyó `.agents` (verificado contra `HEAD`). No es regresión de DEV-161/169/170.
- **`publish:check` no lo detecta**: el guard audita fugas de datos y rutas personales, no archivos faltantes. Pasó en verde.
- **DEV-161 pasó sus ACs igual**: el AC #6 ("`initScaffold.js` instala solo `.agents/skills/gripm/`") se verificó contra el repo fuente, donde el archivo existe — no contra el tarball. Es la misma clase de fallo que el guard de DEV-159: **una aserción ejecutada contra la realidad equivocada**.

### Ítem secundario en la misma causa raíz

`.githooks/` tampoco está en `files`. El script `prepare` de `package.json` ejecuta `git config core.hooksPath .githooks`, dejando el repo del consumidor apuntando a un directorio inexistente.

`CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` y `CODE_OF_CONDUCT.md` tampoco viajan, pero no son necesarios en runtime y **no forman parte de este ítem**.

### Objetivo

Que el tarball contenga los artefactos que el producto promete instalar, y que la ausencia de cualquiera de ellos falle de forma visible en lugar de degradar en silencio.

**Criterios de Aceptación:**
- [x] #1 `node -e "const f=require('./package.json').files; console.log(f.includes('.agents'), f.includes('.githooks'))"` devuelve `true true`
- [x] #2 Tras `npm run build`, `tar -tzf <tarball> | grep -c "\.agents/skills/gripm/SKILL"` devuelve un valor `>= 2` (SKILL.md y SKILL.en.md)
- [x] #3 `tar -tzf <tarball> | grep -c "\.githooks/pre-commit"` devuelve `1`
- [x] #4 Instalando el tarball en un directorio temporal y ejecutando `gripm --init -y`, `wc -c <repo>/.agents/skills/gripm/SKILL.md` devuelve un valor `>= 1000` — este es el AC que hoy falla con 20
- [x] #5 En esa misma instalación, `wc -c <repo>/AGENTS.md` devuelve un valor `>= 1000` y **no** contiene la cadena `Bienvenido a` de los stubs
- [x] #6 Con `--language en` el `SKILL.md` instalado es el contenido de `.agents/skills/gripm/SKILL.en.md`; con `--language es` es el de `SKILL.md` — verificación por contenido, no por nombre de archivo (el scaffolder siempre escribe en `SKILL.md`)
- [x] #7 `npm run publish:check` falla si `.agents` o `.githooks` desaparecen del array `files`, en lugar de pasar en verde
- [x] #8 Existe un script de verificación de distribución (p. ej. `npm run verify:dist`) que empaqueta, instala en un directorio temporal efímero y valida los artefactos de onboarding, y está conectado a `npm test`
- [x] #9 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0 y `npm run build` sin errores

---

#### [DEV-173] Auditoría de Accesibilidad del Cockpit: Foco, Navegación por Teclado y Contraste
- **Prioridad**: `high` | **Tipo**: `chore`

La accesibilidad del producto nunca fue auditada. `npm run audit:ux` es un análisis estático que reporta 313 sugerencias de clases Tailwind arbitrarias (`text-[10px]`, `text-[11px]`) y 0 errores de accesibilidad — **no es un análisis de accesibilidad**. Ninguna otra herramienta del repositorio cubre foco, teclado ni contraste.

### El proyecto ya tiene la herramienta y no la usó

`.agents/skills/code-level-ux-auditor/` está instalado en el repo y audita anti-patrones de UX móvil, colisiones de gestos, scroll, teclado virtual y jank de render. Está orientado a móvil, pero cubre varias de las categorías que importan acá. Nunca se ejecutó como auditoría del codebase.

### Superficie de riesgo

El producto es una interfaz densa: tablero Kanban con drag-and-drop, reordenamiento, filtros, tarjetas, y al menos 5 modales (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`, `SettingsView`). Los tres modos de fallo con mayor probabilidad en esta clase de producto son:

1. **Focus trap y retorno de foco en modales.** Un modal que no atrapa el foco deja al usuario de teclado tabulando detrás del overlay; un modal que no devuelve el foco al disparador pierde el contexto al cerrarse.
2. **Navegación por teclado en el Kanban.** Si el reordenamiento y el cambio de estado solo responden a drag-and-drop o click, el producto es inutilizable sin mouse — y `AGENTS.md` §6.16 declara launningham de flujo Kanban como metodología central.
3. **Contraste de los badges de estado.** `src/utils/statusMeta.ts` define clases de color con variantes `dark:` y sin variants. Los badges de 6 estados en dos temas son el texto más pequeño de la pantalla.

### Objetivo

Convertir la accesibilidad de supuesto en verificado: ejecutarla, corregir lo que se encuentre, y decidir si queda incorporateda al gate de CI o es una tarea recurrente de release.

**Criterios de Aceptación:**
- [x] #1 Existe en `backlog/retros/` o en una nota de tarea el resultado de una ejecución real del skill `code-level-ux-auditor` sobre `src/`, con los hallazgos listados — la tarea no se cierra sin evidencia de ejecución
- [x] #2 Cada modal (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`) atrapa el foco mientras está abierto, y devuelve el foco al elemento disparador al cerrarse (verificable por navegación de teclado completa con `Tab`, `Shift+Tab` y `Escape`)
- [x] #3 El cambio de estado de un ítem en el Kanban y la reordenación son alcanzables por teclado, no solo por drag-and-drop
- [x] #4 Todos los controles interactivos son alcanzables por teclado; ninguno requiere puntero
- [x] #5 Los badges de estado de `src/utils/statusMeta.ts` alcanzan una relación de contraste mínima de 4.5:1 en texto pequeño, en tema claro **y** oscuro — el valor se registra en la nota de la tarea
- [x] #6 Todo elemento con `onClick` y sin rol semántico expone `role`, `tabIndex` y handler de teclado, o se convierte en `<button>` nativo
- [x] #7 Existe `prefers-reduced-motion` respetado en las animaciones existentes (splash, transiciones de tema, dots de estado)
- [x] #8 La decisión queda registrada: la accesibilidad se incorpora como paso de `npm run audit:ux` y CI, o se declara como tarea recurrente de release con la razón
- [x] #9 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0

---

#### [DEV-174] Matriz de CI: Múltiples Sistemas Operativos y la Versión Mínima de Node Declarada
- **Prioridad**: `medium` | **Tipo**: `chore`

CI corre en un solo sistema operativo y contra una versión de Node flotante que no es la mínima declarada como soportada.

### Evidencia (verificada sobre `6a50230`)

```yaml
# .github/workflows/ci.yml
runs-on: ubuntu-latest          # un solo SO
node-version: '22.x'            # flotante: "la última 22.x"
```

Frente a lo declarado por el propio proyecto:

```
.nvmrc                → 22.6.0
package.json engines  → node >=22.6.0
```

### Dos consecuencias concretas

**1. La versión mínima soportada nunca se testea.** CI corre `22.x`, que es la última 22.x disponible, no `22.6.0`. Una regresión que rompa en la mínima — por ejemplo, usando una API o sintaxis disponible recién en una 22.x posterior — pasaría la suite en verde mientras el producto declara soportar algo que no funciona.

**2. Solo se verifica un SO, y ya hay un bug que lo demuestra.** El bug de bind de red registrado en DEV-169 (el servidor escuchaba solo en IPv6, por lo que `127.0.0.1` daba connection refused) fue encontrado probando manualmente en macOS. Windows y Linux nunca fueron ejercitados en CI. En un lanzamiento público, los issues de otros sistemas operativos son la primera fuente de reportes.

### Objetivo

Que CI verifique lo que el proyecto dice soportar, y que la matriz sirva de detector temprano de problemas de portabilidad.

**Criterios de Aceptación:**
- [x] #1 `.github/workflows/ci.yml` declara `strategy.matrix.os` con `ubuntu-latest`, `macos-latest` y `windows-latest`
- [x] #2 `.github/workflows/ci.yml` declara `strategy.matrix.node-version` que **incluye explícitamente `22.6.0`**, el valor de `.nvmrc` y el mínimo de `engines.node`
- [x] #3 Los pasos sensibles a plataforma están resueltos de forma agnóstica (`prepare` en `package.json` migrado a `node scripts/prepare-hooks.js` sin redirección shell POSIX `/dev/null`)
- [x] #4 La matriz declara `strategy.fail-fast: false` para que un runner fallido no cancele los demás jobs
- [x] #5 `timeout-minutes` se ajusta a 15 minutos para acomodar la ejecución paralela
- [x] #6 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0

---

#### [DEV-175] Automatizar Actualizaciones de Dependencias con Dependabot
- **Prioridad**: `low` | **Tipo**: `chore`

El repositorio no tiene `.github/dependabot.yml`. Un proyecto con 8 dependencias de runtime y 4 de desarrollo, en un tarball que se distribuye globalmente, queda de mantenimiento manual.

### Evidencia (verificada sobre `6a50230`)

```
$ test -f .github/dependabot.yml
NO

$ find .github -type f
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/config.yml
.github/ISSUE_TEMPLATE/feature_request.yml
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
```

### Superficie de dependencia

| Paquete | Tipo | Rol |
| :--- | :--- | :--- |
| `vite` | runtime | servidor embebido (`bin/gripm.js:212`) |
| `react`, `react-dom` | runtime | render de la interfaz |
| `lucide-react` | runtime | iconografía (45 MB en disco, verificado) |
| `tailwindcss`, `postcss`, `autoprefixer`, `@vitejs/plugin-react` | runtime | plugins cargados al leer `vite.config.ts` |
| `typescript`, `@types/*` | dev | toolchain |

### Riesgo específico de este proyecto

`SECURITY.md` describe un producto que **ejecuta binarios con permisos del usuario y escribe en su disco**. Una vulnerabilidad transitiva en `vite` —que es el servidor HTTP que corre en cada sesión— es un vector de ataque real, no teórico. `vite` es la dependencia más expuesto del stack.

### Objetivo

Que las actualizaciones de seguridad se apliquen de forma automática y visible, y que las de Features queden agrupadas para revisión manual.

**Criterios de Aceptación:**
- [x] #1 `.github/dependabot.yml` existe con el ecosistema `npm` y un calendario semanal
- [x] #2 Cubre tanto `dependencies` como `devDependencies` (directorio `/`)
- [x] #3 Declara una separación entre actualizaciones de seguridad (`open-pull-requests-limit` alto, agrupadas con label) y de features (agrupadas por menoría, con label distinta)
- [x] #4 Existe una etiqueta aplicada a los PRs de seguridad para que `SECURITY.md` pueda referenciar el canal
- [x] #5 Configuración lista para activación automática del primer ciclo en GitHub al publicarse el repositorio
- [x] #6 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0

---

#### [DEV-176] Adopción del Término Tablero en Español y Sustitución de Cockpit en UI y CLI
- **Prioridad**: `medium` | **Tipo**: `chore`

En la versión en español, la interfaz y los scripts utilizaban el término anglosajón 'cockpit', el cual resulta forzado, poco intuitivo y distante para los desarrolladores hispanohablantes.

Tras la deliberación de identidad y narrativa del producto, se adopta de forma canónica el término **'tablero'** (y **'tablero ágil'** cuando califica al sistema), por ser una definición directa, transparente, alineada con la cultura de ingeniería y perfectamente coherente con el comando nativo del CLI (`npm run board`).

### Cambios a realizar:
1. **Internacionalización en UI:**
   - Incorporar claves `app.badge` y `settings.systemTitle` en diccionarios `src/locales/es.json` y `en.json`.
   - En `src/App.tsx`, reemplazar el badge hardcodeado 'cockpit' por `t('app.badge')` ('tablero' en español, 'board' en inglés).
   - En `src/components/SettingsView.tsx`, reemplazar `<span>gripm Cockpit</span>` por `<span>{t('settings.systemTitle')}</span>`.
2. **Splash HTML estático:**
   - En `index.html`, actualizar el badge a 'tablero' y el texto a 'Iniciando tablero ágil...'.
3. **Banners y mensajes CLI:**
   - En `bin/gripm.js`, actualizar el banner de arranque a 'Tablero Ágil de Ingeniería y Producto con IA'.
   - En `scripts/initScaffold.js`, actualizar la instrucción a 'Para abrir el tablero:'.
4. **Documentación en Español:**
   - En `README.es.md` y `docs/ARCHITECTURE.md`, sustituir referencias no intencionadas de 'cockpit' por 'tablero' o 'tablero ágil'.

**Criterios de Aceptación:**
- [x] #1 `src/locales/es.json` y `src/locales/en.json` exponen `app.badge` ("tablero" / "board") y `settings.systemTitle` ("gripm Tablero" / "gripm Board")
- [x] #2 `src/App.tsx` utiliza `t('app.badge')` en el badge de carga de la aplicación en lugar del literal hardcodeado 'cockpit'
- [x] #3 `src/components/SettingsView.tsx` renderiza `t('settings.systemTitle')` en la tarjeta de información del sistema en lugar del literal 'gripm Cockpit'
- [x] #4 `index.html` muestra 'tablero' y 'Iniciando tablero ágil...' en el splash inicial HTML estático
- [x] #5 `bin/gripm.js` y `scripts/initScaffold.js` utilizan 'Tablero Ágil' y 'Para abrir el tablero:' en sus salidas en español
- [x] #6 `README.es.md` y `docs/ARCHITECTURE.md` sustituyen 'cockpit' por 'tablero' / 'tablero ágil' en sus secciones en español
- [x] #7 `npx tsc --noEmit` compila con 0 errores, `npm test` pasa con exit 0, `npm run backlog:sync && npm run backlog:check` en verde y `npm run build` compila sin errores

---

#### [DEV-177] Priorizar Localhost en URL por Defecto de Vite y CLI Manteniendo Bind Loopback IPv4
- **Prioridad**: `medium` | **Tipo**: `enhancement`

En DEV-169 se unificó el enlace de red del servidor a la dirección loopback IPv4 (`127.0.0.1`) para garantizar compatibilidad con herramientas de línea de comandos (`curl`, scripts) y evitar que macOS limitara la escucha exclusivamente a IPv6 (`[::1]`).

Sin embargo, al establecer de forma estricta `host = '127.0.0.1'` en la configuración de Vite (`vite.config.ts`) y en el binario ejecutable (`bin/gripm.js`), tanto la salida por consola (`➜ Local: http://127.0.0.1:4100/`) como la URL abierta por defecto en el navegador pasaron a exponer la dirección IP numérica en lugar del nombre canónico `localhost`. Para usuarios finales y desarrolladores, las direcciones IP numéricas resultan menos amigables, más técnicas y menos estéticas que `localhost`.

Dado que los navegadores modernos y las pilas de red locales resuelven `localhost` de manera transparente y realizan fallback inmediato a `127.0.0.1` (o dual-stack), la solución óptima es:
1. Mantener el socket de escucha en `127.0.0.1` bajo el capó para preservar la compatibilidad probada en DEV-169.
2. Configurar la URL de apertura (`server.open`) y la URL informada en la consola de Vite (`server.resolvedUrls.local`) para que muestren por defecto `http://localhost:<puerto>/`.
3. Ajustar el banner ASCII y la apertura del navegador en `bin/gripm.js` para priorizar `localhost` cuando el host sea el loopback por defecto.
4. Preservar cualquier host personalizado cuando el usuario especifique explícitamente `--host` o `GRIPM_HOST` (por ejemplo `0.0.0.0` o una IP de red).

**Criterios de Aceptación:**
- [x] #1 En `vite.config.ts`, la URL configurada para apertura automática (`server.open`) utiliza `http://localhost:<puerto>/` cuando el host es el default loopback (`127.0.0.1`) y no está deshabilitada por CI o variables de entorno
- [x] #2 En el plugin de Vite de `vite.config.ts`, `server.listen` mapea `127.0.0.1` a `localhost` en `server.resolvedUrls.local` para que la salida de consola (`Local:`) y los atajos de teclado del CLI muestren `http://localhost:<puerto>/`
- [x] #3 En `bin/gripm.js`, el banner ASCII y la llamada a `openBrowser` muestran y abren `http://localhost:<puerto>` por defecto cuando se enlaza al loopback `127.0.0.1`
- [x] #4 Se conserva intacta la compatibilidad con hosts explícitos: si se define `--host 0.0.0.0` o `GRIPM_HOST=<otro>`, se respeta dicho valor sin forzar `localhost`
- [x] #5 Se preserva la compatibilidad de red de DEV-169: el servidor continúa enlazando a `127.0.0.1` a nivel socket, permitiendo que tanto `localhost` en navegador como `127.0.0.1` en herramientas locales reciban respuesta HTTP 200
- [x] #6 `npx tsc --noEmit` compila con 0 errores, `npm test` pasa con exit 0, `npm run backlog:sync && npm run backlog:check` en verde y `npm run build` compila sin errores

---

#### [DEV-179] Alineación de Playbook Upstream a gripm-playbook y Preservación de gripm como Repositorio Insignia
- **Prioridad**: `high` | **Tipo**: `improvement`

Alinear las referencias y automatizaciones de sincronización del Playbook tras su renombramiento canónico a `gripm-playbook` (`pablojavierrodriguez/gripm-playbook`), preservando a `gripm` como el repositorio insignia (*flagship*) único y unificado del ecosistema.

**Decisión de Arquitectura de Ecosistema:**
1. **`gripm` (este repositorio):** Es el producto estrella integral (*batteries-included*). Contiene el cockpit visual, motor Markdown, servidor MCP, CLI global y las skills canónicas del playbook ya integradas y sincronizadas. No requiere renombrarse a `gripm-board`, conservando la máxima simplicidad y peso de marca (`github.com/pablojavierrodriguez/gripm`).
2. **`gripm-playbook`:** Existe como repositorio desacoplado e independiente para usuarios y proyectos (Python, Go, Rust, etc.) que desean adoptar la metodología, roles y skills de agentes sin clonar ni depender del stack del cockpit.
3. **Sincronización:** Se actualiza el sincronizador (`scripts/sync-playbook.mjs`), la documentación (`docs/AGENTIC_PLAYBOOK.md`) y los badges del proyecto (`README.md`, `README.es.md`) para consumir desde el nuevo upstream `pablojavierrodriguez/gripm-playbook`.

**Criterios de Aceptación:**
- [x] #1 Actualizar DEFAULT_REMOTE en scripts/sync-playbook.mjs apuntando a pablojavierrodriguez/gripm-playbook
- [x] #2 Actualizar enlace a upstream en docs/AGENTIC_PLAYBOOK.md hacia pablojavierrodriguez/gripm-playbook
- [x] #3 Actualizar badges y referencias de metodología en README.md y README.es.md reflejando gripm-playbook
- [x] #4 Preservar la identidad canónica soberana de gripm como repositorio insignia (package.json, binarios, CI/CD) sin fragmentación innecesaria
- [x] #5 Verificar que la suite unificada de calidad (tsc, npm test, backlog:check, publish:check) pase con código 0

---

#### [DEV-181] Saneamiento P0 de Frontera OSS: Fugas en Skills, Contrato MCP y Endurecimiento de Seguridad
- **Prioridad**: `urgent` | **Tipo**: `bug`

Ejecutar el saneamiento integral de frontera pública identificado en la auditoría técnica de código abierto (`docs/informe-auditoria.md`):

1. **Fuga de contexto en Skills:** Eliminar residuos de proyectos privados (`YourApp`, `PermissionGate`, `People.tsx`, `MeetingDetailModal`, `Check-in QR`, `Ministerios y grupos`, etc.) y corregir tokens sintéticos inválidos (`'regional-locale'`) en `.agents/skills/`.
2. **Contrato de Herramientas MCP:** Corregir `.agents/skills/gripm/SKILL.md` para erradicar las llamadas `devboard_*` obsoletas y documentar con fidelidad las 12 herramientas canónicas `gripm_*`.
3. **Endurecimiento de Seguridad en API Local:** Contener `/api/fs/browse` dentro de rutas autorizadas (`os.homedir()`) y proteger el comportamiento de CORS/Host cuando se configura `0.0.0.0`.
4. **Higiene Documental:** Remover referencias a tooling eliminado (ESLint) y actualizar conteos de métricas del proyecto en los READMEs.

**Criterios de Aceptación:**
- [x] #1 Erradicar de .agents/skills/ todas las referencias a YourApp y componentes/contextos de proyectos privados, convirtiéndolas en plantillas universales
- [x] #2 Reemplazar en .agents/skills/ tokens sintéticos inválidos ('regional-locale') y clases CSS no declaradas
- [x] #3 Actualizar .agents/skills/gripm/SKILL.md reemplazando devboard_* por el catálogo canónico de 12 tools gripm_*
- [x] #4 Implementar contención en /api/fs/browse (vite.config.ts) validando que targetDir resida dentro de os.homedir() o rutas permitidas (403 Forbidden ante escapes)
- [x] #5 Endurecer reglas de seguridad cuando se usa host 0.0.0.0 sin deshabilitar protecciones de Host ni reflejar Origin indiscriminadamente
- [x] #6 Limpiar menciones de ESLint y actualizar conteos de tareas y sprints en README.md, README.es.md y CHANGELOG.md
- [x] #7 Validar que la pirámide completa de verificación (tsc, npm test, backlog:check, publish:check, build) pase con código 0

---

#### [DEV-182] Pipeline de Despliegue Continuo (CD): Automatización de npm publish con GitHub Actions y Provenance
- **Prioridad**: `medium` | **Tipo**: `improvement`

Configurar e implementar el workflow automatizado de despliegue continuo (CD) para la publicación en el registro público de npm (`@gripm/board` y `@gripm/playbook`) ante la creación de releases o tags en GitHub, eliminando la necesidad de publicación manual desde terminales locales.

**Puntos clave identificados en auditoría (R19):**
1. **Disparador:** Ejecución automática en eventos `release: [published]` o push de tags `v*`.
2. **Seguridad y Provenance:** Publicación con flag `--provenance` mediante permisos OIDC (`id-token: write`, `contents: read`).
3. **Validación previa:** Ejecutar `prepublishOnly` verificando build y `publish:check` sin fugas antes de publicar.

**Criterios de Aceptación:**
- [x] #1 Crear workflow .github/workflows/publish.yml en gripm con trigger de release/tag
- [x] #2 Configurar permisos OIDC id-token: write y contents: read para soporte de npm provenance
- [x] #3 Documentar en docs o README el uso del secret NPM_TOKEN o Trusted Publishing
- [x] #5 Validar que un dry-run de empaquetado y build ejecute exitosamente en CI antes del publish

---

#### [DEV-183] Higiene de Documentación Secundaria: Unificación de Logs Internos, Endpoints de Arquitectura y Metadata
- **Prioridad**: `low` | **Tipo**: `chore`

Ejecutar la limpieza y actualización de documentación técnica secundaria y residuos de logs internos identificados en el informe de auditoría técnica (R11):

1. **Logs y Fallbacks de UI:** Erradicar cadenas residuales `[DevBoard]` en `App.tsx` y fallbacks `|| 'dev-board'` en `ReleaseAssembler.tsx`.
2. **Endpoints en Arquitectura:** Corregir menciones obsoletas de endpoints en `docs/ARCHITECTURE.md` (`/api/backlog`, `/api/tasks` por los reales `/api/data`, `/api/items`).
3. **Métricas en Docs:** Sincronizar recuentos de herramientas MCP en `CONTRIBUTING.md` (12 tools) y tiempos reales de tests.
4. **Metadata de Repositorio:** Configurar topics de GitHub oficiales para gripm basados en las palabras clave del paquete.

**Criterios de Aceptación:**
- [x] #1 Erradicar prefijos de log residuales [DevBoard] en App.tsx reemplazando por [gripm]
- [x] #2 Actualizar fallbacks de proyecto en ReleaseAssembler.tsx
- [x] #3 Corregir la descripción de endpoints del servidor en docs/ARCHITECTURE.md
- [x] #4 Sincronizar catálogo de MCP tools y notas en CONTRIBUTING.md
- [x] #5 Verificar que la suite de tests y backlog:check pasen con código 0

---

#### [DEV-185] Corrección de Desacople Interactivo: Reemplazar node:readline por node:readline/promises en scripts/uninstall.js
- **Prioridad**: `high` | **Tipo**: `bug`

Al ejecutar `npx gripm --uninstall` (o `gripm --clean`) en una terminal interactiva (TTY), el proceso fallaba inmediatamente con:
`TypeError: Cannot read properties of undefined (reading 'trim')`.

**Causa Raíz:**
En `scripts/uninstall.js`, se importaba `node:readline` (basado en callbacks) en lugar de `node:readline/promises`. Por consiguiente, `await rl.question('')` evaluaba a `undefined`, provocando que la invocación `.trim()` fallara.

**Solución:**
1. Se migró la importación a `import readline from 'node:readline/promises';`.
2. Se añadieron salvaguardas defensivas para respuestas nulas `(rawAnswer || '').trim()`.
3. Se implementó la inyección opcional de streams (`input`, `output`, `interactive`) en `runUninstallCommand` para testeo automatizado de flujos interactivos.
4. Se extendió `scripts/verify-integration.js` con una prueba de integración interactiva que valida el ciclo interactivo completo de preguntas y respuestas sin regresiones.

**Criterios de Aceptación:**
- [x] #1 Importar node:readline/promises en scripts/uninstall.js para soportar llamadas async/await en rl.question
- [x] #2 Implementar manejo defensivo ante respuestas nulas al recortar con trim
- [x] #3 Soportar inyección de opciones de streams (input, output, interactive) en runUninstallCommand
- [x] #4 Agregar prueba de integración del flujo interactivo en scripts/verify-integration.js
- [x] #5 Validar que npm test y npm run backlog:check pasen con código 0

---

### 📦 Archivadas / Descartadas (2)

#### [DEV-119] Reescritura Quirúrgica del Historial Git para Eliminación de Datos Comprometedores
- **Prioridad**: `urgent` | **Tipo**: `bug`

Utilizar `git-filter-repo` para reescribir el historial de Git eliminando rutas absolutas personales y referencias a proyectos privados externos, sin perder información valiosa de commits.

> [!NOTE]
> **Descartada / Suprimida:** Se acordó conservar el repositorio `dev-board` como archivo histórico personal e inmutable privado, e inicializar un nuevo repositorio público limpio e independiente en GitHub (`pablojavierrodriguez/gripm`) con un único commit inicial consolidado en `v1.0.0`. Esta estrategia de bifurcación limpia elimina completamente la necesidad y los riesgos de reescritura destructiva de historial con `git-filter-repo`.

**Criterios de Aceptación:**
- [ ] #1 Instalar `git-filter-repo` en el sistema (`pip install git-filter-repo` o `brew install git-filter-repo`)
- [ ] #2 Crear archivo de expresiones de reemplazo que cubra: rutas absolutas `/Users/<usuario>/<ruta-personal>` → placeholder neutro, descripciones del proyecto DOM → `<redacted>`, sin tocar `pablojavierrodriguez` ni el nombre `Pablo`
- [ ] #3 Ejecutar `git filter-repo --replace-text expressions.txt` exitosamente sobre todo el historial local
- [ ] #4 Verificar con `git log --all -p | grep -c "/Users/<usuario>/<ruta-personal>` que retorna 0 ocurrencias
- [ ] #5 Verificar que los tags existentes (v0.2.0 a v0.6.1) se preservan correctamente post-rewrite
- [ ] #6 Verificar que `npm test` y `npx tsc --noEmit` pasan exitosamente post-rewrite
- [ ] #7 Documentar el comando exacto de `git push --force` que el usuario debe ejecutar para publicar al remote, con instrucciones de contexto claras

---

#### [DEV-156] Normalizacion Canonica de Slugs de Tareas en Backlog dev a DEV
- **Prioridad**: `medium` | **Tipo**: `chore`

Resolución del hallazgo §5.2 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

`AGENTS.md` §6.4 establece la regla canónica de nombres de archivos: `DEV-XXX - slug-descriptivo.md`. Actualmente, 101 de las 150 tareas históricas en `backlog/tasks/` tienen formato en minúsculas `dev-0XX - ...`, lo cual genera inconsistencia en el repositorio y contradice las normas operativas escritas.

Se deben normalizar los nombres de los 101 archivos preservando su frontmatter, sus criterios de aceptación y actualizando de forma transparente y determinista `BACKLOG.md` mediante `npm run backlog:sync`.

**Criterios de Aceptación:**
- [ ] #1 Todos los archivos en `backlog/tasks/` siguen el patrón estricto `DEV-XXX - ...md` (0 archivos con prefijo en minúscula `dev-`)
- [ ] #2 `npm run backlog:sync` y `npm run backlog:check` finalizan con código 0
- [ ] #3 `npx tsc --noEmit` y `npm test` verifican que no haya rutas relativas rotas en tests o scripts

---
