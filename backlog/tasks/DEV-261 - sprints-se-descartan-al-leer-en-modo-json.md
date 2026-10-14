---
id: DEV-261
title: "Sprints se escriben pero se descartan al leer en proyectos en modo JSON"
status: ready
created_date: '2026-10-13'
updated_date: '2026-10-13'
labels:
  - "bug"
  - "storage"
  - "sprints"
  - "json"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Encontrado al ejecutar DEV-222 (dataset de la sandbox), al verificar dónde Persisten
los sprints de un proyecto en modo JSON.

**La rama JSON de `readProjectBacklog()` omite el campo `sprints` en el objeto que
devuelve, pero `writeProjectBacklog()` sí lo escribe completo.** La escritura y la
lectura no están en simetría: lo que se persiste nunca vuelve a leerse.

### Los dos lados, medidos

`server/services/storage.ts:384-389`, rama JSON del read:

```ts
return {
  project: { ...project, storageType: 'json' },
  items,
  releases: Array.isArray(parsed.releases) ? parsed.releases : [],
  lastUpdated: parsed.lastUpdated || new Date().toISOString()
};
```

`server/services/storage.ts:799`, `writeProjectBacklog` modo JSON:

```ts
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
```

`data` se escribe entero, `sprints` incluido. La interfaz `ProjectBacklog`
(`server/types.ts:16-22`) declara `sprints?: any[]`, así que el tipo dice que el campo
existe: **el contrato promete un campo que el read nunca devuelve.**

La rama markdown no tiene el problema: lee y devuelve `sprints` desde
`backlog/sprints.json` (`storage.ts:262-267` y `:336`).

### Consecuencias observables

1. **`GET /api/sprints` responde `[]` siempre en un proyecto JSON.** La ruta
   (`server/routes/api.ts:1005`) hace `backlog.sprints || []`, y `backlog` viene del
   read que ya lo descartó.
2. **Un sprint creado desde la UI se persiste y después desaparece.** `POST /api/sprints`
   (`api.ts:1018`) hace `backlog.sprints = backlog.sprints || []`, escribe, y en el
   siguiente `GET` la lista vuelve a estar vacía.
3. **Colisión de IDs al crear dos sprints seguidos.** El cálculo de `maxNum`
   (`api.ts:1038-1045`) parte siempre de un array vacío, así que genera
   `sprint-${length}` con el mismo valor las dos veces.
4. **Afecta al proyecto demo.** `isBacklogMdProject()` devuelve `false` para `isDemo`
   (`registry.ts:34`), así que el demo vive en modo JSON y es uno de los casos rotos.

### Por qué no se notó antes

El modo markdown es el camino feliz y cubre el uso local principal. El modo JSON es
además el de los proyectos sin `backlog.md`, y ahí no hay ningún test que lea de vuelta
lo que se escribió. Ninguna suite ejercita hoy el ciclo completo de escritura y relectura
en modo JSON.

## Fix

Agregar `sprints` al retorno de la rama JSON del read, con la misma normalización de
`Array.isArray` que usan `items` y `releases`:

```ts
sprints: Array.isArray(parsed.sprints) ? parsed.sprints : [],
```

Y revisar si hace falta el mismo tratamiento en los dos retornos de error y en el
`initial` de las líneas 354-370, que hoy también lo omiten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 La rama JSON de `readProjectBacklog()` devuelve `sprints` con guard `Array.isArray`, en los tres puntos de retorno de esa rama (normal, inicial y error)
- [x] #2 `GET /api/sprints` devuelve los sprints de un proyecto JSON tras un ciclo de escritura completo, y sobrevive a un reinicio del daemon
- [x] #3 Crear dos sprints consecutivos en modo JSON produce IDs distintos: el cálculo de `maxNum` de `api.ts:1038` parte de la lista leída, no de una lista siempre vacía
- [x] #4 El proyecto demo (`isDemo: true`, modo JSON) expone sus sprints en la vista Sprint
- [x] #5 Test de regresión que cubra el ciclo **escribir y volver a leer** en modo JSON, que es el que faltaba y por eso el defecto no fue detectado
- [x] #6 `npx tsc --noEmit` con 0 errores, `npm test` y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** detectado al preparar el dataset de la sandbox de DEV-222. No lo bloquea
  (el adaptador sandbox lee el JSON en el navegador y no pasa por el server), pero
  invalida la premisa del plan de DEV-222 de que ampliar `data/demo-backlog.json` con
  sprints mejoraría también el proyecto demo local.
- **No se mezcló con DEV-222:** es un defecto preexistente, independiente de los AC de
  DEV-222 y con su propio radio de impacto. Por la regla de trazabilidad va en su propio ítem.

