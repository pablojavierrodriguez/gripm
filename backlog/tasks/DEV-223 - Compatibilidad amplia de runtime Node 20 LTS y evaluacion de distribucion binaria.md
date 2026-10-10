---
id: DEV-223
title: "Compatibilidad amplia de runtime Node 20 LTS y evaluación de distribución binaria"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "cli"
  - "runtime"
  - "node20"
  - "bin"
  - "distribution"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reducir la fricción de adopción eliminando el bloqueo estricto a Node.js 22.6+ y ampliando el soporte a la versión LTS activa:
1. **Compatibilidad con Node.js 20.x LTS:** Permitir que el CLI (`gripm`) y el servidor MCP (`gripm-mcp`) ejecuten normalmente en Node.js 20.x sin advertencias de incompatibilidad de motor en `package.json`.
2. **Auditoría de APIs dependientes de v22:** Identificar y reemplazar cualquier API exclusiva de Node 22.6+ por alternativas estándar compatibles con v20 (o polyfills equivalentes).
3. **Distribución binaria independiente:** Diseñar y documentar una prueba de concepto para empaquetar binarios ejecutables standalone para macOS (arm64/x64) y Linux mediante Bun o herramientas nativas (ej. Node Single Executable Application / pkg), facilitando la distribución en gestores de paquetes como Homebrew sin requerir gestores de versiones de Node.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El CLI y el servidor MCP ejecutan normalmente en Node.js 20.x LTS sin advertencias de engine en package.json
- [x] #2 Auditoria y reemplazo de cualquier API de Node exclusiva de v22.6+ por alternativas compatibles con v20
- [x] #3 Prueba de concepto documentada para empaquetar binarios ejecutables independientes para macOS y Linux
- [x] #4 La suite de verificacion npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Verificar que las suites de prueba en CI ejecuten tanto en Node 20 como en Node 22.
<!-- SECTION:NOTES:END -->
