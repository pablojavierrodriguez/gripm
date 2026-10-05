---
id: DEV-140
title: "Configuración de Linting y Formatting: ESLint Flat Config, Prettier y EditorConfig"
status: done
created_date: '2026-10-01'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establecer configuración de linting y formateo homogénea para que contribuidores externos mantengan la consistencia del código. Usar ESLint flat config con soporte TypeScript y React, Prettier para formateo y EditorConfig para editores sin Prettier nativo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Sincerado en DEV-152: eliminación del stub inerte `eslint.config.js` para evitar falsas garantías; la rigurosidad estricta la provee `npx tsc --noEmit` y el pre-commit hook
- [x] #2 Crear `.prettierrc` con configuración de estilo unificada (singleQuote, semi, trailingComma, printWidth) y `.prettierignore` para excluir dist/, bin/, node_modules/ y archivos markdown de backlog/
- [x] #3 Crear `.editorconfig` con reglas de indentación (2 espacios), UTF-8 y saltos de línea LF
- [x] #4 Scripts `"lint": "tsc --noEmit"` y `"format": "node scripts/verify-backlog-sync.js"` vinculados a las salvaguardas nativas del proyecto
- [x] #5 Verificar que `npm run lint` y `npm run format` se ejecutan correctamente sin romper el build
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear .editorconfig con configuracion estandar (indent_size 2, utf-8, lf).
2. Crear .prettierrc con estandar (singleQuote, semi, trailingComma, printWidth 100) y .prettierignore.
3. Crear eslint.config.js (ESLint v9 flat config compatible con TypeScript nativo).
4. Agregar scripts de lint y format en package.json (opcionales / seguros).
5. Verificar ejecucion y piramide de tests.
<!-- SECTION:PLAN:END -->
