---
id: DEV-120
title: "Sanitización del Backlog: Anonimización de Referencias a Proyectos Externos Privados"
status: done
created_date: '2026-09-28'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: chore
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Revisar y anonimizar las tareas del backlog que contienen referencias explícitas al proyecto privado `DOM`, al directorio `m3` o a `c3admin`. Preservar el valor técnico de la documentación de cada tarea sin exponer información de proyectos ajenos a DevBoard.

Tareas afectadas: DEV-116, DEV-117, dev-012, dev-022, dev-024, dev-027
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Sanitizar DEV-116: reemplazar referencias a `m3` por `instancia-b` o `another-project` en el contexto de colisión de puertos
- [x] #2 Sanitizar DEV-117: reemplazar referencias a `m3` y `DOM` por ejemplos genéricos (`my-app`, `ProjectName`)
- [x] #3 Sanitizar dev-012: generalizar la referencia a `dom` y `m3/docs` como `external-project`
- [x] #4 Sanitizar dev-022: reemplazar `DOM-P, DOM-BUG, DOM-FEAT, DOM-SPEC` por `APP-P, APP-BUG, APP-FEAT, APP-SPEC`
- [x] #5 Sanitizar dev-024: reemplazar `proyecto DOM` por `proyecto externo`
- [x] #6 Sanitizar dev-027: reemplazar `m3 y c3admin` en el título por `repositorios externos`
- [x] #7 Verificar con grep que cero tareas del backlog contienen referencias privadas a DOM, m3 o c3admin (excepto en contexto técnico web estándar como DOM API)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modificar DEV-116: sustituir 'm3' por 'instancia-b' en el contexto de colisión de puertos IPv6.
2. Modificar DEV-117: sustituir referencias a 'm3' y 'DOM' por ejemplos genéricos ('my-app', 'ProjectName').
3. Modificar dev-012: generalizar referencias a 'dom' y 'm3/docs' como 'external-project'.
4. Modificar dev-022: reemplazar prefijos de ejemplo 'DOM-P, DOM-BUG, DOM-FEAT, DOM-SPEC' por 'APP-P, APP-BUG, APP-FEAT, APP-SPEC'.
5. Modificar dev-024: sustituir 'proyecto DOM' por 'proyecto externo'.
6. Modificar dev-027: renombrar título y cuerpo para sustituir 'm3 y c3admin' por 'repositorios externos'.
7. Modificar dev-030, dev-071, dev-082 y DEV-135 para sanitizar cualquier remanente de proyecto privado.
8. Auditar con git grep que no quedan referencias privadas en backlog/tasks/.
9. Correr npm run backlog:check y npm test.
<!-- SECTION:PLAN:END -->
