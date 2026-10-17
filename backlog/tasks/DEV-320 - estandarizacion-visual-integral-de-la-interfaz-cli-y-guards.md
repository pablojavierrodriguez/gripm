---
id: DEV-320
title: "Estandarización visual integral de la interfaz CLI, guards y herramientas"
status: done
created_date: '2026-10-17'
updated_date: '2026-10-17 17:20'
labels:
  - "cli"
  - "ux"
  - "dx"
  - "tooling"
dependencies: []
priority: high
type: feature
estimate: 3
claimed_by: "antigravity:80a7372b-a537-48df-a1c4-8385724b0a1f"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Completar la homogeneización visual absoluta de la interfaz de terminal (CLI), guards y scripts de soporte en todo el ecosistema de gripm según los estándares modernos de DEV-252 (clig.dev, Vite, Next.js):
1. **bin/gripm.js:** Modernizar el bloque de advertencia y tokens efímeros de red local (--host 0.0.0.0), sustituyendo emojis por punteros sobrios (➜) y glifo de advertencia (▲).
2. **scripts/gripm-cli.ts:** Rediseñar el dashboard de métricas (--stats), eliminando emojis decorativos y bordes dobles a favor de una estructura abierta con sangría uniforme y colores ANSI semánticos. Limpiar mensajes de export y check.
3. **scripts/gate-qa.mjs:** Erradicar cajas rígidas (=== / ---) y emojis en el auditor ejecutable de QA a favor de encabezado abierto estilo gripm, lista alineada y veredictos con ✔ y ✖.
4. **scripts/audit-ux-code.cjs:** Modernizar encabezado y reporte humano de auditoría estática de UX, erradicando cajas de signos de igual.
5. **scripts/verify-backlog-sync.js:** Limpiar prefijos redundantes entre corchetes ([gripm Guard], [Consolidado]) y emojis (🔍, 📄, 🛑, ✅) a favor de mensajes atómicos y sobrios.
6. **scripts/verify-publish-surface.js:** Eliminar corchetes y emojis festivos (🎉, 📦), adoptando checks mono-ancho consistentes.
7. **scripts/generate-changelog.cjs:** Estandarizar la salida de regeneración de changelog.
8. **scripts/run-tests.js:** Sustituir emojis ✅ y ❌ por ✔ y ✖ en el resumen secuencial de la suite de pruebas.
9. **Paridad con Playbook:** Reflejar las mejoras correspondientes en las herramientas de gripm-playbook.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Modernizada la advertencia de red LAN en bin/gripm.js (--host 0.0.0.0) sin emojis decorativos
- [x] #2 Rediseñado el dashboard de métricas y mensajes en scripts/gripm-cli.ts bajo la jerarquía abierta estándar
- [x] #3 Modernizada la salida de scripts/gate-qa.mjs con encabezado abierto, punteros ➜ y glifos mono-ancho
- [x] #4 Limpiado el reporte de auditoría en scripts/audit-ux-code.cjs sin recuadros de signos =
- [x] #5 Estandarizadas las salidas de guards (verify-backlog-sync.js, verify-publish-surface.js, generate-changelog.cjs, run-tests.js)
- [x] #6 Cero em-dashes y soporte total de NO_COLOR en todas las herramientas intervenidas
- [x] #7 Sincronización en gripm-playbook y Pirámide de Verificación completa en verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Consolida una experiencia de terminal única, predecible y sin fricciones en Windows Terminal, PowerShell y entornos Unix.
- Elimina cualquier discrepancia tipográfica o saturación de caracteres visuales redundantes en herramientas CLI y pre-commit hooks.
<!-- SECTION:NOTES:END -->
