---
id: DEV-135
title: "El Motor de Importación está Hardcodeado a un Proyecto Privado: Genericizar import-docs.js"
status: done
created_date: '2026-09-30'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "architecture"
  - "hardening"
  - "devboard-core"
dependencies:
  - "DEV-118"
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El motor de importación de documentación —`runMigration` en
`scripts/import-docs.js`, invocado por el endpoint de importación del dev
server en `vite.config.ts:2324` y `:2353`— está **hardcodeado a un proyecto de
finanzas personales concreto**. No es un script personal descartable: es código de
producto con un supuesto privado incrustado.

**Elementos hardcodeados, tras la sanitización de rutas de DEV-118:**

| Línea | Contenido |
|---|---|
| `scripts/import-docs.js:78-84` | `name: '<Private Project>'`, `codePrefix: '<PREFIX>'`, `description` de finanzas personales |
| `scripts/import-docs.js:159` | `const code = \`<PREFIX>-${rawId}\`` |
| `scripts/import-docs.js:279` | `code: \`<PREFIX>-${rawId}\`` |
| `scripts/import-docs.js:319,322` | `let code = \`<PREFIX>-${...}\`` y `<PREFIX>-SPEC-${n}` |

Además, el **nombre del archivo y el script de npm** heredan el supuesto:
`import-docs.js` y `"import:docs": "node scripts/import-docs.js"`.

**Por qué importa más allá de la privacidad**: cualquier proyecto importado por
otro usuario recibe identificadores con prefijo hardcodeado, que colisionan con el
prefijo real del proyecto y con el de cualquier otro. El `codePrefix` que el
proyecto declara se ignora por completo en la generación de códigos.

**Lo que hace el refactor viable**: `runMigration` ya recibe `projectMeta` y lo usa
para asignar `item.projectId`. Sólo hay que extender ese mismo objeto a la
generación de códigos y eliminar el objeto de proyecto embebido.

**Lo que ya se corrigió en DEV-118 y no hay que repetir**: la ruta absoluta
personal (`<DOCS_DIR>` con valor por defecto embebido) y el objeto `projectMeta`
de respaldo. Ahora ambos se exigen en vez de inventarse.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 La generación de códigos usa `projectMeta.codePrefix` en lugar de un literal hardcodeado, en los cuatro sitios de `import-docs.js`
- [x] #2 Un proyecto sin `codePrefix` falla de forma explícita antes de importar, en lugar de generar códigos sin prefijo
- [x] #3 El script se renombra a un nombre sin supuesto privado (`scripts/import-docs.js`) y se actualizan el import en `vite.config.ts` y el script de npm
- [x] #4 Ninguna cadena del módulo contiene identificadores hardcodeados ni descripciones de proyectos privados. El único prefijo restante es el recibido por configuración
- [x] #5 El script de npm deja de exponer el supuesto: `import:dom` pasa a `import:docs`
- [x] #6 El contexto (`codePrefix` + `projectId`) se resuelve **una sola vez** en el entrypoint y se propaga a los cuatro parsers, en lugar de pasar el prefijo suelto en cada llamada
- [x] #7 El `.d.ts` del módulo se renombra junto con el archivo y se tipa en lugar de usar `any`: define `ImportProjectMeta` con `codePrefix` obligatorio
- [x] #8 Se agrega un test de regresión en `scripts/test-parser.js` que falla si el módulo vuelve a incrustar un proyecto o un prefijo privado hardcodeado, o si alguno de los cuatro parsers deja de recibir el contexto
- [x] #9 `npx tsc --noEmit` finishes con código 0
- [x] #10 `npm test` finishes con código 0
- [x] #11 `npm run build` finishes con código 0
- [x] #12 `npm run backlog:check` finishes con código 0
- [x] #13 `npm run audit:ux` sigue con 0 errores y 0 advertencias
- [x] #14 Las referencias al nombre viejo (`import-dom-docs.js`, `import:dom`) se actualizan en todos los archivos rastreados, incluidas las descripciones de DEV-118 y DEV-135, y `BACKLOG.md` se regenera
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Propagar `projectMeta` (o al menos su `codePrefix`) hasta las funciones que
   generan códigos, hoy desacopladas de él.
2. Reemplazar los cuatro literales hardcodeados por el prefijo recibido.
3. Verificar con un proyecto de prueba de prefijo distinto que los códigos se
   generan correctamente.
4. Renombrar el módulo y actualizar el import en `vite.config.ts` y el script de
   npm.
5. Verificar el flujo de importación end-to-end.
6. Ejecutar la pirámide completa más `build`.
<!-- SECTION:PLAN:END -->
