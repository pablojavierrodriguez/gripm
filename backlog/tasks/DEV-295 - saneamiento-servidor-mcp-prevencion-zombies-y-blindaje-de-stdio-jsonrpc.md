---
id: DEV-295
title: "Saneamiento del Servidor MCP: Prevención de procesos zombies y blindaje de JSON-RPC"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15 23:26'
labels:
  - "mcp"
  - "json-rpc"
  - "cli"
  - "agent"
dependencies: []
priority: medium
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Endurecimiento del servidor Model Context Protocol (`scripts/mcp-server.ts` y `bin/gripm-mcp.js`) para evitar procesos huérfanos en segundo plano, roturas del canal de comunicación stdio con agentes de IA (Cursor, Claude, Antigravity) y desincronizaciones entre el código fuente TypeScript y el binario empaquetado.

### Problemas identificados y reproducibles:

1. **Procesos Zombie por falta de listeners de cierre en `stdin`:**
   En `scripts/mcp-server.ts:1820`, el servidor escucha líneas mediante `readline`, pero **no registra ningún listener para `process.stdin.on('close')`, `'end'`, `SIGINT` ni `SIGTERM`**. Cuando un cliente LLM desconecta o termina la sesión, el proceso Node.js permanece vivo consumiendo memoria y CPU si existen temporizadores activos (como `checkForUpdates`).
2. **Rotura de protocolo JSON-RPC por enrutamiento fallido en CLI:**
   En `bin/gripm.js:148-182`, la detección de MCP evalúa rígidamente `args[0] === 'mcp'`. Si un cliente o script invoca `gripm --repo /ruta mcp`, `args[0]` es `'--repo'`. El ejecutable no inicia MCP, sino que inicia el servidor web e imprime texto plano y banners ASCII en `stdout`, reventando la conexión JSON-RPC del cliente.
3. **Peligro de salida en `readline`:**
   En `scripts/mcp-server.ts:1810`, se declara `output: process.stdout` en `readline.createInterface`. En un transporte stdio de MCP, `output` debe ser nulo para evitar que secuencias de escape del terminal se filtren en la salida.
4. **Desfase silencioso de binario compilado:**
   El binario commiteado `bin/gripm-mcp.js` no cuenta con una verificación en pre-commit hook que valide si está sincronizado con los cambios en `scripts/mcp-server.ts`.

### Script de Reproducción Inmediata (PoC):

```bash
# Simular invocación con banderas previas
node bin/gripm.js --repo . mcp
# En el estado actual, imprime "gripm v... listo / Tablero: http://..." en stdout en lugar de responder a JSON-RPC
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/mcp-server.ts` registra manejadores explícitos para `process.stdin.on('close')`, `process.stdin.on('end')`, `SIGINT` y `SIGTERM` para terminar el proceso limpiamente de inmediato
- [x] #2 `bin/gripm.js` analiza los argumentos de forma no posicional, reconociendo el subcomando `mcp` sin importar si está precedido por banderas como `--repo` o `-r`
- [x] #3 `readline.createInterface` en `scripts/mcp-server.ts` omite `output: process.stdout` para blindar la pureza del canal JSON-RPC
- [x] #4 Un check en `scripts/verify-changes.js` compila en memoria `mcp-server.ts` y verifica que `bin/gripm-mcp.js` coincida exactamente, abortando el commit si el binario está desactualizado
- [x] #5 La suite de pruebas de MCP aprueba limpiamente (`node scripts/verify-mcp-binary.js`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
