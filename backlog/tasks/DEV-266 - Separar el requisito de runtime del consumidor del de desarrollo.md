---
id: DEV-266
title: "Separar el requisito de runtime del consumidor del requisito de desarrollo"
status: review
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
  - "cli"
  - "runtime"
  - "distribution"
  - "packaging"
dependencies:
  - DEV-223
  - DEV-141
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
  directo: `npm test`, `npm run tasks`, los `verify-*.js`, `scripts/*.ts`.
- **`bin/gripm.js` importa solo built-ins de Node** — `fs`, `path`, `os`, `url`,
  `child_process` — sin strip-types, y está empaquetado por esbuild con
  `target: 'node18'` (`scripts/build-binaries.js:22`).
- Es decir: el binario que instala el consumidor lleva su propio runtime y no necesita
  Node 22.6 para nada.

**El efecto del desajuste:** npm advertía a cualquiera que instalara `gripm` globalmente
que requería Node 22.6, cuando el binario habría corrido en un runtime bastante anterior. Y
el badge del README, que dice `>=20.0.0`, quedaba **mintiendo sobre la restricción real**:
prometía algo que `engines` rechazaba.

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
- [ ] #6 Medido qué runtime mínimo soporta realmente `bin/gripm.js`, ejecutándolo y no deduciendo del `target` de esbuild, para decidir si `>=20.0.0` se puede bajar o hay que subirlo
- [ ] #7 Revisado DEV-223, que quedó en `done` con ACs que nunca se verificaron y con una premisa que expiró, para que no sigaAFFIRMANDO una garantía que no existe
- [ ] #8 `npx tsc --noEmit` con 0 errores, `npm test` con 17/17 y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** salió de una revisión de coherencia al comparar `engines`, `.nvmrc`, la matriz
  de CI, el `target` de esbuild y el badge del README. Los cinco decían cosas distintas.
- **`devEngines` está soportado:** npm 11.19.0 en este repo. Con Node 24 el
  `npm install --dry-run` sigue en verde, porque 24 >= 22.6.
- **AC #6 y #7 quedan abiertos a propósito.** El #6 es la parte honesta: nadie corrió el
  CLI en un runtime anterior a 22. El #7 es higiene de backlog: DEV-223 afirma en su
  descripción una garantía que nunca se comprobó.
- **Este ítem no cierra DEV-223.** Lo referencia como dependencia y le deja el AC #7 para
  que la corrección quede explícitamente a nombre de alguien.
<!-- SECTION:NOTES:END -->