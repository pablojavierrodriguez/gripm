---
id: DEV-169
title: "Unificar el Bind de Red con la Allowlist Anti-DNS-Rebinding: el servidor escucha solo en IPv6"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 01:00'
labels:
  - "networking"
  - "security"
  - "portability"
dependencies: []
priority: medium
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El servidor HTTP embebido enlaza a un único host, pero el middleware anti-DNS-rebinding acepta un conjunto de hosts loopback más amplio que el que realmente está escuchando. El resultado es que una URL que la política de seguridad considera válida puede ser rechazada a nivel de conexión.

### Evidencia (verificada sobre `6a50230`, macOS)

```
$ lsof -nP -iTCP:4178 -sTCP:LISTEN
node    38378   ...   IPv6  0x5ed9abc27bf44872   TCP [::1]:4178 (LISTEN)   ← único listener

$ curl -o /dev/null -w "%{http_code}" http://localhost:4178/    → 200
$ curl -o /dev/null -w "%{http_code}" http://[::1]:4178/        → 200
$ curl -o /dev/null -w "%{http_code}" http://127.0.0.1:4178/    → 000  (connection refused)
```

### Causa raíz

`bin/gripm.js:104` defaultea `host = 'localhost'` y lo pasa directamente a Vite. Node resuelve `localhost` según la plataforma: en macOS resuelve a `::1` primero, por lo que el bind queda restringido a IPv6.

Mientras tanto, la política de hosts permitidos en `vite.config.ts:1159` (y la de origins en `:1175`) incluye:

```js
['localhost', '127.0.0.1', '::1', '[::1]']
```

Es decir: **la allowlist de seguridad es más amplia que el bind real**. El código acepta `127.0.0.1` como loopback legítimo en el header `Host`, pero no hay nada escuchando en esa familia de direcciones.

### Impacto

- **No rompe el flujo documentado**: el README indica `http://localhost:4100`, que funciona porque el navegador resuelve `localhost` a `::1` en macOS y a `127.0.0.1` en la mayoría de Linux/Windows.
- **Sí produce fallas cruzadas**: cualquier herramienta, script o documentation que apunte explícitamente a `127.0.0.1:4100` recibe connection refused en plataformas donde `localhost` resuelve a IPv6.
- La inconsistencia es una latente de seguridad: si en el futuro se agrega una ruta que confíe en la allowlist sin considerar el bind, la suposición sería falsa.

### Objetivo

Que el bind real coincida con la allowlist de loopback, sin abrir exposição de red no intencional ni romper la advertencia de seguridad existente para `0.0.0.0`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `grep -n "let host" bin/gripm.js` devuelve una línea cuyo default resuelve a una dirección que cubre explícitamente el loopback IPv4 (`127.0.0.1`) y no a `localhost`
- [x] #2 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" http://localhost:<puerto>/` devuelve `200` (no `000`)
- [x] #3 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" http://127.0.0.1:<puerto>/` devuelve `200` (no `000`) — este es el AC que hoy falla
- [x] #4 Con el servidor levantado, `curl -o /dev/null -w "%{http_code}" "http://[::1]:<puerto>/"` devuelve `200` o, si la decisión es hacer bind solo IPv4, la allowlist de `vite.config.ts:1159` y `:1175` se reduce a los hosts realmente escuchados
- [x] #5 La advertencia de seguridad de `bin/gripm.js:110-112` para `--host 0.0.0.0` se conserva sin cambios
- [x] #6 El middleware anti-DNS-rebinding sigue rechazando un header `Host` no loopback: un request con `Host: evil.example.com` recibe rechazo
- [x] #7 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cambiar el default de `host` en `bin/gripm.js` de `'localhost'` a `'127.0.0.1'`, o documentar explícitamente la decisión si se mantiene IPv6.
2. Ajustar `findAvailablePort(port, host)` si asume nombres de host resolubles.
3. **No** tocar la lista de `bin/gripm.js:110-112` ni la lógica anti-DNS-rebinding: solo alinear el bind.
4. Si se elige bind solo IPv4, reducir la allowlist de `vite.config.ts:1159` y `:1175` a los hosts efectivamente escuchados, para que ambas listas digan lo mismo.
5. Verificar cada AC con su comando antes de tildar.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué el AC #3 es el que importa

Es el único que hoy falla. Los AC #2 y #4 son de no-regresión: pasan antes y después del cambio. El #6 protege contra el error más probable al tocar este código, que es relajar la allowlist para "hacer que funcione" en vez de alinear el bind.

### Riesgo del cambio

Cambiar a `127.0.0.1` es de bajo riesgo: es un subset de loopback, no agrega superficie de red. La opción `0.0.0.0` sigue siendo explícita y sigue emitiendo la advertencia.
<!-- SECTION:NOTES:END -->