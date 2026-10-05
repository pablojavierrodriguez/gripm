---
id: DEV-181
title: "Saneamiento P0 de Frontera OSS: Fugas en Skills, Contrato MCP y Endurecimiento de Seguridad"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "security"
  - "skills"
  - "mcp"
  - "oss"
  - "p0"
dependencies:
  - DEV-148
  - DEV-154
  - DEV-171
priority: urgent
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ejecutar el saneamiento integral de frontera pública identificado en la auditoría técnica de código abierto (`docs/informe-auditoria.md`):

1. **Fuga de contexto en Skills:** Eliminar residuos de proyectos privados (`YourApp`, `PermissionGate`, `People.tsx`, `MeetingDetailModal`, `Check-in QR`, `Ministerios y grupos`, etc.) y corregir tokens sintéticos inválidos (`'regional-locale'`) en `.agents/skills/`.
2. **Contrato de Herramientas MCP:** Corregir `.agents/skills/gripm/SKILL.md` para erradicar las llamadas `devboard_*` obsoletas y documentar con fidelidad las 12 herramientas canónicas `gripm_*`.
3. **Endurecimiento de Seguridad en API Local:** Contener `/api/fs/browse` dentro de rutas autorizadas (`os.homedir()`) y proteger el comportamiento de CORS/Host cuando se configura `0.0.0.0`.
4. **Higiene Documental:** Remover referencias a tooling eliminado (ESLint) y actualizar conteos de métricas del proyecto en los READMEs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Erradicar de .agents/skills/ todas las referencias a YourApp y componentes/contextos de proyectos privados, convirtiéndolas en plantillas universales
- [x] #2 Reemplazar en .agents/skills/ tokens sintéticos inválidos ('regional-locale') y clases CSS no declaradas
- [x] #3 Actualizar .agents/skills/gripm/SKILL.md reemplazando devboard_* por el catálogo canónico de 12 tools gripm_*
- [x] #4 Implementar contención en /api/fs/browse (vite.config.ts) validando que targetDir resida dentro de os.homedir() o rutas permitidas (403 Forbidden ante escapes)
- [x] #5 Endurecer reglas de seguridad cuando se usa host 0.0.0.0 sin deshabilitar protecciones de Host ni reflejar Origin indiscriminadamente
- [x] #6 Limpiar menciones de ESLint y actualizar conteos de tareas y sprints en README.md, README.es.md y CHANGELOG.md
- [x] #7 Validar que la pirámide completa de verificación (tsc, npm test, backlog:check, publish:check, build) pase con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar y sanitizar quirúrgicamente cada archivo en `.agents/skills/`.
2. Corregir `.agents/skills/gripm/SKILL.md` con las tools canónicas `gripm_*`.
3. Aplicar contención en `vite.config.ts` para `/api/fs/browse` y endurecer el middleware de seguridad.
4. Pulir `README.md`, `README.es.md` y `CHANGELOG.md`.
5. Ejecutar la suite completa de tests y comprobaciones de empaquetado.
<!-- SECTION:PLAN:END -->
