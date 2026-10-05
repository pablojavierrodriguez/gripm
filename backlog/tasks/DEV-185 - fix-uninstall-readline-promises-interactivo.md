---
id: DEV-185
title: "Corrección de Desacople Interactivo: Reemplazar node:readline por node:readline/promises en scripts/uninstall.js"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "cli"
  - "bugfix"
  - "uninstall"
dependencies:
  - DEV-181
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al ejecutar `npx gripm --uninstall` (o `gripm --clean`) en una terminal interactiva (TTY), el proceso fallaba inmediatamente con:
`TypeError: Cannot read properties of undefined (reading 'trim')`.

**Causa Raíz:**
En `scripts/uninstall.js`, se importaba `node:readline` (basado en callbacks) en lugar de `node:readline/promises`. Por consiguiente, `await rl.question('')` evaluaba a `undefined`, provocando que la invocación `.trim()` fallara.

**Solución:**
1. Se migró la importación a `import readline from 'node:readline/promises';`.
2. Se añadieron salvaguardas defensivas para respuestas nulas `(rawAnswer || '').trim()`.
3. Se implementó la inyección opcional de streams (`input`, `output`, `interactive`) en `runUninstallCommand` para testeo automatizado de flujos interactivos.
4. Se extendió `scripts/verify-integration.js` con una prueba de integración interactiva que valida el ciclo interactivo completo de preguntas y respuestas sin regresiones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Importar node:readline/promises en scripts/uninstall.js para soportar llamadas async/await en rl.question
- [x] #2 Implementar manejo defensivo ante respuestas nulas al recortar con trim
- [x] #3 Soportar inyección de opciones de streams (input, output, interactive) en runUninstallCommand
- [x] #4 Agregar prueba de integración del flujo interactivo en scripts/verify-integration.js
- [x] #5 Validar que npm test y npm run backlog:check pasen con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `scripts/uninstall.js` importando `node:readline/promises`.
2. Proteger las lecturas de `answer` con fallback a cadena vacía antes de `.trim()`.
3. Habilitar `options.interactive`, `options.input`, `options.output` en `runUninstallCommand`.
4. Añadir test de integración en `scripts/verify-integration.js` usando streams simulados `PassThrough`.
5. Ejecutar `npm run backlog:sync`, `npm run backlog:check`, `npm test` y compilar.
<!-- SECTION:PLAN:END -->
