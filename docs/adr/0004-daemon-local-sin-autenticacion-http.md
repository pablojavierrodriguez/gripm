# 0004 — Daemon local monousuario sin autenticación HTTP

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-13
- **Tareas:** `DEV-243`, `DEV-190`
- **Reemplaza:** —

---

## Contexto

El servidor embebido de gripm expone `/api/*` con operaciones de lectura y escritura sobre el sistema de archivos del usuario ([ADR-0002](0002-backend-embebido-como-plugin-de-vite.md)). Es la misma superficie que consume la UI. La pregunta de diseño es si ese endpoint debe estar autenticado.

La respuesta depende del modelo de despliegue: **gripm es una herramienta local, monousuario, sin cuentas ni nube**. No hay servidor remoto al que autenticarse, no hay multi-tenancy y no hay datos que salgan de la máquina. Introducir un esquema de tokens exigiría un segredo que alguien tiene que generar, distribuir y rotar, para proteger un recurso que ya sólo existe dentro del proceso del propio usuario.

El riesgo real no es la autenticación, sino que un proceso del navegador de **otra** página del sistema pueda alcanzar el endpoint (CSRF / DNS rebinding) o que la herramienta quede expuesta en la LAN.

## Decision Drivers

1. **Cero fricción de arranque:** `npx @gripm/board` debe abrir y funcionar, sin crear claves ni configurar nada.
2. **Frontera de aislamiento explícita:** el proceso del usuario es la frontera de confianza, y hay que decirlo por escrito.
3. **Mitigación de vectores de navegador reales:** DNS rebinding, CSRF desde `localhost` y exposición accidental a la red.
4. **Monousuario:** la autorización por usuario es un modelo sin valor agregado en esta herramienta.

## Opciones consideradas

### Opción A — Autenticación por token en todas las mutaciones

- **A favor:** modelo familiar, permite una futura capa multiusuario o remota.
- **En contra:** el usuario debe generar, almacenar y rotar un secreto; la UI tiene que inyectarlo en cada request; el agente MCP también; y el secreto no agrega protección real contra un atacante local, que ya tiene acceso al repositorio.
- **Veredicto:** descartada. Fricción permanente a cambio de una garantía vacía en este modelo.

### Opción B — Bind exclusivo a loopback, sin ningún control adicional

- **A favor:** mínimo código; ninguna otra máquina alcanza el puerto.
- **En contra:** `--host 0.0.0.0` sigue siendo una opción soportada para uso en LAN; y aun en loopback, una página maliciosa de otro origen puede intentar pegarle al puerto.
- **Veredicto:** insuficiente por sí sola. La opción elegida incluye el bind a loopback, pero además valida `Host` y `Origin`.

### Opción C — Sin autenticación, con mitigaciones de transporte y exposición

- **A favor:** arranque sin fricción, y los vectores de ataque relevantes quedan cubiertos: validación de `Host` (anti DNS rebinding), validación de `Origin` (anti CSRF), exigir `Content-Type: application/json` en métodos mutantes, límite de 10 MB de body y cabeceras de seguridad (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`).
- **En contra:** sigue siendo un endpoint sin credenciales; quien pueda alcanzar el puerto y pasar las validaciones opera el backlog.
- **Veredicto:** adoptada.

## Decisión

**La API local no tiene autenticación.** La frontera de aislamiento es el proceso del usuario. Esto queda registrado como riesgo asumido y explícito (**SEC-10** en `AGENTS.md`), junto con la advertencia de exposición en LAN (**SEC-06**).

Mitigaciones obligatorias, implementadas en [`server/middleware/security.ts`](../../server/middleware/security.ts) y aplicadas a todo request que entra al middleware:

1. **Validación de `Host` (anti DNS rebinding):** se acepta loopback (`localhost`, `127.0.0.1`, `::1`), el host configurado vía `GRIPM_HOST`, una IP cuando el servidor está en `0.0.0.0`, y los extras de `GRIPM_ALLOWED_HOSTS`. Cualquier otro `Host` recibe `403`.
2. **Validación de `Origin` (anti CSRF):** si hay `Origin`, debe ser loopback o coincidir con el `Host` o con los hosts permitidos; en caso contrario, `403`.
3. **Métodos mutantes:** `POST`, `PUT`, `DELETE` y `PATCH` exigen `Content-Type: application/json`.
4. **Límite de body:** 10 MB (`MAX_BODY_SIZE`), con corte de la request y `413` al superarlo.
5. **Cabeceras de seguridad** en todas las respuestas.
6. **Contención de rutas en el explorador de archivos** (`server/services/fsExplorer.ts`): validación estricta con `path.relative` y `realpathSync` contra las raíces permitidas (`home`, `cwd`, proyectos registrados), que es lo que evita un traversal (`/api/fs/browse`).

Uso en LAN: `--host 0.0.0.0` abre el servidor a cualquier dispositivo de la red local. Se admite **sólo en redes de confianza** y nunca en redes públicas.

## Consecuencias

### Positivas

- Arranque inmediato sin configuración, exactamente en línea con el objetivo de producto.
- Los vectores de ataque practicalmente relevantes (rebinding, CSRF, DoS por body, sniffing) están cubiertos por código y testeados.
- La superficie de la UI queda bloqueada a framings (`X-Frame-Options: DENY`) y a CSP restrictiva.

### Negativas

- Si en el futuro el producto se expone a una red no confiable o se vuelve multiusuario, **esta decisión debe revisitarse** y requiere un ADR nuevo que reemplace a éste.
- Un atacante con acceso de lectura al repositorio ya tiene el backlog: la ausencia de tokens es coherente con el modelo, pero no debe interpretarse como "seguro para exposición pública".

### Neutras o a vigilar

- Las variables `GRIPM_HOST` y `GRIPM_ALLOWED_HOSTS` amplían la superficie: cada excepción agregada es un bypass deliberado de las validaciones 1 y 2.

## Referencias

- [`AGENTS.md`](../../AGENTS.md) §7 — `SEC-01`, `SEC-06`, `SEC-07`, `SEC-10`.
- [`server/middleware/security.ts`](../../server/middleware/security.ts) — implementación de las mitigaciones.
- `backlog/tasks/DEV-243 - *` — cabeceras de seguridad y protección anti-DoS.