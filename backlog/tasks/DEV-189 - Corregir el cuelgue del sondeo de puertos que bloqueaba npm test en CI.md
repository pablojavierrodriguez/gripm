---
id: DEV-189
title: "Corregir el cuelgue del sondeo de puertos que bloqueaba npm test en CI"
status: ready
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "ci"
  - "bugfix"
  - "cross-platform"
  - "devops"
dependencies: []
priority: high
type: bugfix
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`npm test` se colgaba en `ubuntu-latest` y mataba el job por `timeout-minutes`, con todos los asserts ya pasando. MacOS y Windows terminaban bien, lo que hacía el fallo parecer de infraestructura en lugar de un bug.

### Síntoma en CI

El log del job muestra la suite completa en verde y después nada:

```
🧹 Cleaned up test directory
🎉 Full verification passed successfully!
##[error]The operation was canceled.
```

El proceso terminó de trabajar pero nunca salió, así que el `&&` de `npm test` nunca avanzó al paso siguiente. Local el mismo script tarda 2s y sale con código 0.

### Causa raíz

`scripts/portUtils.js`, en `isPortAvailable`, sondea el puerto conectándose a él. El timeout del socket se fijaba con `socket.setTimeout(150)`, que **solo empieza a correr cuando el socket está establecido**. Un SYN descartado en vez de rechazado nunca llega a ese estado, así que la promesa nunca se resuelve.

En macOS el sistema operativo rechaza la conexión de inmediato y el proceso sale. En un runner Linux el puerto está filtrado, el SYN se descarta, y el `TCPConnectWrap` queda pendiente para siempre: mantiene vivo el event loop y Node nunca termina.

El test que disparaba el sondeo es DEV-177 en `scripts/verify-integration.js`, que resuelve la configuración real de Vite, y esa resolución llama a `findAvailablePort`.

### El error que cometí en el primer intento

La primera corrección añadió el timer guard con `guard.unref()`. Eso anula **justo el timer que debe resolver la promesa**: si es lo único que mantiene vivo el loop, Node sale antes de dispararlo y la promesa queda sin resolver. El síntoma pasó de "cuelgue silencioso" a `Detected unsettled top-level await`, que es el mismo bug con otro mensaje.

### Corrección posterior: esta tarea no era la causa del cuelgue de CI

Marqué el AC #5 (`npm test` sale con código 0 sin depender del sistema operativo) basándome en que la fuga del `TCPConnectWrap` era real y quedaba visible en macOS. **Eso fue una inferencia, no una verificación**, y estaba mal.

La fuga existía, pero había una segunda, mucho mayor, que solo se manifestaba en Linux: 207 `fs.FSWatcher` abiertos por `vite.config.ts`. La causa raíz real se documenta en DEV-190.

Dejé el AC #5 sin tildar a propósito. Un AC en verde sin aserción ejecutable es exactamente el tipo de mentira que hace inservible la pirámide de verificación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `isPortAvailable` resuelve aunque el connect nunca se complete, mediante un timer guard independiente del estado del socket
- [x] #2 El timer guard no está `unref`'d y el socket se destruye en todas las rutas de salida
- [x] #3 Existe test de regresión que reproduce el SYN descartado de forma determinista, para que el bug no vuelva en silencio en macOS o Windows
- [x] #4 El test cubre también el comportamiento normal: puerto ocupado se reporta ocupado, puerto libre se reporta libre
- [ ] #5 `npm test` sale con código 0 sin depender del sistema operativo — **no cumplido: este fix no resolvió el cuelgue de CI. La causa real está en DEV-190**
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reemplazar `socket.setTimeout` por un timer guard independiente que resuelva la promesa y destruya el socket.
2. Verificar que el guard no esté unref'd, y documentar por qué no debe estarlo.
3. Agregar `scripts/verify-port-probe.js` que sustituye `Socket.prototype.connect` por un no-op para simular un SYN descartado.
4. Conectar el test a `npm test`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por que un test con monkey-patch y no con red real

Reproducir un SYN descartado de verdad exige una regla de firewall DROP, que no se puede instalar desde un test portable. La alternativa sería esperar el timeout real en cada corrida.

En su lugar el test sustituye `Socket.prototype.connect` por un no-op. Eso reproduce exactamente el estado relevante: el connect queda en vuelo, no hay respuesta, no hay error, y nada dispara el `socket.setTimeout`. La prueba es determinista y corre en 164ms.

Es importante porque el bug es **invisible en macOS**: ahí el sistema operativo rechaza la conexión y el proceso sale solo. Un test que dependiera del comportamiento del SO volvería a pasar en verde mientras el bug sigue vivo en CI.

### Un falso positivo que el propio test casi deja pasar

El primer assert buscaba `unref` en todo el archivo y fallaba por `server.unref()` de la comprobación de bind, que es legítimo y previo a este fix. El assert se acotó al bloque del timer guard.

Vale la pena dejarlo anotado: un test demasiado amplio produces ruido que entrena a ignorar sus propias señales, que es el mismo problema que daba el baseline de audit:ux.

### Verificación

```bash
node scripts/verify-port-probe.js   # 3/3
npm test                            # sale con código 0
```
<!-- SECTION:NOTES:END -->