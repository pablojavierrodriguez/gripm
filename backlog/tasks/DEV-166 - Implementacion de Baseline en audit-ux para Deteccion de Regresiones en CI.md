---
id: DEV-166
title: "Implementación de Baseline en audit:ux para Detección de Regresiones en CI"
status: draft
created_date: '2026-10-04'
updated_date: '2026-10-04 20:00'
labels:
  - "ci"
  - "qa"
  - "ux"
  - "tooling"
  - "post-launch"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El auditor estático de ergonomía y UX `npm run audit:ux` (`scripts/audit-ux-code.cjs`) analiza el código fuente en busca de problemas de touch targets, colisiones de scroll y legibilidad.

### Diagnóstico de Causa Raíz

Actualmente el paso en CI produce:
`Resumen: 0 errores, 0 advertencias, 313 sugerencias.`
La gran mayoría de estas 313 sugerencias corresponden a micro-tipografías deliberadas (`text-[10px]` y `text-[11px]`) utilizadas en badges, metadatos y vistas de densidad compacta.

### Problema

El pipeline de integración continua (`.github/workflows/ci.yml`) ejecuta `npm run audit:ux`. Al emitir sistemáticamente más de 300 observaciones y finalizar siempre con código 0, la herramienta pierde su valor informativo: acostumbra al equipo a ignorar la salida y sepulta posibles regresiones reales introducidas en PRs entre cientos de líneas de ruido.

### Objetivo

Implementar un mecanismo de baselining para `scripts/audit-ux-code.cjs`:
1. Permitir registrar o cargar un baseline de observaciones conocidas y aceptadas (ej. `scripts/audit-ux-baseline.json`).
2. En ejecución estándar (CI y local), comparar los hallazgos contra el baseline y reportar únicamente las diferencias (nuevas violaciones).
3. Proveer una bandera CLI `--update-baseline` para renovar deliberadamente el snapshot cuando se agreguen o modifiquen componentes intencionalmente.
4. Convertir el linter en un gate de calidad estricto que alerte ante regresiones genuinas sin requerir silenciadores manuales invasivos en cada línea.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Diseñar el formato de snapshot y persistencia de baseline para `scripts/audit-ux-code.cjs`
- [ ] #2 Implementar la opción `--update-baseline` para capturar el conjunto actual de 313 observaciones
- [ ] #3 En ejecución normal sin argumentos, `npm run audit:ux` debe reportar 0 observaciones no baselineadas y terminar con código 0
- [ ] #4 Si se introduce una regresión no catalogada en el baseline, el script debe reportarla con precisión de archivo y línea
- [ ] #5 La suite completa `npm test` y el workflow de CI ejecutan limpiamente sin advertencias espurias
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `scripts/audit-ux-code.cjs` para parsear el argumento `--update-baseline`.
2. Generar el archivo `scripts/audit-ux-baseline.json` indexando las observaciones por código de regla, archivo y patrón.
3. Incorporar la lógica de filtrado diff: si no se provee `--update-baseline`, excluir los hallazgos existentes en el snapshot.
4. Validar el comportamiento introduciendo una violación intencional y confirmando que solo esa novedad sea informada.
5. Ejecutar `npm run audit:ux` y verificar salida limpia en CI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: Errores críticos de accesibilidad o layout (como UX-010 en scrollbars) nunca deben ser silenciados por el baseline; este solo debe aplicar a advertencias y sugerencias de micro-diseño auditadas.
<!-- SECTION:NOTES:END -->
