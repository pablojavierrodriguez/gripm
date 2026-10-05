---
id: DEV-182
title: "Pipeline de Despliegue Continuo (CD): Automatización de npm publish con GitHub Actions y Provenance"
status: draft
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "ci-cd"
  - "devops"
  - "npm"
  - "automation"
dependencies:
  - DEV-174
  - DEV-181
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar e implementar el workflow automatizado de despliegue continuo (CD) para la publicación en el registro público de npm (`@gripm/board` y `@gripm/playbook`) ante la creación de releases o tags en GitHub, eliminando la necesidad de publicación manual desde terminales locales.

**Puntos clave identificados en auditoría (R19):**
1. **Disparador:** Ejecución automática en eventos `release: [published]` o push de tags `v*`.
2. **Seguridad y Provenance:** Publicación con flag `--provenance` mediante permisos OIDC (`id-token: write`, `contents: read`).
3. **Validación previa:** Ejecutar `prepublishOnly` verificando build y `publish:check` sin fugas antes de publicar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Crear workflow .github/workflows/publish.yml en gripm con trigger de release/tag
- [ ] #2 Configurar permisos OIDC id-token: write y contents: read para soporte de npm provenance
- [ ] #3 Documentar en docs o README el uso del secret NPM_TOKEN o Trusted Publishing
- [ ] #4 Replicar el workflow automatizado en el repositorio de gripm-playbook
- [ ] #5 Validar que un dry-run de empaquetado y build ejecute exitosamente en CI antes del publish
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Diseñar el archivo `.github/workflows/publish.yml` configurando Node 22 y setup de registry npm.
2. Añadir paso de verificación de tests, build y surface check.
3. Añadir comando `npm publish --access public --provenance` condicionado al environment de release.
4. Documentar los pasos de aprovisionamiento del token en GitHub Secrets.
<!-- SECTION:PLAN:END -->
