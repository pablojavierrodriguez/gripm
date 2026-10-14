---
id: DEV-222
title: "Modo Sandbox interactivo y deploy público en Vercel con dataset en memoria"
status: ready
created_date: '2026-10-09'
updated_date: '2026-10-14'
labels:
  - "web"
  - "demo"
  - "vercel"
  - "sandbox"
  - "ui"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Preparar una versión web autónoma de Gripm Board para desplegar en Vercel, orientada a demostraciones públicas desde dispositivos móviles y comunidades técnicas sin requerir un CLI ni daemon local:
1. **Detección automática de entorno y fallback en memoria:** Si la aplicación detecta que está corriendo en la web sin conexión al socket o CLI local, inicializa automáticamente un adaptador en memoria y LocalStorage con un dataset precargado (un sprint activo, tareas en distintas columnas, criterios de aceptación interactivos y un release publicado con changelog) sin mostrar pantallas vacías ni errores de red.
2. **Selector de formato dual interactivo:** Incorporar en la tarjeta o modal de tarea un selector que permita previsualizar en vivo cómo se serializa esa tarea en Markdown (`backlog/tasks/*.md`) frente a JSON unificado (`.gripm/backlog.json`).
3. **Optimización móvil estricta (Zero-CLS & Touch Targets):** Interfaz completamente adaptada a pantallas móviles (360px a 430px) con áreas táctiles de al menos 44px de altura/anchura y navegación táctil fluida.
4. **Configuración de hosting SPA:** Configuración limpia de `vercel.json` para soportar rutas SPA sin errores 404 en navegación directa o recarga.
5. **Enlace a demo en README:** Incorporar badge y enlace directo a la demo en producción en la cabecera de `README.md` y `README.es.md`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Compilacion de produccion con Vite limpia hacia Vercel con configuracion de vercel.json para soportar rutas SPA
- [x] #2 Deteccion automatica de entorno sin daemon que monta de inmediato dataset de prueba en memoria sin errores de red
<!-- AC #3 retirado: "adaptar la interfaz a moviles de 360px a 430px" salio de este item
     por decision del PO (ver nota de alcance), y la evidencia de escritorio que se llevo
     consigo — la columna Completado cortada a 1280px — quedo registrada en DEV-264.
     Un AC transferido a su propio item no debe seguir abierto en el de origen: lo
     convierte en algo que nunca cierra. -->
<!-- AC #4 retirado: "selector de formato dual Markdown/JSON" es un afordance de pitch, no
     parte del entregable. El objetivo de DEV-222 es que la app funcione sin daemon; el
     afordance hace que la demo comunique mejor, que es otra cosa. Atarlos al mismo criterio
     de cierre mezclaba dos objetivos de naturaleza distinta. Salio a DEV-265. -->
- [x] #5 Enlace directo a la demo en produccion incorporado en la cabecera del README.md
- [x] #6 npm test y npm run backlog:check pasan con codigo 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
> Alcance de esta pasada: **AC #1, #2, #3 y #6**. Los AC #4 (selector de formato dual) y
> #5 (badge de demo en README) quedan explícitamente fuera y se tratan en una segunda
> pasada. Ver "Fuera de alcance" al final.

### Diagnóstico previo (medido sobre el árbol, 2026-10-13)

No existe ninguna de las piezas que el ítem da por descontadas. El ítem fue escrito como
si existiera un "adaptador en memoria" y un "modo demo" del cliente. **Ninguno de los dos
existe**, y el "modo demo" de DEV-240 es otra cosa:

| Supuesto del ítem | Realidad |
| :--- | :--- |
| "Si detecta que corre en la web, inicializa un adaptador en memoria" | **No hay detección.** `src/api.ts:3` es `const API_BASE = '/api'` y no hay ninguna lectura de `import.meta.env`, `VITE_*` ni `window.location` en todo `src/` salvo dos `location.reload()`. |
| "adaptador en memoria + LocalStorage" | **No existe.** `src/utils/storage.ts` solo maneja `string` y solo prefs de UI. |
| Dataset precargado | **Existe uno**: `data/demo-backlog.json`, server-side. Le faltan sprints y ACs. |
| DEV-240 "activación de demo" | Es un *proyecto* demo en el registro + flags CLI `--single/--hub`. Cero código cliente reutilizable. |

**El hecho operativo que define todo el plan:** `gripm` no tiene Express. La API existe
únicamente como middleware del dev server y del preview server (`server/plugin.ts:44-46`
y `:69-71`); `bin/gripm.js:357-379` levanta Vite en proceso. `vite build` produce un
`dist/` estático puro. **En Vercel todos los `/api/*` dan 404 siempre.** El adaptador en
memoria no es una mejora de la demo, es la única vía por la que la app puede funcionar
allá. Eso también significa que el detector no puede ser una heurística: tiene que ser
un probe real.

**Comportamiento de falla actual** (`src/App.tsx:313-351`): el `catch` sólo muestra un
toast. `boardData` queda `null`, se sale del splash igual, y el árbol renderiza con
`projects = []` → Header vacío, `FilterBar` sin datos, columnas con `t('kanban.emptyColumn')`.
Es exactamente la pantalla vacía que este ítem viene a eliminar. Encima corre el retry
infinito de SSE cada 3 s (`api.ts:313-328`): en una demo pública serían 20 reintentos por
minuto por sesión.

### Decisión 1 — Interfaz de adaptador, no interceptor de fetch

Se crea la capa `src/data/` con una interfaz explícita y dos implementaciones. No se
parchea `fetch` con un interceptor: interceptar no cubre escrituras, no tipa las firmas y
deja el contrato de datos implícito.

