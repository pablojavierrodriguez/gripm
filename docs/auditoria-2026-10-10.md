# Auditoría Integral de gripm — 2026-10-10

> **Estado:** informe de revisión. **Nada de lo que está aquí fue implementado todavía.**
> **Alcance:** `@gripm/board@1.1.0`, commit `f9dadc3`, rama `main`.
> **Motivo:** el producto acumuló 8 releases y ~232 tareas en 5 días con una tasa de
> incidentes de CI y de retrabajo fuera de rango. Este documento busca explicar por qué,
> y dejar cada hallazgo en un estado verificable antes de tocar una sola línea.

---

## 0. Cómo usar este documento

### 0.1 Convención de identificadores

Cada hallazgo tiene un ID estable. **Un hallazgo no se cierra hasta que su verificación
pasa, no hasta que alguien dice que lo cerró.** Los IDs sirven para que las tareas, los
commits y las revisiones puedan referirse a algo concreto.

| Prefijo | Significado | Fase de resolución |
|---|---|---|
| `SEC-xx` | Seguridad | Fase 2 — antes de la siguiente release |
| `BUG-xx` | Defecto funcional | Fase 0 — P0 |
| `GATE-xx` | El gate de calidad no cumple su contrato | Fase 1 |
| `TOOL-xx` | Defecto de tooling / scripts | Fase 1–3 |
| `PROC-xx` | Proceso, datos o trazabilidad | Fase 3 |
| `DOC-xx` | Documentación y reglas | Fase 3 |
| `ARCH-xx` | Deuda técnica estructural | Fase 4 |
| `OK-xx` | Acierto a preservar | Nunca |

### 0.2 Niveles de confianza

- **CONFIRMADO** — verificado leyendo el código, ejecutando el comando, o comparando
  bytes/hashes. Incluye la referencia `archivo:línea`.
- **SOSPECHA** — el patrón está presente pero el resultado en runtime depende de
  condiciones no ejecutadas en esta auditoría.

Un hallazgo `CONFIRMADO` puede estar equivocado si el razonamiento es incorrecto; por eso
cada uno lleva su evidencia y su comando de verificación, para que cualquiera lo
deshaga.

### 0.3 Por qué este informe tiene IDs y no un "análisis general"

El informe anterior de auditoría (`docs/informe-auditoria.md`, 50 KB, ya obsoleto) cerró
en `DEV-181` con sus recomendaciones ejecutadas, pero **no dejó nada verificable**: no
había forma de saber, seis meses después, si un hallazgo seguía abierto. Un informe que
no se puede auditar a sí mismo se convierte en prosa. La diferencia entre ambos es la
sección 11.

### 0.4 Fe de erratas

Este informe se corrigió el 2026-10-10, después de que un revisor cuestionara un hallazgo.
Se registra el error acá a propósito: **un hallazgo retractado vale más para la confianza
en el resto que un informe que nunca admite fallar.**

| Fecha | ID retractado | Qué se corrigió |
|---|---|---|
| 2026-10-10 | `PROC-10` (`.gitignore` ignora `backlog/`) | **Hallazgo fabricado.** Ver abajo. Los IDs `PROC-11`…`PROC-17` se renumeraron a `PROC-10`…`PROC-16`. |

**Causa del error.** El hallazgo surgió leyendo
`Get-Content .nvmrc, .node-version, .editorconfig, .prettierrc, .prettierignore, .gitignore`
— un solo comando sobre seis archivos. PowerShell concatena varios paths **sin separador y
sin encabezado de nombre**, y el bloque `node_modules/ dist/ bin/ backlog/ .devboard/
*.local* package-lock.json` que se atribuyó a `.gitignore` era en realidad
**`.prettierignore`** (línea 4), el archivo inmediatamente anterior en la lista.

**Por qué el comando de verificación no lo detectó.** El hallazgo se marcó `CONFIRMADO` con
`git check-ignore -v backlog/tasks/<nueva>.md`. Ese comando **salta por defecto los
archivos que ya están en el índice**; como `backlog/*`, `package-lock.json` y `bin/*`
están trackeados, ninguno fue evaluado y la salida fue vacía para todos. El único patrón
reportado fue `dist/index.html`, que es el único no trackeado. El falso negativo
*confirmó* la lectura equivocada en vez de contradecirla. La forma correcta de evaluar
reglas sobre archivos ya trackeados es `git check-ignore -v --no-index <path>`.

**Estado real verificado.** `.gitignore` tiene 42 líneas y **no** contiene `backlog/`,
`bin/` ni `package-lock.json`. `git check-ignore -v --no-index` devuelve vacío para
`backlog/tasks/DEV-233 — …md`, `package-lock.json`, `bin/gripm.js` y
`backlog/releases.json`. No hay tal mina.

**Lección operativa.** Un hallazgo marcado `CONFIRMADO` cuyo comando de verificación fue
escrito —y mal escrito— por el mismo auditor no es evidencia: es una afirmación con
decoración. La contra-medida adoptada para el resto del informe: **todo hallazgo de
configuración se verificó releyendo el archivo con número de línea**, no encadenando
lecturas.

**Hallazgo menor que sí sobrevivió y que este error ayudó a encontrar.**
`.gitignore:32` declara `data/dev-board.json` — marca pre-1.0. Corrobora `DOC-16`
(`bug_report.yml:45` apunta a `.devboard/backlog.json`): la marca vieja sobrevive en tres
archivos visibles para el usuario final.

---

## 1. Veredicto ejecutivo

**El gate de calidad estuvo verde todo el tiempo porque midió presencia de código, no
comportamiento.**

`npm test` corre 16 pasos en 31.8 s y pasa. Mientras tanto, cinco modales lanzan un error
de React y matan la aplicación al abrirse. El verificador que debía detectarlo existe,
tiene el chequeo correcto — y lo aplicó **únicamente al único archivo que ya complyía**.

Hay tres fallos estructurales en cascada:

1. **Se documentó la regla sin construir el mecanismo.** `test:linux` está declarado
   obligatorio y no corre en ningún workflow. `verify-changes.js` —el gate que cubre las
   clases de defecto que la pirámide no cubre— solo corre en el hook local. `audit:ux`
   no puede fallar en Windows. La regla escrita más el gate ausente se contaron como
   cumplimiento.

2. **Se certificó por inspección, no por aserción.** `AGENTS.md §4` exige que cada AC
   tildado tenga un comando ejecutable — y desde `DEV-134` se cumple. Pero los
   *verificadores* se escribieron como `assert(src.includes(...))` sobre el texto del
   archivo. Resultado: un gate que detecta renombres y no bugs.

3. **Se elongó el proceso en vez de acortarlo.** 16 skills (cinco de ellas de stacks que
   el proyecto no usa), tres máquinas de estado que se contradicen, cuatro pirámides de
   verificación distintas, y cuatro de ocho tags de versión apuntando a commits
   `fix(ci)`.

### 1.1 Números que sostienen el veredicto

| Métrica | Valor | Lectura |
|---|---|---|
| Commits totales | 32 | En 5 días (2026-10-05 → 10-09) |
| Líneas + / − | 67.240 / 4.871 | 6.8% de borrado: el código solo crece |
| Tareas creadas antes del primer commit | 137 de 229 (59.8%) | Sin trazabilidad posible |
| Releases declarados | 15, de los cuales 7 pre-commit | `releases.json` |
| Tags de versión que apuntan a `fix(ci)` | 4 de 8 | v1.0.2, v1.0.3, v1.0.5, **v1.1.0** |
| Commits con ID de tarea en el subject | 12 de 32 (37.5%) | Cobertura de trazabilidad: 7% |
| Tareas en `doing` / `review` / `ready` | 0 / 0 / 0 | El pipeline tiene el medio vacío |
| Tareas en `done` | 204 (89.1%) | Prohibido por `AGENTS.md §1` |
| ACs no concretas (sin comando/path/cantidad) | 535 de 1.272 (42.1%) | Contra el `§4` |
| Líneas de `src/` cubiertas por tests unitarios | ~116 de 14.216 (**0.8%**) | 6 monolitos sin cobertura |
| Scripts de `scripts/` huérfanos | 3 | Uno es la única cobertura de un módulo |
| Superficie de docs | ~326 KB | ~150 KB borrables sin perder una regla exigible |
| Findings de `audit:ux` que el baseline no puede absorber en Windows | 278 de 278 | `GATE-03` |

---

## 2. Origen de los datos

- Historia completa: 32 commits, `--numstat` por commit.
- Árbol de trabajo: 365 archivos de texto escaneados con round-trip UTF-8.
- Los cuatro ejes se auditaron por separado y en paralelo: `src/`, `scripts/`,
  capa de reglas/documentación, y artefactos de proceso.
- `npm test` ejecutado localmente (16/16 en verde) para establecer el estado real.
- `npm pack --dry-run` ejecutado para medir la superficie de distribución.
- Cross-check contra `@gripm/playbook@2.2.2` para determinar el origen de
  `audit-ux-code.cjs` y `ux-rules.json`.

**Reproducir la pirámide:** `npx tsc --noEmit && npm test && npm run backlog:check &&
npm run audit:ux && npm run build && npm run publish:check`.

---

## 3. P0 — Defectos funcionales que llegan a producción

### BUG-01 · React lanza y la app muere al abrir cinco modales

**CONFIRMADO.** `useFocusTrap` se llama **después** de un `if (!isOpen) return null`.
React prohíbe hooks condicionales: al pasar `isOpen` de `false` a `true` el conteo de
hooks crece y React lanza *"Rendered more hooks than during the previous render"*.

Como los padres montan el componente **incondicionalmente**, la instancia ya existe del
render anterior. El resultado es un throw, no un render vacío.

| Archivo | Early return | Llamada al hook | Padre lo monta |
|---|---|---|---|
| `src/components/ProjectModal.tsx` | L67 | **L94** | `src/App.tsx:1419` incondicional |
| `src/components/ImportWizardModal.tsx` | L122 | **L126** | `src/App.tsx:1438` incondicional |
| `src/components/SprintModal.tsx` | L100 | **L127** | `src/components/SprintView.tsx:1245` incondicional |
| `src/components/FolderPickerModal.tsx` | L58 | **L78** | `src/components/ProjectModal.tsx:266` incondicional |
| `src/components/CompleteSprintModal.tsx` | L59 | **L100** | `src/components/SprintView.tsx:1266` incondicional |
| `src/components/ItemModal.tsx` | L414 | L229 ✅ correcto | — |
| `src/components/ConfirmModal.tsx` | L53 | L34 ✅ correcto | — |

**Reproducir:** abrir "Nuevo proyecto" desde el header. Pantalla en blanco hasta que el
error boundary de `src/main.tsx:15` la captura.

**Verificar el cierre:**
```powershell
# Por cada modal, el call a useFocusTrap debe estar ANTES del early return
foreach($f in @('ProjectModal','PlanGuardModal','ImportWizardModal','SprintModal',
                'FolderPickerModal','CompleteSprintModal')){
  $p="src/components/$f.tsx"
  $e=(Select-String -Path $p -Pattern 'if \(!isOpen\) return null'|Select-Object -First 1).LineNumber
  $c=(Select-String -Path $p -Pattern '=\s*useFocusTrap'|Select-Object -First 1).LineNumber
  "{0} early={1} trap={2}" -f $f,$e,$c
}
```

> **Este bug y `ARCH-06` son el mismo hallazgo visto desde dos ángulos.** La causa raíz es
> que el andamiaje de modal está copiado a mano en ocho archivos. Arreglar los cinco sin
> extraer un primitivo `<Modal>` garantiza la reaparición en el próximo modal.

### BUG-02 · Rama SSE muerta: `settings_changed` nunca se despacha

