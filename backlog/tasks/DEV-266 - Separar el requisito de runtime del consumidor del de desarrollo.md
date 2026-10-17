---
id: DEV-266
title: "Separar el requisito de runtime del consumidor del requisito de desarrollo"
status: done
created_date: '2026-10-14'
updated_date: '2026-10-15'
labels:
 - "cli"
 - "runtime"
 - "distribution"
 - "packaging"
dependencies:
 - "DEV-223"
 - "DEV-141"
priority: high
type: fix
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`engines.node` declaraba `>=22.6.0`, pero ese requisito **no le corresponde al consumidor**:
es el requisito de **desarrollar** el repo, no el de **usar** el paquete.

## La evidencia

**El requisito de 22.6 es de desarrollo, no de consumo:**

- `--experimental-strip-types` aparece únicamente en scripts que ejecutan TypeScript
  directo: `npm test`, `npm run tasks`, los `verify-*.js`, `scripts/*.ts`. **No aparece en
  los binarios publicados.**
- `bin/gripm.js` no usa type-stripping: es JavaScript plano que importa cinco módulos
  relativos del proyecto (`registryConfig`, `updateChecker`, `initScaffold`, `uninstall`,
  `portUtils`), que a su vez solo importan built-ins.
- El arranque del cockpit, que un consumidor sí ejercita, carga **Vite 5.4.21**, cuyas
  `engines` son `^18.0.0 || >=20.0.0`. Ese es el eslabón que fija el piso.

> [!NOTE]
> **Corrección de evidencia (2026-10-14, tras la auditoría de QA).** La primera redacción de
> esta sección afirmaba que `bin/gripm.js` *"importa solo built-ins de Node"* y que *"está
> empaquetado por esbuild con `target: 'node18'`"*. **Las dos son falsas:**
> `scripts/build-binaries.js:31-33` solo le hace `chmod` a `bin/gripm.js`, y el
> `target: 'node18'` de la línea 22 corresponde al build de `gripm-mcp.js`. La conclusión
> era correcta, pero se apoyaba en una evidencia que nunca se ejecutó. Queda corregido
> porque el siguiente que lo lea tiene que poder reproducir el razonamiento.

**El efecto del desajuste:** npm advertía a cualquiera que instalara `gripm` globalmente
que requería Node 22.6, cuando el binario corre en un runtime bastante anterior. Y el badge
del README, que dice `>=20.0.0`, quedaba **mintiendo sobre la restricción real**: prometía
algo que `engines` rechazaba.

## Contradicción con ítems anteriores

Este ítem cierra una contradicción que llevaba dos semanas abierta:

| Ítem | Fecha | Qué decía |
| :--- | :--- | :--- |
| **DEV-141** (`done`) | 1-2 oct | Fijar `engines.node: ">=22.6.0"` por `--experimental-strip-types` |
| **DEV-223** (`done`) | 9 oct | **"Eliminar el bloqueo estricto a Node.js 22.6+"** y dar soporte a Node 20 LTS |

Ocho días de diferencia y deciden lo contrario. El que llegó después no modificó el
`engines` que había puesto el primero, y sigue en `done` con 4/4 ACs tildados.

**DEV-223 tampoco se implementó, y su premisa además expiró:** su única nota de
implementación es *"Verificar que las suites de prueba en CI ejecuten tanto en Node 20 como
en Node 22"*, que es una instrucción pendiente, no una nota. La matriz de CI quedó en
`['22.6.0', '22.x']`, sin Node 20. Y **Node 20 quedó deprecado el 1 de octubre de 2026**,
ocho días antes de que DEV-223 se creara.

## Qué se cambió

Se separaron los dos públicos con `devEngines`, que existe exactamente para esto:

```jsonc
"engines": {
  "node": ">=20.0.0"        // consumidor: qué necesita para usar gripm
},
"devEngines": {
  "runtime": {
    "name": "node",
    "version": ">=22.6.0",  // desarrollador: qué necesita para correr la suite
    "onFail": "error"
  }
}
```

**El floor del consumidor quedó en `>=20.0.0`, no en `>=18`.** `target: 'node18'` de
esbuild describe compatibilidad **sintáctica**, no disponibilidad de APIs: un bundle
compilado para node18 puede llamar una API que solo existe en 20. Ninguna prueba del repo
ejecutó el CLI en runtime real por debajo de 22, así que afirmar 18 sería sobre-declarar.
`>=20.0.0` es lo que el badge del README ya publicaba desde antes, y ahora pasa a ser
verdad.

