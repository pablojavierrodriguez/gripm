---
id: DEV-145
title: "Apertura Automática del Navegador en npm run dev y npm run board"
status: done
created_date: '2026-10-02'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: feature
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar la apertura automática del navegador en localhost:4100 (o el puerto disponible) tanto al ejecutar npm run dev como npm run board, agregando el script board en package.json y configurando server.open en vite.config.ts de forma coordinada con bin/devboard.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Agregar script "board": "node bin/devboard.js" en package.json
- [x] #2 Configurar server.open: true en vite.config.ts para apertura automática de localhost:4100 (o puerto resuelto) en npm run dev
- [x] #3 Prevenir apertura duplicada en bin/devboard.js pasando open: false a createServer y preservando el flag --no-open
- [x] #4 Verificar tipado estricto con npx tsc --noEmit, pruebas con npm test y auditoría con npm run backlog:check
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Añadir el script 'board': 'node bin/devboard.js' en package.json.
2. Añadir 'open: true' en la sección 'server' de vite.config.ts para que 'npm run dev' abra el navegador automáticamente en el host y puerto resueltos.
3. En bin/devboard.js, pasar 'open: false' en la configuración de createServer para evitar que Vite dispare una doble apertura durante server.listen(), permitiendo que devboard gestione la apertura respetando el flag --no-open.
4. Validar tsc, tests y backlog:check.
<!-- SECTION:PLAN:END -->
