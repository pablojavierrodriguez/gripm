# 0005 - Overlays montados vía portales y layout raíz estable (cero CLS)

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-13
- **Tareas:** `DEV-129`, `DEV-130`, `DEV-124`, `DEV-190`, `DEV-254`
- **Reemplaza:** - 

---

## Contexto

La UI de gripm es densa en superficies flotantes: modales de detalle, confirmaciones, menús contextuales de tarjeta, drawers de release y popovers de filtros. Toda esa UI se renderiza dentro de contenedores que aplican `transform` y `backdrop-filter` (el drawer con blur, las tarjetas con transiciones de hover y drag & drop).

En CSS, un ancestro con `transform` se convierte en *containing block* de sus descendientes `position: fixed`. El resultado fue una cadena de bugs reales: el menú contextual de `ItemCard` se dibujaba detrás de la tarjeta siguiente (`DEV-129`), `ConfirmModal` aparecía duplicado y con parpadeo, y los overlays no cubrían el viewport esperado.

En paralelo, la aparición y desaparición de la barra de scroll del documento generaba *layout shift* acumulado: el contenido saltaba horizontalmente en cada transición de vista, tema o ancho de columna.

Ambos problemas son de la misma familia: **el punto de montaje del overlay y la estabilidad del contenedor raíz son invariantes de layout, no detalles de CSS por componente**.

## Decision Drivers

1. **Correctitud visual impredecible de los overlays:** un modal no puede quedar detrás de una tarjeta ni clipped.
2. **Cero CLS:** ninguna transición de estado, tema o scrollbar puede desplazar el contenido.
3. **Una sola regla, no un checklist por componente:** la corrección tiene que ser estructural y verificable estáticamente.
4. **Accesibilidad de overlays:** `role="dialog"`, `aria-modal`, trampa de foco y retorno de foco al disparador.

## Opciones consideradas

### Opción A - Overlays `position: fixed` montados en el árbol del componente

- **A favor:** cero trabajo extra, el overlay queda junto a su disparador en el árbol de React.
- **En contra:** queda rehén de cualquier ancestro con `transform` o `filter`; el bug reaparece cada vez que un componente toma un estilo nuevo.
- **Veredicto:** descartada. Es la causa raíz de `DEV-129` y `DEV-130`.

### Opción B - Portales a un nodo contenedor dedicado, sin `document.body`

- **A favor:** desacopla del ancestro problemático y permite concentrar el stacking en un solo nodo.
- **En contra:** exige mantener un nodo raíz de overlays con su propio contexto de stacking y su ciclo de vida; no resuelve el `position: fixed` si el nodo tiene `transform`.
- **Veredicto:** descartada. `document.body` ya es el nodo de overlays natural y no necesita mantenimiento propio.

### Opción C - `createPortal` a `document.body` + reserva estable de scrollbar

- **A favor:** el overlay vive en el nodo de más alto nivel del documento, inmune a *containing block* y *stacking context* heredados; y el layout raíz se declara estable una sola vez.
- **En contra:** hay que ser explícito con el `z-index` y con el foco (el portal rompe la intuición de árbol de React para foco y para tests).
- **Veredicto:** adoptada.

## Decisión

**Todo overlay se monta con `createPortal(..., document.body)`, y el elemento raíz `html` se declara estable de scrollbar.**

1. **Portales para overlays** (`AGENTS.md` §6.10): modales (`src/components/Modal.tsx`), `ConfirmModal`, menús contextuales (`src/components/ItemCard.tsx`), drawers y modales de release (`src/components/ReleaseAssembler.tsx`). El primitivo `Modal` monta incondicionalmente sobre `document.body`.
2. **Cero CLS en la raíz** (`AGENTS.md` §6.9): `index.css` declara en `html` `overflow-y: scroll; scrollbar-gutter: stable;`. El gutter se reserva siempre: la barra de scroll aparece y desaparece sin desplazar el contenido.
3. **Cero `truncate` en cajas de confirmación** (`AGENTS.md` §6.12): el texto de advertencia o confirmación usa `break-words text-xs leading-relaxed`, nunca ellipsis, para no cortar texto crítico.
4. **Accesibilidad como parte del primitivo, no del uso:** `role="dialog"`, `aria-modal`, `useFocusTrap` con retorno de foco al disparador y cierre con `Esc`. Un overlay sin esas cuatro propiedades no es un overlay válido.

## Consecuencias

### Positivas

- Los bugs de z-index y de clipping no tienen dónde reaparecer: cualquier overlay nuevo que siga la regla funciona sin depurar stacking contexts.
- El layout no salta al cambiar de vista, de tema o al aparecer contenido largo: la diferencia entre screenshots y perception de calidad deja de depender de timing.
- La regla es verificable estáticamente (búsqueda de `createPortal` sobre `document.body`), sin necesidad de browser para confirmar la mayor parte de los casos.

### Negativas

- El foco y los tests deben razonar sobre el árbol de React **y** sobre el árbol del DOM: un modal portal puede requerir `screen.getByRole` en lugar de consultas por contenedor.
- Los `z-index` quedan en un espacio global compartido: cada overlay nuevo debe declararse por encima del drawer y de la barra, y no hay aislamiento por componente.
- Añade un portal a la ruta de renderizado, con un costo menor de montaje en overlays frecuentes (menú por tarjeta abierta).

### Neutras o a vigilar

- Un overlay montado con `position: absolute` sobre `document.body` reintroduce el problema de "no cubre el viewport" si no se acompaña de `inset-0` y `fixed`; la auditoría estática de UX cubre estos casos.

## Referencias

- [`AGENTS.md`](../../AGENTS.md) §6.9, §6.10 y §6.11 - gotchas permanentes derivadas de esta decisión.
- `backlog/tasks/DEV-129 - Menu Contextual de ItemCard se Monta Detras de la Tarjeta Siguiente.md`.
- `backlog/tasks/DEV-130 - ConfirmModal Roto en ItemCard Popup Duplicado y Parpadeo.md`.
- `backlog/retros/sprint-7-retro.md` - acción "montar todo modal y menú flotante vía `createPortal`".