---
id: DEV-192
title: "Normalizar los IDs de sprint: hay un prefijo duplicado y un ID basado en timestamp"
status: draft
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "higiene"
  - "backlog"
  - "data"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`backlog/sprints.json` tiene 9 sprints y dos de sus IDs no siguen el patrón `sprint-<n>`:

```
sprint-0                 Sprint 0
sprint-1                 Sprint 1
sprint-2                 Sprint 2
sprint-3                 Sprint 3
sprint-4                 Sprint 4
sprint-1790252674566     Sprint 5     <- ID basado en timestamp
sprint-6                 Sprint 6
sprint-sprint-7          Sprint 7     <- prefijo duplicado
sprint-8                 Sprint 8
```

`sprint-sprint-7` tiene el prefijo `sprint-` duplicado, y `sprint-1790252674566` se generó con `Date.now()` en lugar de secuencia. Visualmente el nombre es correcto ("Sprint 7"), así que el defecto está oculto hasta que algo consume el ID.

### Por qué importa aunque hoy no rompa nada

Verificado: **ninguna tarea, release ni entrada de `BACKLOG.md` referencia estos dos IDs**. La migración no tiene costo de datos.

El riesgo es latente, no activo. Los IDs son la clave de agrupación y de las queries del filtro de sprint; un ID con doble prefijo rompe cualquier comparación por `startsWith` o por regex que asuma el patrón, y un timestamp no ordena igual que el resto de la secuencia.

### Origen probable

El `sprint-sprint-7` sugiere que en algún momento el nombre ya venía prefijado y el código que genera el ID le agregó el prefijo otra vez. El timestamp sugiere un camino de creación alternative que no participa de la secuencia.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Los 9 IDs de `backlog/sprints.json` siguen el patrón `sprint-<n>`
- [ ] #2 La secuencia es correlativa y coincide con el nombre del sprint
- [ ] #3 El generador de IDs de sprint no puede producir un prefijo duplicado
- [ ] #4 El generador de IDs de sprint no puede producir un ID basado en timestamp
- [ ] #5 `npm run backlog:check` sigue en verde después de la migración
- [ ] #6 La vista de Sprint y el filtro por sprint muestran los 9 sprints con el mismo nombre que antes de la migración
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Localizar el código que genera el ID de sprint y Reproducir los dos casos defectuosos.
2. Corregir el generador para que aplique el prefijo una sola vez y use la secuencia.
3. Migrar los dos IDs mal formados en `sprints.json`.
4. Verificar que ninguna referencia quedara apuntando al ID viejo.
5. Correr `backlog:check` y la suite para confirmar que el filtro de sprint sigue igual.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### El orden importa: primero el generador, después los datos

Si se corrige solo `sprints.json` sin tocar el generador, el sprint 7 vuelve a aparecer como `sprint-sprint-7` en cuanto se cree un sprint nuevo. La migración de datos sin arreglar la causa solo compra tiempo.

### Por qué esto no se detectó antes

Nadie miró `sprints.json`. Los IDs se muestran como "Sprint 7" en la UI, así que el defecto es invisible desde la interfaz, que es donde se revisa el backlog. Es la misma razón por la que el baseline de UX-010 terminó con falsos positivos: **una vista cómoda puede ocultar el dato defectuoso**. La verificación tiene que mirar el dato, no la vista.
<!-- SECTION:NOTES:END -->