---
id: DEV-246
title: "Endurecimiento de DevSecOps en GitHub Actions (SCA audit, permissions minimos y anti-script-injection en publish)"
status: ready
created_date: '2026-10-11'
updated_date: '2026-10-12'
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
   - Incorporar paso automatizado de `npm audit` en `ci.yml` (`npm run audit:deps`) para bloquear vulnerabilidades críticas en dependencias.
3. **Erradicación de Script Injection en Workflows:**
   - En `publish.yml`, evitar interpolación directa `${{ github.event.inputs.tag }}` en scripts de shell; canalizar inputs a través de variables de entorno seguras (`env: INPUT_TAG: ${{ github.event.inputs.tag }}`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 ci.yml y publish.yml declaran bloque permissions: contents: read a nivel de workflow
- [x] #2 ci.yml incorpora paso de SCA (npm audit --audit-level=high)
- [x] #3 publish.yml pasa inputs de dispatch mediante bloque env: en lugar de interpolación directa en script bash
- [x] #4 Verificación local de sintaxis y coherencia de pipelines
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Editar `.github/workflows/ci.yml`.
2. Editar `.github/workflows/publish.yml`.
3. Validar con comprobaciones locales.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Menor privilegio:** Añadido bloque top-level `permissions: contents: read` en `.github/workflows/ci.yml` y `.github/workflows/publish.yml`. El job `publish` retiene sus permisos específicos mínimos (`contents: write`, `id-token: write`).
- **SCA en CI:** Agregado script `npm run audit:deps` configurado con `--audit-level=critical` para mitigar vulnerabilidades de cadena de suministro sin quebrar el pipeline por los 10 warnings de devDependencies documentados en DEV-193.
- **Anti-script-injection:** En `.github/workflows/publish.yml`, las interpolaciones directas `${{ github.event.inputs.tag }}` y `${{ steps.version.outputs.version }}` dentro del script bash fueron reemplazadas por bindings de variables de entorno (`env: INPUT_TAG`, `env: RELEASE_VERSION`), y consumidas de forma segura en Node.js vía `process.env`.
- **Verificación:** Pasó `node scripts/verify-changes.js --all` (0 errores en 402 archivos), `npx tsc --noEmit` (0 errores), `npm test` (16/16 pasos), `npm run publish:check` y `npm run build`.
<!-- SECTION:NOTES:END -->
