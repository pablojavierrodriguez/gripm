---
id: DEV-172
title: "Cobertura de Tests para la Capa de UI: Lógica Derivada y Accesibilidad de Componentes"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-07 23:29'
labels:
  - "testing"
  - "ui"
  - "react"
  - "post-launch"
dependencies: []
priority: high
type: chore
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La suite de verificación cubre parser, API, seguridad de red, MCP, CLI, SSE, locking optimista e importación. Antes de esta tarea, ningún paso importaba lógica desde la UI; para ~14.000 líneas de `src/` con 6 componentes de más de 1.100 líneas cada uno, la única cobertura era `audit:ux`, un análisis estático de clases Tailwind.

### Evidencia (verificada sobre `6a50230`)

```
$ grep -rln "ItemCard\|KanbanBoard\|SprintView" scripts/*.js scripts/*.ts
(vacío)

$ grep -E "test|jest|vitest|playwright|jsdom|testing-library" package.json
(antes de DEV-198 no había tooling E2E; esta etapa usa `node:assert` para módulos puros)
```

### Consecuencia

Una regresión en el drag-and-drop del Kanban, en el ordenamiento de tarjetas, en el focus trap de un modal o en la normalización de estados puede **pasar la suite en verde** si no está cubierta por el E2E. El gate `npm test` no cubría la lógica que alimenta la capa donde el usuario pasa el 100 % del tiempo.

### Tension real con el proyecto

El producto sostiene una filosofía zero-deps: los tests son scripts con `node:assert`, sin framework. Introducir Vitest + Testing Library contradice esa filosofía. La tarea debe resolver esa tensión explícitamente, no ignorarla.

### Enfoque propuesto en dos etapas

**Etapa 1 (sin framework de render, coherente con la filosofía actual):** extraer la lógica determinista de los componentes a módulos puros en `src/utils/` y cubrirla con `node:assert`. `src/utils/statusMeta.ts` (DEV-162) ya expone `normalizeStatus()` y `getStatusMeta()`; la derivación de tareas por columna se extrae también para probarse directamente.

**Etapa 2 (requiere decisión de stack):** cubrir comportamiento de render e interacción. Implica elegir framework y documentar el trade-off en `AGENTS.md`.

### Objetivo

Que una regresión en la lógica que alimenta la UI falle la suite, sin adoptar un stack de testing de componentes React que contradiga la filosofía de dependencias.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Existe al menos un archivo en `scripts/` que importe desde `src/utils/` o `src/components/` y ejecute aserciones con `node:assert`, y está conectado a la cadena de `npm test`
- [x] #2 La lógica de derivación de columnas y agrupación del Kanban está extraída a un módulo puro en `src/utils/` y cubierta por tests: una entrada conocida que produce una salida incorrecta hace fallar el test
- [x] #3 La normalización de estados legacy→canónico de `src/utils/statusMeta.ts` tiene test que ejercita los 4 aliases (`backlog`, `in_progress`, `testing_qa`, `finish`) contra `normalizeStatus()`
- [x] #4 Existe un test que verifica que las etiquetas de estado provienen de `status.*` y no de literales: ante una locale alternativa, la etiqueta cambia
- [x] #5 Si la Etapa 2 queda fuera de alcance, la tarea documenta explícitamente en sus notas que la cobertura de render no existe y cuál fue la razón — **no se deja implícito**
- [x] #6 No se introduce un framework para render de componentes React en esta etapa, así que no hace falta cambiar la decisión zero-deps en `AGENTS.md`
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0, `npm run test:linux` con exit 0 y `npm run build` sin errores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventariar qué lógica hoy vive dentro de los componentes y es determinista: normalización de estados, agrupación por columna, orden por prioridad/ranking, filtros de vista, formateo de fechas y contadores.
2. Extraer esa lógica a módulos puros en `src/utils/`, siguiendo el patrón de `statusMeta.ts`.
3. Escribir tests con `node:assert` en `scripts/`, conectándolos a la cadena de `npm test`.
4. Ejecutar la pirámide completa y verificar cada AC con su comando antes de tildar.
5. Dejar las pruebas de render de componentes React documentadas como fuera de alcance, con su razón; el smoke Playwright de DEV-198 cubre el flujo E2E principal.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué empezar por `src/utils/` y no por los componentes

- `scripts/test-ui-logic.js` importa directamente helpers puros y está conectado a `npm test`.
- Kanban prueba agrupación de ideas/columnas y orden; statusMeta prueba los cuatro alias legacy y que las etiquetas dependan del locale `status.*`.
- El hook React `useStatusMeta` se separó a `src/utils/useStatusMeta.ts` para probar la lógica en Node sin cargar JSX.

Probar un componente React exige DOM. El proyecto no tiene jsdom ni Testing Library; sumarlos cambiaría la filosofía de dependencias. Playwright se usa solo para el smoke E2E independiente de DEV-198; no prueba cada estado de render ni sustituye una suite de componentes.

### Por qué el AC #1 importa

Es el AC que hoy falla de forma estructural: ningún test toca la capa de UI. Los AC #3 y #4 verifican normalización e idioma; el #1 garantiza que la suite ejecute estas aserciones.

### Advertencia de alcance

Esta tarea **no** reemplaza pruebas de render ni el flujo end-to-end de navegador. Cubre lógica determinista, no toda la interacción; el flujo principal de creación se cubre aparte en DEV-198.
<!-- SECTION:NOTES:END -->
