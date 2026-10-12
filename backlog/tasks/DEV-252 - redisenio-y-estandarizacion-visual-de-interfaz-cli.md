---
id: DEV-252
title: "Rediseño y estandarización visual de interfaz CLI según lineamientos modernos"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "cli"
  - "ux"
  - "dx"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rediseñar la interfaz de terminal (CLI) de gripm adoptando los estándares de la industria (Command Line Interface Guidelines - clig.dev, Vite, Next.js):
1. Erradicar las cajas Unicode cerradas y fijas con emojis que se descuadran en terminales como PowerShell y Windows Terminal debido a discrepancias en el ancho de caracteres de fuentes monoespaciadas.
2. Adoptar una jerarquía visual limpia y abierta con sangría consistente, punteros sobrios (`➜`), etiquetas atenuadas y valores clave destacados (URL local y proyecto).
3. Eliminar la saturación de emojis decorativos ("emoji soup") en banners de bienvenida y wizards de scaffolding, priorizando la señal sobre el ruido.
4. Respetar entornos sin color (`NO_COLOR` / no-TTY) y garantizar robustez entre plataformas (Windows, Linux, macOS).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Erradicada la caja rígida cerrada y la sopa de emojis en el banner de arranque en bin/gripm.js a favor de un diseño limpio estilo Vite/Next.js
- [x] #2 Banner de arranque destaca la URL local y ruta del proyecto con sangría consistente y formateo ANSI semántico respetando NO_COLOR y TTY
- [x] #3 Modernizados los avisos de actualización y mensajes de scripts/initScaffold.js y scripts/uninstall.js sin recuadros rígidos quebradizos
- [x] #4 Preservada la compatibilidad con todas las opciones CLI (--repo, --port, --init, --help, mcp, playbook) y suites de prueba existentes
- [x] #5 Pirámide de Verificación completa en verde (tsc --noEmit, npm test, backlog:check, verify-changes)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Inspirado en el estándar de servidores de desarrollo modernos (Vite, Next.js, Turborepo).
- Se elimina la dependencia de cálculos manuales frágiles de ancho de caracteres (getVisualWidth) al evitar bordes cerrados en el margen derecho.
<!-- SECTION:NOTES:END -->
