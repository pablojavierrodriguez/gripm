---
id: DEV-264
title: "Estándar de densidad de escritorio a 1366×768: medición, presupuesto y cero scroll horizontal"
status: dismissed
created_date: '2026-10-14'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "responsive"
  - "desktop"
  - "technical-debt"
priority: high
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Este ítem existe para **respaldar una promesa que el producto ya hace pública**. Los dos
README dicen que la demo está *"Optimized for desktop"* / *"Optimizada para escritorio"*.

Esa afirmación tiene una parte verdadera y una que no. Es verdad que el tablero **prioriza**
el escritorio y que mobile no está hecho (DEV-207). Lo que no está respaldado es la
calidad: **escritorio tampoco está impecable a anchos comunes**, y el README es la única
fuente de esa promesa. Si alguien la toma literalmente y encuentra el tablero apretado a
1366, el README queda desmentido por el producto.

El caso de uso real de este ítem es la **demo pública de `gripm.vercel.app`**, que se
comunicó como experiencia desktop.

## Qué se sabe, y qué no

### Medido

- **La columna `Completado` queda cortada por el borde derecho a 1280×800** y pide scroll
  horizontal para leerse. Es el ancho más común en un portátil pequeño, y es un defecto de
  escritorio, no de móvil.
- **45 hallazgos `UX-007` (hacinamiento horizontal) aceptados en el baseline**, repartidos
  en 16 archivos:

  | Archivo | Hallazgos |
  | :--- | ---: |
  | `ItemModal.tsx` | 5 |
  | `SettingsView.tsx` | 5 |
  | `ReleaseAssembler.tsx` | 4 |
  | `ImportWizardModal.tsx` | 4 |
  | `Header.tsx` | 4 |
  | `KanbanBoard.tsx` | 3 |
  | `CompleteSprintModal.tsx` | 3 |
  | `ItemCard.tsx` | 3 |
  | `PlanGuardModal.tsx` | 3 |
  | `AdvancedFiltersPopover.tsx` | 3 |
  | `ProjectModal.tsx` | 2 |
  | `FolderPickerModal.tsx` | 2 |
  | `Toast.tsx`, `SprintView.tsx`, `SprintModal.tsx`, `ConfirmModal.tsx` | 1 c/u |

  La regla que los produce se titula *"Horizontal crowding on mobile cards (< 640px)"*,
  así que **su firma es de móvil, pero el patrón que marca es el mismo**: filas
  `flex justify-between` con 3 o más nodos complejos y sin `truncate` ni wrap. Un
  componente así se aprieta igual a 1366 que a 400px; a 1366 simplemente se nota menos.
  **El nombre de la regla invita a pensar que no aplica a escritorio, y eso es un error de
  lectura.**

### Sin medir, y es el punto de partida obligatorio

- **1366×768**, la resolución de referencia que usa DEV-206, **nunca se midió**.
- La demo pública solo se auditó a 1280×800.
- No hay inventario de qué de esos 45 hallazgos se manifiestan también a 1366 y cuál se
  resuelve solo con más espacio.
- No existe una **línea de base medible de densidad en escritorio**. El criterio actual es
  "no romper lo que ya existe", que es un criterio de no-regresión, no de estándar.

## Qué resolver

1. **Medir antes de tocar.** Inventario real a 1366×768 y, si hace falta, 1440×900: scroll
   horizontal del tablero, columnas cortadas, filtros y contadores, y comportamiento de
   los modales anchos. Con números, no con la inferencia de que "si se ve bien a 400px y a
   1280, se verá bien a 1366".
2. **Declarar un presupuesto de densidad operable.** El criterio *"que no haya scroll
   horizontal"* no se puede auditar sin un número. Hay que dejar declarado y verificable:
   ancho mínimo por columna del tablero, cuántas son visibles sin scroll en la vista por
   defecto, ancho máximo de los modales, y el umbral a partir del cual el scroll
   horizontal pasa a ser **intencional** en lugar de accidental.
3. **Resolver el caso de la columna `Completado`.** Un tablero con scroll horizontal en su
   vista por defecto es el defecto de escritorio más visible.
4. **Revisar los 45 `UX-007` separando lo que es apretado real de lo que solo afecta a
   móvil**, y dejar escrito el criterio. Si se decide aceptar los que son de móvil, queda
   escrito; si se aceptan todos, también.
5. **Mantener la honestidad del README.** Si al cierre la experiencia de escritorio queda
   buena, el texto puede volver a afirmar más, en el mismo commit y con evidencia. Si no,
   el texto actual es el correcto y este ítem documenta por qué.

## Alcance de este ítem y el de DEV-269