**CONFIRMADO.**
- `src/api.ts:277` — `BoardEventType` no incluye `'settings_changed'`.
- `src/api.ts:298` — solo se registra `es.addEventListener('backlog_changed', …)`. Los
  eventos SSE con nombre **no** llegan a `onmessage`.
- El servidor sí lo emite: `vite.config.ts:1428`.

La rama de `src/App.tsx:332` es código muerto. El toast "Configuración sincronizada con
cambios en disco" no puede dispararse nunca, y una edición externa de `.gripm/config.json`
nunca llega a la UI.

**Verificar:** `grep -n "settings_changed" src/api.ts src/App.tsx vite.config.ts`

### BUG-03 · Enter sobre "Cancelar" ejecuta la acción destructiva

**CONFIRMADO.** `src/components/ConfirmModal.tsx`:
- L44-46 — un listener `window` de keydown dispara `handleConfirm()` ante **cualquier**
  Enter. Si el usuario tabulariza hasta "Cancelar" y pulsa Enter, se borra.
  No hay chequeo de target, al contrario que en `src/App.tsx:350-358` que sí distingue
  `INPUT/TEXTAREA/SELECT`.
- L55-63 — `try { await onConfirm() } finally { setLoading(false); onClose() }` **sin
  `catch`**. Si `onConfirm` rechaza, la excepción escapa como unhandled rejection *y*
  el modal se cierra igual, ocultando el fallo.
- L51 — deps `[isOpen, loading, onClose]`; `onConfirm` ausente. Los callers pasan
  lambdas inline (`ItemCard.tsx:658`, `TrashView.tsx`, `Header.tsx:663`), así que Enter
  puede borrar el `item.id` capturado antes.

**Este modal es el que se usa para borrado definitivo de tareas.**

### BUG-04 · El formulario del release se borra por cambios no relacionados

**CONFIRMADO.** `src/components/ReleaseAssembler.tsx:118` — el efecto de sincronización
del drawer tiene `items` entre sus deps. `items` cambia en cada drag, cambio de estado o
evento SSE. Cada uno de esos cambios re-ejecuta el efecto y **resetea los siete campos de
edición**, destruyendo cambios sin guardar del usuario a mitad de edición.

**Verificar:** eliminar `items` del array de deps y comprobar con un cambio de estado
concurrente.

### BUG-05 · Rollback optimista desde estado obsoleto

**CONFIRMADO.** `src/App.tsx:502` — `setBoardData({ ...boardData, items: prevItems })`
captura `boardData` del momento de creación del callback. Si otra actualización llegó
entre la escritura optimista y el rechazo, **se descarta**.

El patrón correcto ya existe 100 líneas más abajo, en `handleReorderBacklogItem`
(`App.tsx:609`): `setBoardData(prev => ...)`.

### BUG-06 · Closure obsoleta en el handler global de teclado

**CONFIRMADO.** `src/App.tsx:342-378` — el efecto tiene deps `[]` (L378) pero lee
`config?.defaultView` en L346. El atajo `⌘,` queda clavado en el valor del primer render.

### BUG-07 · Fetch sin `res.ok` y sin cancelación, con `any[]`

**CONFIRMADO.** `src/components/SprintView.tsx:122-130` — `fetch('/api/retros')` con:
- sin chequeo de `res.ok` (un 500 devuelve HTML, `.json()` lanza dentro de un `.catch` mudo),
- sin `AbortController` (cambios rápidos de `projectId` compiten),
- `useState<any[]>([])` en L119 — fuga de tipos en un archivo estrictamente tipado,
- salteando `src/api.ts` por completo, lo que lo hace invisible a `test-api-security.js`.

Es el **único** `fetch` directo a `/api` fuera de `src/api.ts` en todo `src/`.

### BUG-08 · Número mágico `0.2.0` usado como sentinel de estado

**CONFIRMADO.** `src/components/ReleaseAssembler.tsx:155,159` — una release realmente
numerada `0.2.0` queda clasificada como `released` para siempre, y cualquier otra release
legacy como `unreleased`. Datos de dominio hardcodeados en un filtro genérico.

### BUG-09 · Escape cierra el drawer desde dentro de un textarea

**CONFIRMADO.** `src/components/ReleaseAssembler.tsx:142-151` — sin guard de target,
a diferencia de `src/App.tsx:350-358` e `src/components/ItemModal.tsx:294`.

### BUG-10 · Toast de "copiado" sin verificar la escritura

**CONFIRMADO.** `src/components/ItemCard.tsx:353` y `src/components/PlanGuardModal.tsx:60`
— `navigator.clipboard.writeText(prompt)` sin `.catch` ni `await`, y el toast de éxito se
dispara igual. `navigator.clipboard` rechaza en orígenes no seguros, que es el caso
normal de un dev server servido por IP de LAN. El patrón correcto existe en
`src/components/ReleaseAssembler.tsx:359-366`.

### BUG-11 · Carrera en `loadData`

**CONFIRMADO.** `src/App.tsx:285-320` — `loadData` se recrea en cada cambio de proyecto
(deps `[selectedProjectId, showToast]`), y el efecto que lo dispara no tiene
`AbortController`, ni token de secuencia, ni guarda de desmontaje. `new AbortController`
aparece **0 veces** en todo `src/`. Dos cambios rápidos de proyecto pueden resolver fuera
de orden y pintar los ítems del proyecto equivocado.

### BUG-12 · Timers de toast sin cleanup

**CONFIRMADO.** `src/App.tsx:247-249` — los timers de auto-cierre nunca se limpian al
desmontar ni cuando el usuario descarta antes. `setToasts` se invoca sobre un componente
desmontado.

### BUG-13 · Alias de estado legacy en el atajo `N`

**CONFIRMADO.** `src/App.tsx:363` — `setDefaultNewStatus('backlog')`. Todos los demás
paths usan `'draft'` (`App.tsx:1212`, `KanbanBoard.tsx:1099`). `backlog` es un alias
deprecado (`types.ts:24`, `statusMeta.ts:35`). Pulsar `N` persiste un estado legacy.

### BUG-14 · El fallback de i18n pierde parámetros

**CONFIRMADO.** `src/utils/i18n.tsx:56-57` reemplaza `{{k}}` y `{k}`; el fallback de L92
solo reemplaza `{{k}}`. `useTranslation()` fuera de un provider descarta silenciosamente
los parámetros de una llave.

### BUG-15 · Los toasts son invisibles para lectores de pantalla

**CONFIRMADO.** `src/components/Toast.tsx:19` — sin `role="status"`, sin `aria-live`, sin
`role="alert"`. Los toasts de error son el **único** canal de feedback de ~20 rutas de
fallo (`App.tsx:503,538,610,637,658,679,703,774,798`, `SettingsView.tsx:539`).

### BUG-16 · `createPortal` ausente en 10 de 13 overlays

**CONFIRMADO** — contradice directamente `AGENTS.md` regla 11 (`DEV-129`, `DEV-130`).
Solo existen 3 call sites: `ConfirmModal.tsx:114`, `ItemCard.tsx:414`,
`ReleaseAssembler.tsx:660,1087`.

Dos overlays no tienen ni portal, ni `role="dialog"`, ni `aria-modal`, ni trampa de foco,
ni manejo de Escape:
- `src/components/SprintView.tsx:1306-1308` (modal de retrospectiva)
- `src/components/Header.tsx:511-519` (drawer móvil)

`verify-focus-trap.js:19-20` afirma haber enumerado "cada overlay de la app" y lista 8.
El número real de `fixed inset-0` en `src/` es 13.

### BUG-17 · Sin safe-area en elementos fijos

**CONFIRMADO.** `grep -n "env(safe-area" src/` → **0 coincidencias**.
- `src/App.tsx:1452` — navegación inferior móvil `fixed bottom-0` sin
  `padding-bottom: env(safe-area-inset-bottom)`. Con indicador de inicio en iOS, la
  última tab queda parcialmente oculta.
- `src/components/Toast.tsx:19` — `fixed bottom-5` con `z-50`, **por encima** de la nav
  (`z-40`): los toasts tapan la navegación móvil.
- `src/components/Header.tsx:122` — `sticky top-0` sin `env(safe-area-inset-top)`.

### BUG-18 · Botones de solo icono sin nombre accesible

**CONFIRMADO.** `PlanGuardModal.tsx:117-122`, `SprintModal.tsx:154-160`,
`Toast.tsx:37-42`, `FilterBar.tsx:185` — sin `aria-label`. Contradice lo que sí hacen
`Header.tsx:499,533` e `ItemCard.tsx:408`: la aplicación es inconsistente consigo misma.

### BUG-19 · Labels sin `htmlFor`

**CONFIRMADO.** `ItemModal.tsx:144-146` y `PlanGuardModal.tsx:144-146` — `<label>` sin
`htmlFor` y campos sin `id`. También `KanbanBoard.tsx:901-922` (el `<select>` de sprint
no tiene label ni `aria-label`).

---

## 4. P0 — Seguridad

### SEC-01 · Ejecución de comandos persistida en el backlog versionado

**CONFIRMADO.** `scripts/mcp-server.ts`:

```js
L997   const verifyCmd = args.verifyCommand || current.rawExtraFrontmatter.verifyCommand;
L1024  if (args.verifyCommand) current.rawExtraFrontmatter.verifyCommand = args.verifyCommand;
```

Un `verifyCommand` arbitrario se **escribe en el `.md` de la tarea, se commitea, y se
re-ejecuta automáticamente en cada transición futura de esa tarea**. Quien empuje una
tarea con `verifyCommand` en el frontmatter obtiene ejecución de código en la máquina del
próximo agente que la cierre.

No hay allowlist, ni validación, ni dry-run. `execSync` corre con `timeout: 120000`
dentro del event loop del servidor MCP: durante esos 2 minutos **el servidor no responde
a nada**, ni `tools/list`.

**Verificar:** `grep -n "verifyCommand" scripts/mcp-server.ts`

### SEC-02 · El agente muta el backlog del usuario y tilda ACs no verificados

**CONFIRMADO.** `scripts/mcp-server.ts:1181` — `const autoFix = args.autoFix !== false;`
El default es **`true`**. Con `autoFix` activo (`:1222-1223`) el servidor convierte
`- [ ]` en `- [x]` en toda tarea `done` con ACs pendientes: **fabrica evidencia de
verificación**.

Peor: el único test del tool, `scripts/verify-mcp-binary.js:82-84`, lo invoca con
`autoFix: false`. **La parte peligrosa nunca se testea.**

### SEC-03 · El servidor MCP escribe fuera de cualquier containment

**CONFIRMADO.** `scripts/mcp-server.ts:99-104` acepta `--repo <ruta arbitraria>` y lo usa
como base de lectura **y escritura** de `backlog/tasks/*.md` (`getTasksDir`, L136-139).
No hay `isAllowedBrowsePath` — la función que el dev server HTTP **sí** aplica
(`vite.config.ts:160-176`).

**Asimetría:** el servidor HTTP, con menos privilegios, valida containment de rutas. El
servidor MCP, que además ejecuta shell, no lo hace.

### SEC-04 · `gripm_list_projects` expone el filesystem de otros proyectos

**CONFIRMADO.** `scripts/mcp-server.ts:475-486` — `getRegistry()` (`:90-134`) lee
`~/.gripm/registry.json` y expone el `repoPath` de **todos** los proyectos registrados.
Un agente conectado ve las rutas del disco de los demás proyectos del usuario.

### SEC-05 · `inputSchema` decorativo: los 12 tools no validan sus argumentos

**CONFIRMADO.** `scripts/mcp-server.ts:236-465` declara JSON Schema para 12 tools;
`handleToolCall(name, args: any)` (`:471`) no valida nada contra ese schema.

