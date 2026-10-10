---
id: DEV-225
title: "Extensión Webview para VS Code y Cursor con sincronización en tiempo real"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "vscode"
  - "cursor"
  - "webview"
  - "extension"
  - "dx"
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminar la fricción de alternar ventanas hacia el navegador para supervisar el backlog, empaquetando la interfaz React existente de Gripm dentro de una vista de panel lateral (Webview) para VS Code y Cursor:
1. **Extensión empaquetada:** Crear una extensión ligera que registre una vista lateral (`WebviewViewProvider`) en el contenedor de vistas del explorador o barra de actividad de VS Code / Cursor.
2. **Consumo de workspace activo:** Cargar la aplicación web de Gripm dentro del Webview alimentándose directamente de los archivos de backlog (`backlog/tasks/*.md` o `.gripm/backlog.json`) del workspace abierto.
3. **Sincronización bidireccional reactiva:** Detectar eventos de modificación en disco mediante watchers del editor para que los cambios aplicados por el agente (vía MCP) o por el usuario se reflejen inmediatamente en la vista sin necesidad de recargar manualmente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Extension funcional empaquetada que registra una vista lateral en el explorador del editor
- [ ] #2 Carga de la aplicacion web de Gripm dentro del Webview consumiendo los archivos locales del workspace abierto
- [ ] #3 Sincronizacion bidireccional inmediata ante cambios en disco sin recargar manualmente
- [ ] #4 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reutilizar el bundle estático de la UI compilada de Gripm Board asegurando soporte de Content Security Policy (CSP) en Webview.
<!-- SECTION:NOTES:END -->
