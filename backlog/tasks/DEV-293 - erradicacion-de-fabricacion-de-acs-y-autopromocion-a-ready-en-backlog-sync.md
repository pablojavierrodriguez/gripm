---
id: DEV-293
title: "Gobernanza de Calidad: Erradicación de fabricación de ACs y auto-promoción a ready en backlog sync"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "backlog"
  - "state-machine"
  - "governance"
  - "qa"
dependencies: []
priority: p1
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corrección en el script de sincronización y verificación de backlog (`scripts/verify-backlog-sync.js`) para erradicar la alteración ilegítima de estados y la falsificación automática de criterios de aceptación (`- [ ]` ➔ `- [x]`).

### Problemas identificados y reproducibles:

1. **Fabricación automática de criterios de aceptación cumplidos:**
   En `scripts/verify-backlog-sync.js:236-242`, si una tarea está en estado `done` pero tiene criterios sin tildar (`- [ ]`), ejecutar `npm run backlog:sync` (modo `--fix`) ejecuta:
   ```javascript
   const fixedAcBlock = acBlock.replace(/-\s*\[ \]/g, '- [x]');
   ```
   Tildando mecánicamente todos los criterios como aprobados sin ninguna verificación ejecutable. Esto viola directamente la regla de seguridad `SEC-02` y falsea la trazabilidad histórica de pruebas.
2. **Auto-promoción ilegítima a `ready` saltando `review` y QA:**
   En `scripts/verify-backlog-sync.js:220-228`, si todos los ACs de una tarea en `doing` están tildados, el modo `--fix` cambia su estado automáticamente a `status: ready`.
   Esto viola la Invariante Fundamental de `STATE_MACHINE.md` y `AGENTS.md` (el paso a `ready` es potestad exclusiva del rol QA tras auditar bajo la Pirámide de Verificación).
3. **Diffs artificiales de Git por fecha diaria en `BACKLOG.md`:**
   En `scripts/backlogMdParser.ts:759`, `generateMonolithicBacklogMd` estampa `> Consolidado generado el ${now} por gripm ⚡`. Ejecutar el sync al día siguiente sin cambios en tareas produce un commit innecesario por la fecha.

### Script de Reproducción Inmediata (PoC):

```bash
# Crear tarea en done con AC pendiente
cat << 'EOF' > backlog/tasks/DEV-997\ -\ Test\ Sync.md
---
id: DEV-997
title: Tarea Test
status: done
---
## Acceptance Criteria
- [ ] Criterio no probado
EOF

node scripts/verify-backlog-sync.js --fix
# En el estado actual, el archivo pasa a tener "- [x] Criterio no probado" falsificado
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `verify-backlog-sync.js` en modo `--fix` jamás altera checkboxes `- [ ]` a `- [x]` en tareas marcadas como `done`; en su lugar, reporta una advertencia o error exigiendo verificación real o reclasificación del estado
- [x] #2 `verify-backlog-sync.js` en modo `--fix` jamás auto-promociona tareas de `doing` a `ready`; la transición formal a `ready` se preserva como gate manual/exclusivo del rol QA
- [x] #3 `generateMonolithicBacklogMd` omite marcas de tiempo volátiles que generen git churn diario cuando el contenido de las tareas no ha variado
- [x] #4 `npm run backlog:check` y `npm run backlog:sync` respetan estrictamente la State Machine sin alterar el contenido semántico de las tareas
<!-- AC:END -->

## Implementation Notes

- **Erradicación de fabricación de ACs (SEC-02):** Se eliminó la sustitución automática de `- [ ]` por `- [x]` en tareas con `status: done` dentro de `scripts/verify-backlog-sync.js`. El script ahora emite una advertencia formal de calidad indicando los ACs pendientes sin mutar el archivo.
- **Erradicación de auto-promoción a `ready`:** Se eliminó la mutación del frontmatter a `status: ready` cuando todos los ACs están cumplidos en `doing`. Ahora emite un aviso informativo indicando que la tarea puede avanzar a `review`, preservando la potestad exclusiva de QA para la transición a `ready` según la State Machine.
- **Prevención de Git Churn por Timestamp:** En modo `--fix`, `verify-backlog-sync.js` valida previamente mediante `export --check` si `BACKLOG.md` ya se encuentra sincronizado con el contenido semántico de las tareas. Si coincide, omite la reescritura, evitando diffs innecesarios causados por la fecha diaria en el encabezado.
- **Verificación PoC:** Verificado con tarea de prueba en `done` con `- [ ]` y en `doing` con `- [x]`, demostrando que `node scripts/verify-backlog-sync.js --fix` no muta estados ni checkboxes. Suites `npm run backlog:check` y `npm run backlog:sync` en verde.
