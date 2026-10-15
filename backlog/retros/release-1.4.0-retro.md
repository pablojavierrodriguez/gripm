---
sprintId: release-1.4.0
sprintName: "Release v1.4.0 & Estándares de Entrega"
date: "2026-10-15"
author: "Pablo & Antigravity Agentic Team"
status: completed
tasksCompleted:
  - DEV-262
  - DEV-263
  - DEV-264
  - DEV-265
  - DEV-266
  - DEV-267
  - DEV-268
  - DEV-269
  - DEV-270
  - DEV-271
  - DEV-272
  - DEV-273
  - DEV-274
  - DEV-275
  - DEV-276
  - DEV-277
  - DEV-278
  - DEV-279
  - DEV-280
  - DEV-281
  - DEV-282
  - DEV-283
  - DEV-284
  - DEV-285
  - DEV-286
tasksPlannedNext:
  - DEV-287
  - DEV-288
  - DEV-289
  - DEV-290
  - DEV-291
  - DEV-292
  - DEV-293
  - DEV-294
  - DEV-295
  - DEV-296
---

# Retrospectiva de Cierre — Ciclo Release v1.4.0

**Objetivo:** Consolidar el Cockpit de Gripm con estándares profesionales de UX/UI para resoluciones de escritorio (1366×768), modularidad de vistas y componentes en Settings, carga diferida (lazy loading), chips descartables de filtros, y la incorporación de la vista interactiva de **Roadmap** (`DEV-281`).

**Resultado:** Versión `v1.4.0` publicada exitosamente en npm y desplegada en producción. Posterior refinamiento de la vista de Roadmap con divisor redimensionable, reestructuración estricta de la cuadrícula por escalas (Trimestres, Meses, Sprints), drag & drop interactivo y guías explícitas de árbol jerárquico, validada en preview privada y mergeada a la rama `dev`.

---

## Dimensiones de la Retrospectiva

### 🔴 Problemas (¿Qué falló o tomó más tiempo del esperado?)

1. **Despliegue Incompleto en Producción (Vercel Prod):**
   - *Causa raíz:* El cierre de release se dio por concluido tras el merge a `main`, el tag de Git y la publicación en npm (`@gripm/board@1.4.0`). La instancia web de demostración/sandbox (`https://gripm.vercel.app`) no se actualizó automáticamente al tag, requiriendo intervención manual posterior (`npx vercel --prod --yes`).
   - *Impacto:* Brecha temporal entre el código publicado en npm y la demo viva accesible por usuarios y stakeholders.
   - *Mitigación:* Se fijó como norma obligatoria en `AGENTS.md` (Sección 1) que un release solo se considera concluido tras verificar la respuesta HTTP 200 de la promoción en Vercel.

2. **Falta de Visibilidad de Versión en el Sandbox (`DEV-288`):**
   - *Causa raíz:* La interfaz web no exhibía visiblemente el número de versión desplegado, obligando al usuario y a QA a inspeccionar headers o la consola de JavaScript para certificar si la actualización se había aplicado.
   - *Mitigación:* Se registró `DEV-288` en el backlog para incluir la versión canónica en el modal de atajos de teclado y cabecera del Sandbox.

3. **Ambigüedad Semántica en Filtros de Estado (`DEV-287`):**
   - *Causa raíz:* La etiqueta genérica "Todos los estados" en los selectores inducía al usuario a asumir que la vista incluía tareas completadas (`done`), canceladas o descartadas, cuando en realidad filtraba el flujo de trabajo activo (WIP).
   - *Mitigación:* Se estableció la convención estándar canónica: **"Estados activos"** (ES) / **"Active statuses"** (EN), reservando "Todos" únicamente para consultas exhaustivas.

