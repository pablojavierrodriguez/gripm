---
id: DEV-249
title: "Tolerancia a CRLF en verify-changes y actualizacion de selector de pestana Sprints en test-ui"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ci"
  - "quality-gate"
  - "windows"
  - "playwright"
  - "hotfix"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolución de dos fallos en el pipeline de GitHub Actions (`ci.yml`):

1. **Falso positivo de `U+D` en `scripts/verify-changes.js` en runner `windows-latest`:**
   - En runners Windows, Git realiza el checkout por defecto con CRLF (`\r\n`).
   - `checkCorruption` dividía por `\n`, dejando el retorno de carro `\r` (0x0D / 13) al final de cada línea, evaluando erróneamente `code < 0x20 && code !== 0x09` como verdadero y reportando falso positivo `carácter de control U+D` en cada línea de cada archivo del repositorio.
   - Mitigación: Normalización en `checkCorruption` descartando `\r` final (`replace(/\r$/, '')`), exclusión explícita de `0x0d` y `0x0a` de la condición de caracteres de control, y creación de `.gitattributes` con `* text=auto eol=lf` para estandarizar checkout en LF.

2. **Timeout en `scripts/test-ui-smoke.js` en runner `ubuntu-latest`:**
   - La pestaña de Sprints en Header (`src/components/Header.tsx`) utiliza la etiqueta localizada `header.sprints` ("Sprints").
   - El test de smoke usaba un regex estricto `/^(Sprints & Backlog|Sprints y Backlog)$/` que no contemplaba "Sprints".
   - Mitigación: Actualización del regex a `/^(Sprints & Backlog|Sprints y Backlog|Sprints)$/`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- SECTION:AC:BEGIN -->
- [x] `scripts/verify-changes.js` no reporta falsos positivos de `U+D` en archivos con terminaciones de línea CRLF.
- [x] `.gitattributes` existe en la raíz y define `* text=auto eol=lf` para consistencia cross-platform.
- [x] `scripts/test-ui-smoke.js` localiza correctamente la pestaña de Sprints mediante `/^(Sprints & Backlog|Sprints y Backlog|Sprints)$/`.
- [x] `node scripts/verify-changes.js --all` pasa con código de salida 0.
- [x] La suite completa `npm test` y el check de sincronización `npm run backlog:check` pasan en verde.
<!-- SECTION:AC:END -->
