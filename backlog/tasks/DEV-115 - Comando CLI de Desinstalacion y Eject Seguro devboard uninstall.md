---
id: DEV-115
title: "Comando CLI de Desinstalación y Eject Seguro Inteligente (devboard --uninstall)"
status: done
created_date: '2026-09-26'
updated_date: '2026-10-02 23:43'
labels:
  - "cli"
  - "tooling"
  - "dx"
dependencies: []
priority: medium
type: feature
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "20"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar un comando `devboard --uninstall` (o `devboard --clean` / `--eject`) inteligente y con discriminación contextual de alcance, permitiendo al usuario decidir con precisión quirúrgica si desea desacoplar DevBoard exclusivamente del repositorio actual o erradicarlo por completo de todas sus instancias locales en el dispositivo.

**Capacidades y Flujo Inteligente del Comando:**

1. **Detección Contextual del Entorno:**
   - Analiza la configuración local en `.devboard/config.json` (modo `single` o `multi`).
   - Inspecciona el registro central global en `~/.devboard/registry.json` para determinar si existen otros repositorios registrados en la máquina.

2. **Selector Interactivo de Alcance (Scope):**
   Si se detectan múltiples instancias o registros globales, el asistente presenta un menú claro:
   - **[1] Desacoplar sólo este proyecto (Recomendado):**
     - Si es Mono-Proyecto (`single`), limpia únicamente la carpeta local `.devboard/` y los scripts `"board"` / `"mcp"` en `package.json`. No toca ningún archivo global ni afecta a otros repositorios.
     - Si pertenecía al Hub global (`multi`), desvincula únicamente la entrada de este repositorio en `~/.devboard/registry.json`, dejando intactos los demás proyectos.
   - **[2] Erradicación completa del dispositivo (Global Purge):**
     - Desacopla el repositorio actual.
     - Limpia o elimina el directorio central de registro `~/.devboard/`.
     - Ofrece opcionalmente desvincular los scripts inyectados en los demás repositorios que estaban registrados en el Hub.
     - Instruye la desinstalación del binario global si estuviese instalado (`npm uninstall -g dev-board`).

3. **Pregunta Opcional por Artefactos de Agente:**
   - Pregunta si desea remover la Agent Skill (`.agents/skills/devboard/SKILL.md`) y la guía `AGENTS.md` o si prefiere conservarlas para colaborar con agentes de IA.

4. **Garantía Inviolable de Cero Pérdida de Información:**
   - En **cualquiera** de las opciones elegidas, el directorio `backlog/` (`backlog/tasks/`, `releases.json`, `BACKLOG.md`) **permanece 100% intacto y legible**.

5. **Modo No Interactivo / CI:**
   - Soporte de flags `--yes` / `-y` (desacopla el proyecto actual por defecto) y `--global` / `--all` (para purga total desatendida).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Soporte para flags `devboard --uninstall` y `devboard --clean` en `bin/devboard.js`, con el handler ejecutándose **antes** del registro de proyecto para no re-registrar el repo que se está desacoplando
- [x] #2 Detección automática del modo local (`single` vs `multi`) e inspección de `~/.devboard/registry.json` para saber si hay otras instalaciones en el sistema
- [x] #3 Menú interactivo con selección de alcance: `[1] Desacoplar sólo este proyecto` vs `[2] Erradicar de todas las instancias locales`
- [x] #4 Reversión segura de scripts `"board"` y `"mcp"` en `package.json`: sólo se revierten los valores que DevBoard inyectó, y un script propio del usuario llamado `board` se preserva
- [x] #5 En purga global, desregistro de repositorios en `~/.devboard/registry.json` y limpieza de registros huérfanos, con advertencia y confirmación explícita del número de proyectos afectados
- [x] #6 Preservación estricta del directorio `backlog/` y del archivo `BACKLOG.md` en todos los repositorios involucrados, garantizada por construcción
- [x] #7 Soporte de flags `--yes` / `-y` y `--global` / `--all` para automatización sin intervención humana
- [x] #8 Tests de integración automatizados en `scripts/verify-integration.js` que validan el aislamiento mono-proyecto y la preservación del backlog y de los scripts propios
- [x] #9 Guarda de integridad contra path traversal: `removeIfExists` sólo borra rutas contenidas en el repo, además de rechazar las protegidas
- [x] #10 La reversión del `.gitignore` quita también el comentario de encabezado que DevBoard agregó, para no dejar `# DevBoard local cache` huérfano
- [x] #11 Flag `--remove-agents` para eliminar `.agents/skills/devboard` y `AGENTS.md`, que por defecto se preservan
- [x] #12 Módulo tipado: `scripts/uninstall.d.ts` declara las firmas sin `any`
- [x] #13 El comando se documenta en `README.md` y `README.es.md` con su tabla de flags y las garantías
- [x] #14 Regresión: el nombre de la opción coincide entre el CLI (`removeAgentArtifacts`) y la función; el test falla si vuelve a desalinearse
- [x] #15 `npx tsc --noEmit` finishes con código 0
- [x] #16 `npm test` finishes con código 0
- [x] #17 `npm run build` finishes con código 0
- [x] #18 `npm run backlog:check` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `scripts/initScaffold.js` con las funciones `uninstallLocalProject(repoPath, options)` y `purgeGlobalDevBoard(options)`.
2. Integrar lógica de detección de registro XDG / global en `scripts/registryConfig.js`.
3. Registrar los flags `--uninstall`, `--clean` y `--global` en `bin/devboard.js` y la ayuda de consola.
4. Crear pruebas de integración en `scripts/verify-integration.js` validando los dos flujos.
5. Documentar el comando en `README.md` y `README.es.md`.
<!-- SECTION:PLAN:END -->
