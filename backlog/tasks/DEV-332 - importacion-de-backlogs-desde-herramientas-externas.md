---
id: DEV-332
title: "Importación de backlogs desde herramientas externas"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "product"
  - "cli"
  - "interop"
priority: low
type: feature
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrar a gripm desde otra herramienta hoy exige reescribir tareas a mano. OpenTodo destaca por su importador de JSON, CSV y exports de otras apps. gripm puede importar con dos caminos de bajo riesgo: la convención de archivos de Backlog.md (que ya sigue en `backlog/tasks/*.md`) y un formato tabular o JSON genérico.

La restricción crítica es la integridad: una importación no puede fabricar criterios de aceptación ni estados certificados (regla SEC-02). Las tareas importadas deben nacer en estado inicial (`draft` o `ideas`) sin ACs tildadas, y el resultado debe pasar `backlog:sync` y `backlog:check` limpios. El importador debe ser transaccional: o escribe todo o no escribe nada.

Es una iniciativa de descubrimiento: elegir primero el formato de origen de mayor demanda y validar el contrato antes de implementar múltiples importadores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se elige y documenta el formato de origen prioritario con un ejemplo real de importación.
- [ ] #2 Toda tarea importada nace en estado inicial sin criterios marcados y sin transgredir SEC-02.
- [ ] #3 El proceso es transaccional: una importación interrumpida no deja el backlog a medias.
- [ ] #4 El resultado pasa `npm run backlog:sync` y `npm run backlog:check` con código 0.
- [ ] #5 Duplicados y conflictos de ID se detectan y reportan antes de escribir, sin sobrescribir tareas existentes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Releva qué formatos traen los usuarios que migran y elige el prioritario.
2. Definir el contrato de importación (estados, IDs, duplicados, atomicidad).
3. Implementar el importador transaccional sobre el motor de escritura existente.
4. Validar con backlogs reales de prueba pasando la pirámide de verificación.
<!-- SECTION:PLAN:END -->
