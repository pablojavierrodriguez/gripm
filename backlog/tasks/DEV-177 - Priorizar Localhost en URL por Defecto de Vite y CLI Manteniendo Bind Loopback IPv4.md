---
id: DEV-177
title: "Priorizar Localhost en URL por Defecto de Vite y CLI Manteniendo Bind Loopback IPv4"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 10:00'
labels:
  - "dx"
  - "networking"
  - "cli"
dependencies:
  - DEV-169
priority: medium
type: enhancement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En DEV-169 se unificó el enlace de red del servidor a la dirección loopback IPv4 (`127.0.0.1`) para garantizar compatibilidad con herramientas de línea de comandos (`curl`, scripts) y evitar que macOS limitara la escucha exclusivamente a IPv6 (`[::1]`).

Sin embargo, al establecer de forma estricta `host = '127.0.0.1'` en la configuración de Vite (`vite.config.ts`) y en el binario ejecutable (`bin/gripm.js`), tanto la salida por consola (`➜ Local: http://127.0.0.1:4100/`) como la URL abierta por defecto en el navegador pasaron a exponer la dirección IP numérica en lugar del nombre canónico `localhost`. Para usuarios finales y desarrolladores, las direcciones IP numéricas resultan menos amigables, más técnicas y menos estéticas que `localhost`.

Dado que los navegadores modernos y las pilas de red locales resuelven `localhost` de manera transparente y realizan fallback inmediato a `127.0.0.1` (o dual-stack), la solución óptima es:
1. Mantener el socket de escucha en `127.0.0.1` bajo el capó para preservar la compatibilidad probada en DEV-169.
2. Configurar la URL de apertura (`server.open`) y la URL informada en la consola de Vite (`server.resolvedUrls.local`) para que muestren por defecto `http://localhost:<puerto>/`.
3. Ajustar el banner ASCII y la apertura del navegador en `bin/gripm.js` para priorizar `localhost` cuando el host sea el loopback por defecto.
4. Preservar cualquier host personalizado cuando el usuario especifique explícitamente `--host` o `GRIPM_HOST` (por ejemplo `0.0.0.0` o una IP de red).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 En `vite.config.ts`, la URL configurada para apertura automática (`server.open`) utiliza `http://localhost:<puerto>/` cuando el host es el default loopback (`127.0.0.1`) y no está deshabilitada por CI o variables de entorno
- [x] #2 En el plugin de Vite de `vite.config.ts`, `server.listen` mapea `127.0.0.1` a `localhost` en `server.resolvedUrls.local` para que la salida de consola (`Local:`) y los atajos de teclado del CLI muestren `http://localhost:<puerto>/`
- [x] #3 En `bin/gripm.js`, el banner ASCII y la llamada a `openBrowser` muestran y abren `http://localhost:<puerto>` por defecto cuando se enlaza al loopback `127.0.0.1`
- [x] #4 Se conserva intacta la compatibilidad con hosts explícitos: si se define `--host 0.0.0.0` o `GRIPM_HOST=<otro>`, se respeta dicho valor sin forzar `localhost`
- [x] #5 Se preserva la compatibilidad de red de DEV-169: el servidor continúa enlazando a `127.0.0.1` a nivel socket, permitiendo que tanto `localhost` en navegador como `127.0.0.1` en herramientas locales reciban respuesta HTTP 200
- [x] #6 `npx tsc --noEmit` compila con 0 errores, `npm test` pasa con exit 0, `npm run backlog:sync && npm run backlog:check` en verde y `npm run build` compila sin errores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear la tarea DEV-177 y sincronizar el backlog inmediatamente (`npm run backlog:sync`).
2. Actualizar `vite.config.ts`:
   - Calcular `displayHost = (host === '127.0.0.1') ? 'localhost' : host`.
   - Ajustar `server.open` para abrir `http://${displayHost}:${resolvedPort}/` cuando la apertura esté habilitada.
   - En `configureServer` y `configurePreviewServer`, interceptar defensivamente `server.listen` para actualizar `server.resolvedUrls.local` con `localhost`.
3. Actualizar `bin/gripm.js`:
   - Calcular `displayHost = (host === '127.0.0.1') ? 'localhost' : host`.
   - Utilizar `displayHost` en la construcción de `url` para el banner y para `openBrowser`.
4. Agregar aserciones de prueba en `scripts/verify-integration.js` para asegurar que la configuración de Vite y gripm resuelven `localhost` en el modo loopback por defecto.
5. Ejecutar la suite completa de pruebas y validar los criterios de aceptación.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Este cambio optimiza la experiencia de usuario (DX/UX) sin introducir regresiones de red. El bind real a nivel socket de Node.js sigue siendo `127.0.0.1`, lo que previene los problemas de IPv6-only observados en macOS cuando se usa `server.listen(port, 'localhost')`.
<!-- SECTION:NOTES:END -->
