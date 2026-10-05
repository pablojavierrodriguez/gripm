---
id: DEV-172
title: "Cobertura de Tests para la Capa de UI: Lógica Derivada y Accesibilidad de Componentes"
status: draft
created_date: '2026-10-05'
updated_date: '2026-10-05 11:30'
labels:
  - "testing"
  - "ui"
  - "react"
  - "post-launch"
dependencies: []
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La suite de verificación cubre parser, API, seguridad de red, MCP, CLI, SSE, locking optimista e importación. **Ninguno de los 9 scripts importa un componente React.** Para ~14.000 líneas de `src/` con 6 componentes de más de 1.100 líneas cada uno, la única cobertura de la interfaz es `audit:ux`, que es un análisis estático de clases Tailwind.

### Evidencia (verificada sobre `6a50230`)

```
$ grep -rln "ItemCard\|KanbanBoard\|SprintView" scripts/*.js scripts/*.ts
(vacío)

$ grep -E "test|jest|vitest|playwright|jsdom|testing-library" package.json
(vacío — no hay framework de test instalado)
```

### Consecuencia

Una regresión en el drag-and-drop del Kanban, en el ordenamiento de tarjetas, en el focus trap de un modal o en la normalización de estados que se renderiza **pasa la suite en verde**. El gate más caro del proyecto (`npm test`, 9 scripts) no cubre la capa donde el usuario pasa el 100 % del tiempo.

### Tension real con el proyecto

El producto sostiene una filosofía zero-deps: los tests son scripts con `node:assert`, sin framework. Introducir Vitest + Testing Library contradice esa filosofía. La tarea debe resolver esa tensión explícitamente, no ignorarla.

### Enfoque propuesto en dos etapas

**Etapa 1 (sin framework, coherente con la filosofía actual):** extraer la lógica determinista de los componentes a módulos puros en `src/utils/` y cubrirla con `node:assert`. El precedente ya existe: `src/utils/statusMeta.ts` (DEV-162) extrajo `normalizeStatus()` y la tabla de estilos como módulo puro testeable. `KanbanBoard`, `SprintView` e `ItemCard` consumen hoy los datos a través de ese módulo, de modo que las funciones de derivación de columna, agrupación y filtrado son candidatas directas.

**Etapa 2 (requiere decisión de stack):** cubrir comportamiento de render e interacción. Implica elegir framework y documentar el trade-off en `AGENTS.md`.

### Objetivo

Que una regresión en la lógica que alimenta la UI falle la suite, sin adoptar un stack de testing que contradiga la filosofía del producto sin antes haberlo decidido y documentado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Existe al menos un archivo en `scripts/` que importe desde `src/utils/` o `src/components/` y ejecute aserciones con `node:assert`, y está conectado a la cadena de `npm test`
- [ ] #2 La lógica de derivación de columnas y agrupación del Kanban está extraída a un módulo puro en `src/utils/` y cubierta por tests: una entrada known que produce una salida incorrecta hace fallar el test
- [ ] #3 La normalización de estados legacy→canónico de `src/utils/statusMeta.ts` tiene test que ejercita los 4 aliases (`backlog`, `in_progress`, `testing_qa`, `finish`) contra `normalizeStatus()`
- [ ] #4 Existe un test que verifica que las etiquetas de estado renderizadas provienen de `status.*` y no de literales: ante una locale alternativa, la etiqueta cambia
- [ ] #5 Si la Etapa 2 queda fuera de alcance, la tarea documenta explícitamente en sus notas que la cobertura de render no existe y cuál fue la razón — **no se deja implícito**
- [ ] #6 Si se introduce un framework de test en la Etapa 2, la decisión queda registrada en `AGENTS.md` con el trade-off explícito frente a la filosofía zero-deps
- [ ] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0 y `npm run build` sin errores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventariar qué lógica hoy vive dentro de los componentes y es determinista: normalización de estados, agrupación por columna, orden por prioridad/ranking, filtros de vista, formateo de fechas y contadores.
2. Extraer esa lógica a módulos puros en `src/utils/`, siguiendo el patrón de `statusMeta.ts`.
3. Escribir tests con `node:assert` en `scripts/`, conectándolos a la cadena de `npm test`.
4. Ejecutar la pirámide completa y verificar cada AC con su comando antes de tildar.
5. Dejar la Etapa 2 (render e interacción) documentada como pendiente con la razón, o abordarla con decisión de stack explícita.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué empezar por `src/utils/` y no por los componentes

Probar un componente React exige DOM. El proyecto no tiene jsdom ni Testing Library, y sumarlos contradice la filosofía zero-deps. La lógica extraída a módulo puro se testea con las mismas herramientas que ya usan los otros 9 scripts — cero costo nuevo de stack.

### Por qué el AC #1 importa

Es el AC que hoy falla de forma estructural: ningún test toca la capa de UI. Los AC #3 y #4 son la redefine конкреta; el #1 es el que garantiza que la suite dinnersecte esa capa.

### Advertencia de alcance

Esta tarea **no** reemplaza pruebas end-to-end de navegador. Cubre lógica, no interacción real. Declararlo evita que se lea como "la UI está testeada".
<!-- SECTION:NOTES:END -->