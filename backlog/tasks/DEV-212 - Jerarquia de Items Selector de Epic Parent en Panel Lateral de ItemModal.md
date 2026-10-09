---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
milestone: "1.0.5"
id: DEV-212
title: Jerarquía de Ítems Selector de Epic Parent en Panel Lateral de ItemModal
status: done
priority: p2
type: ux
module: UI / Modals
release: "1.0.5"
created: 2026-10-09
---

## Descripción

La relación de jerarquía vertical (ítem -> padre / épica) tenía un peso específico de primer orden que quedaba oculto dentro del acordeón colapsable de relaciones secundarias.
Se promueve el selector de Padre / Épica al panel lateral derecho de `ItemModal.tsx`, ubicándolo inmediatamente debajo de las etiquetas (labels) y arriba de módulo/código.

## Criterios de Aceptación

<!-- AC:BEGIN -->
- [x] 1. En 'ItemModal.tsx', la relación vertical 'parentId' se remueve de la sección colapsable de relaciones (manteniendo bloques de blockedBy, blocks y relatedTo).
- [x] 2. Se incorpora el campo 'Epic / Épica' (o 'Item Padre') en la columna lateral derecha de 'ItemModal.tsx', debajo de etiquetas y arriba de módulo y código.
- [x] 3. El selector permite seleccionar un padre de la lista de candidatos (epics, initiatives, features) o desasignar fácilmente, persistiendo el campo 'parentId' de forma simétrica.
<!-- AC:END -->
