---
id: DEV-298
title: "Gobernanza de CI/CD: Gate de verificación previa obligatoria en pipeline de publish a npm"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ci"
  - "cd"
  - "npm"
  - "governance"
dependencies: []
priority: p2
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Garantizar que el workflow de publicación en npm (`.github/workflows/publish.yml`) no emita ningún paquete al registro público sin que la suite integral de CI (`.github/workflows/ci.yml`, incluyendo la matriz multi-OS y los tests de navegador Playwright) haya finalizado exitosamente sobre el commit del release.

### Diagnóstico del Defecto de Arquitectura:
Actualmente, el pipeline de CI (`ci.yml`) y el de publicación (`publish.yml`) corren en paralelo y de forma desacoplada:
1. Al pushear el commit a `main`, se dispara `ci.yml`.
2. Al pushear el tag `v*`, se dispara `publish.yml`.
3. `publish.yml` ejecuta una pirámide local básica antes de publicar, pero **no incluye el smoke test de navegador de Playwright (`test:ui`) ni la matriz multiplataforma**.
4. En caso de fallas que solo emergen en el smoke test o en runners de Windows/macOS, `publish.yml` publica el paquete a npm antes de que CI termine de detectar el problema, dejando a los usuarios con una versión inmutable defectuosa en npm.

### Solución Técnica Propuesta:
- **Validación de Check Suites en `publish.yml`:**
  Antes de ejecutar `npm publish`, agregar un paso que consulte la API de GitHub (`gh api repos/:owner/:repo/commits/:sha/check-runs`) para certificar que todos los jobs de `ci.yml` asociados al commit taggeado estén en estado `completed` con conclusión `success`.
- **Manejo de Reintentos / Espera:**
  Si los checks de CI aún están `in_progress`, esperar con timeout configurable o utilizar el evento `workflow_run` para encadenar la publicación únicamente tras el éxito garantizado de CI en `main`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] AC #1: `publish.yml` verifica que el commit asociado al tag tenga todos los check runs de `ci.yml` aprobados (`conclusion: success`) antes de invocar `npm publish`.
- [ ] AC #2: Si algún check de CI falla, `publish.yml` aborta inmediatamente con error descriptivo y no publica el paquete en npm.
- [ ] AC #3: Si los checks de CI están en curso, `publish.yml` aguarda su finalización hasta un límite de tiempo razonable antes de proceder o abortar.
- [ ] AC #4: El mecanismo soporta tanto la publicación por push de tag `v*` como por `workflow_dispatch`.
<!-- AC:END -->

## Notes

<!-- SECTION:NOTES:BEGIN -->
Identificado durante el release de v1.5.0/v1.5.1, donde un fallo en `ui-smoke` de CI ocurrió en paralelo a la publicación exitosa del paquete en npm.
<!-- SECTION:NOTES:END -->