Este ítem se amplió originalmente a "estándar de calidad visual completo" y se partió en
dos, porque **un ítem de 16 criterios no es certificable**:

- **DEV-264 (este)** es el núcleo duro: medición, presupuesto de densidad, clasificación de
  los `UX-007`, cero scroll horizontal y modales sin truncado. Es el quick win de
  escritorio y **desbloquea a DEV-265**.
- **DEV-269** aplica sobre este presupuesto los criterios de jerarquía visual, estados
  completos, motion y cero CLS. Depende duro de este ítem.

El orden queda serializado: **DEV-264 → DEV-269 → DEV-265**.

## Relación con DEV-207

No solapan y no se deben fusionar. DEV-207 es una card de `ideas` para **diseñar** la
experiencia móvil; su AC #4 pide *"mantener la experiencia desktop sin regresiones"*, o sea
habla de **no romper** escritorio, no de arreglar lo que ya está apretado. Este ítem trabaja
el lado desktop con defectos preexistentes.

Lo que sí los une: la evidencia de acá es insumo directo para el diseño de DEV-207, y
cualquiera de los dos debería conocer el estado del otro.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Medición documentada a 1366×768 y 1440×900 de: scroll horizontal del tablero, columnas cortadas, filtros, contadores y modales anchos
- [ ] #2 Presupuesto de densidad declarado y verificable: ancho mínimo por columna del tablero, cuántas son visibles sin scroll en la vista por defecto, ancho máximo de modales y el umbral declarado a partir del cual el scroll horizontal pasa a ser intencional
- [ ] #3 Inventario de los 45 hallazgos `UX-007` clasificados en "aprieta a escritorio" / "solo móvil", con el criterio escrito y la lista de aceptados dentro de este ítem
- [ ] #4 El tablero no requiere scroll horizontal en su vista por defecto a 1366×768, incluida la columna `Completado`
- [ ] #5 Los modales anchos (`ItemModal`, `SettingsView`, `ReleaseAssembler`, `CompleteSprintModal`, `PlanGuardModal`) no muestran texto truncado ni solapado a 1366×768
- [ ] #6 Verificado en ambos idiomas y en ambos temas, sin overflow horizontal accidental
- [ ] #7 La medición, el presupuesto de densidad y la clasificación de `UX-007` quedan escritos en un artefacto versionado bajo `docs/ux/`, y ese artefacto es el estándar contra el que se certifica DEV-265 y se diseña DEV-207
- [ ] #8 El README sigue reflejando el estado real: si la experiencia desktop queda buena, el texto se ajusta en el mismo commit con evidencia; si no, se conserva el texto actual y este ítem explica por qué
- [ ] #9 `npm run audit:ux` en verde **sin regenerar el baseline a ciegas**, `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** al publicar la demo se redactó el párrafo del README como *"Optimized for
  desktop"*, y fue objetado: escritorio también tiene defectos. Se propuso cambiarlo por
  *"Built desktop-first; the mobile experience is not there yet"*, pero **la decisión fue
  dejar el README como está y corregirlo más adelante**. Este ítem es ese "más adelante".

  > [!CAUTION]
  > **El texto del README sigue siendo "Optimized for desktop"** en los dos idiomas, sin
  > cambios en `main`. No se modificó. Cualquier lectura de este ítem que dé por hecho que
  > el texto ya se corrigió está equivocada.
- **Por qué el ítem importa igual.** La objeción es válida y no depende de qué texto haya:
  el tablero prioriza el escritorio, pero escritorio **no está impecable** a anchos
  comunes. La promesa del README solo queda respaldada cuando esto cierre.
- **No usar `--update-baseline` como atajo para el AC #9.** Regenerar el snapshot es
  justamente el modo de convertir "hemos decidido que este hacinamiento es aceptable" en
  algo invisible. Si se acepta algo, la decisión va escrita acá (AC #3).
- **La certificación de escritorio tiene que ser visual, no estática.** La regla `UX-007`
  ya marca 45 casos y aun así el defecto de la columna `Completado` a 1280 se le escapó a
  todo el mundo porque nadie abrió la demo a ese ancho. Un `audit:ux` en verde no dice nada
  sobre si alguien puede leer la última columna. **El AC #1 es la medición; el AC #9 es el
  piso, no la prueba.**
- **Al cerrar, el texto del README se ajusta en el mismo commit**, con evidencia de la
  medición. No antes.
- **Nombre de archivo renombrado con `git mv`** al cambiar el título: el slug anterior
  ("hacinamiento horizontal") describía el alcance original, no el vigente. El `id` no
  cambió, así que ninguna referencia externa se rompió.
<!-- SECTION:NOTES:END -->