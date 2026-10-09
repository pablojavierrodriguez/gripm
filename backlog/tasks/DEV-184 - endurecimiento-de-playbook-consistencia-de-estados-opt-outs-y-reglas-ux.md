---
id: DEV-184
title: "Endurecimiento del Playbook: Consistencia de Estados T0-T5, Opt-outs en audit:ux y Reglas Multilínea"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-09'
labels:
  - "playbook"
  - "rules"
  - "ux-audit"
  - "quality"
dependencies:
  - DEV-179
  - DEV-181
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver las inconsistencias menores identificadas en el marco de trabajo `gripm-playbook` (hallazgos R8, R9 y R12 del informe de auditoría):

1. **Consistencia de Transiciones (R9):** Alinear los IDs de transición en `docs/sprints/SPRINT_SPEC_TEMPLATE.md` y `TEAM_PLAYBOOK.md` para coincidir de forma unívoca con `STATE_MACHINE.md` (T0 a T5, eliminando la referencia ficticia a T6).
2. **Soporte de Opt-outs (R8):** Implementar la propiedad `exclude` documentada en `.uxaudit.json` dentro de `audit-ux-code.cjs`, o limpiar la documentación en caso de ser redundante.
3. **Robustez en Motor de Reglas UX (R12):** Corregir el contador de delimitadores en `buildUnits` para ignorar flechas de funciones (`=>`) y prevenir falsos positivos de UX-001 en inputs multilínea.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Corregir IDs de transición en SPRINT_SPEC_TEMPLATE.md y TEAM_PLAYBOOK.md alineándolos con STATE_MACHINE.md
- [x] #2 Implementar soporte de exclude en audit-ux-code.cjs o unificar la especificación en la documentación
- [x] #3 Corregir la heurística de cierre de etiquetas en buildUnits para evitar falsos positivos con arrow functions multilínea
- [x] #4 Agregar test fixture multilínea en la suite de tests del playbook
- [x] #5 Validar que npm run check:all pase en verde en gripm-playbook
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Corregir los identificadores de transiciones en plantillas del playbook.
2. Añadir soporte para el array `exclude` en `scripts/audit-ux-code.cjs`.
3. Ajustar `buildUnits` en `audit-ux-code.cjs` distinguiendo tags HTML de lambdas `=>`.
4. Ejecutar pruebas unitarias de regresión.
<!-- SECTION:PLAN:END -->