4. **Regresión Tipográfica Bloqueante en Auditoría UX (`UX-011`):**
   - *Causa raíz:* La maquetación inicial de la vista temporal incorporó clases arbitrarias (`text-[10px]`, `text-[11px]`, `text-[9px]`), activando la regla `UX-011` del motor de auditoría y deteniendo `npm test` en el paso `audit-ux-baseline`.
   - *Mitigación:* Corrección inmediata reemplazando los valores de estilo libre por la escala canónica (`text-xs`), y adición del gotcha 21 en `AGENTS.md`.

5. **Desajuste Conceptual de Escalas en la Vista Temporal Original:**
   - *Causa raíz:* El selector de escalas (Trimestres, Meses, Sprints) inicialmente solo cambiaba la cabecera visual pero mantenía una interpolación de días continuos sobre porcentajes fijos, provocando que en la vista de Sprints las tareas no coincidieran con las columnas de sus iteraciones.
   - *Mitigación:* Rediseño estructural en `TimelineView.tsx` donde la cuadrícula de Sprints adopta columnas basadas en las iteraciones reales registradas, permitiendo drag & drop con reasignación directa de Sprint.

---

### 🟡 Eficiencia (¿Qué podría haberse hecho en menos pasos o con menos tokens?)

1. **Estrategia de Ramas Aisladas con Previews Privadas:**
   - Trabajar el Roadmap en la rama `dev-281-roadmap` con despliegues de preview privados (`npx vercel` sin `--prod`) permitió al PO auditar la interacción, evaluar el divisor redimensionable y verificar la jerarquía de árbol sin exponer estados intermedios en `main` ni en la versión de producción pública.
2. **Barrera Física de Hooks Pre-Commit:**
   - El hook `verify-backlog-sync.js` evitó desfasajes entre el archivo consolidado `BACKLOG.md` y los 287 archivos individuales de tareas en disco, asegurando coherencia mecánica sin fricción manual.

---

### 🟢 Fortalezas (¿Qué funcionó de manera excelente y debe repetirse?)

1. **Pirámide de Verificación Automatizada (18 pasos, 100% verde):**
   - La suite unificada corre en ~26 segundos cubriendo seguridad de API, persistencia atómica, contratos MCP, contraste accesible, trampa de foco y consistencia de distribución, otorgando certeza total antes de cada merge.
2. **Calidad de Interacción del Roadmap:**
   - Splitter con memoria local (`localStorage`), cursor `col-resize`, guías visuales de árbol explícitas (`border-l` + conector en L) y drag & drop con feedback táctil inmediato (`ring-2 ring-indigo-500` y tooltip en vivo con fechas o sprint destino).
3. **Naming Canónico Consistente:**
   - Adopción uniforme de **Roadmap** en UI, Header, Settings y catálogos de internacionalización (`es.json`, `en.json`), alineándose con el estándar de mercado de Jira y Linear.

---

### 📌 Acciones Concretas (Compromisos y Guardrails)

- [x] **Acción 1:** Actualizar `AGENTS.md` (Sección 1) incorporando el despliegue obligatorio a Vercel producción (`npx vercel --prod --yes`) en la checklist de release.
- [x] **Acción 2:** Registrar Gotcha 21 en `AGENTS.md`: Cero tamaños de fuente arbitrarios (`UX-011`), forzando apego estricto a Tailwind (`text-xs`, `text-sm`, `text-base`).
- [x] **Acción 3:** Registrar Gotcha 22 en `AGENTS.md`: Nomenclatura *"Estados activos"* / *"Active statuses"* para selectores de flujo de trabajo vivo.
- [x] **Acción 4:** Registrar Gotcha 23 en `AGENTS.md`: Exposición de versión canónica visible en entornos Sandbox (`DEV-288`).
- [x] **Acción 5:** Actualizar la skill propia `.agents/skills/list-views-filters/SKILL.md` con los estándares de semántica de filtros activos, chips descartables y la vista Roadmap.
- [x] **Acción 6:** Registrar las tareas identificadas de resiliencia y blindaje del parser (`DEV-289` a `DEV-296`) en el backlog para su posterior refinamiento.

---
*Retrospectiva ejecutada de conformidad con la Sección 2 de AGENTS.md.*
