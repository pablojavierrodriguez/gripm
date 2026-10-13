# 0002 — Backend embebido como plugin de middleware de Vite

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-13
- **Tareas:** `dev-043`, `DEV-102`, `DEV-155`, `DEV-190`, `DEV-243`
- **Reemplaza:** —

---

## Contexto

gripm necesita leer y escribir el backlog en el disco, servir la UI React y exponer endpoints `/api/*`. La decisión estructural es **con quién comparte proceso y quién es dueño del ciclo de vida**. Los dos candidatos naturales eran un servidor de aplicación propio (Node + Express/Fastify) o el propio servidor de desarrollo que ya levanta la UI.

El producto se distribuye como un binario (`npx @gripm/board`, `bin/gripm.js`) y se espera que un usuario lo abra y empiece a trabajar en segundos, sin instalar un servidor, sin configurar un proxy y sin dos procesos que deban mantenerse sincronizados.

## Decision Drivers

1. **Un solo proceso y una sola URL:** `gripm` levanta todo, UI incluida.
2. **Cero configuración de CORS ni de proxy:** el cliente y la API comparten origen.
3. **Distribución mínima:** el binario no arrastra un framework de servidor con sus dependencias.
4. **Mantenibilidad:** el servidor embebido debe ser auditable y testeable por separado del front.

## Opciones consideradas

### Opción A — Servidor HTTP propio (Express/Fastify) + Vite separado

- **A favor:** separados, el backend se despliega de forma independiente, límites de red explícitos.
- **En contra:** dos procesos, dos puertos, CORS o proxy obligatorios, dos comandos para el usuario y un runtime adicional en el tarball.
- **Veredicto:** descartada. Empeora los drivers 1, 2 y 3 sin ganancia real para una herramienta monousuario local.

### Opción B — Servidor estático (`vite preview` o `express.static`) sirviendo un bundle precompilado

- **A favor:** arranque en runtime más liviano, artefacto de producción real.
- **En contra:** obliga a compilar antes de usar, pierde HMR y source maps en desarrollo.
- **Veredicto:** **diferida**, no descartada. El trade-off (cold start y tarball vs. HMR) es real y quedó explícitamente fuera del alcance de `DEV-164` para no mezclarse con un refactor de code-splitting. Candidato natural a un ADR propio.

### Opción C — Plugin de Vite que sirve la API dentro del mismo ciclo de vida

- **A favor:** un proceso, un origen, cero CORS, `pnpm dev` / `npx gripm` indistinguibles para el usuario; y como plugin, el servidor se apaga solo.
- **En contra:** mezcla el runtime de desarrollo con el de la API; obliga a exponer y liberar handles de `fs.watch` de forma explícita para que el proceso pueda morir.
- **Veredicto:** adoptada.

## Decisión

**El backend es un plugin de middleware de Vite** (`gripmApi()` en [`server/plugin.ts`](../../server/plugin.ts), conectado desde [`vite.config.ts`](../../vite.config.ts)), y la lógica vive en capas explícitas bajo `server/`:

| Capa | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| Plugin / ciclo de vida | [`server/plugin.ts`](../../server/plugin.ts) | Instala el middleware, levanta watchers de proyecto y expone `closeWatchers`. |
| Middleware de seguridad | [`server/middleware/security.ts`](../../server/middleware/security.ts) | Cabeceras de seguridad, validación de `Host`/`Origin`, límite de tamaño de body. |
| Rutas | [`server/routes/api.ts`](../../server/routes/api.ts) | Enrutado de `/api/*` y contrato JSON. |
| Servicios | [`server/services/storage.ts`](../../server/services/storage.ts), [`registry.ts`](../../server/services/registry.ts), [`fsExplorer.ts`](../../server/services/fsExplorer.ts) | Persistencia, registro XDG multi-proyecto y exploración de archivos con contención de rutas. |
| Tiempo real | [`server/sse/sseManager.ts`](../../server/sse/sseManager.ts) | Canal SSE de sincronización en vivo. |

Dos consecuencias operativas quedan fijadas como regla:

- **Los watchers son handles vivos y hay que liberarlos.** `fs.watch()` no se puede `unref()`, por lo que el plugin expone `closeWatchers` y cualquier consumidor (tests, CLI) debe llamarlo explícitamente para que el proceso termine (`DEV-190`).
- **El cliente nunca habla con el disco.** Toda mutación pasa por `src/api.ts`; la UI no importa `server/`.

## Consecuencias

### Positivas

- `npx @gripm/board` levanta el producto completo: no hay segundo proceso ni segundo puerto.
- Sin CORS, sin proxy, sin configuración de red en el camino caliente.
- La lógica de servidor es TypeScript testeable de forma aislada, sin levantar Vite.

### Negativas

- El código de la API queda atado al ciclo de vida del servidor de desarrollo: una futura distribución con estáticos requiere desacoplar el enrutado del plugin (`Option B` sigue abierta).
- Los handles de watcher son una fuente clásica de fugas: sin `closeWatchers` el proceso no muere y los tests se cuelgan.

### Neutras o a vigilar

- El middleware aplica cabeceras CSP estrictas en todo origen, lo que condiciona cualquier decisión futura sobre recursos externos (CDN de fuentes, telemetría).

## Referencias

- [`docs/ARCHITECTURE.md` §2 y §3](../ARCHITECTURE.md) — mapa de capas y catálogo de archivos.
- `backlog/tasks/DEV-190 - *` — cierres de handles y validación en Linux.
- `backlog/tasks/DEV-164 - Code-Splitting del Bundle de Produccion con React.lazy y manualChunks en Rollup.md` — decisión explícitamente diferida sobre estáticos vs. dev server.