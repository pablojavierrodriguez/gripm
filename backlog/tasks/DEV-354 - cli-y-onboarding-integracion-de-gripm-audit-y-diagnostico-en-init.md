---
id: DEV-354
title: "CLI y Onboarding: Integracion de gripm audit y Diagnostico Inicial en gripm --init con Recomendacion de Perfil"
status: ready
created_date: '2026-10-31'
updated_date: '2026-10-31'
labels:
  - "cli"
  - "onboarding"
  - "dx"
  - "audit"
  - "config"
dependencies:
  - "DEV-353"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrar el motor de auditoria estatica (`DEV-353`) directamente en la experiencia de linea de comandos (`gripm audit`) y dentro del asistente de inicializacion de repositorios (`gripm --init` en `scripts/initScaffold.js`).

### Objetivos y Comportamiento:
1. **Comando de Terminal Dedicado (`gripm audit`):**
   - Ejecuta la inspeccion completa del repositorio e imprime en consola un reporte visual estilizado con resumen de salud, alertas amarillas/rojas y lista de hallazgos.
   - Soporta flags CLI: `--format json` (para integraciones en scripts o CI), `--strict` (retorna codigo 1 si hay fallas criticas de presupuesto o supresiones) y `--quiet`.

2. **Diagnostico de Bienvenida en el Onboarding (`gripm --init`):**
   - Al iniciar el wizard en un repositorio, Gripm ejecuta el diagnostico en los primeros 2 segundos antes de solicitar confirmaciones.
   - Muestra una radiografia inmediata del stack detectado, infraestructura de pruebas y estado de deuda tecnica.
   - **Recomendacion Inteligente de Perfil:** Si detecta TypeScript + suite de pruebas robusta, sugiere por defecto el perfil *AI-Native* o *Baterias Incluidas*. Si detecta un proyecto simple sin pruebas, sugiere el perfil *Minimalista* para no imponer friccion innecesaria.
   - **Auto-Configuracion de Verificacion:** Popula automaticamente la clave `verifyCommand` en `.gripm/config.json` con el comando canónico detectado (ej. `npm test` o `npx tsc --noEmit`).

3. **Opt-in de Importacion de TODOs en Init:**
   - Si el scanner detecta comentarios `TODO:` o `FIXME:`, el wizard pregunta de forma interactiva si se desean importar como tareas en estado `draft` dentro de `backlog/tasks/`.
   - Si el usuario aprueba, materializa los archivos `.md` correspondientes y ejecuta `backlog:sync` de inmediato.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El binario bin/gripm-cli.js reconoce el comando audit (y npx @gripm/board audit) ejecutando el diagnostico y formateando la salida en consola.
- [x] #2 La bandera --format json en gripm audit emite exclusivamente el JSON estructurado por stdout con exit code 0.
- [x] #3 La bandera --strict en gripm audit retorna exit code 1 si existen archivos que superan 1000 LOC o supresiones criticas.
- [x] #4 El wizard en scripts/initScaffold.js ejecuta el diagnostico al inicio e imprime la radiografia previa a la seleccion de presets.
- [x] #5 El wizard preselecciona la opcion recomendada de perfil segun los hallazgos del scanner, preservando la soberania del usuario para cambiarla.
- [x] #6 El wizard ofrece importar los TODOs encontrados creando tareas validas en backlog/tasks/ sin duplicar IDs y ejecutando backlog:sync.
- [x] #7 El modo no interactivo (--yes o -y) ejecuta la inicializacion de forma predecible sin colgarse en prompts.
- [x] #8 La suite de pruebas de CLI (test-init-suite.js y test-cli-add.js) cubre el nuevo comando y aprueba con codigo de salida 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender el parser de argumentos en `bin/gripm-cli.js` y `scripts/gripm-runner.js` para registrar el comando `audit`.
2. Crear formateador de salida para terminal con soporte de colores ANSI y modo JSON neutro.
3. Incorporar el paso de diagnostico previo en `scripts/initScaffold.js` conectando la auto-configuracion de `verifyCommand`.
4. Implementar el generador de tareas para TODOs seleccionados en el asistente de inicio.
5. Probar flujos interactivos y no interactivos con `npm test`.
<!-- SECTION:PLAN:END -->
