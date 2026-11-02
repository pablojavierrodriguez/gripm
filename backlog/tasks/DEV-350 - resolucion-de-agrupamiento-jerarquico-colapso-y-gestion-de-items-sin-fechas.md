---
id: DEV-350
title: "Resolucion de agrupamiento jerarquico, colapso/expansion y gestion de items sin fechas"
status: draft
created_date: '2026-10-27'
updated_date: '2026-10-27'
labels:
  - "roadmap"
  - "epics"
  - "hierarchy"
  - "bug"
  - "ux"
dependencies:
  - DEV-348
priority: high
type: bug
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la vista de Roadmap se presentan anomalias criticas de jerarquia, agrupamiento y visualizacion de tareas:
1. **Colapso/Expansion Inoperativo:** Al agrupar por epicas, no es posible colapsar o expandir cuando el item padre no fue tipado estrictamente como `type: epic | initiative` o cuando las referencias (`parentId` / `epic`) no resuelven a un ID padre existente.
2. **Modo Plano con Formato Inadecuado:** Al desactivar el agrupamiento, tareas individuales continuan mostrando estilo visual de agrupador/padre (badge de epica, porcentaje de avance simulado, bloqueo de manijas de redimensionamiento temporal).
3. **Desbordamiento por Codigos Largos:** Tareas con codigos extensos (ej. `DOM-BENCHMARK-POST-DESARROLLOS` o `DOM-C4`) colapsan el ancho disponible para el titulo y desencadenan truncamiento abrupto en barras de Gantt y sidebar.
4. **Items sin Fechas (Seccion Sin Planificar):** Dejar de asignar fechas arbitrarias (ej. `createdAt + 14 dias`) a items que no cuentan con `startDate`, `dueDate` ni herencia de Sprint/Release. Reubicarlos de forma clara en una seccion o carril dedicado de tareas "Sin planificar".
5. **Warning en Desplazamiento de Epicas con Hijos:** Cuando el usuario arrastra la barra de una epica cuyas fechas provienen de sus hijos, emitir un aviso informativo o advertencia (toast/confirmacion) indicando que las fechas estan consolidadas a partir de las tareas contenidas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] El agrupamiento jerarquico admite cualquier referencia valida de contenedor o padre y los chevrons de colapsar/expandir operan correctamente en cada grupo
- [ ] En modo sin agrupar (lista plana), las tareas se presentan como filas estandar sin simular porcentajes ni estilos de contenedor
- [ ] Los codigos extensos se ajustan ergonomicamente sin ocluir los titulos de tarea ni desbordar la celda
- [ ] Las tareas sin fechas no inventan rangos temporales en la grilla y se muestran agrupadas en el panel / seccion 'Sin planificar'
- [ ] Al intentar desplazar una epica con fechas calculadas de hijos se muestra una advertencia explicativa
<!-- AC:END -->