### Implementación (2026-10-13)

**Fix: 4 líneas en `server/services/storage.ts`, 3 inserciones y 1 reemplazo.** Se
agrega `sprints: Array.isArray(parsed.sprints) ? parsed.sprints : []` en el retorno normal
y `sprints: []` en los otros dos puntos de retorno de la rama JSON, con exactamente el
mismo estilo y normalización que ya usaban `items` y `releases`. **La rama markdown no se
tocó.**

**Test de regresión: `scripts/verify-json-sprint-persistence.js`** (nuevo, enganchado en
`scripts/run-tests.js`; la suite pasó de 16 a **17 pasos**). Fixture aislado en
`os.tmpdir()` con registro temporal, se limpia en `finally`. Seis pasos que cubren AC
#1, #2, #3, #4 y #5.

El paso que importaba era el **AC #5, el ciclo escribir → releer a nivel servicio**,
porque era exactamente el hueco que dejó pasar el defecto: ninguna suite leía de vuelta
lo que se había escrito en modo JSON.

#### El test falla sin el fix (verificado dos veces)

Lo reproduje yo mismo, no me quedé con el reporte: backup de `storage.ts`,
`git checkout HEAD --` del archivo, corrida del test, restauración. El archivo volvió al
diff de 4 líneas después.

Sin el fix, el test muere en el primer paso con el contrato roto:

```
Error: El backlog inicial de un proyecto JSON debe traer sprints: [] y no undefined
exit=1
```

Y la **colisión de IDs del AC #3**, que es el defecto observable, se confirma por
separado: contra el código sin fix, dos `POST /api/sprints` consecutivos producen los dos
el mismo ID (`sprint-0`), porque `maxNum` partía de una lista siempre vacía.

#### El test se autoprotege

El paso 6 hashea `data/demo-backlog.json` antes y después y **falla si el test lo mutó**.
Ese archivo es a la vez semilla versionada y destino de escritura de
`writeProjectBacklog()` para el proyecto demo, así que era un riesgo real de que un test
contaminara el repo. Confirmado con hash idéntico antes y después.

#### AC #4 verificado a nivel de datos, no visual

El test comprueba que `readProjectBacklog()` del demo devuelve los 2 sprints con
`projectId: "demo"`. El filtro del front (`App.tsx:1079`) compara
`s.projectId === selectedProjectId`, así que la ruta de datos cierra. **No se abrió el
navegador** para ver las tarjetas en pantalla. Queda anotado por honestidad: si QA quiere
la prueba visual, necesita `browser_subagent`.

#### Puerta de verificación

`npx tsc --noEmit` 0 · `npm test` **17/17** exit 0 · `npm run backlog:check` 0 ·
`npm run backlog:sync` 0. **Sin commit:** el working tree tiene los 3 archivos y el commit
lo hace el humano.

### Riesgos encontrados y NO arreglados (fuera de alcance)

1. **Asimetría de `projectId` entre la rama markdown y la JSON.** Markdown hace
   `sprints.map(s => ({ ...s, projectId: project.id }))` (`storage.ts:272-275`); la JSON
   devuelve `parsed.sprints` crudo. Un `.gripm/backlog.json` copiado de otro proyecto
   conserva sprints con `projectId` ajeno y el front los filtra en `App.tsx:1079`, que
   los vuelve invisibles. No se tocó porque el AC #1 pedía solo el guard `Array.isArray` y
   esto es un cambio de comportamiento aparte.
2. **`projectId` divergente entre ítems y sprints cuando el proyecto tiene `repoPath`.**
   El read reescribe `project.id` con `resolveProjectIdentity(repoPath)`, así que los
   ítems llevan el id *resuelto*, mientras `POST /api/sprints` graba el id *del registro*.
   Preexistente para ítems; el fix suma los sprints al mismo desajuste. Merece ítem propio.
3. **`PUT`/`DELETE /api/sprints/:id` ahora persisten en modo JSON.** Efecto secundario
   correcto pero nuevo: antes mutaban un array que se descartaba. **El test cubre POST y
   GET, no PUT/DELETE.** Cobertura faltante, riesgo bajo.
4. **Todo `.gripm/backlog.json` reescrito gana `"sprints": []`** aunque nunca haya tenido
   sprints. Ruido cosmético: la clave condicional rompería la simetría que el AC #5
   justamente quiere fijar.

Los cuatro quedan **reportados, no corregidos**, por la regla de "todo cambio de código
tiene tarea asociada": corregirlos acá sería ampliar el radio de impacto de un ítem de 4
líneas en pleno vuelo de DEV-222.
<!-- SECTION:NOTES:END -->