Con esto el badge del README **deja de necesitar corrección**: dice `>=20.0.0` y
`engines` ahora dice `>=20.0.0`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `engines.node` declara el requisito del **consumidor**, alineado con el badge del README
- [x] #2 `devEngines.runtime` declara el requisito de **desarrollo** con `onFail: "error"`, para que un colaborador en un runtime incompatible reciba un error explícito y no un fallo raro más tarde
- [x] #3 `npm install` sigue funcionando sin error en el runtime de desarrollo y en el de CI
- [x] #4 El badge de Node del README y `engines.node` dicen lo mismo, verificado por comparación de strings
- [x] #5 Documentado en `CONTRIBUTING.md` por qué hay dos requisitos distintos y cuál aplica a quién
- [x] #6 Medido qué runtime mínimo soporta realmente `bin/gripm.js`, ejecutándolo y no deduciendo del `target` de esbuild, para decidir si `>=20.0.0` se puede bajar o hay que subirlo
- [x] #7 Revisado DEV-223, que quedó en `done` con ACs que nunca se verificaron y con una premisa que expiró, para que no siga afirmando una garantía que no existe
- [x] #8 `npx tsc --noEmit` con 0 errores, `npm test` con 17/17 y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** salió de una revisión de coherencia al comparar `engines`, `.nvmrc`, la matriz
  de CI, el `target` de esbuild y el badge del README. Los cinco decían cosas distintas.
- **`devEngines` está soportado:** npm 11.19.0 en este repo. Con Node 24 el
  `npm install --dry-run` sigue en verde, porque 24 >= 22.6.
- **AC #7 cerrado tras auditoría y actualización explícita de DEV-223.** Se agregaron en
  `DEV-223` las notas de implementación que explicitan que la separación formal de
  `devEngines` y la compatibilidad real del runtime en `>=20.0.0` fueron materializadas
  y verificadas empíricamente en `DEV-266`.
- **AC #6 cerrado por medición, no por deducción.** La auditoría de QA instaló el **tarball
  real** (`npm pack`, no el repo) en `node:20.0-bullseye` (v20.0.0, npm 9.6.4) y en
  `node:20-bookworm` (v20.20.2, npm 10.8.2). En los dos: `gripm --version`, `--help`,
  `initialize` + `gripm_list_tasks` del servidor MCP (263 tareas, `storageType: markdown`) y
  el arranque del cockpit sirviendo en un puerto, todos con salida 0.
  **El floor de 18 sigue sin medirse y no se afirma en ningún lado del repo.**
- **El enforcement de `devEngines` depende de npm ≥ 11 - medido en las dos direcciones.**
  En la raíz del repo con Node 20.20.2 y npm 11.21.0, `npm install` falla con
  `EBADDEVENGINES`. Instalando el tarball, el mismo Node con el mismo npm sale 0. Con el
  npm 10.8.2 que trae Node 20, el campo se **ignora en silencio**. Irrelevante para el
  consumidor, que nunca corre `install` en la raíz del repo, pero significa que la garantía
  del AC #2 es condicional al npm. Queda documentado en `CONTRIBUTING.md`.
- **El ítem volvió de `review` por un AC tildado que era falso.** AC #5 daba por hecho que
  `CONTRIBUTING.md` documentaba la separación; el commit `207824e` nunca lo tocó, y el
  archivo seguía afirmando que el aviso al colaborador venía de `engines.node`. La auditoría
  lo detectó; el texto de `CONTRIBUTING.md` y la evidencia de la descripción se corrigieron
  antes de volver a `ready`.
- **Segunda certificación (2026-10-14): `CERTIFICADO`.** La corrección del AC #5 se verificó
  campo por campo contra `package.json`, y las Implementation Notes se ejecutaron una por
  una: los cinco imports relativos de `bin/gripm.js`, el `chmod` sin esbuild, los
  `engines: ^18.0.0 || >=20.0.0` de Vite, y **cero apariciones de `--experimental-strip-types`
  en `bin/`**. La medición de Node 20 se **repitió** con tarball real en `node:20.0-bullseye`
  y `node:20-bookworm` y **coincide exactamente** con la primera; la única diferencia es el
  conteo de tareas (263 → 266, porque el repo creció). El `onFail: "error"` se comprobó en
  las dos direcciones: npm 10.8.2 lo ignora en silencio, npm 11.21.0 rechaza la raíz del repo
  y acepta el tarball.
- **Lo que esa certificación encontró y quedó corregido en el mismo movimiento:**
  `CONTRIBUTING.md` declaraba *"16 pasos secuenciales"* cuando la suite corre 17 - le faltaba
  `json-sprint-persistence` - , y `scripts/build-binaries.js:17` seguía comentando
  *"Node 18+ native"*, que es exactamente la afirmación que este ítem afirma no hacer. Las dos
  derivas viven en los archivos que el AC #5 certifica: certificar un archivo que todavía
  miente sería repetir el defecto que motivó el rechazo.
- **Certificación final de QA y transición a `ready`:** Con los 8 ACs verificados y cerrados
  sin excepciones ni marcas artificiales, el ítem cumple formalmente todas las invariantes
  del Gatekeeper y la Pirámide de Verificación para ingresar a `ready`.
- **El cambio de runtime se sostiene por ejecución, no por argumento.** `engines.node = ">=20.0.0"`
  + `devEngines.runtime = ">=22.6.0"` es correcto porque el tarball arranca en Node 20.0.0.
<!-- SECTION:NOTES:END -->
