---
id: DEV-178
title: "Previsibilidad de Puerto y Evitación de Saltos Innecesarios en Servidor Dev y CLI"
status: ideas
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "server"
  - "dx"
  - "cli"
  - "networking"
dependencies:
  - DEV-116
  - DEV-169
priority: low
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigar y definir mecanismos para evitar que el servidor de desarrollo (`npm run dev`) y el CLI (`npm run board`) cambien inesperadamente de puerto (ej. saltando de 4100 a 4101 o 4102) durante una misma sesión de trabajo o ante reinicios de servidor.

**Problemas detectados:**
1. **Reinicio de servidor Vite (*Server Restart*):** `vite.config.ts` importa utilidades de backend/parsers (`scripts/backlogMdParser.ts`, `src/utils/legacyParser.ts`, etc.). Modificar estos módulos provoca un reinicio completo del servidor Vite (`server.restart()`). Si el socket anterior en macOS aún está cerrándose (estado `TIME_WAIT`), `findAvailablePort` detecta el puerto 4100 como ocupado y migra automáticamente a 4101.
2. **Política `strictPort: false`:** La configuración actual incrementa silenciosamente el puerto ante cualquier colisión o demora transitoria de bind, rompiendo la pestaña que el desarrollador tiene abierta en el navegador.
3. **Doble resolución redundante:** En `npm run board`, `bin/gripm.js` ejecuta `findAvailablePort(4100)` con binds temporales y luego `vite.config.ts` vuelve a invocar `findAvailablePort(4100)` antes del `server.listen()` definitivo, generando ráfagas de sockets de sondeo.

**Vías de solución a evaluar:**
- Evaluar `strictPort: true` con mensajes claros de diagnóstico para que el servidor falle explícitamente en lugar de cambiar de URL de forma silenciosa.
- Desacoplar `vite.config.ts` de dependencias de parsers para aislar el HMR de la UI y no disparar reinicios globales del servidor HTTP.
- Sincronizar el puerto resuelto en `bin/gripm.js` exportando `process.env.GRIPM_PORT` para evitar doble invocación de `findAvailablePort`.
- Reintento con backoff breve antes de declarar un puerto ocupado en reinicios calientes de Vite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Evaluar tradeoff entre strictPort: true (fallo explícito y diagnóstico) vs strictPort: false (salto automático)
- [ ] #2 Evitar doble sondeo de puertos sincronizando el puerto entre bin/gripm.js y vite.config.ts vía process.env.GRIPM_PORT
- [ ] #3 Analizar desacoplamiento de imports de scripts en vite.config.ts para reducir disparadores de server restart completo
- [ ] #4 Preservar compatibilidad con configuración multi-puerto explícita (--port y GRIPM_PORT)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Documentar los casos de uso donde el salto de puerto resulta problemático vs deseable.
2. Realizar benchmark de estabilidad de sockets tras reinicios de Vite en macOS / Linux.
3. Decidir la estrategia canónica de gestión de puertos y plasmarla en la configuración del servidor.
<!-- SECTION:PLAN:END -->
