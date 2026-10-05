---
id: DEV-171
title: "El tarball npm no incluye `.agents/`: `gripm --init` instala stubs en vez de las plantillas canónicas"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 01:15'
labels:
  - "packaging"
  - "onboarding"
  - "agents"
  - "critical"
dependencies:
  - "DEV-161"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El directorio `.agents/` no está declarado en el array `files` de `package.json`, por lo que **no viaja en el tarball de npm**. Los scaffolders `getSkillTemplate()` y `getAgentsMdTemplate()` de `scripts/initScaffold.js` resuelven sus rutas fuente contra `PKG_ROOT`, que en una instalación real no contiene ese directorio. Ante la ausencia, ambos caen a su fallback hardcodeado y escriben **stubs de una línea** en el repositorio del consumidor.

### Evidencia (verificada sobre `6a50230` + árbol de trabajo, instalación limpia)

```
$ node -e "require('./package.json').files.some(x=>x.includes('.agents'))"
false

$ tar -tzf gripm-1.0.0.tgz | grep -c "\.agents"
0
```

En un consumidor nuevo (`npm install gripm-1.0.0.tgz` → `gripm --init -y`):

| Artefacto | Tamaño esperado | Tamaño real |
| :--- | ---: | ---: |
| `.agents/skills/gripm/SKILL.md` | 2.425 B (en) / 13.896 B (es) | 🔴 **20 B** |
| `AGENTS.md` | 1.702 B (en) / 1.846 B (es) | 🔴 **80 B** |

Contenido literal instalado hoy:

```
# gripm Agent Skill
```

```
# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **demo**.
```

### Por qué es crítico

El README vende exactamente esta función:

> *"AI Agent Skill: Installs `.agents/skills/gripm/SKILL.md` so Cursor, Antigravity, and Claude Code know how to manage tasks."*

Después de `npx gripm --init`, el agente recibe una línea vacía y **no conoce ninguna de las 12 herramientas MCP**. El onboarding para agentes está silenciosamente roto para el 100 % de los consumidores, y el síntoma es invisible: el comando reporta éxito.

### Pre-existente, y no detectado por los guards

- **Pre-existente**: `files` nunca incluyó `.agents` (verificado contra `HEAD`). No es regresión de DEV-161/169/170.
- **`publish:check` no lo detecta**: el guard audita fugas de datos y rutas personales, no archivos faltantes. Pasó en verde.
- **DEV-161 pasó sus ACs igual**: el AC #6 ("`initScaffold.js` instala solo `.agents/skills/gripm/`") se verificó contra el repo fuente, donde el archivo existe — no contra el tarball. Es la misma clase de fallo que el guard de DEV-159: **una aserción ejecutada contra la realidad equivocada**.

### Ítem secundario en la misma causa raíz

`.githooks/` tampoco está en `files`. El script `prepare` de `package.json` ejecuta `git config core.hooksPath .githooks`, dejando el repo del consumidor apuntando a un directorio inexistente.

`CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` y `CODE_OF_CONDUCT.md` tampoco viajan, pero no son necesarios en runtime y **no forman parte de este ítem**.

### Objetivo

Que el tarball contenga los artefactos que el producto promete instalar, y que la ausencia de cualquiera de ellos falle de forma visible en lugar de degradar en silencio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `node -e "const f=require('./package.json').files; console.log(f.includes('.agents'), f.includes('.githooks'))"` devuelve `true true`
- [x] #2 Tras `npm run build`, `tar -tzf <tarball> | grep -c "\.agents/skills/gripm/SKILL"` devuelve un valor `>= 2` (SKILL.md y SKILL.en.md)
- [x] #3 `tar -tzf <tarball> | grep -c "\.githooks/pre-commit"` devuelve `1`
- [x] #4 Instalando el tarball en un directorio temporal y ejecutando `gripm --init -y`, `wc -c <repo>/.agents/skills/gripm/SKILL.md` devuelve un valor `>= 1000` — este es el AC que hoy falla con 20
- [x] #5 En esa misma instalación, `wc -c <repo>/AGENTS.md` devuelve un valor `>= 1000` y **no** contiene la cadena `Bienvenido a` de los stubs
- [x] #6 Con `--language en` el `SKILL.md` instalado es el contenido de `.agents/skills/gripm/SKILL.en.md`; con `--language es` es el de `SKILL.md` — verificación por contenido, no por nombre de archivo (el scaffolder siempre escribe en `SKILL.md`)
- [x] #7 `npm run publish:check` falla si `.agents` o `.githooks` desaparecen del array `files`, en lugar de pasar en verde
- [x] #8 Existe un script de verificación de distribución (p. ej. `npm run verify:dist`) que empaqueta, instala en un directorio temporal efímero y valida los artefactos de onboarding, y está conectado a `npm test`
- [x] #9 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores, `npm test` con exit 0 y `npm run build` sin errores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Agregar `.agents` y `.githooks` al array `files` de `package.json`.
2. **No** eliminar los fallbacks de `getSkillTemplate()` y `getAgentsMdTemplate()`: son una red de seguridad legítima. Lo que debe cambiar es que la ruta feliz sea la que se ejecuta en una instalación real.
3. Convertir el fallback en fallo visible: si la plantilla canónica no se encuentra, emitir una advertencia explícita en lugar de escribir un stub silencioso. Un stub instalado sin aviso es peor que un error.
4. Agregar `scripts/verify-dist.js` que ejecute el ciclo `npm pack` → install en temp → `gripm --init -y` → aserción de tamaño y contenido, con limpieza del temporal en `finally`.
5. Conectar el script a `npm test` (AC #8) para que este bug no pueda reintroducirse.
6. Extender `scripts/verify-publish-surface.js` con un chequeo de presencia de archivos obligatorios en el tarball (AC #7).
7. Verificar cada AC con su comando antes de tildar.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué el fix durable es un test, no el `files`

Agregar `.agents` a `files` cierra **este** bug. Lo que evita que reaparezca es el AC #8: un ciclo de empaquetar-instalar-probar en `npm test`. El mismo razonamiento que impulsó el guard de DEV-159 — un hook que valida el índice real en vez del disco — aplica aquí: hay que verificar contra el artefacto que se distribuye, no contra el repo de trabajo donde todo existe.

### Por qué los AC se formulan como "hoy falla"

El AC #4 tiene un valor observed de 20 bytes. Escribir el valor esperado en el AC convierte la aserción en algo que no admite interpretación, y deja el valor real registrado como línea de base.

### Orden sugerido

`files` primero (desbloquea el producto), luego la advertencia de fallback (convierte el silencio en visibilidad), después `verify:dist` (evita la regresión) y por último el chequeo en `publish:check`.
<!-- SECTION:NOTES:END -->