---
id: DEV-188
title: "Migración al motor de audit:ux upstream: fin del fork, baseline y pérdida de INVARIantes locales"
status: draft
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "ux-audit"
  - "upstream"
  - "@gripm/playbook"
  - "technical-debt"
dependencies:
  - DEV-166
  - DEV-173
priority: high
type: tech_debt
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Registrar la fecha de fin del fork: dejar de preservar `scripts/audit-ux-code.cjs` en `sync-playbook.mjs` cuando `@gripm/playbook@2.2.0` esté publicado, y quitar la nota que lo justifica
- [ ] #2 Mover `scripts/audit-ux-baseline.json` a la raíz del proyecto (`./audit-ux-baseline.json`), que es donde upstream lo ancla vía `path.join(ROOT, BASELINE_NAME)`
- [ ] #3 Agregar el script `audit:ux:baseline` a `package.json`; hoy no existe y la guía upstream lo invoca
- [ ] #4 Desacoplar los 4 asserts de la sección 6.2 de `scripts/test-parser.js` que dependen de la existencia de `ENV_GUTTER` y `auditEnvInvariants`, conservando 6.1 (UX-009 acotado a diálogos) y 6.3 (gutter leído del CSS)
- [ ] #5 Regenerar el baseline **con revisión manual de los hallazgos**, no con `--update-baseline` ciego: separar lo genuino de los falsos positivos de UX-010 antes de snapshotear
- [ ] #6 Confirmar que `ENV-002` (truncate en diálogo) queda promovido upstream o, si no, reimplementarlo localmente después del sync, con su opt-out `audit-ux:allow-ENV-002` y las dos supresiones de `FolderPickerModal.tsx`
- [ ] #7 Verificar que la contraparte de UX-010 en el motor nuevo reporte el conteo **real** de botones sin nombre accesible, y que ese número sea el que se use para cerrar AC #4 de DEV-173
- [ ] #8 `npm run audit:ux` en verde con exit 0, `npx tsc --noEmit` con 0 errores, `npm test` y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Esperar `@gripm/playbook@2.2.0`. No hay nada que ejecutar antes: sin la extensión publicada, seguir bifurcado es la única opción.
2. Levantar la preservación en `scripts/sync-playbook.mjs` y dejar que `scripts/audit-ux-code.cjs` entre al sync.
3. Mover el snapshot a la raíz y agregar `audit:ux:baseline`.
4. Correr `npm run audit:ux` con el motor nuevo y **leer la salida completa** antes de snapshotear: es la primera vez que se ve el estado real.
5. Clasificar los hallazgos: los falsos positivos de UX-010 no entran al baseline; los genuinos, sí.
6. Regenerar el baseline y pasar la Pirámide de Verificación completa.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Medición contra el tarball publicado (2026-10-06)

`@gripm/playbook@2.1.0` verificado por shasum: `dcf2e433b8ad616bf0bc724db2496644ac7eade9`,
coincidente con el declarado. Todas las corridas son contra el **tarball del
registro**, no contra el repo, y con **baseline vacío** (sin `audit-ux-baseline.json`
al lado del script, que es lo que ancla a `ROOT`).

**UX-010 sobre `gripm/src` con el motor 2.1.0: 0 hallazgos.** De los 127 que reportaba
el fork, **0 son reales**. Confirma el diagnóstico y lo mejora: la estimación previa
era "~101 falsos sobre 191 candidatos, genuinos entre 0 y 90"; el valor real es 0.

| Regla | Fork local | Upstream 2.1.0 | Δ |
| :--- | ---: | ---: | :--- |
| UX-002 atajos físicos | 5 | 0 | −5 |
| UX-006 oclusión inferior | 1 | 0 | −1 |
| UX-007 hacinamiento | 34 | 71 | **×2** |
| UX-010 sin nombre accesible | 127 | **0** | −127 |
| UX-011 tamaño de fuente | 294 | 294 | = |
| UX-012 sin feedback táctil | 23 | 23 | = |

