---
id: DEV-336
title: "El gate de QA nunca arranca el producto instalado desde el tarball"
status: done
release: "1.9.0"
created_date: '2026-10-23'
updated_date: '2026-10-24'
labels:
  - "qa"
  - "release"
  - "verification"
dependencies: []
priority: high
type: bug
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La suite `npm test` (21 pasos) certifica el repositorio, pero **nunca el producto tal como lo recibe un usuario**. El paso `package-smoke` hace `npm pack`, verifica el manifiesto de archivos, y ejecuta `--help`, `--version` y la sintaxis del binario MCP. Ahi termina: no arranca el servidor desde el tarball, no renderiza la interfaz, no instancia un proyecto nuevo y no prueba el bucle de escritura.

`test:ui` existe pero esta fuera de `npm test` (gotcha 18), asi que tampoco cubre el render.

**Cobertura antes de esta tarea:**

| Verificacion | Cubierta por el gate |
| --- | --- |
| `npm pack` + manifiesto de archivos criticos | si |
| `--help` / `--version` desde el tarball | si |
| sintaxis del binario MCP | si |
| arrancar el servidor desde el tarball | **no** |
| render de la interfaz sin errores de consola | **no** |
| proyecto random ejecutando `--init` | **no** |
| bucle crear tarea -> persistencia en disco | **no** |
| scripts `npm` anunciados por el `package.json` empaquetado | **no** |

**Prueba clean-room ejecutada a mano el 2026-10-23** durante la preparacion de 1.9.0 (`npm pack` -> proyecto vacio -> `npm install <tarball>`), 15 checks, **12 PASS y 3 FAIL**:

PASS:

1. `npm run build` del repositorio.
2. `npm pack` genera `gripm-board-1.9.0.tgz`.
3. `npm install <tarball>` en un proyecto aleatorio sin nada preexistente.
4. Shim `node_modules/.bin/gripm` instalado.
5. `--version` sale codigo 0, imprime `1.9.0` y stderr vacio.
6. `--help` sale codigo 0 y documenta el tablero.
7. La estructura minima del proyecto instanciado queda montada.
8. `gripm mcp` responde `initialize` por stdio con `serverInfo` correcto.
9. El servidor arranca: `gripm v1.9.0  listo`, puerto en escucha por estado del sistema, stderr vacio.
10. La interfaz renderiza con **cero errores de consola** y estados vacios correctos (`Sin tareas en este estado`).
11. La pestana `Versiones` renderiza su empty state aunque falte `backlog/releases.json`.
12. Una tarea creada desde la interfaz persiste como `backlog/tasks/PROY-001 - ....md` con frontmatter valido, codigo autogenerado y slug coincidente.

FAIL:

- **`gripm --init --yes --minimal --no-playbook` entrega backlog vacio con exit 0** -> levantado como **DEV-337**.
- **`backlog/releases.json` no se genera en el proyecto nuevo** (consecuencia de DEV-337).
- **`npm run validate` falla con codigo 1 dentro del paquete instalado**: el `package.json` empaquetado anuncia 32 scripts `npm` cuyo objetivo es `scripts/*.js`, directorio que el tarball excluye. El error es `Cannot find module .../scripts/verify-changes.js`. De esos 32 scripts, los que viajan al usuario son los unicos que apuntan a binarios si presentes (`gripm`, `board`, `mcp`).

**Conclucion de la prueba.** El producto **no** esta inusable: instala, arranca, renderiza sin errores y el bucle de escritura funciona. El riesgo no era que estuviera roto, era que **nadie lo estaba comprobando antes de publicar**.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Existe un paso de clean-room en `scripts/` que crea un proyecto temporal vacio, ejecuta `npm pack` e instala el tarball con `npm install <tarball>`, sin resolver nada desde el repositorio fuente.
- [x] #2 El paso verifica `--version` (codigo 0, igual a la version del `package.json` empaquetado, stderr vacio) y `--help` contra el binario instalado y no contra `bin/` del repositorio.
- [x] #3 El paso arranca el servidor del paquete instalado, confirma que el puerto queda en escucha consultando el estado del sistema (sin emitir peticiones HTTP locales, segun el gotcha 9) y que el proceso no termina ni escribe en stderr.
- [x] #4 El paso verifica que una tarea creada persiste como archivo `.md` bajo `backlog/tasks/` con frontmatter valido que contiene `id`, `title` y `status`, y que el slug del archivo coincide con el `id`.
- [x] #5 El paso ejecuta `gripm --init --yes --minimal --no-playbook` en un proyecto vacio y afirma exactamente lo que el propio CLI declara crear, de modo que una promesa incumplida del texto se detecte y no se archive como exito.
- [x] #6 El paso verifica que cada script `npm` anunciado por el `package.json` empaquetado resuelve su archivo objetivo dentro del paquete instalado, o que tales scripts no viajan al tarball. Hoy `npm run validate` sale con codigo 1 dentro del paquete instalado.
- [x] #7 El paso esta incluido en `npm test` y la suite completa sale con codigo 0 tanto en Windows como con `npm run test:linux`.
- [x] #8 `npm run backlog:check`, `npm run publish:check` y `node scripts/verify-changes.js --all` salen con codigo 0 tras agregar el paso.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Convertir la prueba clean-room ejecutada a mano en `scripts/` con asserts, reutilizando la estructura de `scripts/test-package-smoke.js`.
2. Sumar arranque del servidor con verificacion de bind por estado del sistema y posterior limpieza del proceso.
3. Sumar instanciacion `--init` y creacion de tarea con verificacion en disco.
4. Sumar la verificacion de resolucion de scripts `npm` anunciados por el `package.json` empaquetado.
5. Registrar el paso en `scripts/run-tests.js` para que corra dentro de `npm test`.
6. Correr `npm test` en Windows y `npm run test:linux`, y luego `backlog:check`, `publish:check` y `verify-changes --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Hallazgo positivo que debe quedar registrado.** La prueba mostro que el producto instalado funciona: arranca, renderiza con cero errores de consola y el bucle crear -> disco persiste correctamente. El problema detectado no es que 1.9.0 este roto, es que el gate no lo estaba comprobando.

**Por que esta tarea es previa a cualquier publicacion seria.** Con `package-smoke` tal como esta, un tarball con el servidor incapaz de arrancar pasaria las 21 pruebas y se publicaria igual. La unica barrera real entre el repositorio y el usuario de npm es esta verificacion.

**No confundir con `test:ui`.** `test:ui` valida el render con el servidor de desarrollo y sigue fuera de `npm test` (gotcha 18). Este paso valida el **tarball instalado**, que es artefacto distinto: incluye `dist/` compilado, excluye `src/` y `scripts/`, y corre sin devDependencies.

**Restriccion de entorno a respetar.** El sandbox bloquea peticiones HTTP a `localhost` (gotcha 9), por lo que la verificacion del bind debe hacerse por estado del sistema o por logs del propio proceso, y nunca con `curl` o `fetch` contra el puerto.

**La prueba manual quedo en** `C:\Users\Pablo\AppData\Local\Temp\opencode\cleanroom-190.mjs` y es un buen punto de partida para el paso definitivo.
<!-- SECTION:NOTES:END -->
