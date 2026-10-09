---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
release: "1.0.5"
milestone: "1.0.5"
id: DEV-215
title: "Tolerancia de flags de ayuda y clarificación de comandos y servidor MCP en CLI"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "cli"
  - "dx"
  - "mcp"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver irregularidades y fricciones de usabilidad en la interfaz de línea de comandos (CLI) y servidor MCP:
1. **Tolerancia de flags de ayuda:** Cuando el usuario pasa variantes comunes de ayuda como `--h` o `-help` (o `help`), el CLI no debe abrir el servidor web ni buscar puertos alternativos (ej: 4101), sino responder inmediatamente imprimiendo la ayuda y saliendo con código 0. Esto aplica tanto a `gripm`, `gripm-mcp`, `gripm mcp` como a `gripm playbook`.
2. **Claridad en comandos y ejecutable MCP:** En la sección `Comandos:` de `gripm --help`, separar los subcomandos ejecutables reales (`gripm mcp`, `gripm playbook sync`) del binario directo independiente `gripm-mcp` (provisto para clientes MCP como Cursor y Claude Desktop), evitando la impresión errónea de que `gripm-mcp` es un subcomando anidado.
3. **Eliminación de disclaimers confusos:** Retirar de la salida de `--help` la mención `"Gripm Suite no tiene aún un instalador"`, la cual genera confusión al referirse a un elemento de roadmap no publicado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 bin/gripm.js y scripts/mcp-server.ts aceptan --h, -help, --help y -h terminando con codigo 0 sin iniciar Vite ni abrir puertos
- [x] #2 gripm --help lista unicamente subcomandos directos en Comandos: y documenta gripm-mcp en seccion de integracion MCP
- [x] #3 La salida de ayuda elimina la mencion innecesaria a Gripm Suite y su falta de instalador
- [x] #4 verify-resilience-and-cli.js y test-package-smoke.js auditan las nuevas variantes de flag y la estructura limpia de ayuda
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Recompilar bin/gripm-mcp.js mediante npm run build:bin tras actualizar scripts/mcp-server.ts.
<!-- SECTION:NOTES:END -->
