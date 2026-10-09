---
id: DEV-221
title: "Inversión de orden en pipeline de publicación y auto-creación de GitHub Release"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "ci"
  - "release-management"
  - "github-actions"
  - "npm"
  - "automation"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reestructurar el flujo de entrega continua en `.github/workflows/publish.yml` para garantizar que la publicación a npmjs.com y la creación de la GitHub Release ocurran de forma atómica y estrictamente posterior a la validación completa del código:
1. **Inversión de fases en el workflow de publicación:** Mover el paso `npm publish` al final del pipeline. La ejecución de la suite completa (`tsc`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build`, `npm run publish:check` y `npm pack --dry-run`) debe preceder obligatoriamente a la publicación. Si cualquier verificación falla, el proceso debe abortar sin mutar el registro de npm.
2. **Auto-creación de GitHub Release:** Integrar en el workflow la creación automática de la Release oficial en GitHub utilizando el CLI nativo `gh release create` y el token de Actions con permisos `contents: write`. El título y las notas de la versión deben extraerse automáticamente desde `backlog/releases.json` / `CHANGELOG.md` para evitar pasos manuales o scripts externos.
3. **Sincronización atómica:** Asegurar que el tag de Git, la release documental en GitHub y el paquete publicado en npmjs.com compartan la misma foto verificada y queden sellados en el mismo evento sin duplicar ejecuciones ni dejar artefactos a medio publicar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 En publish.yml, la piramide completa de pruebas y verificacion se ejecuta antes del paso de publicacion en npm
- [ ] #2 Si cualquier paso de verificacion o build falla, el job se detiene sin publicar en npm ni crear la GitHub Release
- [ ] #3 Tras publicar exitosamente en npmjs.com, publish.yml crea la GitHub Release oficial extrayendo titulo y notas desde backlog/releases.json
- [ ] #4 El workflow maneja idempotencia evitando fallas si la version o la release ya existian en el repositorio
- [ ] #5 La suite de pruebas y scripts de integridad local pasan con codigo 0
<!-- AC:END -->
