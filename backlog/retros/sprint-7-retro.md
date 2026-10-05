---
sprintId: sprint-7
sprintName: "Sprint 7"
date: "2026-10-02"
author: "Antigravity Agentic Team & Pablo"
status: completed
tasksCompleted:
  - DEV-101
  - DEV-114
  - DEV-115
  - DEV-116
  - DEV-117
  - DEV-118
  - DEV-120
  - DEV-121
  - DEV-122
  - DEV-124
  - DEV-125
  - DEV-126
  - DEV-127
  - DEV-128
  - DEV-129
  - DEV-130
  - DEV-131
  - DEV-132
  - DEV-133
  - DEV-135
  - DEV-145
tasksDismissed:
  - DEV-119
---

# Retrospectiva de Cierre — Sprint 7

**Objetivo del Sprint:** Integridad del dato y corrección de fallos silenciosos: hooks de verificación que no mutan el repositorio, paridad de temas, identidad de proyecto, y eliminación de los defectos que no fallaban de forma visible (contenido fabricado en los .md, stacking context y containing block en overlays, y pulido de ItemModal).  
**Resultado:** 21 ítems completados exitosamente al 100% y 1 ítem descartado de forma controlada (`DEV-119`). Todo el valor empaquetado y liberado formalmente en el Release `v0.7.0`.

---

## Dimensiones de la Retrospectiva

### 🔴 Problemas (¿Qué falló o tomó más tiempo del esperado?)
1. **Pre-Commit Hook Invasivo:** El hook original ejecutaba `git add .` mutando el índice de Git, lo que impedía componer commits selectivos y forzaba el stageado accidental de tareas no deseadas. Se resolvió de raíz en DEV-125 haciendo que el hook sea estrictamente no mutador (solo audita y alerta).
2. **Bugs de Overlays por Stacking Context:** Los modales de confirmación y menús desplegables se renderizaban dentro de tarjetas contenedoras con propiedades CSS (`transform`, `backdrop-filter`) que alteraban el containing block. Se erradicó en DEV-129 y DEV-130 migrando los portales a `document.body`.
3. **Inyección de Contenido Fabricado:** Tareas guardadas desde la UI sufrían contaminación de bloques generados artificialmente por el parser. Se erradicó en DEV-127 y se creó un script de purga en DEV-128.
4. **Marcadores de Sección Literales en Markdown:** El uso de marcadores sin escapar (`<!-- AC:BEGIN -->`) causaba que el parser cortara las descripciones silenciosamente. Se resolvió en DEV-132 estableciendo una regla canónica de escape en `AGENTS.md`.

### 🟡 Eficiencia (¿Qué podría haberse hecho en menos pasos o con menos tokens?)
1. **Auditoría UX Estática:** Integrar reglas estáticas personalizadas en `scripts/audit-ux-code.cjs` permitió capturar regresiones visuales (textos arbitrarios, scrollbars rotos) en milisegundos sin necesidad de navegadores headless costosos.
2. **Verificación Estricta en Cascada:** Respetar la pirámide de verificación (`tsc` -> `test` -> `backlog:check` -> `build`) garantizó que ningún bug de tipo o sincronización llegara a la fase de commit.

### 🟢 Fortalezas (¿Qué funcionó de manera excelente y debe repetirse?)
1. **Internacionalización Integral (i18n):** Adopción de cobertura bilingüe simultánea en CLI, UI y documentación sin textos hardcodeados (DEV-114).
2. **Apertura Automática del Navegador:** Mejora de DX instantánea en `npm run dev` y `npm run board` con autodetección de puertos y flags `--no-open` (DEV-145, DEV-116).
3. **Eject Seguro y Desinstalación:** Garantía de no regresión en la persistencia del usuario con `devboard --uninstall` (DEV-115).

### 📌 Acciones Concretas (Compromisos y Guardrails)
- [x] **Acción 1:** Prohibir cualquier mutación del índice de Git en hooks automáticos (`AGENTS.md` Sección 3).
- [x] **Acción 2:** Montar todo modal y menú flotante vía `createPortal(..., document.body)`.
- [x] **Acción 3:** Escapar siempre marcadores HTML literales dentro de descripciones o notas Markdown.
- [x] **Acción 4:** Sellar formalmente Sprint 7 en `backlog/sprints.json` y registrar la versión `v0.7.0` en `backlog/releases.json`.

---
*Retrospectiva ejecutada de conformidad con la Sección 2 de AGENTS.md.*