```
src/data/types.ts        → interface GripmApi (las 30 firmas actuales, tipadas)
src/data/httpAdapter.ts  → la implementación actual sobre fetch (código movido de src/api.ts)
src/data/sandbox.ts      → implementación en memoria + LocalStorage
src/data/detect.ts       → probe de disponibilidad + decisión cacheada
src/data/runtime.ts      → selección del adaptador activo (un único punto de decisión)
src/api.ts               → fachada: re-exporta las 30 funciones desde el adaptador elegido
```

**`src/api.ts` pasa a ser una fachada de re-export y nada más.** Es lo que mantiene el
costo en cero: `src/App.tsx:17-41` importa 22 funciones por nombre desde `./api`, y **el
contrato de carga de datos no se toca**. El archivo sí cambió más tarde, para agregar el
banner de demo y el prop `isSandbox`, pero ninguna línea de cómo se piden o cargan los
datos. La política de la casa (sin supresiones, sin `any`) pide que la
fachada exponga las 30 funciones tipadas contra `GripmApi`, no `any` por el hueco.

`src/data/runtime.ts` existe para que cambiar de adaptador no obligue a editar los 30
exports con nombre de la fachada: el punto de decisión queda en un solo archivo.

`src/api.ts` sigue siendo **el único módulo del que importa la UI**: grep de
`from './api'` sobre `src/` devuelve un solo hit, `App.tsx:41`. No hay otros consumidores
que mantener sincronizados.

`subscribeToBoardEvents` **debe quedar inerte en modo sandbox**: devuelve un no-op que no
abre `EventSource`. Es el que garantiza AC #2 ("sin errores de red").

### Decisión 2 — El dataset se reutiliza, no se duplica

Existe `data/demo-backlog.json` y es la única fuente de verdad: lo lee el server en
`server/services/registry.ts:11` (`DEMO_FILE`) y lo escribe `writeProjectBacklog()`
(`storage.ts:792`). Se **extiende ese mismo archivo** en vez de crear
`src/data/sandbox-dataset.ts` en paralelo, porque un dataset duplicado diverge en la
primera iteración y nadie se da cuenta.

`tsconfig.json:15` ya tiene `resolveJsonModule: true`, así que el cliente lo importa
directo y queda bundleado:

```ts
import demoBacklog from '../../data/demo-backlog.json';
```

**Ampliaciones necesarias** sobre los 4 ítems actuales:

| Falta | Dónde | Por qué la exige |
| :--- | :--- | :--- |
| `sprints[]` | clave de primer nivel | El ítem pide "un sprint activo". Hoy el demo **no tiene ningún sprint**, así que la vista Sprint abre vacía. |
| `acceptanceCriteriaList[]` | por ítem | El ítem pide "criterios de aceptación interactivos". Hoy **ningún ítem tiene ACs**: esa columna del modal abre vacía. |
| Cobertura de columnas | `items[].status` | Hoy sólo `draft` x2 y `doing` x2. Faltan `review`, `ready` y `done`, que es lo que hace que un tablero se vea vivo. |

No crear un fixture nuevo: reutilizar y ampliar. Beneficio colateral: el proyecto demo
local (`gripm` corriendo en tu máquina) también mejora.

### Decisión 3 — El detector es un probe, y su decisión se cachea

`detect.ts` hace `GET /api/data` con **timeout explícito y corto** (~1.5 s). Si responde
con JSON válido → `httpAdapter`. Si falla, da timeout o responde no-JSON → `sandbox`.
La decisión **se cachea en un solo lugar** y no se re-evalúa en cada llamada: si no, el
primer render sanea el timeout y cada interacción paga el coste otra vez.

Se ejecuta **dentro de `fetchBoardData()`**, no en un useEffect aparte, para que la app
nunca llegue a renderizar con `boardData === null` en modo sandbox. Esa es la diferencia
entre "sandbox que funciona" y "sandbox que se ve vacía un instante".

### Decisión 4 — `vercel.json` con el `/api` explícitamente fuera del rewrite

Falta el archivo. Sin `base` en Vite (default `'/'`) Vercel sirve en root sin problema.
El detalle que hay que acertar es el **negative lookahead**: si el rewrite a
`index.html` captura también `/api/*`, un `fetch` fallido recibe HTML con status 200 y el
detector tiene que distinguir "HTML donde esperaba JSON". Más simple y más honesto es
dejar que `/api/*` **no** se reescriba y dé 404 real, que es lo que el detector ya sabe
leer.

