---
id: DEV-368
title: "Idempotencia y desacople de publicación en ci.yml con extracción limpia de release notes y flag latest"
status: ready
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels: []
dependencies: []
priority: medium
type: tech_debt
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
El job `publish` en `.github/workflows/ci.yml` sufre de acoplamiento frágil: si `check_npm` detecta que la versión ya está en npm, se saltea todo el paso de Git Tag y GitHub Release. Además, el parseo de `releases.json` se ejecuta con un script inline de bash/node (`node -e "..."`) de 10 líneas y `gh release create` no declara `--latest`.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Desacoplar los pasos en el job `publish` de `ci.yml`:
     - `npm_published`: publica a npm solo si falta en el registro.
     - `tag_exists`: verifica remotamente si existe el tag y lo crea solo si falta.
     - `release_exists`: verifica con `gh release view` si existe la release y la crea solo si falta.
  2. Eliminar el script inline `node -e "..."` de `ci.yml` reemplazándolo por un script dedicado (ej. `node scripts/extract-release-notes.js` o la utilidad de Playbook).
  3. Agregar el flag `--latest` a la llamada `gh release create`.
  4. Mover la verificación de consistencia de `CHANGELOG.md` al job `verify` (o integrarla en `backlog:check`) para evitar que fallas de sincronización detengan la publicación en `main`.
- **Out-of-Scope:**
  - Alterar los 19 pasos del runner de tests de `scripts/run-tests.js`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 ci.yml desacopla npm publish, creación de Git Tag y creación de GitHub Release en steps independientes con guardas idempotentes.
- [x] #2 La extracción de notas de release en CI no utiliza scripts inline en bash, usando en su lugar un script dedicado con salidas deterministas.
- [x] #3 gh release create incluye el flag --latest.
- [x] #4 La verificación de sincronización de CHANGELOG.md se ejecuta en la fase previa (verify) antes de mergear a main.
- [x] #5 npm run backlog:check y npm run backlog:sync terminan con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