Casos concretos:
- `gripm_list_tasks` con `limit: "abc"` → `tasks.slice(0, "abc")` sin crashear ni validar.
- `gripm_update_task` con `toggleAcIndex: 0` o `-1` → **no-op silencioso**. `AGENTS.md`
  gotcha 2 dice "secuencial, nunca paralelizar" — el código no lo fuerza, solo lo documenta.

### SEC-06 · `--host 0.0.0.0` expone el backlog completo a la LAN

**CONFIRMADO, y es un trade-off documentado.** `vite.config.ts:1239-1240` — `isIpHost`
acepta cualquier IPv4. Con `GRIPM_HOST=0.0.0.0`, **cualquier IP de la LAN pasa el check
de Host sin Origin**. `test-api-security.js:146-156` lo testea y lo acepta como correcto.

Combinado con la ausencia total de autenticación, es lectura/escritura completa del
backlog para toda la red local. `bin/gripm.js:230` advierte al usuario, pero no hay token,
ni warning en la respuesta, ni límite de permisos.

### SEC-07 · El home directory es una raíz válida para el file browser

**CONFIRMADO, y testeado como correcto.** `vite.config.ts:119` — `roots.push(
path.resolve(homedir))`. `/api/fs/browse` puede listar **el home entero**.
`test-api-security.js:199-212` lo verifica. No es un bug de containment; es una raíz
demasiado amplia para un endpoint de navegación de archivos.

### SEC-08 · El guard de fugas hardcodea la ruta del mantenedor y solo cubre macOS

**CONFIRMADO.** `scripts/verify-publish-surface.js:37-38`:

```js
{ label: 'ruta absoluta de home de usuario', re: /\/Users\/[a-z0-9_-]+\//i },
{ label: 'ruta de proyectos del autor',    re: /Pablo\/code\// },
```

El script cuyo propósito es no filtrar el entorno del mantenedor **incluye el path del
mantenedor en su fuente**. Además solo detecta fugas con forma macOS: una fuga Windows
(`C:\Users\Pablo\...`) o Linux (`/home/pablo/`) pasa. **Y CI corre `windows-latest`.**

Corolario ya materializado: `.playbook-lock.json` contiene
`"playbook": "C:\\Users\\Pablo\\Proyectos\\gripm-playbook"` commiteado. Es exactamente el
defecto que `DEV-118` y `DEV-120` fueron creados para eliminar, ambos `done`.

### SEC-09 · `force: true` salta el gate sin dejar rastro

**CONFIRMADO.** `scripts/mcp-server.ts:985,1090` — `force` desactiva la verificación sin
loguear nada. Ni en el archivo, ni en la respuesta.

### SEC-10 · No hay autenticación, y no está declarado como superficie de riesgo

**CONFIRMADO.** `grep` de `auth|token|permission` en `scripts/mcp-server.ts`: 5 matches,
**todos dentro de strings de description o de la palabra "tokens" de un mensaje**. Cero
enforcement. Para un servidor stdio es aceptable (la frontera es el proceso padre), pero
`AGENTS.md` no lo declara bajo ningún encabezado de seguridad, y hoy convive con
`SEC-01` sin que nadie lo note.

---

## 5. Gates de calidad que no cumplen su contrato

### GATE-01 · `verify-changes.js` nunca corre en CI

**CONFIRMADO.** Es el gate que `AGENTS.md §4` presenta como respuesta a "las clases de
defecto que la pirámide no cubre" (YAML inválido, `import()` con rutas del filesystem,
corrupción de codificación, slugs). Corre **exclusivamente** en `.githooks/pre-commit`.

Un squash desde la UI de GitHub, un `git commit --no-verify`, o un contributor sin hooks
instalados → los cuatro tipos de defecto llegan a `main` sin verificar.

### GATE-02 · El gate Linux existe, funciona, y nunca se ejecutó

**CONFIRMADO.** `AGENTS.md §4` declara `npm run test:linux` **obligatorio** para cambios
en runtime, CI, I/O o filesystem. `grep test:linux .github/workflows/*.yml` → **0
coincidencias**.

El gate se creó a raíz de dos bugs que **ocurrieron en Linux**: `60bacef` (el sondeo de
puertos podía colgarse para siempre) y `4ab0411` (207 watchers sin cerrar). Ninguno fue
detectado por el gate que motivó su creación. Se descubrieron a mano, después.

### GATE-03 · El baseline de `audit:ux` no puede absorber nada en Windows

**CONFIRMADO — mecanismo exacto.** `audit-ux-code.cjs` y `ux-rules.json` son copias
**byte-idénticas** de `@gripm/playbook@2.2.2` (vendorizado; `sync-playbook.mjs:76` los
incluye en `FALLBACK_CORE_FILES`).

```
scripts/audit-ux-code.cjs:792   const relPath = path.relative(root, filePath);
                                → en Windows: "src\App.tsx"   (barras invertidas)
audit-ux-baseline.json          claves: "UX-011|src/App.tsx|e609aca4e519"  (278 entradas)
```

`toPosixPath` existe (`:312`) pero se aplica **solo al filtrado de `exclude`** (`:366`),
nunca al `relPath` que alimenta `fingerprint()` (`:886`).

**Consecuencia medida:** en Windows las 278 entradas fallan el match, se re-reportan como
nuevas, y como `ERROR: 0` el exit sigue siendo 0. La leg `windows-latest` del matrix de
CI **no aporta nada** en el gate de UX.

**Verificar:**
```powershell
node scripts/audit-ux-code.cjs --format json | Select-String 'baseline|absorbed'
node -e "console.log(Object.keys(require('./audit-ux-baseline.json').entries).slice(0,2))"
```

### GATE-04 · Un verificador se auto-desactiva en Windows y se reporta como aprobado

**CONFIRMADO.** `scripts/verify-audit-ux-baseline.js:126-137` detecta `isWindows` y
**omite las aserciones de delta**, imprimiendo un warning.

Esto es literalmente lo que `scripts/verify-changes.js:24` prohíbe: *"Un check que no
puede correr se reporta como omitido, nunca como aprobado."*

### GATE-05 · Gates que tragan su propia falla

**CONFIRMADO.** `scripts/verify-backlog-sync.js` tiene tres `catch` mudos que hacen
desaparecer reglas enteras:

| Línea | Qué desaparece |
|---|---|
| `:262-264` | Las 3 reglas de documentación (versión de README, conteo de tools MCP, refs a `legacyParser.ts`) |
| `:287-289` | **REGLA 4** — todo ítem de un release `released` debe estar en `done` |
| `:305-307` | **REGLA 5** — integridad de `backlog/sprints.json` |

Si `releases.json` o `sprints.json` se corrompen, **la Invariante Fundamental de
`AGENTS.md §1` no se verifica y el gate sale verde**.

### GATE-06 · El MCP devuelve `ok: true` tras un fallo de escritura

**CONFIRMADO.** `scripts/mcp-server.ts:723` — `} catch {}` en el bulk update. Un
`writeFileSync` fallido (permisos, disco lleno, archivo bloqueado en Windows) se traga;
`updatedCount` no se incrementa, el tool responde `{ ok: true, ... }` y **el agente cree
que la mutación se aplicó**.