```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

### Secuencia de ejecución

1. `src/data/types.ts` con `GripmApi`; `src/api.ts` pasa a fachada. Verificar que
   `npx tsc --noEmit` sigue en 0 **antes** de escribir una línea de lógica.
2. Mover el cuerpo actual a `httpAdapter.ts`. `src/api.ts` re-exporta. Gate: tsc + `npm test`.
3. Ampliar `data/demo-backlog.json` con sprints, ACs y cobertura de columnas.
4. `src/data/sandbox.ts`: adapter en memoria, con mutaciones reales (create/update/delete
   de ítems, sprints y releases) y persistencia en LocalStorage bajo una clave nueva
   `gripm_sandbox_board`, con botón "Reset demo" para volver al dataset original.
5. `src/data/detect.ts` con el probe y la decisión cacheada.
6. `vercel.json` + guardar el modo sandbox en la config visible (badge en `Header.tsx`,
   que ya tiene slots de demo en las líneas 111/158/161/179).
7. AC #3: pasada de responsive 360–430 px con touch targets ≥ 44 px usando la skill
   `code-level-ux-auditor`. `ItemModal.tsx:2016/2024` ya cumple (44 px en móvil);
   hay que auditar el resto del árbol, no asumirlo.
8. Pirámide de Verificación completa y cierre en `ready`.

### Fuera de alcance (sección separada, no se pierden)

- **AC #4** — selector dual Markdown/JSON. Requiere exponer `serializeBacklogMd()` de
  `scripts/backlogMdParser.ts` al cliente; es trabajo propio.
- **AC #5** — badge y enlace a la demo en `README.md`/`README.es.md`. Ojo: DEV-251 (que
  está en `done`) **borró** justamente ese badge y el enlace a `gripm.vercel.app` por
  apuntaba a un deploy inexistente. Reintroducirlo es un revert consciente y sólo se
  justifica cuando exista una URL viva. Hoy no la hay.

### Riesgos

- **La refactorización de `api.ts` es el 70% del trabajo y no agrega valor visible.** Es
  el precio de entrada, pero puede.safeer en un PR propio si se quiere revisionar por
  partes.
- **`data/` está en `watch.ignored` de `vite.config.ts:63`** y en `files` de
  `package.json:51`, pero no se copia a `dist/`. Importarlo desde `src/` lo bundlea
  (correcto para el sandbox); hay que verificar que el build de producción no lo omita.
- **`storage.ts:756-802` escribe en disco**, y para el demo eso significa escribir
  `data/demo-backlog.json` dentro del repo. No lo toca el sandbox (es cliente), pero
  queda anotado para que nadie lo confunda.
- **Borrar el demo local desde la UI** (`restoreDemoProject`, `api.ts:229`) en modo
  sandbox tiene que ser no-op seguro, no un error.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener la premisa local-first: el deploy en Vercel es una sandbox interactiva de demostración, no un servicio SaaS remoto.

### Pasos 1 y 2 — Extracción de la capa de datos (hechos)

Mover `src/api.ts` a la arquitectura de adaptador **sin cambio de comportamiento**. La
superficie real resultó ser de **30 funciones**, no las 35 que se habían estimado en la
primera redacción del plan; el conteo está corregido arriba.

Archivos nuevos: `src/data/types.ts` (contrato `GripmApi`), `src/data/httpAdapter.ts`
(cuerpo movido literal, incluidos los mensajes de error para no partir en dos los textos
que ve el usuario), `src/data/runtime.ts` (punto único de decisión del adaptador).

`npx tsc --noEmit` en 0 y `npm test` en 16/16 tras el movimiento.

#### El invariante de DEV-237 se mudó de archivo y hubo que seguirlo

`scripts/test-api-security.js` Test 12 (DEV-237) leía `src/api.ts` por path hardcodeado y
afirmaba que "debe haber llamadas fetch mutantes". Al vaciarse el archivo, el assert de
existencia pasó a fallar y **`npm test` se cayó en el paso `api-security`** — el gate
funcionó.

La corrección fue **mover el check, no relajarlo**: ahora escanea todo `src/data/`
(`readdirSync` + filtro `.ts`) en vez de un archivo fijo. Motivo: un path hardcodeado
vuelve a romperse en el próximo movimiento, y un test que se rompe es un test que se
desactiva. Con el cambio siguen cubiertos los mismos 30 bloques POST/PUT con su aserción
de `Content-Type: application/json`, y además ahora cubre cualquier archivo nuevo que se
agregue a la capa.

`src/api.ts` quedó como fachada pura de re-export con las 30 funciones delegando en
`getActiveApi()`, cada una con su firma tomada del contrato vía `Parameters<>` para que
la deriva de tipos sea un error de compilación y no una discrepancia silenciosa.

Pendiente para el siguiente paso: `src/data/sandbox.ts` y `src/data/detect.ts`, que son
los que le dan sentido a la fachada. Hasta entonces `runtime.ts` devuelve siempre
`httpAdapter` y la app se comporta exactamente como antes.

### Paso 3 — Dataset ampliado (`data/demo-backlog.json`)

Ampliado el fixture existente, sin crear un dataset paralelo. Antes tenía 4 ítems, **0
sprints y 0 ACs**; ahora:

| Dimensión | Antes | Ahora |
| :--- | :--- | :--- |
| Sprints | ninguno | 2 (`completed` + **`active`**) |
| Ítems | 4 | 7 |
| Columnas cubiertas | `draft`, `doing` | `draft`×2, `doing`, `review`, `ready`, `done`×2 |
| Ítems con ACs | 0 | 7 |
| Releases | 1 | 2 (`released` + `unreleased`) |

**Corregí una incoherencia que estaba en los datos:** DEMO-001 estaba en estado `draft`
pese a estar incluida en el release 1.0.0 y tener `releasedAt`. Para una demo eso se lee
como basura. Ahora está en `done`, que es lo que corresponde.

**Sobre el formato de los ítems:** cada uno lleva `sprint`, `targetSprint` y `sprints[]` con
el mismo valor, que es exactamente la forma que la propia app escribe al arrastrar una
tarjeta (`App.tsx:635-636` y `:761`). No es redundancia gratuita: la UI resuelve con
`it.sprint || it.targetSprint || sprints[last]` en 76 lugares distintos, y sembrar una
sola de las tres haría que el ítem apareciera sin sprint en algunos read paths y con
sprint en otros.

`npm test` sigue en 16/16 tras el cambio.

### Bug encontrado de paso — DEV-261

Al verificar **dónde** persisten los sprints en modo JSON encontré un defecto preexistente
que **no bloquea la sandbox** (el adaptador lee el JSON en el navegador y no pasa por el
server) pero que **invalida una premisa del plan**:

La rama JSON de `readProjectBacklog()` (`storage.ts:384-389`) devuelve `project`, `items`,
`releases` y `lastUpdated`, **pero no `sprints`**. Y `writeProjectBacklog()` en modo JSON
(`storage.ts:799`) serializa el objeto entero, `sprints` incluido. **La escritura y la
lectura no están en simetría: lo que se persiste nunca vuelve a leerse.**

Consecuencias: `GET /api/sprints` responde `[]` siempre en un proyecto JSON; un sprint
creado desde la UI se persiste y después desaparece; y como el cálculo de `maxNum`
(`api.ts:1038-1045`) parte siempre de una lista vacía, **crear dos sprints seguidos genera
el mismo ID dos veces**. El proyecto demo está afectado porque `isBacklogMdProject()`
devuelve `false` para `isDemo` (`registry.ts:34`).

La rama markdown no sufre esto: lee y devuelve `sprints` desde `backlog/sprints.json`
(`storage.ts:262-267` y `:336`). Por eso no se notó: el modo markdown es el camino feliz.

Registrado como **DEV-261** (`priority: high`, `type: bug`). No se mezcla en DEV-222: es
un defecto preexistente, con su propio radio de impacto, y la trazabilidad exige ítem
propio.

**Consecuencia sobre este plan:** el paso 3 es **medio efectivo hasta que DEV-261 se
cierre**. Los sprints del dataset funcionan hoy en la sandbox (lectura cliente) pero **no**
en el proyecto demo local servido por el daemon. La premisa del plan de que ampliar el
dataset mejoraría también el demo local queda en suspenso hasta ese cierre.

### Pasos 4, 5 y 6 — Adaptador en memoria, detector y `vercel.json`

#### `src/data/sandbox.ts`

Implementa los 30 métodos de `GripmApi` sobre un `BoardData` en memoria, con
mutaciones reales y persistencia en LocalStorage bajo `gripm_sandbox_board`
(`gripm_sandbox_config` para los settings). `resetSandbox()` borra ambas claves y
vuelve al semilla.

Decisiones que no son obvias y quedaron documentadas en el archivo:

- **`subscribeToBoardEvents` es un no-op, y no emite por las mutaciones propias.** No
  abrir `EventSource` es lo obvio (serían 20 reintentos por minuto por sesión contra
  un 404). Lo que no es obvio es que **tampoco debe emitir `backlog_changed`**: el
  handler de `App.tsx:365-367` interpreta ese evento como "el tablero cambió en disco",
  refresca los datos y muestra un toast. Emitirlo tras cada escritura propia mostraría
  "Tablero sincronizado con cambios en disco" en cada clic, que es falso.
- **`browseDirectory` y `detectPathStorage` lanzan.** No tienen sentido sin daemon ni
  disco. Los dos únicos consumidores (`FolderPickerModal.tsx:43` y `ProjectModal.tsx:41`)
  están dentro de `try/catch`, así que un error explícito es seguro y mejor que un
  `false` mudo.
- **`deleteSprint` desasocia ítems en vez de dejar punteros muertos.** Un ítem cuyo
  sprint fue borrado queda con `sprint: ''`, no apuntando a un nombre inexistente.
- **`createItem` valida el título.** `Partial<BacklogItem>` deja `title` opcional pero
  es obligatorio en el dominio; sin la validación el ítem llegaba al tablero sin título.

#### `src/data/detect.ts`

`GET /api/data` con `AbortController` y timeout de 1.5 s. HTTP si responde 200 **y**
`content-type: application/json` **y** el body parsea; sandbox en cualquier otro caso,
incluido el fetch que revienta.

El chequeo de `content-type` no es paranoia: si el rewrite de `vercel.json` capturara
`/api/*`, el `fetch` fallido recibiría HTML con status 200 y el detector tendría que
adivinar. Excluyendo `/api` del rewrite, el 404 es honesto.

**No es una heurística sobre la URL.** Un `window.location` que "parece" web puede estar
detrás de un proxy que sí tiene API, y un `localhost` puede estar sin daemon. La única
señal fiable es si el endpoint responde.

La decisión se cachea en una promesa compartida: todas las llamadas concurrentes
esperan el mismo probe, y después el costo es cero.

#### `vercel.json`

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

El negative lookahead es lo que importa: deja que `/api/*` dé **404 real** en vez de
HTML, que es la señal que el detector ya sabe leer.

#### Verificación

`tsc` 0 · `npm test` 17/17 · `npm run build` OK · `npm run publish:check` 0.

**El seed entra al bundle de producción, verificado por inspección del artefacto:** en
`dist/assets/index-*.js` aparecen `Sprint 2 — Resiliencia`, `acceptanceCriteriaList`,
`gripm_sandbox_board` y `/api/data`. Esto era un riesgo abierto del plan (el `data/` está
en `watch.ignored` de `vite.config.ts`): `watch.ignored` afecta al dev server, no al
bundle, y el JSON importado desde `src/` queda correctamente embebido.

### Paso 7 — El Header no puede confundir "sandbox" con "proyecto demo"

El gap más serio que dejó la arquitectura: **`data/demo-backlog.json` cumple dos roles** y
`isDemo: true` viaja en el seed, así que en la web la UI cree estar mirando un proyecto
demo descartable dentro de una instancia local, cuando **toda la app** es la demo.

Tres consecuencias, verificadas en `Header.tsx`:

1. **Acciones de borrar el proyecto** (`Header.tsx:238` y `:694`). En una demo pública eso
   deja al visitante con la app vacía y sin forma de recuperar el seed. **Eliminadas en
   sandbox** y reemplazadas por un **"Reiniciar demo"** explícito.
2. **Indicador de live en ámbar "Reconectando…" para siempre.** `liveConnected` arranca en
   `false` (`App.tsx:310`) y solo pasa a `true` con el evento `connected` del SSE, que la
   sandbox **nunca dispara a propósito**. Decir "reconectando" cuando no hay nada a qué
   reconectarse es mentira, y contradice el AC #2 justo en la demo pública. Ahora es
   neutro, en índigo, etiquetado "Modo demo".
3. **El badge decía "Demo"**, que era lo correcto en los dos casos. Se dejó así.

**El reset reutiliza `handleRestoreDemo`**: en el adaptador sandbox `restoreDemoProject()`
*es* un `resetSandbox()`, así que el handler existente ya hacía exactamente lo correcto y
no hizo falta escribir uno nuevo. El botón va en la rama `singleProject` porque el
desplegable de proyectos **no se renderiza** en sandbox (`singleProject: true`), que es
donde se lo iba a poner primero. Lleva `min-h-[44px]` en móvil.

#### El gate de UX frenó un error mío

`npm test` se cayó en `audit-ux-baseline` con dos hallazgos UX-011 en `Header.tsx`. Aislé
la causa revirtiendo el archivo a `HEAD` y reejecutando el auditor: **sin mis cambios,
cero UX-011** en el Header. Eran míos:

- **El botón de reset usaba `text-[11px]`**, un tamaño arbitrario fuera de la escala
  canónica. Es código nuevo mío, así que no tenía excusa: cambiado a `text-xs`.
- **El badge lo había reescrito** para ponerlo en índigo en sandbox. Ese color era un
  adorno que **yo** había agregado: lo pedido era que dijera "Demo" y no ofreciera borrar.
  Revertido a su `className` original.

Resultado: **cero hallazgos nuevos y cero regeneración del baseline.** El atajo de
`--update-baseline` habría puesto el gate en verde en 30 segundos y habría congelado dos
supresiones que nadie revisó, que es justo lo que DEV-188 prohíbe.

#### Verificación

`tsc` 0 · `npm test` **17/17** · `npm run backlog:sync` 0.

### AC #3 — Auditoría estática de mobile (resultado parcial; el AC **no** se puede tildar)

Pasada con la skill `code-level-ux-auditor`. **El AC #3 NO se tilda todavía**, y el motivo
es el hallazgo, no una formalidad.

#### Lo que la auditoría estática sí puede afirmar

Conté el baseline regla por regla y verifiqué que las reglas realmente corren: las cuatro
que importan están en `scripts/ux-rules.json`, todas `stack agnostic` (sin
`requires.deps` que las salte) y `.uxaudit.json` **no tiene ningún opt-out**.

| Regla | Qué mide | Observaciones en baseline |
| :--- | :--- | ---: |
| **UX-009** | Touch target sub-36px | **0** |
| **UX-006** | UI fija inferior tapando el scroll | **0** |
| UX-007 | Hacinamiento horizontal en < 640px | **45** |
| UX-012 | Sin feedback táctil | 11 |
| UX-011 | Tamaño de fuente arbitrario | 222 |

Cero UX-009 y cero UX-006 **es un resultado genuino**: no hay ningún elemento interactivo
con tamaño explícito por debajo de 36px sin compensación, y no hay firma de barra inferior
fija tapando contenido.

#### Por qué el AC sigue sin poder tildarse

Dos razones, y la segunda es la importante:

1. **UX-009 solo ve tamaños explícitos.** Su firma es `h-5..h-8`, `w-5..w-8`, `size-6..size-8`
   sin compensación. Un botón que queda en 38px por su propio contenido y padding **no lo
   detecta**. El "0" es un piso, no la prueba de los 44px.
2. **UX-007 tiene 45 observaciones aceptadas, repartidas en 16 archivos:** ItemModal (5),
   SettingsView (5), ReleaseAssembler (4), ImportWizardModal (4), Header (4),
   KanbanBoard (3), CompleteSprintModal (3), ItemCard (3), PlanGuardModal (3),
   AdvancedFiltersPopover (3), ProjectModal (2), FolderPickerModal (2), y Toast,
   SprintView, SprintModal y ConfirmModal (1 c/u).

   El AC pide *"interfaz completamente adaptada a pantallas móviles de 360px a 430px"*.
   Con 45 casos conocidos de hacinamiento horizontal **en el rango exacto de ancho que el
   AC exige**, el AC describe un estado que el código no tiene. Tildarlo sería declarar
   algo falso.

Además, ninguna regla estática renderiza nada: que el layout entre en 360px es una
pregunta de CSS computado, no de tokens.

#### Resolución

El AC queda partido en dos:

- **AC #3a — verificable por auditoría estática:** cero regresiones de touch target y de
  oclusión inferior. **Cumplido**, con el conteo del baseline como aserción.
- **AC #3b — requiere render:** el layout real entra en 360–430px y los targets medidos
  dan ≥44px. Delegado a verificación visual en viewport móvil, que es el uso sancionado de
  navegador porque no es deducible estáticamente.

Mientras 3b no vuelva, el ítem **no pasa a `ready`**.

### Pendiente

- Verificación visual de AC #3b (en curso).
- Pirámide de Verificación completa y cierre en `ready`.

### `test:ui` y `test:linux` — los dos checks que la Pirámide exige y no son los de siempre

**`npm run test:ui`** es obligatorio cuando se toca `Header` o navegación (`AGENTS.md` §6.18)
y lo había pasado por alto. Corrido: verde.

**`npm run test:linux`** es obligatorio cuando el cambio toca runtime, CI, I/O o filesystem,
que es exactamente el caso (LocalStorage en la sandbox, y `storage.ts` de DEV-261).
Resultado: **`SUITE_EXIT=0`, 17/17 pasos en `node:22.6.0-bookworm`**, con
`verify-linux-exit-code.js` en verde.

#### El diagnóstico original era incorrecto

> [!CAUTION]
> **Corrección (2026-10-14, tras dos auditorías independientes).** La primera redacción de
> esta sección afirma que `scripts/repro-ci-linux.sh` *"no se puede ejecutar desde Windows"*,
> que PowerShell *"devuelve exit 1 aunque la suite pase"* y que hay *"MSYS path mangling"* de
> `-w /work`. **Las tres son falsas.** El comando se volvió a correr **sin modificar una sola
> línea del script** y dio:
>
> ```
> npm run test:linux
> === imagen: node:22.6.0-bookworm ===
> ✅ Linux suite runner preserves both successful and failed exit codes
> 17 pasos · 17.4s · todas verdes
> SUITE_EXIT=0
> ```
>
> Dos auditorías lo confirmaron de forma independiente. **La causa real del fallo inicial era
> Docker apagado** —el primer punto de esta misma lista, que el diagnóstico de abajo
> contradecía— y se atribuyó a un defecto del script que no existe.

Lo que **sí** es un defecto real, y sobrevive a la corrección:

1. **Docker apagado → exit 1 con salida totalmente silenciosa.** El `set -euo pipefail` del
   script combinado con `docker volume create >/dev/null` hace que "el daemon no está" y "la
   suite falló" produzcan exactamente la misma salida: exit 1 y cero diagnóstico.
2. **`verify-linux-exit-code.js` sí cubre la segunda mitad** (preserva exit codes), pero
   ninguna de las dos capas distingue daemon ausente de test fallido.

**Lo que se retiró:** la recomendación de migrar `-v "$REPO":/src:ro` a `--mount`, escrita
en dirección a DEV-190. El `-v` del script funciona; el diagnóstico estaba equivocado y la
recomendación habría enviado a alguien a arreglar algo que ya está bien.

> [!NOTE]
> La forma `--mount` sí es preferible si vas a montar el repo desde Git Bash por comfort —
> evita el quoting de rutas con espacios en `C:\Users\...` — pero **no es un workaround
> necesario**. La afirmación de que `-v` se rompe era incorrecta.

#### Estado de la Pirámide de Verificación

| Check | Resultado |
| :--- | :--- |
| `npx tsc --noEmit` | 0 errores |
| `npm test` | 17/17 |
| `npm run test:ui` | verde |
| `npm run test:linux` | `SUITE_EXIT=0`, 17/17 |
| `npm run backlog:sync` / `check` | 0 |
| `npm run publish:check` | 0 |
| `npm run build` | OK, seed verificado dentro del bundle |
| `node scripts/verify-changes.js --all` | 424 archivos |

Lo único abierto es el **AC #3b**, que depende de render.

### AC #3b — Verificación visual en viewport móvil (resultado: **FALLA**)

Delegada a navegador (Playwright + Chromium), con `dist/` servido por un **servidor
estático puro** que devuelve 404 de texto plano para todo `/api/*`. Se evitó
deliberadamente `vite preview` y `npm run dev`, que levantan el middleware de API y
invalidarían la prueba. Viewports 390x844, 360x800 y 430x932, con `isMobile` y `hasTouch`.

> [!NOTE]
> La app renderiza en **inglés** porque `.gripm/config.json` fija `"language": "en"`. Los
> rótulos del AC ("Reiniciar demo", "Modo demo") aparecen como "Reset demo" y "Demo mode".

#### Lo que sí funciona — la capa de datos de DEV-222 queda probada en runtime

| # | Ítem | Resultado |
| :--- | :--- | :--- |
| 1 | La app carga con datos | **OK** — 7 ítems, 3 columnas pobladas, badge `Demo` |
| 7 | Vistas Sprint y Releases | **OK** — 2 sprints con progreso, 2 releases con scope |
| 8 | Toggle de AC y mover tarjeta persisten | **OK** — verificado en `localStorage` tras recargar |

Ese bloque confirma lo que el ítem vino a construir: **detección de entorno, seed en
memoria, adaptadores y persistencia en LocalStorage funcionan de verdad.** El probe de
`/api/data` dispara **una sola vez** por carga (promesa cacheada, timeout 1500 ms) y no hay
loop de reconexión del SSE. Cero excepciones no capturadas.

#### Lo que falla

| # | Ítem | Resultado |
| :--- | :--- | :--- |
| 2 | Cero scroll horizontal | **FALLA** — desborde de 127px recortado por `overflow-x: hidden` |
| 3 | Touch targets ≥44px | **FALLA** — 9 controles no llegan |
| 4 | "Reiniciar demo" funciona | **FALLA** — el tap se hijackea hacia Sprints |
| 5 | Indicador "Modo demo" accesible | **PARCIAL** — valor correcto, inalcanzable en móvil |
| 6 | Sin errores de red | **PARCIAL** — sin loop, pero `/api/retros` escapaba del adaptador |

**Causa raíz de 2, 3, 4 y 5: una sola.** El Header en móvil es una fila
`grid-cols-[1fr_auto_1fr]` cuyo cluster derecho **no refluye** y queda fijo en x 397–487,
fuera del viewport. El `nav` tiene `min-w` hardcoded (88+145+98 = 331px) que desborda y
**pinta por encima** del botón de reset: `elementFromPoint` sobre el centro del botón
devuelve el tab "Sprints". Un tap real en (272, 29) navegó a Sprints en 6 corridas
independientes.

**El desborde no se ve como scroll** porque `overflow-x: hidden` lo recorta: `scrollWidth`
iguala `clientWidth` mientras el contenido está 127px más ancho. Es contenido inalcanzable,
no una región scrolleable.

Touch targets medidos con `getBoundingClientRect()`: Reset demo **28x44** (el `min-h` se
cumplió, el ancho nunca: `hidden sm:inline` colapsa la etiqueta a solo icono), New Task
**40x40**, menú móvil **40x40**, tabs del header **28px de alto**, acciones de tarjeta
**22x22**, nuevo ítem de columna **32x32**, copiar código **50x16**, checkbox de AC
**13x13**.

**El botón de reset tiene además el problema de ser peor que estar ausente:** está
presente, se ve, y tocarlo ejecuta la acción equivocada. La lógica de reset en sí es
correcta: con el nav oculto, el mismo botón resetea bien y persiste.

#### Correcciones aplicadas tras la auditoría

**`/api/retros` escapaba del adaptador.** `SprintView.tsx:134` hacía
`fetch('/api/retros')` hardcodeado, con el rejection silenciado por `.catch(() => {})`: un
404 por carga de la vista Sprint que nadie veía. Era **el único `fetch` hardcodeado a
`/api` en todo `src/`**, verificado por grep.

Corregido agregándolo al contrato `GripmApi` como `fetchRetros`, implementado en
`httpAdapter` (request real) y en `sandboxAdapter` (lista vacía, porque sin daemon no hay
retros que buscar). El contrato queda en **31 métodos**, y es lo que evita que esto se
repita: si un método no está en la interfaz, TypeScript no avisa que falta en sandbox.

**El reset se agregó al footer del drawer móvil**, único lugar alcanzable en móvil según
el punto 4.

#### Conclusión sobre AC #3

**El AC no se puede cerrar en esta sesión.** El defecto de raíz es el layout móvil del
Header y **es preexistente**, no introducido por DEV-222: pertenece a **DEV-207**
("Mejorar UX responsive del tablero en tablet y mobile", hoy en `ideas`).

Lo que sí es de DEV-222 y quedó corregido: la fuga de `/api/retros` y la colocación del
reset. Lo que no: el reflujo del Header, los 9 touch targets y la alcanzabilidad del
indicador de modo demo — todos dependientes de DEV-207.
### Nota de alcance — móvil sale del sandbox (decisión del PO, 2026-10-13)

El AC #3 se reescribió para acotar la demostración a **desktop**. La auditoría móvil se
conserva íntegra arriba como **evidencia**, no como bloqueo.

Motivo: hacer la demo pública inutilizable en teléfono es un mundo muy completo para
bloquear un lanzamiento. Y el defecto de raíz —el Header en `grid-cols-[1fr_auto_1fr]` sin
reflujo— es **preexistente**, no introducido por DEV-222.

**Lo que hereda DEV-207**, sin que este ítem lo resuelva:

- El cluster derecho del Header fijo en x 397–487 y el `nav` con `min-w` 331px que
  desborda y secuestra taps.
- Los 9 controles con target < 44px (checkbox de AC 13x13, acciones de tarjeta 22x22,
  tabs del header con 28px de alto).
- Los 45 hallazgos UX-007 de hacinamiento horizontal, que son el mismo problema de raíz.

**Contrapartida que se acepta explícitamente:** DEV-207 tiene que tener en cuenta que el
adaptador sandbox ya existe y es reutilizable, para que el futuro trabajo responsive se
haga sobre una base que funciona en web y no sobre una vista local.

> [!WARNING]
> Mientras tanto, **la demo pública se publica y se comunica como experiencia desktop.** Si
> se enlaza desde el README, el texto tiene que decirlo, o el primer visitante desde un
> teléfono se va a llevar una impresión rota.

### Journey de entrada — decidido: opción A, sandbox que se explica sola

Decisión del PO: **una sola URL, la raíz es la sandbox, y la app se explica a sí misma.**
No hay landing por ahora; queda como decisión de presencia pública para cuando exista una
URL viva y presupuesto de mantenimiento.

Lo que faltaba y quedó resuelto:

- **Contexto:** banner en `App.tsx`, arriba del FilterBar, visible solo en sandbox
  (`isSandboxMode()`), con el título "Demo interactiva" y la explicación de que los cambios
  se guardan solo en ese navegador.
- **Salida:** dos enlaces en el banner, **Código** (GitHub) y
  `npm install -g @gripm/board`, ambos con target táctil de 44px.

Antes de esto el recorrido era literalmente *nadie → nadie*: el único enlace a GitHub de la
app era el de "hay actualización", que solo aparece con `updateAvailable.hasUpdate`.

#### `.vercelignore` — hallazgo de seguridad previo al deploy

Vercel sube el repositorio entero al contenedor de build. **No existía `.vercelignore`**, y
con eso cada deploy habría arrastrado **258 archivos de `backlog/tasks/` (868 KB)** con
trabajo privado: decisiones, prioridades, nombres de proyectos. Más
`data/projects-registry.json`, que es el registro local de proyectos de la máquina.

Es la misma clase de fuga que cerraron DEV-118, DEV-120 y DEV-151. `npm run publish:check`
protege el tarball de npm, pero **nada protegía el upload a Vercel**.

Creado `.vercelignore` con `backlog/`, `BACKLOG.md`, `data/projects-registry.json`,
`.gripm/`, `dist/`, `bin/`, `docs/`, `node_modules/` y la documentación que sirve GitHub.
Verificado que `tsconfig` incluye solo `src`, `server`, `scripts` y `vite.config.ts`, así que
**ninguno de los excluidos hace falta para compilar**.

> [!IMPORTANT]
> **`data/demo-backlog.json` NO se excluye a propósito:** `src/data/sandbox.ts` lo importa
> como módulo y es el dataset semilla de la demo. Queda una nota en el propio archivo para
> que nadie lo "limpie" después.

#### Idioma: la detección ya existía, el bug era mío

Había puesto `locale: 'en'` en el config de la sandbox. Eso **pisaba** el
`getInitialLanguage()` que ya existe en `src/utils/i18n.tsx:14`, que resuelve en este orden:
preferencia guardada → `navigator.language` → **español por defecto**.

`App.tsx:238` solo llama a `setLanguage()` cuando `cfg.locale` viene definido, así que sacarlo
de `SANDBOX_CONFIG` devuelve el control a la detección existente. Corregido y documentado en
el código para que nadie lo vuelva a hardcodear.

### Estado del deploy

> [!NOTE]
> **Sección superada, conservada como registro cronológico.** Cuando se escribió, el
> proyecto de Vercel todavía no existía. Hoy la demo **está desplegada y verificada** en
> `https://gripm.vercel.app`. Lo que sigue describe el estado de ese momento.

**No desplegado.** La CLI de Vercel responde **"Logged out"**: no hay `VERCEL_TOKEN` ni
`~/.vercel`, y el repo de GitHub no está conectado a Vercel. Desplegar requiere
`vercel login` del humano, o importar el repo en el panel de Vercel para obtener auto-deploy
desde `main`.

Pendiente y **deliberadamente no ejecutado** en ese momento: agregar el badge y el párrafo
de demo a `README.md` / `README.es.md` (AC #5). No se agregaba antes del primer deploy
porque reabriría exactamente el enlace roto que DEV-251 cerró, y la descripción de ese ítem
pide que la demo exista *"y su pipeline de hosting"*.

**Estado actual:** desplegado. El proyecto de Vercel es `gripm` en el scope
`pablos-product-team-projects`, el despliegue salió `readyState: READY` y
`gripm.vercel.app` quedó como URL de producción del proyecto. El badge del README se agregó
después, con la URL viva, y por eso el AC #5 está tildado. El modo de despliegue es manual
y deliberado; ver **DEV-263**.

### Estado de los criterios de aceptación (2026-10-14)

**4 de 4 tildados con aserción real.** Los otros dos criterios originales se retiraron del
ítem, cada uno a su propio ítem, con el motivo escrito en el lugar del AC:

| AC original | Destino | Motivo |
| :--- | :--- | :--- |
| #3 adaptación a móvil | **DEV-264** (+ DEV-207) | Descope del PO. La evidencia de escritorio que se llevó consigo —la columna `Completado` cortada a 1280×800— quedó registrada |
| #4 selector de formato dual | **DEV-265** | Es un afordance de **pitch**, no parte del entregable de la sandbox. El objetivo de este ítem es que la app funcione sin daemon; que la demo comunique mejor es otro objetivo, y atarlos al mismo criterio de cierre mezclaba dos cosas de naturaleza distinta |

| AC vigente | Aserción |
| :--- | :--- |
| #1 | `npm run build` exit 0; deploy `readyState: READY`; deep link `/cualquier/ruta` → 200 html; `/api/data` → 404 text/plain |
| #2 | Auditoría en navegador sobre la URL pública: monta en modo sandbox, **exactamente 1** request a `/api/data`, 0 `pageerror`, 7 ítems renderizados |
| #5 | Badge `Live Demo` en línea 21 y párrafo con el enlace en línea 25 de `README.md` y `README.es.md`; verificado con grep |
| #6 | `npm test` 17/17 y `npm run backlog:check` exit 0 |

> [!NOTE]
> **El ítem pasó de `review` a `ready` tras la certificación de QA** (`88a7276`), que es lo
> que corresponde: `ready` lo mueve la certificación, no el desarrollo. Que el código esté
> commiteado en `main`, desplegado y verificado no sustituye esa certificación: son capas
> distintas. La certificación cubrió los AC #1, #2, #5 y #6; **el AC #3 (mobile) sigue
> withdrawn y sin verificar** — la tabla de arriba no lo lista porque no hay aserción que lo
> sostenga.

### Lo que NO se resolvió acá, y quedó en el backlog

| Deuda | Ítem |
| :--- | :--- |
| Sin tests del adaptador sandbox ni del detector (~480 líneas) | **DEV-262** |
| Deploy manual, dominio como alias, Node 24 en producción | **DEV-263** |
| Hacinamiento en escritorio, columna `Completado` cortada | **DEV-264** |
| Selector de formato dual, afordance de pitch | **DEV-265** |

Ninguna bloquea el cierre de este ítem, y todas son más grandes que él en alcance. Que
existan y queden escritas es lo que evita que la demo se lea como producto terminado cuando
todavía no lo es.
<!-- SECTION:NOTES:END -->
