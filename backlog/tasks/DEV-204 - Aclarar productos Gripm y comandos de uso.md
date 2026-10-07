---
id: DEV-204
title: "Aclarar los productos Gripm y sus comandos de uso"
status: done
created_date: '2026-10-07'
updated_date: '2026-10-07 23:29'
labels:
  - "product"
  - "documentation"
  - "cli"
  - "dx"
  - "ecosystem"
  - "playbook"
dependencies: []
priority: high
type: improvement
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hacer que una persona nueva pueda distinguir qué ofrece cada parte del ecosistema Gripm, elegir el comando correcto para su objetivo y combinar los productos sin creer que son dependencias obligatorias entre sí.

### Modelo de producto

- **Gripm** es la marca y el ecosistema.
- **Gripm Board** (`@gripm/board`) es el producto de gestión del backlog: interfaz web local, CLI y servidor MCP para exponer ese mismo backlog a agentes.
- **Gripm MCP** (`gripm-mcp` o `gripm mcp`) es una interfaz de Board para agentes, distribuida dentro del paquete Board; se ejecuta sin abrir la interfaz web, pero no es hoy un paquete/producto autónomo.
- **Gripm Playbook** (`@gripm/playbook`) es el producto independiente de metodología y skills para equipos/agentes; puede utilizarse sin Board.
- **Gripm Suite** no existe todavía como paquete o instalador y queda fuera del alcance de esta tarea.

Board incluye algunos materiales de agente y ofrece `gripm playbook sync` para sincronizar materiales canónicos en un proyecto. Ese comando no instala el paquete Playbook ni equivale a instalar/actualizar Board. La ayuda del CLI y las guías de inicio deben dejar claras estas diferencias, indicar qué comandos se usan para abrir Board o conectar MCP, y evitar nombres de paquetes obsoletos o ambiguos.

La documentación debe ser honesta sobre lo que existe hoy y no prometer una instalación unificada todavía.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 README en español e inglés explica con el mismo modelo Gripm, Board, MCP y Playbook, incluida la independencia real y la relación de MCP con Board.
- [x] #2 Una guía breve de decisión asigna de forma inequívoca los comandos existentes a abrir Board, inicializar un proyecto, conectar MCP y sincronizar materiales del Playbook.
- [x] #3 La ayuda del CLI presenta el comando por defecto y sus subcomandos con propósitos, opciones de destino y efectos claramente diferenciados.
- [x] #4 Las instrucciones de instalación y configuración MCP usan el nombre publicado `@gripm/board` y no sugieren paquetes o comandos no existentes.
- [x] #5 Se aclara que `gripm playbook sync` sincroniza materiales del Playbook en un proyecto; no instala el paquete Playbook ni Gripm Suite.
- [x] #6 Suite se describe solo como una posibilidad futura, sin prometer instalador, paquete agregador o flujo de instalación que todavía no exista.
- [x] #7 README, ayuda del CLI y skills incluidas en Board no se contradicen en nombres de productos ni comandos.
- [x] #8 Pasan las verificaciones de CLI/documentación aplicables, TypeScript, tests, build, publicación y sincronización del backlog.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Documentar el modelo Gripm / Board / MCP / Playbook y la relación entre los productos y sus paquetes/comandos actuales.
2. Simplificar las rutas de inicio para elegir Board, MCP o Playbook según el objetivo; distinguir sincronizar materiales de instalar un producto.
3. Alinear la ayuda de `gripm`, README bilingües y skills que se distribuyen con Board, incluyendo ejemplos MCP y destinos de proyecto.
4. Agregar o actualizar verificaciones para prevenir comandos/paquetes ambiguos u obsoletos en la documentación de uso.
5. Ejecutar verificaciones de TypeScript, tests relevantes, build, superficie de publicación y sincronización del backlog.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Los README en español e inglés ahora separan marca, Board, MCP y Playbook y presentan una tabla de objetivo → comando → efecto; Suite se declara explícitamente como futura y sin instalador actual.
- La ayuda de `gripm --help` aclara que `gripm` abre Board, `gripm mcp`/`gripm-mcp` conectan un agente sin UI y `gripm playbook sync` sincroniza archivos, pero no instala Playbook.
- El CLI rechaza comandos desconocidos y subcomandos de Playbook distintos de `sync` con mensaje de uso; ya no cae accidentalmente en el arranque del tablero.
- Se alinearon las skills de Board con el paquete publicado `@gripm/board` y se aclaró la relación entre MCP y Playbook.
- Validación: `npm test` (16 pasos), `npx tsc --noEmit`, `npm run build`, `npm run test:linux` (suite Linux completa, `SUITE_EXIT=0`), `npm run publish:check`, `npm run backlog:check` y `git diff --check`, todos con código 0.
<!-- SECTION:NOTES:END -->
