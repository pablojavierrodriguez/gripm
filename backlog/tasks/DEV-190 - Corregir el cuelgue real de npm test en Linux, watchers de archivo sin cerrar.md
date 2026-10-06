---
id: DEV-190
title: "Corregir el cuelgue real de npm test en Linux: watchers de archivo sin cerrar"
status: done
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "ci"
  - "bugfix"
  - "cross-platform"
  - "devops"
dependencies:
  - DEV-189
priority: high
type: bugfix
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`npm test` se colgaba en `ubuntu-latest` y mataba el job por `timeout-minutes`, con todos los asserts ya pasando. El log siempre terminaba igual:

```
🧹 Cleaned up test directory
🎉 Full verification passed successfully!
##[error]The operation was canceled.
```

El proceso terminaba el trabajo y nunca salía, así que el `&&` de la cadena nunca avanzaba al script siguiente.

### Lo que NO era

Durante varias iteraciones estuve persiguiendo la fuga equivocada. La fuga del sondeo de puertos de DEV-189 (`TCPConnectWrap` al 4100) **era real**, pero no era la causa: era un handle entre unos 200.

### La causa raíz

`vite.config.ts` abre un `fs.watch()` recursivo por cada directorio del registro. El código intentaba soltarlos así:

```ts
if (typeof watcher.unref === 'function') watcher.unref();
```

**`fs.watch()` devuelve un `FSWatcher`, y `FSWatcher` no tiene método `unref()`.** El guard era código muerto: la condición nunca era cierta y nadie lo notó porque no hay error, simplemente no hace nada.

Los watchers quedaban referenciados, mantenían vivo el event loop y en Linux impedían que el proceso terminara. En macOS el proceso salía igual, lo que escondía el bug por completo.

Dos scripts los abrían:

- `scripts/verify-integration.js` (DEV-177, vía `plugin.configureServer` con un server mock): 207 watchers
- `scripts/test-api-security.js`: 200 watchers

El segundo estaba **tapado**: el primero colgaba antes y la cadena `&&` nunca llegaba al segundo. Cada vez que se arreglaba uno, aparecía el siguiente.

### El patrón que fallaba

Todos los servidores de prueba eran mocks sin ciclo de vida. `configureServer` no tenía dónde registrar una limpieza, y el test no tenía con qué cerrarlos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `closeWatchers()` existe y cierra todos los watchers abiertos por `setupProjectWatchers()`
- [x] #2 Los watchers se liberan cuando el servidor HTTP se cierra, para que el dev server no los filtre en caliente
- [x] #3 `verify-integration.js` y `test-api-security.js` liberan los watchers en su cleanup
- [x] #4 Un watchdog nombra los handles vivos si cualquier paso se cuelga, sin depender del SO
- [x] #5 `npm test` reporta duración por paso y falla nombrando el paso culpable
- [x] #6 La suite completa pasa en Linux dentro de un contenedor: 15 pasos, 13.4s, código 0
- [x] #7 La suite sigue pasando en macOS
- [x] #8 Existe un gate en pre-commit que rechaza YAML inválido, `import()` con rutas crudas, corrupción de codificación y tareas con id descuadrado
- [x] #9 Cada check del gate se validó reintroduciendo el bug original y confirmando que lo rechaza
- [x] #10 El gate no produce falsos positivos sobre el árbol correcto
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extraer `closeWatchers()` en `vite.config.ts` y exponerlo en el objeto del plugin.
2. Registrar la limpieza en `server.httpServer.once('close')`.
3. Quitar el `watcher.unref()` muerto y dejar el motivo en un comentario.
4. Cerrar los watchers en el `finally` de los dos scripts de test.
5. `scripts/watchdog.js`: preload con timer **unref'd** que vuelca handles y requests si el proceso no sale.
6. `scripts/run-tests.js`: runner con duración por paso, timeout por paso y `GIT_TERMINAL_PROMPT=0`.
7. `npm run test:linux` para validar en el SO donde fallaba antes de pushear.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### El watchdog usa un timer `unref'd`, y eso es lo que lo hace correcto