Combinado con `readTasksForProject:216-218` (también `catch` mudo, "skip unparseable
files"), una tarea corrupta desaparece del listado **y del cálculo de `maxNum`** → riesgo
directo de colisión de IDs en `gripm_create_task:839`.

### GATE-07 · `npm test` no incluye el smoke test de navegador

**CONFIRMADO.** `scripts/test-ui-smoke.js` (Playwright) no está en los `STEPS` de
`scripts/run-tests.js:29-46`. Corre solo en el job `ui-smoke` de CI.

Un desarrollador que vuelve a su loop con `npm test` obtiene verde sin la única prueba que
abre un navegador. **De ahí que `BUG-01` pasara: el smoke test nunca abre ninguno de los
cinco modales que crashean.**

### GATE-08 · Cuatro de dieciséis tests son "grep con assertions"

**CONFIRMADO.** Assertan sobre el **texto del archivo fuente**:

| Suite | Qué hace realmente |
|---|---|
| `scripts/verify-focus-trap.js` | `assert(src.includes('role="dialog"'))` y similares. No ejecuta nada. |
| `scripts/verify-kanban-reorder.js` | **Reimplementa** `nextOrder` (`:22-43`) y testea la copia; luego grepea el componente |
| `scripts/verify-port-probe.js:66-83` | asserts sobre strings del source |
| `scripts/test-parser.js` (parcial) | asserts sobre strings del source |

Un refactor cosmético los rompe; un bug semántico real los pasa.

### GATE-09 · El checker correcto se aplicó al único archivo que ya complyía

**CONFIRMADO — y es el corazón de `BUG-01`.** `scripts/verify-focus-trap.js:80-86`
implementa la verificación de orden de hooks (comparar el índice del hook contra el del
early return). El autor identificó exactamente el invariante correcto — **y lo aplicó
solo a `ItemModal`**, el único de los ocho que ya pasaba. Los cinco violaciones quedaron
al lado, sin marcar, durante 8 releases.

### GATE-10 · `npm pack` muta el repositorio, contra su propio contrato

**CONFIRMADO.** `scripts/verify-publish-surface.js:20` declara:

> `CONTRATO: solo verifica. Nunca muta el repositorio ni el índice de Git.`

`:74` corre `npm pack`, que dispara el lifecycle script `prepare`
(`package.json:90` → `scripts/prepare-hooks.js:13`):

```js
execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
```

**`npm run publish:check` muta el `.git/config`.** Es idempotente y en la práctica
inofensivo, pero el contrato declarado es falso y es exactamente la clase de sorpresa
que hace que un guard de seguridad pierda credibilidad.

### GATE-11 · Dos tests ensucian el backlog real con cleanup fuera de `try/finally`

**CONFIRMADO.**
- `scripts/verify-mcp-binary.js:13-18` escribe
  `backlog/tasks/DEV-998 - Gatekeeper Test Task.md` en el backlog real. El cleanup
  (`:221-228`) está **fuera de cualquier `try/finally`**.
- `scripts/verify-resilience-and-cli.js:8-26` escribe `anomalous-orphan-task-file.md` y
  una `DEV-999`.

Si el test falla antes del cleanup, el archivo queda. El siguiente `npm run backlog:check`
falla por una tarea fantasma. **Cicla.**

### GATE-12 · `npm test` no es la pirámide

**CONFIRMADO.** `AGENTS.md §4` describe 6 pasos. `npm test` es **1 de 6**. Los otros 5
(`tsc`, `backlog:check`, `audit:ux`, `publish:check`, `build`) existen solo en CI.

### GATE-13 · No hay linter de workflow

**CONFIRMADO.** No hay `actionlint` en el repo ni en CI. Seis errores de YAML y de
lógica de pipeline llegaron a producción. `hubot/actions` usa `actionlint` desde 2020.

### GATE-14 · `run-tests.js` parsea `--timeout` sin validar

**CONFIRMADO.** `scripts/run-tests.js:52-53` — `Number(args[timeoutArg + 1])` sin
validar. Con `--timeout` sin valor, o `--timeout foo`: `NaN` → `setTimeout(fn, NaN)`
dispara en ~1 ms → el backstop mata el primer paso instantáneamente con un mensaje que no
menciona el flag. Mismo bug en `scripts/watchdog.js:23`:
`Number(process.env.GRIPM_WATCHDOG_MS || 90_000)` — una variable de entorno vacía da
`Number('') === 0`, timer en 0 ms.

### GATE-15 · `--bail` está documentado y no implementado

**CONFIRMADO.** `scripts/run-tests.js:20` lo anuncia en el usage. Aparece una sola vez
en todo el archivo: la del comentario.

### GATE-16 · El margen del job de CI es negativo en el peor caso

**CONFIRMADO.** La suite es estrictamente serial y fail-fast (`run-tests.js:106`), con
timeout de 180 s por paso. `package-smoke` y `dist` **cada uno hace un `npm pack`**, y
cinco suites distintas hacen `await import('../vite.config.ts')` abriendo watchers
reales. Peor caso teórico: 16 × 180 s = 48 min. `.github/workflows/ci.yml:22` da **25
min al job completo**.

### GATE-17 · Dos gatekeepers con destinos distintos

**CONFIRMADO.**
```
scripts/verify-backlog-sync.js:186   fm.replace(/^status:.*$/m, 'status: ready');
scripts/mcp-server.ts:1211           fm.replace(/^status:.*$/m, 'status: Done');
```
Misma regla, mismo disparador (todos los AC tildados + estado en `{draft, doing}`),
**destinos distintos**. Y `Done` con mayúscula es exactamente lo que
`scripts/canonicalize-status.js` existe para corregir.

`npm run backlog:sync` y `gripm_sync_backlog` producen backlogs distintos desde el mismo
input.

---

## 6. Defectos de tooling

### TOOL-01 · `npm run lint` no es un linter

**CONFIRMADO.** `package.json:87` — `"lint": "tsc --noEmit"`. **No hay ESLint ni Prettier
instalados** (`grep '"eslint"' package.json` → sin match). El proyecto tuvo ESLint flat
config (`DEV-140`) y fue saneado después (`DEV-152`, que declara en su AC #1 borrar el
`eslint.config.js` muerto).

Consecuencia: los 44 archivos de `scripts/` son JavaScript **sin ninguna revisión
estática**. Por eso existen `catch {}` con variable sin usar (`mcp-server.ts:216`) y
comparaciones que el compilador no detecta.

### TOOL-02 · `npm run format` no formatea

**CONFIRMADO.** `package.json:88` — `"format": "node scripts/verify-backlog-sync.js --fix"`.
Ejecuta **`backlog:sync`**: regenera `BACKLOG.md`. El nombre es engañoso y el paso en
una wiki o CONTRIBUTING podría disparar una reescritura de 406 KB.

### TOOL-03 · Configuración de formato muerta

**CONFIRMADO.** `.prettierrc` y `.prettierignore` existen; Prettier no está en
`dependencies` ni en `devDependencies`.

### TOOL-04 · Tres scripts huérfanos

**CONFIRMADO** con `git grep` (sin referencias en `package.json`, `run-tests.js`, CI ni
hook):

| Archivo | Problema |
|---|---|
| `scripts/test-legacy-parser.js` | **Única cobertura de `src/utils/legacyParser.ts`.** Nadie lo corre. Es el patrón de `DEV-154` ("suite huérfana") reincidiendo. |
| `scripts/probe-linux-handles.sh` | Diagnóstico de `DEV-190`, ya muerto |
| `scripts/probe-handles.js` | Solo lo referencia el anterior → transitivamente huérfano |

### TOOL-05 · `.vscode/settings.json` aprueba un script inexistente

**CONFIRMADO.** `:9` auto-aprueba `npm run validate`. No existe en `package.json`.

### TOOL-06 · Helpers duplicados en 11 sitios

**CONFIRMADO.**

| Helper duplicado | Copias | Líneas redundantes |
|---|---|---|
| `MockRequest`/`MockResponse`/`dispatch` | 4 suites | ~120 |
| `fallbackId = f.split(' - ')[0] \|\| …` | 11 sitios en 5 archivos | 11 copias de una regla no trivial |
| `closedStatuses = ['done','dismissed','released','cancelled']` | 4 | 4 |
| Lectura de `backlog/tasks/*.md` → items | `mcp-server.ts`, `gripm-cli.ts`, `vite.config.ts` | ~150, **3 implementaciones divergentes** |
| Bootstrap del plugin Vite en tests | 5 | 5 copias |

### TOOL-07 · `verify-integration.js` es un monolito fail-fast

**CONFIRMADO.** 904 líneas, 12 bloques heterogéneos (E2E disco, uninstall, hook,
config de Vite, storage) sin `describe`, sin runner, sin aislamiento. Un `assert` que
falla en el bloque 6 aborta los 6 restantes **sin decir cuáles corrieron**.

### TOOL-08 · El motor de auditoría UX está vendorizado con cobertura degradada

**CONFIRMADO por hash.** `scripts/audit-ux-code.cjs` (39.903 B, sha256 `d5e2edde…`) y
`scripts/ux-rules.json` (sha256 `3ae44d7e…`) son **byte-idénticos** a
`@gripm/playbook@2.2.2`.

Upstream trae **33 bloques de test** (`tests/audit-ux.test.mjs`) cubriendo exactamente
lo que el copy local sufre (`onlyFile`, `exclude` con globs, `UX-010`, `needsContent`,
invariantes del API, exit codes). Local hay **4**, uno desactivado en Windows (`GATE-04`).

**El archivo no se puede testear sin divergir del upstream** — que es exactamente lo que
`DEV-188` terminó resolviendo después de 270/358 líneas de divergencia.

Aparte: el commit `6159972` afirma verificar identidad byte a byte con el shasum
`4cf892994d96be4fbf5f1f5711ccb315937cd82f`. **Ese hash no corresponde a ningún artefacto
del repo** (los reales: SHA1 `3b1e16ea…`, sha256 `d5e2edde…`, git-blob `751c53f8…`). El
gate de integridad está basado en una afirmación no reproducible.

### TOOL-09 · `engines.node` es una declaración falsa

**CONFIRMADO.** `package.json:38` declara `">=20.0.0"`. **6 de los 16 pasos de la suite**
usan `--experimental-strip-types`, que requiere Node ≥ 22.6. En Node 20 la suite no
arranca. Además CI solo prueba `22.6.0` y `22.x` — la versión que se promete nunca se
ejercita. `DEV-223` ya está creada para esto, en `draft`.

### TOOL-10 · `test-package-smoke.js` concatena rutas sin comillas

**CONFIRMADO.** `:15` — `'npm pack --pack-destination ' + tempDir` dentro de `execSync`
con shell. Con un nombre de usuario que tenga espacios rompe. `verify-dist.js:29` lo hace
bien (`--pack-destination "${tmp}"`): inconsistencia entre dos scripts que hacen lo mismo.

### TOOL-11 · Migraciones one-shot que crashean fuera de la raíz

**CONFIRMADO.** `scripts/canonicalize-status.js:24` hace `readdirSync(TASKS_DIR)` sin
`existsSync`. `scripts/purge-fabricated-task-sections.js:51-62` usa `statSync` sin
try/catch. Ambos usan `process.cwd()` para la raíz mientras el resto usa `__dirname`.

### TOOL-12 · `updateChecker.js` no maneja prereleases

**CONFIRMADO.** `scripts/updateChecker.js:12-23` — `parseInt('1.2.0-beta.1', 10)` → `1`.
Una beta se trata como la release final; el banner puede ofrecer "actualizar" a una beta.

---

## 7. Proceso, datos y trazabilidad

### PROC-01 · El 60% de las tareas precede al control de versiones

**CONFIRMADO.** Primer commit: `af5780e`, 2026-10-05 10:20. Earliest `created_date`:
`2026-09-16`. **137 de 229 tareas (59.8%)** se crearon, cerraron y certificaron antes de
que existiera el repositorio.

`backlog/sprints.json` declara 9 sprints completados entre el 16-sep y el 4-oct. Las 4
retrospectivas son de esa ventana. `backlog/releases.json` declara 7 releases
(`0.2.0`–`0.7.0`) íntegramente previos.

**Lectura correcta:** es perfectamente válido haber desarrollado localmente antes de
abrir el repo público. La consecuencia no es deshonrosa, es operativa: **para 137 tareas,
su completitud está afirmada, no evidenciada**. Ninguna velocidad derivada de esas fechas
es falsable. `DEV-119` ("Reescritura Quirúrgica del Historial Git") es irónico: una tarea
sobre higiene del historial cuyo propio historial nunca existió.

### PROC-02 · El pipeline tiene el medio vacío

**CONFIRMADO.** `done: 204`, `draft: 17`, `ideas: 6`, `dismissed: 2`,
**`ready: 0`, `doing: 0`, `review: 0`**.

`AGENTS.md §1` dice: *"La meta terminal del desarrollador es `ready`. Queda terminantemente
prohibido marcar `done` durante el desarrollo."* El flujo descrito tiene cuatro etapas; la
observada tiene un salto de `draft` a `done`.

### PROC-03 · Trazabilidad de commit: 7%

**CONFIRMADO.** 12 de 32 commits (37.5%) citan un ID de tarea; 16 IDs distintos de 229
(7.0%) aparecen en algún subject. `AGENTS.md §3` exige `feat(DEV-XXX)` con
"trazabilidad unívoca".

### PROC-04 · Cuatro de ocho tags de versión apuntan a un `fix(ci)`

**CONFIRMADO.**

| Tag | Commit | Subject |
|---|---|---|
| v1.0.2 | `27fa944` | `fix(ci): eliminar npm_config_dry_run…` |
| v1.0.3 | `cad0b70` | `fix(ci): el guard de superficie corría antes del build` |
| v1.0.5 | `789a909` | `fix(ci): paridad multiplataforma…` |
| **v1.1.0** | `f9dadc3` | **`fix(ci): paridad multiplataforma en auditoría ux`** |

### PROC-05 · El pipeline se comiteó sin correr nunca

**CONFIRMADO.** `.github/workflows/publish.yml` se agregó en `8733c12` (10-05 22:40).
El 10-06 entre 15:05 y 16:18 — **73 minutos** — hubo seis correcciones:

```
15:05  890ac46  annotated tag: consultaba el ref local en vez del remoto
15:18  60bacef  el sondeo de puertos podía colgarse para siempre
15:38  757bb17  indentación de timeout-minutes que rompía el workflow
16:08  4ab0411  el cuelgue en Linux: 207 watchers sin cerrar
16:10  cad0b70  el guard de superficie corría antes del build → fallaba siempre
16:18  03b0785  publicar disparaba el workflow dos veces
```

Una clase de defecto, seis veces, en una hora. El tag v1.0.3 se cortó **en medio del
incendio** (16:10).

Además `v1.0.0` (10:20) y `v1.0.1` (16:37) se publicaron **antes** de que existiera
`publish.yml` (22:40) — es decir, a mano.

### PROC-06 · La invariante fundamental está violada tres veces

**CONFIRMADO.** Tareas en `done` sin release: **DEV-025, DEV-026, DEV-179**. Además
DEV-025 y DEV-026 llevan `release: "v1.2.0"` en frontmatter — **una versión que no existe
en `releases.json`**. Es el modo de fallo de "versiones fantasma" que `DEV-099` fue creado
para eliminar y que `AGENTS.md` regla 6 prohíbe. Recurrió.

### PROC-07 · Todos los sprints se cerraron antes del timebox

**CONFIRMADO.** 9 sprints, todos `completed`, **0 sprints abiertos**. Cumplimiento del
timebox: **0%**.

| Sprint | Timebox declarado | Duración real |
|---|---|---|
| sprint-3 | 7 días | **< 24 h** |
| sprint-5 | 1 día | **6 h 17 m** |
| sprint-6 | 1 día | **6 h 48 m** |
| sprint-8 | 7 días | 3.4 d |

`AGENTS.md §2` establece que el sprint "finaliza cuando vence su plazo programado
(duración fija), independientemente del progreso alcanzado". Además sprint-7
(26-sep→2-oct) y sprint-8 (30-sep→4-oct) **se solapan**, lo que contradice el modelo de
timeboxes secuenciales.

### PROC-08 · `AGENTS.md` se contradice a sí mismo

**CONFIRMADO.**
- §2: "Timebox: el sprint finaliza cuando vence su plazo programado (duración fija)".
- §16: "evitando la sobrecarga artificial de timeboxes de sprint".

Y `.gripm/config.json` tiene `"methodology": "kanban"` con `enabledTabs.sprint: false` —
**la tab de Sprint está desactivada mientras existen 9 sprints y 4 retros en disco.** La
regla 17 declara que el valor canónico es `sprint: true`: una regla que afirma el estado
del repo y se equivoca.

### PROC-09 · Preferencia personal commiteada en configuración

**CONFIRMADO.** `.gripm/config.json` está trackeada (`.gitignore` no la referencia) y
contiene `"autoSave": true` y `"rankingEnabled": true` — preferencias de UI por
desarrollador, sin significado de proyecto. La regla 17 lo prohíbe explícitamente.

### PROC-10 · ACs no verificables en el 42% de los casos

**CONFIRMADO.** 1.272 ACs totales; 737 (57.9%) citan comando, ruta, flag o cantidad;
**535 (42.1%) no lo hacen**. En 44 tareas (19.2%) **ningún** AC es concreto.

Ejemplos:
```
DEV-050 #5 : "Rendimiento optimizado a 60 FPS durante la interacción de arrastre"
DEV-079 #1-3: "mejora en columnas / sumar mas campos"     ← 3 ACs, sin definición
DEV-207 #5 : "Mejorar UX responsive del tablero en tablet y mobile"
```
"60 FPS" es infalsable tal como está escrito: no hay baseline medido, ni herramienta, ni
umbral.

**El gradiente de calidad es temporal, no aleatorio:** desde `DEV-134` (30-sep) los ACs
cierran con `npx tsc --noEmit finishes con código 0`. Antes de eso son prosa. La regla se
escribió y se aplicó — **nunca se aplicó retroactivamente**. 126 tareas (55%) se cerraron
bajo el régimen viejo y nunca se reexaminaron.

### PROC-11 · Integridad del AC ya regresó una vez sin re-verificación

**CONFIRMADO.** `DEV-161` AC #1 dice literalmente:

> `#1 node -e "…Object.keys(require('./package.json').bin).join(' ')"` devuelve
> **exactamente** `gripm gripm-mcp`

Hoy devuelve `gripm gripm-mcp board`. La AC está tildada, la tarea está `done`, y es
falsa. Un cluster posterior (rebranding) reintrodujo el alias `board`.

**No hay mecanismo que re-valide ACs de tareas cerradas cuando un cambio posterior las
invalida.** Es la razón por la que este informe existe.

### PROC-12 · Tareas cerradas sin evidencia de completitud

**CONFIRMADO.**
- **DEV-127** — `status: done` con **cero ACs**. Es la tarea sobre contenido fabricado, y
  se cerró sin un solo criterio.
- **23 tareas** en `done` con el `## Implementation Plan` **vacío**, lo que anula el Plan
  Guard que `DEV-152` documenta como activo.
- **DEV-124 y DEV-127** todavía contienen el marcador escapado
  `<\!-- SECTION:DESCRIPTION:BEGIN -->` que `DEV-127` existe para eliminar. El AC de
  `DEV-132` prohíbe escribirlo; ambos archivos lo hacen.
- **Ninguna tarea** cita `npm run test:linux` en sus ACs, pese a que `AGENTS.md §4` lo
  declara obligatorio para cambios en CI — incluidos `DEV-189`, `DEV-190`, `DEV-197`,
  `DEV-217`.

### PROC-13 · Clusters de retrabajo: 67 de 229 tareas (29.2%)

**CONFIRMADO.** Cinco familias, presentes a lo largo de toda la historia:

| Cluster | n | IDs representativos |
|---|---|---|
| Rebranding / marca | **14** | 043, 106, 143, 144, 149, 155, 161, 163, 176, 183, 195, 199, 227 |
| Scroll / estabilidad de layout | 8 | 010, 045, 063, 093, 094, 095, 098, 124 |
| CLI / MCP polish | 11 | 020, 023, 064, 076, 115, 145, 150, 178, 200, 209, 215 |
| Sprint ↔ Release | 10 | 033, 046, 056, 066, 078, 083, 091, 099, 146, 218 |
| i18n / strings | 6 | 060, 114, 152, 153, 170, 206 |

**El de rebranding es el costo más claro:** `DEV-043` ya investigó naming en septiembre;
`DEV-143` vuelve a investigarlo dos meses después; `DEV-144` renombra; `DEV-161` corta
aliases; `DEV-176` readopta un término; `DEV-199` consolida de nuevo. **Diez tareas para
elegir y aplicar un nombre.**

El de scroll es el mismo defecto reabierto como tarjeta nueva cinco veces. La
retrospectiva de sprint-5 **lo observó y no lo impidió**: su acción fue "mantener la
regla CSS", no "dejar de crear una tarjeta por síntoma CSS".

### PROC-14 · Retrospectivas: coverage parcial, con referencias rotas

**CONFIRMADO.** Existen 4 de 9. **Falta la de sprint-8**, que fue el sprint de launch
open-source (CI/CD, i18n total, linting, branding, assets de README), cerrado el 4-oct.
Sus salidas obligatorias —actualizar `AGENTS.md`, actualizar skills, crear tareas— no
quedan registradas en ningún lado.

Además las retrospectivas de sprint-4/5/6 cierran citando **"la Sección 8 de AGENTS.md"**,
y `AGENTS.md` tiene **6 secciones**. Se escribieron contra una revisión del documento que
ya no existe. Sprint-7 sí cita correctamente "Sección 2".

Lo bueno, y hay que decirlo: las acciones de sprint-4, 5 y 7 **sí se ejecutaron** —
`AGENTS.md` gotchas 11 y 12 y la regla 4 son consecuencia literal de ellas.

### PROC-15 · Fuga de esquema en el frontmatter de tareas

**CONFIRMADO.** Seis claves para dos dimensiones ortogonales:

| Dimensión | Claves en uso |
|---|---|
| Sprint | `sprint` (149), `sprints` (95), `targetSprint` (78) |
| Release | `release` (131), `targetRelease` (131), `milestone` (131) |

Y dos esquemas de fecha: `created_date`/`updated_date` (224 archivos) y `created`
(8 archivos). La "ortogonalidad estricta" de `AGENTS.md` regla 6 está violada **en la capa
de datos**, no solo en la interfaz.

### PROC-16 · `BACKLOG.md` sin drift, pero con costo de revisión

**CONFIRMADO.** 411 KB, 229 IDs, 229 archivos, **0 desalineación**. `dev-187` está
ausente en disco **y** en `BACKLOG.md`: consistente, no drift. `backlog:sync` se ha
corrido con fidelidad — `AGENTS.md §1` se cumple.

El costo: **21 de 32 commits (65.6%) tocan `BACKLOG.md`**, y el commit de release 1.1.0
reescribió 142 archivos de los cuales 111 eran tareas con `+1/-1` puro.

**Veredicto:** el archivo es defendible (es dogfooding: demuestra que el exportador
funciona), pero un espejo generado de 406 KB regenerado en el 65% de los commits infla
cada revisión. Un resumen (id / título / estado / sprint / release / conteo de ACs)
serviría el mismo propósito en ~20 KB.

---

## 8. Documentación y reglas: dónde está el valor

### 8.1 El problema de fondo: tres fuentes de verdad

**CONFIRMADO.**

| Documento | Rol | Estado |
|---|---|---|
| `AGENTS.md` (raíz, 111 L) | Capa proyecto, escrito a mano | **CANÓNICO** |
| `.agents/AGENTS.en.md` / `.es.md` (22 L c/u) | Templates de distribución con `{{projectName}}` literal | Muertos en el árbol de agente |
| `.agents/STATE_MACHINE.md` | Se declara fuente de verdad (`:3`) | Trackeado por lock; contradice el código |
| `.agents/TEAM_PLAYBOOK.md` | Generado por upstream | Trackeado por lock |
| `docs/AGENTIC_PLAYBOOK.md` (217 L, ES) | Fork escrito a mano del playbook de upstream | **Duplicado sin governance** |
| `.playbook-lock.json` | Manifiesto de 12 sha256 | **Solo gobierna 12 de ~34 archivos de `.agents/`** |

`findOrphanedFiles` (`sync-playbook.mjs:315-342`) solo marca archivos **presentes en el
lock** y ausentes del plan. Los ~22 archivos no trackeados (~90 KB) son invisibles al sync
y derivan en silencio.

### 8.2 Contradicciones verificadas

| Tema | Fuentes en conflicto |
|---|---|
| **Vocabulario de estados** | `STATE_MACHINE.md:88` (6), `SPRINT_SPEC_TEMPLATE.md:6,9` (5, incluye `(empty)`), `docs/ARCHITECTURE.md:134` (8, incluye `cancelled`), `src/types.ts:14-27` (7 + 5 aliases legacy), upstream (4) |
| **Pirámide de verificación** | `AGENTS.md:50-55` (6 pasos), `TEAM_PLAYBOOK.md:81-85` (5), `docs/AGENTIC_PLAYBOOK.md:140-143` (4, y afirma "~300ms"), `rigorous-qa-auditor:20-27` (6), `SPRINT_SPEC_TEMPLATE.md:79-86` (4+1) |
| **Criterio de salida de Modo 1** | `TEAM_PLAYBOOK.md:15` ("typecheck + tests") vs `docs/AGENTIC_PLAYBOOK.md:68` ("`npm run build`") |
| **Fase 1** | `TEAM_PLAYBOOK.md:48` ("Discovery & PM") vs `docs/AGENTIC_PLAYBOOK.md:115` ("Context & Grounding") |
| **Versión de Node** | `package.json:38` (`>=20`), `.nvmrc` (22.6.0), `CONTRIBUTING.md:17` (`≥22.6.0`), badge del README (`>=20`), `informe-auditoria.md:70` (`>=22.6.0`) |
| **Conteo de tools MCP** | `SKILL.md:57-62` (6), `SKILL.en.md:60-65` (6), `SKILL.es.md:60-71` (12), `AGENTS.md:74-77` (4), real (`mcp-server.ts:238-456`) (**12**) |
| **Flag `Refined:`** | Documentado en 3 archivos; **presente en 0 de 229 tareas** |

`SPRINT_SPEC_TEMPLATE.md` es el peor caso: **está trackeado por el lock**, así que un
`playbook sync` va a **restaurar** el vocabulario equivocado. El fix es upstream.

### 8.3 Qué borrar sin discusión — ~72 KB, riesgo cero

| Archivo | KB | Motivo |
|---|---|---|
| `docs/informe-auditoria.md` | **50** | Auditoría externa de la v1.0.0/playbook 2.0.0. Hoy el repo es 1.1.0/2.2.2, sus hallazgos P0 están cerrados, sus datos son falsos (dice 10 tests, engines ≥22.6.0). Incluye un censo social del autor y prosa motivacional. **Es basura de auditoría, no documentación.** Si el rastro importa, ya vive en `DEV-181` y en el CHANGELOG de v1.0.1. |
| `.agents/skills/ui-radix-tailwind/` | **17.1** | Cero contenido aplicable: 0 imports de `@radix-ui`, `react-hook-form`, `zod`, `recharts`, `date-fns`, `framer-motion`, `cva` en `src/` ni en `package.json`. **Todos** los archivos que nombra no existen. Afirma que `date-fns` y `react-day-picker` "ya están en package.json" — **falso**. Mayor borrado individual. |
| `.agents/skills/mobile-ux-design/` | **11.8** | App ajena: `@capacitor/haptics`, "banner en pantallas de autenticación" (gripm no tiene auth), sidebar layout inexistente, `chrome://flags`. |
| `.agents/skills/forms-rhf-zod/` | 5.6 | Sin `zod` ni RHF. Referencia una skill `i18next-namespaces` que no existe. |
| `.agents/skills/recharts-reporting/` | 3.5 | Sin `recharts` ni un solo chart en `src/`. |
| `.agents/skills/pwa-assets-audit/` | 1.0 | Su script (`validate-manifest.mjs`) y `public/manifest.webmanifest` **no existen**. gripm no es PWA. |
| `.agents/AGENTS.en.md` + `.es.md` | 3.3 | Templates con `{{projectName}}` literal. Deben vivir en `scripts/templates/`, no en el árbol que lee el agente. |
| `scripts/probe-handles.js`, `probe-linux-handles.sh`, `test-legacy-parser.js` | — | Huérfanos (`TOOL-04`) |

**Confirma el diseño del propio repo:** `.playbook-lock.json` dice `"stacks": []`. El
upstream clasifica esas cinco como *stack packs* opcionales (`react`, `mobile`, `pwa`),
que se instalan bajo demanda. Están aplanadas en `.agents/skills/` — residuos de antes
del refactor de stacks.

### 8.4 Qué comprimir — ~40 KB

**`AGENTS.md`: 111 → ~45 líneas.** Eliminar:

| Sección | Motivo |
|---|---|
| §1 árbol ASCII (`:11-18`) | Repite la frase de arriba |
| §1 líneas 22-23 | Duplican `STATE_MACHINE.md:65,76-78` |
| §1 línea 25 (`npm run backlog:sync`) | **Mecánicamente aplicado**: `.githooks/pre-commit:16` aborta el commit |
| §2 completo | Ceremonia. **Conservar solo la línea 34** (retro → actualizar reglas), que es lo que hace crecer este archivo |
| §3 línea 42 | **Afirmación falsa** — ver `DOC-05` |
| §4 líneas 60-61 (`TCPConnectWrap`) | Anécdota de un bug de 2026-09. `watchdog.js` hace el trabajo |
| §4 líneas 66-67 (anti-browser) | Ya está en 4 archivos más |
| §5 completo | Lista **4 de 12** herramientas. El servidor MCP se autodescribe |
| §6 gotcha 3 | **Mecánicamente aplicado**: `verify-backlog-sync.js:144-159` bloquea e imprime el fix exacto |
| §6 gotcha 4 | **Mecánicamente aplicado**: `verify-changes.js:192-208` |
| §6 gotcha 9 (`lsof`) | `lsof` es macOS/Linux. Este repo corre en Windows |
| §6 gotcha 16 | Prosa aspiracional. 60 palabras, cero instrucciones |
| §6 gotchas 10-13 | Reglas reales de UI, pero pertenecen a `docs/ARCHITECTURE.md` |

**Conservar sin cambios:** §4 (pirámide, comprimida), §5 CAUTION anti-scripts, y los
gotchas **1, 2, 5, 6, 7, 8, 14, 15, 17** — son la mayor densidad de valor del archivo.

**Oraciones a borrar literalmente:**
- `AGENTS.md:3` — "Bienvenido a **gripm**. Este documento establece las normas
  operativas…" — repite el título.
- `AGENTS.md:32` — "Si los ítems se entregan antes del vencimiento del timebox, el PO
  amplía el alcance incorporando nuevos ítems refinados…" — describe qué hace un PO.
  Ningún comportamiento de agente, ninguna aserción.
- `AGENTS.md:61` — "Un `TCPConnectWrap` vivo parecía la causa del cuelgue, y era 1 handle
  de ~200." — anécdota pura.
- `.agents/rules/git-approval.md:4` — `> **REGLA DE CUMPLIMIENTO OBLIGATORIO — SIN
  EXCEPCIONES**` sobre un título que ya dice "Regla de Oro: Prohibición Estricta". Dos
  titulares para una regla. El archivo entero (18 líneas) es duplicado de
  `git-workflow.md:10-14`.
- `.agents/skills/rigorous-qa-auditor/SKILL.md:108` — "Un rechazo sin findings accionables
  es un rechazo inválido…" — cola motivacional sobre una regla ya enunciada 4 líneas antes.

**`docs/AGENTIC_PLAYBOOK.md` (17.8 KB):** fork escrito a mano del playbook de upstream,
en español, sin lock, sin generación, sin validación. **Borrar** (o reducir a un puntero
de 30 líneas a `.agents/TEAM_PLAYBOOK.md`).

**`CHANGELOG.md` (29 KB):** es generado correctamente y está sincronizado con
`releases.json` — **acierto**. Pero cada release repite un `### 🎯 Resumen` que
prosa-repite la lista de bullets inmediatamente debajo. Ejemplo `:19` son 700 caracteres
que resumen 4 líneas. 29 KB → ~14 KB borrando ese bloque en
`scripts/generate-changelog.cjs:74-78`.

### 8.5 Falsos positivos concretos — corrigibles hoy

| ID | Ubicación | Afirmación | Realidad |
|---|---|---|---|
| `DOC-05` | `AGENTS.md:42` | "los hooks abortan si hay errores de TypeScript o si las pruebas fallan" | **Falso.** `.githooks/pre-commit:16` corre `verify-backlog-sync.js --hook`; `:45` corre `verify-changes.js`. **Ni `tsc` ni tests.** |
| `DOC-06` | `AGENTS.md:51` y `ci.yml:17` | "Suite unificada de pruebas (**15** pasos)" | `run-tests.js:29-46` define **16**. `CONTRIBUTING.md:46` dice 16 (correcto). |
| `DOC-07` | `AGENTS.md:52` | "La pirámide local corre en macOS" | El árbol está en Windows. Fuga de entorno en un archivo que se distribuye. |
| `DOC-09` | `AGENTS.md:111` | `enabledTabs: {sprint: true}` | `.gripm/config.json` → `sprint: false`. Una regla que afirma el estado del repo y se equivoca. |
| `DOC-14` | `.agents/skills/gripm/SKILL.md:28` | "instalado con `npm install -g gripm`" | El paquete es **`@gripm/board`**. `SKILL.en.md:28` lo dice bien. El incorrecto es el que `verify-publish-surface.js:51` exige en el tarball. |
| `DOC-15` | `CONTRIBUTING.md:17` | Node "**= 22.6.0**" | `package.json:38` → `">=20.0.0"` (que a su vez es falso, `TOOL-09`). **Tres valores y tres operadores distintos:** `>=20.0.0` / `= 22.6.0` / matriz `['22.6.0','22.x']`. |
| `DOC-16` | `.github/ISSUE_TEMPLATE/bug_report.yml:45` | "JSON monolítico (`.devboard/backlog.json`)" | **Marca pre-1.0.** Correcto: `.gripm/backlog.json`. En una plantilla que ve el usuario. |
| `DOC-12` | `README.md:193` / `README.es.md:193` | "12 AI Agent Role Skills" | 13 directorios / 15 archivos. |
| `DOC-13` | Las 3 skills de gripm | Conteo de tools MCP | 6 / 6 / 12. Real: **12**. Un usuario inglés recibe una skill que documenta la mitad de las tools y nunca puede descubrir `gripm_bulk_update_tasks`, `gripm_list_releases`, `gripm_create_retro`, `gripm_export_backlog`. |
| `DOC-19` | `STATE_MACHINE.md:43`, `pm-orchestrator:29-33`, `SPRINT_SPEC_TEMPLATE.md:11` | Flag `Refined:` como artefacto real | **0 de 229 tareas** lo tienen. No se parsea, no se almacena, no se aplica. |
| `DOC-20` | 5 archivos | Ceremonia de sprint spec (`[RESEARCH]/[DESIGN SPEC]/[TECH ARCHITECTURE]/[QA MATRIX]`) | `backlog/tasks/` usa las secciones de `backlogMdParser.ts`. **0 instancias** de sprint spec en todo el repo. |
| `DOC-23` | `docs/ARCHITECTURE.md:105`, `.agents/rules/codebase-navigation.md:15-22` | "Utiliza CodeGraph MCP" en `localhost:6010` | No hay `.mcp.json`, ni config MCP, ni dependencia. Instrucciones que fallan en silencio para cualquiera que no tenga la extensión del autor. |

### 8.6 El problema de README más grave: se vende una feature inexistente

**CONFIRMADO.** `README.md:362-369` y `README.es.md:362-369` presentan
**"VS Code & Cursor Webview Integration"** con tres bullets, dentro de
"Modular Cockpit & Settings", como capacidad disponible.

La única implementación es `backlog/tasks/DEV-225 — Extension Webview para VS Code y
Cursor`, **`status: draft`**. Cero código de webview en el repo.

Es el defecto más dañino para un consumidor: no es documentación incorrecta, es una
afirmación comercial sobre algo que no existe.

### 8.7 Cuts de README — 483 → ~230 líneas

El README sirve hoy a **tres** audiencias (usuario npx, integrador de agentes,
colaborador) en vez de dos, y el tercio del medio es la mayor parte del bloat. La
sección de quickstart (líneas 40-131) **es excelente y no se toca**.

| Líneas | Sección | Acción |
|---|---|---|
| 177-224 | Arquitectura del ecosistema (diagrama ASCII, tablas, `playbook sync` vs `npm install`) | **Borrar** — describe otro paquete npm; pertenece al README del playbook, donde ya está |
| 228-253 | Tabla de 12 tools MCP | **Borrar** — `bin/gripm-mcp.js` se autodescribe. Cuarta copia |
| 256-308 | Privacy & Git Strategies (3 estrategias) | Comprimir → mover a `SECURITY.md` |
| 311-316 | "Backlog History & Git" ("el storage local no es backup") | **Borrar** — consejo genérico |
| 339-395 | Módulos + **Webview** + Worktrees | **Borrar la webview** (inexistente), comprimir worktrees |
| 399-429 | Core Developers Guide | Mover a `CONTRIBUTING.md` (conservar tabla de flags) |
| 433-441 | "✨ Features" | **Borrar** — restatea el quickstart y los screenshots |
| 445-447 | "🐶 Dogfooding" | 1 línea — inferible de 229 archivos en `backlog/tasks/` |
| 451-457 | Atajos de teclado | **Conservar** — útil, no está en otro lado |
| 461-465 | Ecosistema / atribución Backlog.md | **Conservar** — legalmente importante |

### 8.8 Perfil de las skills: qué conserva el producto

**Dogfooded (el producto las usa):** `gripm/SKILL.es.md` (12 tools, rutas correctas,
gotchas reales — **la skill más valiosa del repo**, sus §8 gotchas son insustituibles),
`list-views-filters` (maps a `FilterBar` y `AdvancedFiltersPopover` reales),
`code-level-ux-auditor` (aplicada por `audit-ux-code.cjs` + `ux-rules.json` +
`audit-ux-baseline.json`).

**Perfil de roles (genéricas pero legítimas):** `pm-orchestrator`,
`principal-engineer`, `rigorous-qa-auditor`, `worldclass-product-designer`,
`market-researcher`.

**Solapamiento:** `worldclass-product-designer` ↔ `mobile-ux-design` ↔
`ui-radix-tailwind` repiten textualmente `44×44px`, `safe-area pb-32`, prohibición de
`type=number`, `active:scale`, icon-only bajo 640px. **Conservar una.**

**Corte recomendado en `principal-engineer`:** conservar `:18-39`, `:67-73`, `:87-94`
(~40%). **Eliminar `:41-52`** (tabla de invariantes *fintech*: "un pasivo nunca suma al
patrimonio", "mezclar monedas y sumar" — en una herramienta kanban sin dominio financiero),
`:54-59` (RLS / `search_path` / Supabase), `:61-65` (migraciones de base de datos).

**No hay `.mcp.json` commiteado.** `AGENTS.md §5` ("usar el servidor MCP de gripm") es
inejecutable por defecto en una sesión nueva. Es el archivo de 3 líneas de mayor
leverage que falta en el repo.

### 8.9 Estado objetivo de la capa de reglas

| | Hoy | Objetivo |
|---|---|---|
| `.agents/skills/` | 97 KB / 13 dirs | ~47 KB / 7 dirs |
| `docs/` | 94 KB | ~26 KB |
| `README.md` × 2 | 53 KB | ~28 KB |
| `AGENTS.md` | 11.5 KB | ~5 KB |
| `CHANGELOG.md` | 29 KB | ~14 KB |
| **Total** | **~326 KB** | **~140 KB (−57%)** |

Nada de ese plan elimina una regla que un script no aplique, un hook no aborte, o el
servidor MCP no autodescriba.

---

## 9. Deuda técnica estructural

### ARCH-01 · `vite.config.ts` tiene 2.711 líneas de las cuales 47 son configuración

**CONFIRMADO.** Estructura real del archivo:

| Líneas | Contenido |
|---|---|
| 26-298 | Detección de proyecto, registry, rutas, config |
| 360-1135 | Lectura/escritura del backlog en Markdown: `readProjectBacklog`, `saveBacklogMdItem`, `findBacklogMdFile`, soft delete / restore / purge |
| 1140-2663 | **`devBoardApi()`** — el plugin de Vite: SSE, watchers, middleware de seguridad, **API REST completa (~1.400 líneas)** |
| 2664-2711 | **`export default defineConfig`** — la configuración de Vite propiamente dicha |

**El archivo se llama `vite.config.ts` y el 1.7% de su contenido es configuración de
Vite.** El resto es la capa de servidor de la aplicación.

`DEV-165 — Modularizacion de vite.config.ts y Extraccion de Capa de Servidor a server.md`
identificó esto el 4-oct y sigue en **`draft`**. Es la fuente de `DEV-189` (sondeo de
puertos) y `DEV-190` (207 watchers): bugs que nacen de que la lógica de ciclo de vida del
servidor está embebida en el archivo de build.

### ARCH-02 · Seis monolitos = 61% de `src/`

**CONFIRMADO.** 8.642 de 14.216 líneas.

| Archivo | Líneas | `useState` | Función más larga |
|---|---|---|---|
| `SettingsView.tsx` | 2.100 | 30 | L139→2222 (2.083) |
| `ItemModal.tsx` | 1.622 | 36 | L117→1696 (1.579) |
| `App.tsx` | 1.395 | 20 | L57→1521 (1.464) |
| `SprintView.tsx` | 1.266 | 18 | L89→1353 (1.264) |
| `ReleaseAssembler.tsx` | 1.131 | 21 | L61→1224 (1.163) |
| `KanbanBoard.tsx` | 1.128 | 11 | L136→1211 (1.075) |

**En los seis, el cuerpo del componente ES la función más larga.** Ninguno extrae un
subcomponente. `KanbanBoard.tsx:607-875` es un `renderColumn` de **269 líneas** que se
recrea en cada render y cierra sobre 11 `useState`.

### ARCH-03 · Estado derivado por efecto: el antipatrón, 5 veces

**CONFIRMADO.** `useEffect` → `setState(prop)` en `SettingsView.tsx:207`,
`ReleaseAssembler.tsx:118`, `ItemModal.tsx:~215`, `FilterBar.tsx:39`, `App.tsx:63`.

`SettingsView.tsx:207-242` es el caso patológico: deps `[config, language]`,
**20 `setState` imperativos**, cinco deep clones `JSON.stringify`. Como `loadSettings`
corre en cada cambio de proyecto (`App.tsx:320`), cualquier cambio de identidad de
`config` reflowa 20 campos y **descarta lo que el usuario estaba escribiendo**.

Bug concreto derivado: `handleLanguageChange` (`:244-249`) llama `setLanguage(newLang)`
*y* dispara `onSaveConfig` fire-and-forget. El cambio de `language` dispara el efecto,
que re-deriva desde un `config` **todavía no actualizado** → el toggle de idioma puede
revertir ediciones en vuelo.

### ARCH-04 · La lista canónica de estados vive en 5 lugares

**CONFIRMADO.**

| Ubicación | Forma |
|---|---|
| `src/utils/statusMeta.ts:23-32` | `CANONICAL_STATUSES` — **la fuente de verdad** |
| `src/App.tsx:151-153` | arrays inline |
| `src/App.tsx:1097-1105` | **reimplementación inline de `normalizeStatus`**, cadena ternaria de 9 líneas |
| `src/components/ItemCard.tsx:455` | array inline |
| `src/components/FilterBar.tsx:66` | array inline |
| `src/components/KanbanBoard.tsx` | 8 arrays `statuses:` |

`App.tsx:1097-1105` es el defecto más claro: copia a mano la normalización que
`statusMeta.ts:41-43` ya provee como función testeada (`test-ui-logic.js:42-49` asserta
los 4 aliases legacy). Agregar un quinto alias requiere editar dos lugares, y solo uno
tiene test.

### ARCH-05 · Lógica de columnas duplicada y ya divergida

**CONFIRMADO.** `src/utils/kanbanColumnItems.ts` es la versión extraída y testeada — y
**no la usa la ruta de conteo**. `KanbanBoard.tsx:1124-1135` reimplementa el filtro inline
para los pills móviles, usando `status === 'ideas'` en vez del predicado `isIdea` (que
también matchea `labels: ['idea']`).

**El conteo del pill móvil y el cuerpo de la columna móvil pueden discrepar.**
`test-ui-logic.js:30-34` asserta el comportamiento del util para un ítem con
`labels:['idea']` + `status:'draft'`; la ruta de conteo lo clasificaría como draft.

### ARCH-06 · No existe un primitivo `<Modal>` — causa raíz de `BUG-01` y `BUG-16`

**CONFIRMADO.** El bloque `fixed inset-0 → panel(role=dialog, aria-modal, tabIndex=-1)
→ header/footer` está copiado a mano en **8 diálogos**. No hay primitivo. `useFocusTrap`
resuelve solo la mitad del problema.

Por eso `BUG-01` se replicó 6 veces en vez de escribirse una, y por eso `BUG-16` (portal)
está ausente en 10 de 13 overlays.

### ARCH-07 · Multiselect triplicado

**CONFIRMADO.** `AdvancedFiltersPopover.tsx` — `toggleType` (`:93-108`),
`togglePriority` (`:111-126`), `toggleStatus` (`:129+`): tres cuerpos de ~18 líneas casi
idénticos, distintos solo en la clave del array. Inlinado otra vez en `App.tsx:1287-1293`.

### ARCH-08 · Superficie de props ancha

**CONFIRMADO.** `App.tsx:1204-1231` pasa **22 props** a `Header`; `App.tsx:1275-1309`
pasa **20** a `KanbanBoard`. Sin context, sin reducer. El problema no es el prop drilling
en sí (2-3 niveles, aceptable) sino la falta de extracción.

### ARCH-09 · Cobertura de tests del frontend: 0.8%

**CONFIRMADO.** De 14.216 líneas de frontend, **116** tienen test unitario directo
(`kanbanColumnItems.ts` + `statusMeta.ts` + `legacyParser.ts`, vía
`scripts/test-ui-logic.js` y `test-legacy-parser.js`). Solo dos archivos de `scripts/`
importan desde `src/`. Los seis monolitos (8.642 líneas, 61%) no tienen ninguno.

El smoke test de navegador cubre: logo, crear tarea, editar tarea, relaciones, navegación
de tabs, persistencia tras recarga. **Nunca abre** `ProjectModal`, `PlanGuardModal`,
`ImportWizardModal`, `SprintModal`, `CompleteSprintModal`, `FolderPickerModal`,
`SettingsView`, `ReleaseAssembler`, `TrashView`, `AdvancedFiltersPopover`, ni drag-and-drop.

**Y codifica los huecos de i18n como aceptables:** todos los selectores son regex
bilingües (`/^(New Task|Nueva Tarea)$/`). La suite está escrita para pasar en el idioma
que arranque el servidor, en vez de assertar corrección de locale.

---

## 10. Aciertos — no romper esto

Esta sección es normativa. Los siguientes comportamientos **funcionan** y cualquier
refactor debe preservarlos. Documentados porque un informe de auditoría que solo enumera
defectos produce el efecto contrario: invita a "simplificar" lo que está bien.

| ID | Acierto | Evidencia |
|---|---|---|
| `OK-01` | **Cero `@ts-ignore` / `eslint-disable`** en todo `src/`. Regla 14 cumplida al 100%. | `grep` repo-wide |
| `OK-02` | **Cero `JSON.parse` sin try/catch.** | `SettingsView:523,2184`, `App:143`, `KanbanBoard:183,208`, `SprintView:162,199`, `api:300` |
| `OK-03` | **Cero acceso a `localStorage` sin guarda.** `utils/storage.ts:37,51,60,70` con try/catch + `typeof window` + migración de claves legacy. | repo-wide |
| `OK-04` | **Paridad i18n exacta**: 748 claves en `es.json`, 748 en `en.json`, cero faltantes. Schema plano con `TranslationKey = keyof typeof esDict` → type-checking en compile. | set-difference |
| `OK-05` | **Cero tareas `done` con AC sin tildar**, y cero IDs duplicados. La disciplina de `- [x]` es real. | 1.272 ACs verificadas |
| `OK-06` | **`BACKLOG.md` sin drift**: 229 ↔ 229, cero IDs sin archivo, cero archivos sin entrada. | `backlog:check` en verde |
| `OK-07` | **Cero corrupción de codificación**: 365 archivos, round-trip UTF-8 limpio, 0 caracteres de reemplazo (U+FFFD). Los signos de interrogación que aparecen al leer los `.md` con `Get-Content` en consola Windows son un artefacto del code page, no del archivo. | scan completo |
| `OK-08` | **Path traversal mitigado en el parser**: `generateTaskFilename` (`backlogMdParser.ts:699-712`) sanea separadores, colapsa whitespace, clampea a 200 chars. No escapable. Igual para `sprintKey` (`mcp-server.ts:1406`). | prueba directa |
| `OK-09` | **Defensa del dev server bien diseñada y testeada contra el middleware real** (`test-api-security.js` extrae y ejercita el middleware de `vite.config.ts`, no un mock del mock): host allowlist, origin allowlist con `Vary: Origin`, `Content-Type` obligatorio, containment con `path.relative` + `realpathSync`. Incluye la regresión de `DEV-190`. | 11 casos |
| `OK-10` | **`scripts/verify-port-probe.js:88-101` se testea a sí mismo** — el único archivo del repo que lo hace, y corrige exactamente el bug de `DEV-189`. | lectura |
| `OK-11` | **Desde `DEV-134` (30-sep) el rigor de proceso es excelente y real**: diagnósticos cuantificados, tests de regresión nombrados, los comandos de la pirámide escritos como ACs, admisiones honestas de sobre-promesa previa (`DEV-152` AC #1 declara borrar un `eslint.config.js` muerto que el propio `DEV-140` había creado). | 15 tareas muestreadas |
| `OK-12` | **Las retrospectivas no fueron ceremoniales.** Tres de sus acciones están literalmente hoy en `AGENTS.md` (gotchas 11 y 12, regla 4). | cross-check |
| `OK-13` | **`CHANGELOG.md` es generado y verificado**: `generate-changelog.cjs` lo escribe, `publish.yml:138-145` aborta el release si no coincide con `releases.json`. 15 releases sincronizados. | verificación |
| `OK-14` | **`scripts/canonicalize-status.js` y `purge-fabricated-task-sections.js` son quirúrgicos**: match exacto, idempotentes, con `--dry-run` y guarda de AC única. El purge funcionó: no queda texto fabricado. | scan de 229 archivos |
| `OK-15` | **Los commits describen la causa raíz, no el síntoma.** `"fix(ci): el cuelgue de npm test en Linux eran 207 watchers sin cerrar"` y `"fix(ci): el guard de superficie corria antes del build y por eso fallaba siempre"` son diagnósticos, no parches. Ese estándar de escritura es valioso y no se pierde con los cambios propuestos. | historial |
| `OK-16` | **La serialización en Markdown con optimistic locking funciona** (`verify-optimistic-locking.js` prueba 409/200/force + relaciones create→edit→reload). Es una decisión de diseño correcta y poco común en herramientas markdown-first. | suite |
| `OK-17` | **`verify-status-contrast.js` verifica una propiedad real**: parsea clases Tailwind de `statusMeta.ts`, compone alpha sobre superficie, calcula luminancia WCAG 4.5:1. | suite |

---

## 11. Trazabilidad y plan

### 11.1 Por qué esta sección es la que faltaba en la auditoría anterior

La auditoría previa (`DEV-181`) cerró con sus recomendaciones ejecutadas pero **no dejó
forma de saber, meses después, si un hallazgo seguía abierto**. Este informe corrige eso
con tres mecanismos:

1. **IDs estables** — cada hallazgo tiene un identificador que sobrevive al documento.
2. **Comandos de verificación** — cada hallazgo incluye cómo comprobar que sigue abierto
   o que se cerró.
3. **Estado explícito** — nada se marca cerrado sin aserción que lo demuestre.

**Regla de cierre:** un hallazgo pasa a cerrado cuando su comando de verificación deja de
detectar el problema **y** un comando de regresión lo impediría volver a aparecer.

### 11.2 Fases

#### Fase 0 — P0 funcional (1 día)

| # | Hallazgo | Verificación de cierre |
|---|---|---|
| 0.1 | `BUG-01` — hooks tras early return (5 modales) | El script de §3/BUG-01 reporta `trap < early` en los 8 modales |
| 0.2 | `ARCH-06` — extraer primitivo `<Modal>` | El andamiaje aparece **una vez**; `grep -c 'role="dialog"' src/components/` ≤ 1 por primitivo |
| 0.3 | `BUG-03` — Enter global ejecuta destructivo | Sin listener global de Enter en `ConfirmModal`; `onConfirm` con `catch` |
| 0.4 | `BUG-15` + `BUG-18` — a11y de toasts y botones | `role="status"` + `aria-live` en `Toast.tsx`; 0 botones de icono sin `aria-label` |
| 0.5 | `BUG-17` — safe-area | `grep -c 'env(safe-area' src/` ≥ 3 |

> Orden importante: **0.2 antes que cualquier otro fix de modal.** Sin el primitivo,
> `BUG-01` reaparece con el primer modal nuevo que escriba un agente.

#### Fase 1 — Recuperar el gate (2 días)

| # | Hallazgo | Verificación de cierre |
|---|---|---|
| 1.1 | `GATE-03` — `toPosixPath` en el fingerprint | Las 278 entradas del baseline absorben en Windows; el JSON reporta `absorbed: 278` |
| 1.2 | `GATE-04` — el verificador ya no se auto-desactiva | Sin rama `isWindows` que salte aserciones |
| 1.3 | `GATE-01` — `verify:changes` en CI | Paso presente en `ci.yml`; falla si se introduce YAML inválido |
| 1.4 | `GATE-02` — `test:linux` en CI | Paso presente en `ci.yml` |
| 1.5 | `GATE-13` — `actionlint` | Sin findings en ambos workflows |
| 1.6 | `GATE-05` — `catch` mudos → `errorsFound++` | Un `releases.json` corrupto **falla** el gate |
| 1.7 | `GATE-06` — `catch {}` del bulk update | Un `writeFileSync` fallido devuelve `ok: false` |
| 1.8 | `GATE-11` — `try/finally` en los 2 tests | Un fallo a mitad no deja archivos en `backlog/tasks/` |
| 1.9 | `GATE-08` + `GATE-09` — tests reales, no greps | `verify-focus-trap` **ejecuta** los hooks; la comprobación de orden cubre los 8 diálogos, no 1 |
| 1.10 | `GATE-07` — smoke de navegador en `npm test` o en un `npm run verify` único | `npm test` cubre lo mismo que CI |
| 1.11 | `GATE-10` — `npm pack --ignore-scripts` | `publish:check` no muta `.git/config` (assert explícito) |
| 1.12 | `GATE-17` — unificar `ready` / `Done` | `backlog:sync` y `gripm_sync_backlog` producen el mismo frontmatter |
| 1.13 | `GATE-14,15,16` — `--timeout` validado, `--bail` implementado, margen de CI | `--timeout foo` no rompe la suite; el job tiene margen realista |

#### Fase 2 — Seguridad (1 día)

| # | Hallazgo | Verificación de cierre |
|---|---|---|
| 2.1 | `SEC-01` — `verifyCommand` fuera del `.md` | Un `verifyCommand` en frontmatter no se persiste ni se re-ejecuta |
| 2.2 | `SEC-02` — `autoFix` default `false` | `gripm_sync_backlog {}` no muta el backlog |
| 2.3 | `SEC-03` — containment en `--repo` del MCP | Reusa `isAllowedBrowsePath` |
| 2.4 | `SEC-05` — validar `inputSchema` | `limit: "abc"` y `toggleAcIndex: -1` devuelven error, no no-op |
| 2.5 | `SEC-08` — quitar la ruta del autor, agregar Windows/Linux | `verify-publish-surface` detecta `C:\Users\x\` y `/home/x/` |
| 2.6 | `SEC-09` — `force` deja rastro | Log de auditoría |
| 2.7 | `SEC-06,07,10` — declarar la superficie de riesgo | Sección de seguridad en `AGENTS.md` y `SECURITY.md`: sin auth, `--host 0.0.0.0`, home como raíz, y **el Gatekeeper ejecuta comandos** |

#### Fase 3 — Proceso y documentación (2 días)

| # | Hallazgo | Verificación de cierre |
|---|---|---|
| 3.1 | `DOC-01` — borrar `informe-auditoria.md` (−50 KB) | No existe |
| 3.2 | `DOC-02` — borrar 5 skills de stack (−38.9 KB) | `.agents/skills/` = 7 dirs |
| 3.3 | `DOC-03` — mover `AGENTS.{en,es}.md` a `scripts/templates/` | Actualizado `initScaffold.js` y `verify-publish-surface.js` |
| 3.4 | `DOC-11` — **quitar la sección de webview del README** | No se anuncia `DEV-225` |
| 3.5 | `DOC-04` — `AGENTS.md` 111 → ~45 líneas | Solo sobreviven las reglas de §8.4 |
| 3.6 | `DOC-05,06,07,09,14,15,16,12,13` — falsos positivos | Cada fila de §8.5 verificada |
| 3.7 | `DOC-17,18,19,20` — unificar pirámide, estados, borrar flag `Refined:` y ceremonia de sprint spec | Una sola fuente de verdad por tema |
| 3.8 | `DOC-21` — quitar `### 🎯 Resumen` del changelog generado | `CHANGELOG.md` ~14 KB |
| 3.9 | `DOC-22` — borrar `docs/AGENTIC_PLAYBOOK.md` o reducirlo a puntero | 17.8 KB menos |
| 3.10 | `TOOL-01` — ESLint real | `"lint"` ejecuta ESLint, no `tsc` |
| 3.11 | `TOOL-02,03` — `format` real; borrar `.prettierrc` muerto | `npm run format` formatea código |
| 3.12 | `TOOL-04` — borrar huérfanos o testear el legacy parser | `grep` sin referencias = 0 |
| 3.13 | `DOC-16` — limpiar la marca pre-1.0 de `.gitignore:32` (`data/dev-board.json`) | Corroborado por `bug_report.yml:45` (`.devboard/backlog.json`): la marca vieja sobrevive en tres archivos visibles para el usuario |
| 3.14 | `PROC-09` — limpiar preferencias personales de `.gripm/config.json` | Solo identidad de proyecto |
| 3.15 | `PROC-06` — resolver las 3 tareas `done` sin release y las 2 versiones fantasma | Invariante fundamental en verde |
| 3.16 | `PROC-08` — resolver la contradicción §2 vs §16 y `sprint: false` vs regla 17 | Una sola metodología declarada |
| 3.17 | `TOOL-09` — `engines` honesto | O se prueba Node 20 en CI, o `engines` dice `>=22.6.0` |

#### Fase 4 — Deuda estructural (a dimensionar)

| # | Hallazgo | Nota |
|---|---|---|
| 4.1 | `ARCH-01` — extraer la capa de servidor de `vite.config.ts` | `DEV-165` ya existe, en `draft`. **Es la fuente de `DEV-189` y `DEV-190`.** Es la mayor deuda del repo. |
| 4.2 | `ARCH-02` — dividir los 6 monolitos | Por debajo de 800 líneas cada uno |
| 4.3 | `ARCH-03` — eliminar estado derivado por efecto | `useReducer` o remount con key en `SettingsView` e `ItemModal` |
| 4.4 | `ARCH-04,05` — usar los utils canónicos | El test de `ARCH-05` debe cubrir ambas rutas |
| 4.5 | `ARCH-07,08` — `useMultiSelect`, context/reducer | — |
| 4.6 | `ARCH-09` — cobertura de tests de UI | Subir del 0.8%; el smoke debe abrir cada diálogo |

### 11.3 Lo que queda deliberadamente sin resolver

- **`PROC-01`** no es un defecto corregible: la historia previa al primer commit no se
  puede reconstruir. La acción es reconocer el corte de trazabilidad en el backlog, no
  fabricar un historial retroactivo (lo que sería repetir el error).
- **`TOOL-08`** (motor vendorizado) tiene dos salidas legítimas: aceptar la cobertura
  reducida y documentarla, o ejecutar los tests de upstream desde este repo. **Re-forkear
  el motor ya se intentó y costó 270/358 líneas de divergencia** (`DEV-188`). La decisión
  es del PO.
- **`SEC-06`** (`--host 0.0.0.0`) es un trade-off legítimo de una herramienta local. Lo
  que no es legítimo es que no esté declarado.
- **`PROC-10,12,13,14,15`** son deuda histórica sobre tareas ya cerradas. Reabrir 126
  tareas para recalificar ACs probablemente devuelve más energía de la que ahorra. La
  acción proporcionada es **aplicar el régimen nuevo solo hacia adelante**, y usar este
  informe como checklist de lo que no hay que repetir.

---

## 12. Resumen ejecutivo por número

| Dimensión | Veredicto |
|---|---|
| **Correctness** | 🔴 5 modales que matan la app. Empaquetado en 8 releases. |
| **Seguridad** | 🔴 Ejecución de comandos persistida y re-ejecutada desde el backlog versionado. Mutación del backlog por defecto. |
| **Gate de calidad** | 🔴 Verde en falso. 4 de 16 tests son greps. 3 gates que tragan su propia falla. 2 gates obligatorios que nunca corrieron. |
| **Tooling** | 🟡 Funciona, pero con 3 huérfanos, 6 copias de un mismo helper, y `"lint"`/`"format"` mentirosos. |
| **Arquitectura** | 🟡 Tests reales en la capa Node (middleware real, no mock). 0.8% de cobertura en la UI. 6 monolitos. |
| **Proceso** | 🔴 60% de las tareas sin trazabilidad. 7% de IDs en commits. 4 tags de release en `fix(ci)`. |
| **Documentación** | 🟡 Ricas en reglas de alto valor y mezcladas con ~150 KB de ruido, contradicciones y skills de otro producto. |
| **Velocidad de reacción a incidentes** | 🔴 6 correcciones de CI en 73 minutos; 3 etapas de la pirámide descubren defectos de plataforma tarde. |

---

*Auditoría generada el 2026-10-10 sobre `@gripm/board@1.1.0` (`f9dadc3`). Ningún archivo
del producto fue modificado para producir este informe. Toda afirmación marcada
`CONFIRMADO` incluye su referencia `archivo:línea` o el comando que la reproduce.*
