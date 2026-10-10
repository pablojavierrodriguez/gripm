---
id: DEV-227
title: "Actualización integral de documentación multilingüe README en y es post-evolución"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "docs"
  - "i18n"
  - "readme"
priority: low
type: task
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualizar de forma exhaustiva, simétrica y coherente la documentación del repositorio en inglés (`README.md`) y español (`README.es.md`) una vez culminado el plan de evolución:
1. **Documentación del Sandbox en Vercel:** Incluir enlace destacado a la demo web interactiva y explicar su funcionamiento como entorno sandbox de demostración sin daemon.
2. **Nuevos perfiles del asistente CLI:** Documentar los perfiles de inicialización de `gripm --init` (Minimalista AI-First vs Baterías Incluidas) y sus flags no interactivas (`--minimal`, `--full`).
3. **Guía de integración del Gatekeeper MCP:** Explicar el funcionamiento de la compuerta de calidad de `gripm-mcp` para agentes de IA y la configuración de comandos de verificación.
4. **Instrucciones de la extensión Webview:** Documentar la instalación y uso del panel lateral en VS Code y Cursor.
5. **Flujo de Worktrees concurrentes:** Añadir guía de comandos para aislamiento multi-sesión con Git Worktrees.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 README.md actualizado con las nuevas capacidades y el enlace al Sandbox de Vercel
- [x] #2 README.es.md actualizado en perfecta sincronia y simetria con README.md
- [x] #3 Documentacion de perfiles CLI, Gatekeeper MCP, extension Webview y Git Worktrees
- [x] #4 npm run backlog:check pasa con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Esta tarea debe ser la última en completarse tras el cierre de las tareas evolutivas del plan.
<!-- SECTION:NOTES:END -->
