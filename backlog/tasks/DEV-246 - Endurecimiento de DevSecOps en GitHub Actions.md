---
id: DEV-246
title: "Endurecimiento de DevSecOps en GitHub Actions (SCA audit, permissions minimos y anti-script-injection en publish)"
status: draft
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "security"
  - "devsecops"
  - "ci-cd"
dependencies:
  - "DEV-242"
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Endurecimiento de la cadena de suministro y workflows de CI/CD en `.github/workflows/`:

1. **Principio de menor privilegio en workflows:**
   - Establecer `permissions: contents: read` a nivel global en `ci.yml` y `publish.yml` para impedir que tokens de Actions tengan permisos excesivos de escritura por defecto.
2. **SCA (Software Composition Analysis):**
   - Incorporar paso automatizado de `npm audit --audit-level=high` en `ci.yml` para bloquear vulnerabilidades críticas en dependencias de producción.
3. **Erradicación de Script Injection en Workflows:**
   - En `publish.yml`, evitar interpolación directa `${{ github.event.inputs.tag }}` en scripts de shell; canalizar inputs a través de variables de entorno seguras (`env: RELEASE_TAG: ${{ github.event.inputs.tag }}`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 ci.yml y publish.yml declaran bloque permissions: contents: read a nivel de workflow
- [ ] #2 ci.yml incorpora paso de SCA (npm audit --audit-level=high)
- [ ] #3 publish.yml pasa inputs de dispatch mediante bloque env: en lugar de interpolación directa en script bash
- [ ] #4 Verificación local de sintaxis y coherencia de pipelines
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Editar `.github/workflows/ci.yml`.
2. Editar `.github/workflows/publish.yml`.
3. Validar con comprobaciones locales.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
