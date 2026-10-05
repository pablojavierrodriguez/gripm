---
id: DEV-121
title: "Metadatos Completos de package.json y Reorganización de Dependencias"
status: done
created_date: '2026-09-28'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: chore
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Completar los metadatos del `package.json` según mejores prácticas de npm y OSS, mover dependencias de build-time a `devDependencies`, agregar campo `engines` con versión mínima de Node, y agregar `files` para controlar qué se incluye en `npm pack`.

Actualmente el package.json tiene `"private": true` (bloquea npm publish) y le faltan todos los metadatos estándar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Remover `"private": true` del package.json
- [x] #2 Agregar campos: `description`, `repository` (type+url), `homepage`, `bugs`, `keywords` (≥10 keywords), `author`, `license: "MIT"` (configurado apuntando a https://github.com/pablojavierrodriguez/dev-board)
- [x] #3 Mover `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer` de `dependencies` a `devDependencies`
- [x] #4 Agregar `"engines": { "node": ">=22.6.0" }` requerido por `--experimental-strip-types`
- [x] #5 Agregar `"files": ["bin", "dist", "data/demo-backlog.json", "LICENSE", "README.md", "README.es.md"]` para controlar el contenido de npm pack
- [x] #6 Verificar que `npm pack --dry-run` lista solo los archivos esperados (sin `src/`, `scripts/`, `backlog/`)
- [x] #7 Verificar que `npm install` y `npm run build` siguen funcionando correctamente
- [x] #8 `lucide-react` también se mueve a `devDependencies`: es build-time igual que el resto, y los binarios publicados sólo importan built-ins de Node
- [x] #9 `dependencies` queda vacío: el paquete publicado no requiere ninguna dependencia en runtime (verificado: `bin/devboard.js` y `bin/devboard-mcp.js` sólo importan `node:*`)
- [x] #10 `author` se escribe como "DevBoard Contributors", en línea con el copyright del `LICENSE` y sin nombre propio
- [x] #11 `npx tsc --noEmit` finishes con código 0
- [x] #12 `npm test` finishes con código 0
- [x] #13 `npm run backlog:check` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventariar qué necesita realmente el paquete publicado: verificar de qué
   importan los binarios de `bin/` y qué assets lee el servidor en runtime.
2. Completar los metadatos que no dependen de una decisión de identidad:
   `description`, `keywords`, `author` y `license`.
3. Mover todas las dependencias de build a `devDependencies`, incluidas las que no
   figuraban en el plan original pero comparten la misma naturaleza.
4. Declarar `engines` con la versión mínima real que exige `--experimental-strip-types`.
5. Declarar `files` con lo que el paquete publicado necesita y nada más, excluyendo
   el registry local de proyectos.
6. Verificar con `npm pack --dry-run`, `npm run build`, `tsc` y la suite de tests.
7. Dejar `repository`, `homepage` y `bugs` para cuando la identidad del repositorio
   esté definida.
<!-- SECTION:PLAN:END -->
