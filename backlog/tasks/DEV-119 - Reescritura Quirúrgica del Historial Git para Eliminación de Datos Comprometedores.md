---
id: DEV-119
title: "Reescritura Quirúrgica del Historial Git para Eliminación de Datos Comprometedores"
status: dismissed
created_date: '2026-09-28'
updated_date: '2026-10-03 21:33'
labels: []
dependencies: []
priority: urgent
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Utilizar `git-filter-repo` para reescribir el historial de Git eliminando rutas absolutas personales y referencias a proyectos privados externos, sin perder información valiosa de commits.

> [!NOTE]
> **Descartada / Suprimida:** Se acordó conservar el repositorio `dev-board` como archivo histórico personal e inmutable privado, e inicializar un nuevo repositorio público limpio e independiente en GitHub (`pablojavierrodriguez/gripm`) con un único commit inicial consolidado en `v1.0.0`. Esta estrategia de bifurcación limpia elimina completamente la necesidad y los riesgos de reescritura destructiva de historial con `git-filter-repo`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Instalar `git-filter-repo` en el sistema (`pip install git-filter-repo` o `brew install git-filter-repo`)
- [ ] #2 Crear archivo de expresiones de reemplazo que cubra: rutas absolutas `/Users/<usuario>/<ruta-personal>` → placeholder neutro, descripciones del proyecto DOM → `<redacted>`, sin tocar `pablojavierrodriguez` ni el nombre `Pablo`
- [ ] #3 Ejecutar `git filter-repo --replace-text expressions.txt` exitosamente sobre todo el historial local
- [ ] #4 Verificar con `git log --all -p | grep -c "/Users/<usuario>/<ruta-personal>` que retorna 0 ocurrencias
- [ ] #5 Verificar que los tags existentes (v0.2.0 a v0.6.1) se preservan correctamente post-rewrite
- [ ] #6 Verificar que `npm test` y `npx tsc --noEmit` pasan exitosamente post-rewrite
- [ ] #7 Documentar el comando exacto de `git push --force` que el usuario debe ejecutar para publicar al remote, con instrucciones de contexto claras
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
