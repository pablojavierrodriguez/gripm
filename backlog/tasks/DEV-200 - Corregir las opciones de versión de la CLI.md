---
id: DEV-200
title: "Corregir las opciones de versión de la CLI"
status: ready
created_date: '2026-10-07'
updated_date: '2026-10-07'
labels:
  - "cli"
  - "dx"
priority: high
type: bug
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al ejecutar `gripm --version`, la CLI ignora la opción y arranca el servidor web en vez de mostrar la versión instalada. Esto causa un efecto secundario inesperado y puede ocupar un puerto o abrir el navegador para una consulta informativa. Implementar y documentar `--version` y su alias `-v`, y verificar que ambos funcionen en el paquete npm extraído.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `gripm --version` imprime únicamente la versión declarada en el paquete y termina exitosamente sin iniciar el servidor ni abrir un navegador
- [x] #2 `gripm -v` produce el mismo resultado que `--version`
- [x] #3 La ayuda del CLI documenta ambas opciones de versión
- [x] #4 El smoke test del paquete npm comprueba la salida y terminación de ambas opciones
- [x] #5 Pasan las validaciones específicas de CLI, la suite unificada y la sincronización del backlog
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `bin/gripm.js` ahora atiende `--version` y `-v` antes del arranque del servidor, e incluye ambas opciones en la ayuda.
- El smoke test empaca el proyecto y verifica que ambos flags impriman exactamente `package.json#version`, terminen con código 0 y no emitan errores. También comprueba que la ayuda documente los flags.
- Validados: `node scripts/test-package-smoke.js`, `npx tsc --noEmit`, `npm test` (16 pasos), `npm run test:linux` (16 pasos), `npm run build`, `npm run publish:check` y `npm run backlog:check`.
<!-- SECTION:NOTES:END -->
