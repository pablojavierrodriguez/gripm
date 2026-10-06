---
id: DEV-186
title: "Refactor de Tipos Core: Renombrar DevBoardConfig a GripmConfig y Unificar Interfaces"
status: draft
created_date: '2026-10-06'
updated_date: '2026-10-06 01:48'
labels: []
dependencies: []
priority: medium
type: tech_debt
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Renombrar la interfaz canónica DevBoardConfig a GripmConfig en src/types.ts y propagar el cambio en los ~10 módulos consumidores (src/App.tsx, SettingsView.tsx, api.ts, etc.) manteniendo retrocompatibilidad mediante un type alias deprecated export type DevBoardConfig = GripmConfig;. Esto completa la unificación de identidad de tipos post-rebranding sin romper contratos externos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Definir GripmConfig como la interfaz canónica de configuración en src/types.ts
- [ ] #2 Exportar export type DevBoardConfig = GripmConfig como alias con anotación @deprecated para retrocompatibilidad total
- [ ] #3 Actualizar las referencias e importaciones en src/App.tsx, src/components/SettingsView.tsx, src/api.ts y demás módulos hacia GripmConfig
- [ ] #4 Verificar que npx tsc --noEmit pase con 0 errores en modo estricto
- [ ] #5 Validar que npm test y npm run backlog:check pasen con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Renombrar la interfaz en src/types.ts y definir el type alias retrocompatible DevBoardConfig.\n2. Reemplazar referencias en componentes y hooks de src/.\n3. Ejecutar npx tsc --noEmit y npm test.\n4. Sincronizar backlog.
<!-- SECTION:PLAN:END -->
