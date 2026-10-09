---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
release: "1.0.5"
milestone: "1.0.5"
id: DEV-191
title: "Actualizar las GitHub Actions deprecadas que corren forzadas en Node 24"
status: done
created_date: '2026-10-06'
updated_date: '2026-10-09'
labels:
  - "ci"
  - "devops"
  - "mantenimiento"
dependencies: []
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cada corrida de los workflows termina con este warning de GitHub:

```
##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but
are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4.
```

`actions/checkout@v4` y `actions/setup-node@v4` apuntan a Node 20, que GitHub ya no soporta. Hoy funcionan porque el runner los fuerza a Node 24, o sea que el runtime real no es el que la action pide. Eso es una dependencia implícita de un comportamiento que GitHub puede cambiar sin avisar, y el día que deje de forzarla, los jobs dejan de andar.

Aparece en `ci.yml` y en `publish.yml`. El de `publish.yml` importa más: es el que publica a npm.

Vale notar que esto no surfaced por una falla, sino por un warning al final de un run exitoso. Es exactamente la clase de cosa que se pierde si solo se leen los pasos con `failure`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `actions/checkout` actualizado a la major que apunta a Node 24 o superior
- [x] #2 `actions/setup-node` actualizado a la major que apunta a Node 24 o superior
- [x] #3 Ningún otro action del repo queda apuntando a una versión de Node deprecada
- [x] #4 La matriz de CI sigue en verde en los 3 sistemas operativos y las 2 versiones de Node
- [x] #5 El workflow de publicación sigue funcionando: `npm view @gripm/board@<version>` responde tras un tag de prueba
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Consultar las majors actuales de `actions/checkout` y `actions/setup-node` y cuál es su runtime de Node.
2. Actualizar ambas referencias en `ci.yml` y `publish.yml`.
3. Verificar que no queden otras actions en versiones deprecadas.
4. Correr la matriz completa de CI y un publish en dry-run.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué el AC #5 exige un tag de prueba

El runtime de `setup-node` determina qué versión de Node ejecuta los tests. Un tag mal actualizado no da error de sintaxis, da un `npm test` corriendo bajo otra versión, que es la clase de falla que las plataformas ya nos hizo sufrir en esta sesión. Por eso no alcanza con "el YAML es válido".

Hay un detalle conocido de este repo: el baseline del auditor de UX **no es portable entre sistemas operativos**, porque las claves se generan con separadores nativos. Regenerarlo en un SO rompe en el otro. Si el cambio de `setup-node` altera la versión por defecto en alguna matriz, ese baseline hay que regenerarlo y volver a fijarlo.
<!-- SECTION:NOTES:END -->