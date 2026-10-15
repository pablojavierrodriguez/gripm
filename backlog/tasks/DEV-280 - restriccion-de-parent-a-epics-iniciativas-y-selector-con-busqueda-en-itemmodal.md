---
id: DEV-280
title: "Restricción de candidatos a Parent (Epics/Iniciativas) y selector con búsqueda en ItemModal"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "item-modal"
  - "hierarchy"
  - "epics"
dependencies: []
priority: medium
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El listado de candidatos a Parent en ItemModal solo muestra tareas de tipo `epic` e `initiative`
- [x] #2 Las tareas regulares de tipo `feature`, `bug`, `ux`, etc., quedan excluidas de la lista de posibles padres
- [x] #3 El selector cuenta con un buscador en tiempo real para filtrar candidatos por código o título
- [x] #4 Seleccionar una épica actualiza inmediatamente el campo `parentId` y muestra la referencia vinculada
- [x] #5 La interfaz permite limpiar la relación de forma rápida con el botón de desvinculación
- [x] #6 `npm test` y consistencia en la jerarquía de ítems
<!-- AC:END -->

## Implementation Notes

- **Restricción estricta de jerarquía en ItemModal:** Se modificó la computación de `candidateParents` en `src/components/ItemModal.tsx` para filtrar únicamente ítems con `type === 'epic' || type === 'initiative'`, excluyendo formalmente tareas operativas (`feature`, `bug`, `ux`, `chore`, etc.).
- **Combobox accesible con búsqueda en tiempo real:**
  - Se reemplazó el `<select>` plano nativo por un selector interactivo tipo combobox popover con soporte de accesibilidad completo (`role="listbox"`, `role="option"`, `aria-selected`, `aria-label`).
  - El trigger muestra la referencia seleccionada con badge (`[EPIC]` o `[INITIATIVE]`), código y título, o el estado neutral `(Sin padre - Tarea raíz independiente)`.
  - El popover integra un input de búsqueda con icono `Search`, placeholder localizado (`itemModal.searchParentPlaceholder`), botón de limpieza inmediata `(X)` y foco automático al desplegarse.
  - Filtro case-insensitive en vivo por código, título y tipo.
  - Soporte de navegación por teclado: flechas Arriba/Abajo para recorrer opciones, Enter para seleccionar, y captura dedicada de Escape para cerrar el desplegable sin cerrar el modal principal.
  - Cierre al hacer clic fuera del componente con `handleClickOutside`.
  - Opción destacada para desvincular o seleccionar sin padre (`itemModal.relationsNoParent`), además de preservar el banner de parent actual con su botón de desvinculación rápida `(X)`.
  - Mensaje de estado vacío cuando ninguna épica coincide con la búsqueda (`itemModal.noParentsFound`).
  - Fallback defensivo para referencias previas no listadas `[LEGACY]`.

