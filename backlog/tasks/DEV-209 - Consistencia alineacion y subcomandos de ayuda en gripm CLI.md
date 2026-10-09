---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
release: "1.0.5"
milestone: "1.0.5"
id: DEV-209
title: "Consistencia alineacion y subcomandos de ayuda en gripm CLI"
status: done
created_date: '2026-10-08'
updated_date: '2026-10-09'
labels:
  - "cli"
  - "dx"
  - "documentation"
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver las inconsistencias en la ayuda del CLI (`bin/gripm.js` y `bin/gripm-mcp.js`):
1. Distinguir semánticamente Comandos posicionales (`gripm`, `gripm mcp`, `gripm playbook sync`) de Opciones de ejecución.
2. Soporte nativo de `--help` y `-h` en subcomandos:
   - `gripm mcp --help` y `gripm-mcp --help` deben desplegar la descripción del servidor MCP y sus parámetros en lugar de bloquearse esperando JSON-RPC por stdin.
   - `gripm playbook --help` y `gripm playbook sync --help` deben mostrar la ayuda con código de salida 0 en lugar de abortar con exit code 1.
3. Documentar las opciones existentes: `--single`, `--multi`, opciones no interactivas de `--init` y flags avanzadas de `playbook sync` (`--branch`, `--remote`, `--dry-run`, `--force`).
4. Alinear el host por defecto documentado (`127.0.0.1`) con la implementación real.
5. Corregir el espaciado y alineación visual de columnas en la salida de terminal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 gripm --help y gripm -h presentan una salida formateada y alineada, diferenciando comandos de opciones y documentando --single, --multi y host 127.0.0.1
- [x] #2 gripm mcp --help, gripm mcp -h y gripm-mcp --help muestran la descripcion del servidor MCP con codigo de salida 0 sin colgarse en stdin
- [x] #3 gripm playbook --help, gripm playbook sync --help y gripm playbook -h muestran la guia de uso de sincronizacion con codigo de salida 0
- [x] #4 Las opciones avanzadas de --init (--no-skill, --no-agents, etc.) y playbook sync (--dry-run, --force, --branch, --remote) estan documentadas adecuadamente
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Verificar tanto la invocación directa (node bin/gripm.js) como vía npx / npm run gripm.
- Preservar el comportamiento headless de stdio en gripm-mcp cuando no se soliciten flags de ayuda (--help / -h).
<!-- SECTION:NOTES:END -->
