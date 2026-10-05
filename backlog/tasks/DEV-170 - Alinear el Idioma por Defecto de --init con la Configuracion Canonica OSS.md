---
id: DEV-170
title: "Alinear el Idioma por Defecto de --init con la Configuración Canónica OSS"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 01:00'
labels:
  - "i18n"
  - "onboarding"
  - "scaffolding"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El scaffolder `--init` tiene `es` como idioma por defecto, mientras que la configuración canónica OSS declarada en `AGENTS.md` §6.17 fija `en`. Un proyecto nuevo inicializado en modo no interactivo queda con configuración, skill y onboarding en español.

### Evidencia (verificada sobre `6a50230`, tarball instalado)

```
$ gripm --init -y
  ✅ Skill para agentes instalada en .agents/skills/gripm/SKILL.md (es)
  ✅ Guía de gobernanza generada en AGENTS.md (es)
  [banner de bienvenida íntegramente en español]

$ cat .gripm/config.json
  "language": "es"
```

### Causa raíz

Dos lugares fijan español:

1. **`scripts/initScaffold.js:58`** — default del modo no interactivo:
   ```js
   let language = (options.language || options.lang || 'es').toLowerCase();
   ```
   Con `-y` no se pregunta, así que siempre cae en `'es'`.

2. **`scripts/initScaffold.js:90`** — la opción por defecto del prompt interactivo es `[1]` (Español), y `scripts/initScaffold.js:14` y `:37` usan `language = 'es'` como default de las plantillas.

### Relación con la regla de gobernanza

`AGENTS.md` §6.17 declara la configuración canónica del **repositorio** con `"language": "en"`, y prohíbe preferencias personales. El repositorio cumple. Pero el **producto** contradice esa declaración en el momento de crear un proyecto nuevo: el primer artefacto que ve un usuario ajeno ya viene en español.

No es un bug funcional ni una contradicción con el gotcha (que gobierna el repo, no el scaffolding). Es una inconsistencia de posicionamiento: el README es bilingüe con inglés primero, y el primer output del producto es español.

### Objetivo

Que el idioma por defecto del scaffolding sea coherente con la configuración canónica OSS declarada, sin perder la capacidad de elegir español de forma explícita.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `grep -n "options.language || options.lang" scripts/initScaffold.js` devuelve `'en'` como default en lugar de `'es'`
- [x] #2 `scripts/initScaffold.js:14` y `:37` usan `'en'` como default de `getSkillTemplate` y `getAgentsMdTemplate`
- [x] #3 El prompt interactivo de `scripts/initScaffold.js:90` ofrece English como opción por defecto (la que se aplica con Enter vacío)
- [x] #4 `gripm --init -y` en un repositorio limpio genera `.gripm/config.json` con `"language": "en"` (verificación: `grep '"language"' .gripm/config.json` devuelve `"en"`)
- [x] #5 `gripm --init -y --language es` sigue produciendo `"language": "es"`, skill y AGENTS.md en español — la override explícita se respeta
- [x] #6 `.gripm/config.json` del propio repositorio sigue cumpliendo `AGENTS.md` §6.17: `grep -E '"language"|"sprint"' .gripm/config.json` devuelve `"en"` y `"sprint": true`
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cambiar el default de `scripts/initScaffold.js:58` de `'es'` a `'en'`.
2. Cambiar los defaults de las plantillas en `scripts/initScaffold.js:14` y `:37`.
3. Invertir el orden de las opciones del prompt en `scripts/initScaffold.js:86-96` para que English sea la opción por defecto, manteniendo ambas opciones disponibles.
4. **No** tocar `AGENTS.md` §6.17 ni `.gripm/config.json` del repositorio: ya cumplen.
5. Verificar el modo no interactivo y el override explícito (AC #4 y #5).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué el AC #5 importa tanto como el #4

Cambiar el default sin preservar la override por flag sería una regresión silenciosa: quien quiera español debe poder pedirlo explícitamente. Por eso el AC #5 es negativo en la dirección correcta — verifica que el override explícito se respetó.

### Nota de alcance

Es una tarea de coherencia, no de funcionalidad. El producto funciona igual en ambos idiomas. Si el PO decide que español es el default correcto para la comunidad objetivo, esta tarea se cierra como `dismissed` con evidencia y el único cambio necesario sería alinear el texto del gotcha §6.17 para que declare `es`.
<!-- SECTION:NOTES:END -->