**UX-002 → 0 es una corrección genuina, no sobre-supresión.** Los dos `<kbd>` reales
(`FilterBar.tsx:187` con `hidden sm:inline`, `SettingsView.tsx:667` con
`hidden sm:inline-block`) tienen exactamente el escape que la regla documenta. Los
otros 3 hallazgos del fork eran comentarios de código (`// Keyboard shortcut ⌘S...`),
que no se renderizan.

### UX-010 en 2.1.0: dos defectos residuales

Aun así, **el 0 no es totalmente confiable**. Aislados contra el tarball:

| Fixture | Resultado esperado | 2.1.0 |
| :--- | :--- | :--- |
| `<button aria-label="editar"><Icon/></button>` | no reportar | ✅ |
| `<button>Guardar</button>` | no reportar | ✅ |
| `<button><span>Cerrar</span></button>` | no reportar | ✅ |
| `<button><Icon/></button>` | **reportar** | ✅ |
| `<button>` multilínea, solo `<Trash/>` | **reportar** | ✅ (su AC #4) |
| `<button>` multilínea + `<span>Eliminar</span>` | no reportar | ❌ **reporta** |
| `<div role="button" tabIndex={0}>` + solo `<Settings/>` | **reportar** | ❌ **no reporta** |

**Defecto A — `unlessVisibleText` no cubre el caso multilínea.** El escape existe pero
no lee el texto cuando el elemento ocupa varias líneas. Réplica mínima:

```tsx
<button type="button" onClick={() => {}} className="p-1">
  <Trash />
  <span>Eliminar</span>
</button>
```

**Defecto B — no detecta icon-only en elementos que no son `<button>`.** `role="button"`
está en la lista `line` de UX-010, pero un `div` con `role="button"` y solo un icono
como hijo pasa limpio. Réplica mínima:

```tsx
<div role="button" tabIndex={0} onClick={() => {}} className="p-1">
  <Settings />
</div>
```

Impacto en `gripm`: bajo, porque el código usa `<button>` nativo casi siempre. Pero
significa que **AC #4 de DEV-173 no puede cerrarse declarando "0 accesibilidad"**: el
0 de UX-010 es un techo, no una prueba.

### UX-006 → 0: no concluyente, requiere verificación visual

El precondición estructural de UX-006 **sí está presente**: `App.tsx:1450` define una
navegación fija `fixed bottom-0 ... md:hidden` y `App.tsx:1272` es el `<main>` con
`pb-16`. Midiendo alturas, la navegación ronda los 57px (botones `min-h-[48px]` +
`py-1` + borde) contra `pb-16` = 64px, así que probablemente no haya oclusión real y
el 0 sea correcto.

No se puede afirmar sin renderizar. Queda como verificación pendiente, no como
regresión confirmada.

### UX-007 se duplica: 34 → 71

El rediseño de `buildUnits` produce unidades más pequeñas, así que la misma línea se
cuenta en más de una unidad. No es un aumento de defectos reales sino de granularidad.
Al migrar, el baseline debe regenerarse con el conteo nuevo.

### Formato del snapshot: compatible

El `fingerprint` de upstream es **byte a byte idéntico** al local:

```js
const normalized = (finding.snippet || finding.message || '').replace(/\s+/g, ' ').trim();
const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
return `${finding.rule}|${finding.file}|${digest}`;
```

No hay migración de formato. El snapshot se regenera de todos modos porque el motor
cambió (rediseño de `buildUnits` +fin de `break`), y eso reagrupa las unidades y
mueve los hashes.

### Estado de `ENV-001`: ya cubierto, no hay nada que migrar

`scripts/test-parser.js` sección 6.3 ya verifica el invariante leyendo `src/index.css`
directamente, sin pasar por el auditor:

```js
const cssNow = fs.readFileSync(path.join(ROOT_DIR, 'src', 'index.css'), 'utf8');
const htmlBlock = cssNow.match(/(^|[,\s}])html\s*\{([\s\S]*?)\}/);
assert.ok(htmlBlock[2].includes('overflow-y: scroll'), ...);
assert.ok(htmlBlock[2].includes('scrollbar-gutter: stable'), ...);
```

Ese test sobrevive al sync. Lo único que depende del fork son 4 asserts de 6.2:
`ENV_GUTTER = 'ENV-001'`, `auditEnvInvariants`, y las dos cadenas de propiedades
dentro del fuente del auditor.

### Corrección al registro de DEV-173

La causa raíz del falso positivo de UX-010 **no era `lineMatches`**. Era `buildUnits`:
contaba `<` contra `>` como caracteres, sin distinguir un self-closing `<Icon />` de
un elemento con hijos, así que `<button>` y su contenido caían en unidades distintas y
"el contenido de este elemento" no era una pregunta computable.

Aplicar solo el fix de `lineMatches` (usar `unit.text` en vez de `content`) es
correcto pero **insuficiente**, y por sí solo **regresiona `UX-006`**: deja de detectar
el caso multilínea que el fixture original no cubría.

Upstream lo resolvió con anidamiento real y tres granularidades por unidad:

| Campo | Incluye | Checks que lo leen |
| :--- | :--- | :--- |
| `text` | Tag de apertura y sus atributos | `line`, `alsoLine`, `unlessLine` |
| `ownContent` | Apertura, cierre y nodos de texto propios, sin descendientes | `alsoContent` |
| `scopeText` | El elemento más todos sus descendientes | `needsContent`, `unlessContent`, `unlessVisibleText` |

### Contato con upstream

Respuesta enviada en este ítem (no por chat), según lo que pidió la carta upstream.

Correcciones que aceptamos sobre nuestro reporte:

- La reproducción mínima declaraba "2 hallazgos, ambos falsos" **contra la copia local
  sin `break`**. Contra upstream (con `break`) reporta **1**, porque el `break` cortaba
  antes del segundo caso. Es decir, el `break` era lo que ocultaba el bug de
  `needsContent`, y por eso el fixture de 2 casos era incomprobable.
- El AC de diagnóstico del bug de `needsContent` apuntaba a `lineMatches`; la causa
  real era `buildUnits`. Corregido acá.

---

## Respuesta a la carta upstream del 2026-10-06

> Publicada en este ítem, no por chat, según lo que pidió la carta.
> Fecha: 2026-10-06 · Referencia upstream: `@gripm/playbook` (motor sin publicar,
> se coordina por release `@gripm/playbook@2.2.0`).

Recibimos la carta. Coincidimos con el diagnóstico y aceptamos las dos correcciones.

**Aceptamos la corrección sobre el `break`.** Nuestro reporte decía "2 hallazgos,
ambos falsos" sin aclarar contra qué copia, y eso fue impreciso. Era contra nuestra
copia local, que ya no tenía el `break`. Contra upstream reporta 1, porque el `break`
cortaba el recorrido antes del segundo caso. La lectura que hacen — que el `break`
era lo que ocultaba el bug de `needsContent`, y que por eso nuestro fixture de 2
casos era incomprobable — es correcta y no la habíamos visto.

**Aceptamos la corrección sobre la causa raíz.** Apuntamos a `lineMatches`. La causa
era `buildUnits`. El rediseño con `text` / `ownContent` / `scopeText` resuelve el
caso multilínea que nuestra reproducción no cubría, y el finding de que el fix
literal de `lineMatches` regresiona UX-006 es un dato que no teníamos.

**Medición de la divergencia, corregida:** 270 líneas solo en `gripm`, 358 solo en
upstream.

**Confirmado: `ENV-001` y `ENV-002` viven dentro del archivo bifurcado** (0
ocurrencias upstream). Tenías razón en que no pueden "seguir locales" si dejamos de
preservar el archivo, y en que la Tarea 1 no está bloqueada por `ENV-002` sino por
la falta de API para componer. Queda acordado: seguimos bifurcados hasta 2.2.0, con
fecha de fin.

**Dos hallazgos de la migración que no estaban en la carta**, por si los quieren
del lado de ustedes:

1. El snapshot se ancla a `path.join(ROOT, BASELINE_NAME)`, o sea la **raíz del
   proyecto**. El nuestro está en `scripts/audit-ux-baseline.json`. Hay que moverlo o
   el motor no lo encuentra.
2. `npm run audit:ux:baseline` no existe en `gripm`; ese paso fallaría tal cual.

**Sobre `ENV-001`:** revisamos y ya está cubierto por el test 6.3 de
`scripts/test-parser.js`, que lee `src/index.css` directo y es independiente del
fork. Sobrevive al sync. Solo 4 asserts de 6.2 dependen del archivo bifurcado.

**Sobre el warning de la Tarea 3:** lo aceptamos y es el riesgo real de la
migración. No vamos a correr `--update-baseline` sobre las 487. El `fingerprint` es
byte a byte idéntico al nuestro, así que no hay migración de formato; se regenera
porque el motor cambió y eso reagrupa las unidades. La secuencia será leer la salida
completa con el motor nuevo, clasificar, y solo entonces snapshotear.

Una pregunta antes del próximo ciclo: **¿`ENV-002` entra en 2.1.0 o 2.2.0?** La
migración depende de que `truncate` en diálogo tenga una firma propia antes del sync,
porque mientras tanto no hay forma de expresarlo sin bifurcar. Si queda en discusión,
asumimos que habría que reimplementarlo localmente después del sync.

---

## Medición entregada a upstream (2026-10-06)

Corresponde a lo que pidieron: medir contra el tarball antes de invertir el día de
migración. Shasum verificado: `dcf2e433b8ad616bf0bc724db2496644ac7eade9`.

**UX-010 sobre `gripm/src` con 2.1.0 y baseline vacío: 0 hallazgos.** De los 127 del
fork, **0 son reales**. Mejora la estimación previa ("~101 falsos sobre 191, genuinos
entre 0 y 90"): el valor real es 0. Diagnóstico confirmado.

Pero **el 0 no es confiable al 100%**, con dos defectos residuales verificados sobre
el tarball:

1. `unlessVisibleText` no cubre el caso multilínea. Un `<button>` de varias líneas con
   icono **y** etiqueta de texto visible se reporta igual:
   ```tsx
   <button type="button" onClick={() => {}} className="p-1">
     <Trash />
     <span>Eliminar</span>
   </button>
   ```
2. No detecta icon-only en elementos que no son `<button>`. Un `div` con
   `role="button"` y solo un icono pasa limpio, aunque `role="button"` está en la
   lista `line` de UX-010:
   ```tsx
   <div role="button" tabIndex={0} onClick={() => {}} className="p-1">
     <Settings />
   </div>
   ```

Los cinco casos que sí importan están correctos: `aria-label` omitido, texto visible
omitido, `<span>` de texto visible omitido, icon-only reportado, y multilínea icon-only
reportado (su AC #4).

**UX-002 → 0 es corrección genuina**, no sobre-supresión: los dos `<kbd>` reales tienen
`hidden sm:inline` / `hidden sm:inline-block`, y los otros 3 hallazgos del fork eran
comentarios de código.

**UX-007 se duplica (34 → 71)** por granularidad de unidad, no por más defectos reales.

**UX-006 → 0 no es concluyente:** la precondición estructural está presente
(`App.tsx:1450` nav fija + `App.tsx:1272` `<main>` con `pb-16`), pero midiendo alturas
la nav ronda 57px contra 64px de `pb-16`, así que probablemente no haya oclusión. Se
verifica visualmente, no se presume regresión.

**Sobre el aviso de bins:** verificado. `gripm/package.json` declara `"gripm":
"bin/gripm.js"` sin prefijo `./`, así que no está afectado. Aplicamos `--dry-run` antes
de cada publish de todos modos.

**No ejecutamos nada:** la preservación de `scripts/audit-ux-code.cjs` sigue intacta y no
corrimos `playbook:sync --force`. Seguimos bifurcados hasta 2.2.0, con fecha de fin.
<!-- SECTION:NOTES:END -->
<!-- SECTION:NOTES:END -->