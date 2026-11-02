---
id: DEV-352
title: "Epica: Motor de Diagnostico y Auditoria de Repositorio (gripm audit) y Gobernanza Multi-Perfil"
status: done
created_date: '2026-10-31'
updated_date: '2026-11-02'
labels:
  - "epic"
  - "audit"
  - "governance"
  - "cli"
  - "core"
  - "mcp"
  - "ui"
dependencies: []
priority: high
type: epic
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Iniciativa y epica paraguas para transformar a Gripm en el motor de diagnostico, auditoria tecnica y aseguramiento de calidad ("Staff Engineer mecanico") para repositorios de software, preservando al 100% las capacidades existentes y soportando diversos arquetipos de proyectos y usuarios.

### Vision y Objetivos Centrales:
1. **Valor Inmediato ("Aha! Moment" en 3 segundos):** Ofrecer una auditoria estatica instantanea al inicializar un repo (`gripm --init`) o bajo demanda (`gripm audit`), reportando salud modular (LOC budgets), practicas anti-slop (supresiones de linter/tipos), infraestructura de testing y tareas pendientes ocultas en comentarios del codigo.
2. **Preservacion de Arquetipos y Flujos Existentes:** Mantener soporte estricto para desarrolladores individuales (modo minimalista/Kanban puro), equipos tradicionales (Sprints, Releases, Timeline, Changelog) y equipos AI-Native (gates mecanicos de ACs, auditoria de diffs y verificacion ciega).
3. **Conversion de Deuda Tecnica en Trabajo Estructurado:** Permitir escanear comentarios `TODO:`, `FIXME:`, `HACK:`, `BUG:` en el codigo e importarlos opcionalmente como tareas formales en `backlog/tasks/`.
4. **Visibilidad Total (CLI, REST API, UI Cockpit y Servidor MCP):** El diagnostico de salud no es solo una salida de consola; vive como endpoint en el servidor local, se visualiza en la interfaz web y se expone a los agentes de IA a traves del protocolo MCP.

### Historias y Tareas que componen la Epica:
- **DEV-353:** Core Engine: Servicio Unificado de Auditoria Estatica (`auditService`) y Scanners de Salud (LOC, Anti-Slop, Tests, TODOs).
- **DEV-354:** CLI & Onboarding: Comando `gripm audit` y Diagnostico Inicial en `gripm --init` con Recomendacion de Perfil.
- **DEV-355:** Backend REST API: Endpoints `/api/audit` e Importacion Masiva de TODOs a Tareas en `backlog/tasks/`.
- **DEV-356:** Cockpit UI: Panel de Diagnostico y Salud del Repositorio en Header y Modal de Acciones Rapidas.
- **DEV-357:** MCP & Gatekeeper: Herramienta `gripm_get_repo_health` y Guardrails Arquitectonicos en Transiciones de Tarea.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Todas las tareas hijas (DEV-353, DEV-354, DEV-355, DEV-356, DEV-357) estan formalizadas y enlazadas en el backlog con criterios verificables y dependencias resueltas.
- [x] #2 El flujo no rompe la configuracion existente en .gripm/config.json ni altera el comportamiento de repositorios configurados previamente.
- [x] #3 La ejecucion de la suite de pruebas general (`npm test`) y validacion de backlog (`npm run backlog:check`) finaliza con codigo de salida 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validar e iniciar la construccion del motor base en DEV-353.
2. Conectar la interfaz de linea de comandos y onboarding en DEV-354.
3. Exponer servicios REST para el Cockpit en DEV-355 y construir componentes visuales en DEV-356.
4. Conectar los agentes a traves de MCP en DEV-357.
5. Ejecutar la Piramide de Verificacion completa y sellar la epica.
<!-- SECTION:PLAN:END -->