Un timer normal mantiene vivo el loop por sí mismo, así que retrasaría cada ejecución sana. Pero `unref()` significa que **no** lo mantiene vivo: solo dispara si algo más está sosteniendo el loop.

Y eso es exactamente la condición de falla que nos importa. El watchdog no puede retrasar una ejecución sana porque en una ejecución sana el proceso simplemente sale; y en una ejecución colgada el loop está vivo por otra razón, así que el timer sí dispara.

### Por qué esto era un problema de proceso y no de código

Todos los fallos de esta sesión eran **solo de plataforma**, y ninguno lo detectó la pirámide local: el snapshot no portable (Windows), el `import()` con ruta cruda (Windows, solo Node 22.23+), los watchers sin cerrar (Linux). La pirámide corre en macOS, así que para el código que toca plataforma es estructuralmente incapaz de validar.

La lección operativa: si el cambio toca runtime, CI o E/S, la pirámide local no alcanza. Hay que correr en el SO destino. `npm run test:linux` existe para eso y por primera vez el fallo aparece en segundos, con el paso nombrado.

Vale la pena notar el patrón: el primer diagnóstico fue el tentativo de que el puerto era la causa, cuando era 1 de 200 handles. La evidencia (un `TCPConnectWrap` pendiente) era real pero no era la explicación. Recién al volcar **todos** los handles dentro de Linux apareció el `FSWatcher` multiplicado por 207. Un solo dato pendiente no es un diagnóstico.

### Dos bugs de tooling que aparecieron de paso

- `import()` con una ruta absoluta cruda falla en Windows: Node la interpreta como URL con protocolo `d:`. En Node 22.6.0 pasaba y en 22.23.3 revienta, así que el fallo llegó a CI sin que la pirámide local lo viera. Ahora hay un assert estático que exige `pathToFileURL`.
- El script de reproducción excluía `bin/` del `tar` al copiar al contenedor, y `test-package-smoke` lo espera en el tarball. Fallo del harness, no del producto, pero costó un ciclo de diagnóstico.

### Cómo evitar repetir esto: `scripts/verify-changes.js`

La pregunta correcta no es "hay que tener más cuidado" sino "qué chequeos faltan". La pirámide no falló: pasó porque `tsc`, los tests y el lint no miran estas clases de defecto. Los cuatro errores de esta sesión eran de verificación, no de lógica.

El gate corre en el pre-commit sobre **los archivos stageados solamente**, así que es rápido y no bloquea trabajo ajeno. Cubre:

| Chequeo | Atrapa |
|---|---|
| YAML parseable (vía python3+PyYAML) + sin tabs | La indentación perdida en `ci.yml` que impedía ejecutar cualquier job |
| `import()` recibe URL `file://` | El fallo de Windows `ERR_UNSUPPORTED_ESM_URL_SCHEME` |
| Sin U+FFFD ni caracteres de control | Corrupción de codificación |
| `id:` del frontmatter = prefijo del nombre | Tareas DEV-XXX mal nombradas |
| Todo script invocado en `package.json` existe | Referencias muertas |

Tres decisiones de diseño que importan:

1. **Un check que no puede correr se reporta como omitido, nunca como aprobado.** La validación de YAML depende de PyYAML; si falta, avisa y lo cubre CI. Un gate que falla cerrado por falta de intérprete es un gate que la gente desactiva.
2. **Corregí el alcance tras una medición, no por intuición.** La primera versión del check de caracteres señalaba "caracteres inesperados" y produjo **63 falsos positivos sobre un árbol correcto**, porque el repo usa frames de caja, emoji, flechas, `§`, `⌘` y selectores de variación. Lo saqué en lugar de ampliar la lista de permitidos: ampliar una lista para callar las alarmas es exactamente cómo un gate deja de significar nada. Los typos de prosa son trabajo de un corrector ortográfico, no de un gate.
3. **Cada check se validó reintroduciendo el bug.** Revertí la indentación de `ci.yml` y el `import()` con ruta cruda, y confirmé que el gate los rechaza. Un check que nunca se probó contra el fallo real es una suposición.
<!-- SECTION:NOTES:END -->