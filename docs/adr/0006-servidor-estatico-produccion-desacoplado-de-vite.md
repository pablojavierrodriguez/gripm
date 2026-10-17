# 0006 - Servidor estático HTTP desacoplado de Vite para producción

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-15
- **Tareas:** `DEV-290`, `DEV-306`
- **Reemplaza:** [ADR-0002](0002-backend-embebido-como-plugin-de-vite.md)

---

## Contexto

En el diseño fundacional registrado en ADR-0002, gripm ejecutaba su servidor backend como un plugin de middleware dentro de la instancia de desarrollo de Vite (`createServer` de Vite con `vite.config.ts`).

Si bien este enfoque simplificaba el desarrollo local al no requerir compilación previa y proveer HMR nativo, introducía severos inconvenientes en entornos de distribución de producción (`npx @gripm/board`, Docker, binarios empaquetados):
1. **Cold start elevado:** Iniciar Vite implicaba parsear `vite.config.ts`, inicializar plugins de Rollup/PostCSS/Tailwind y resolver dependencias en tiempo de arranque.
2. **Consumo de memoria innecesario:** El motor de desarrollo de Vite y su transformador de módulos on-demand permanecían residentes en RAM durante sesiones monousuario prolongadas.
3. **Fragilidad de empaquetado:** Distribuir el runtime dependiendo de Vite como servidor HTTP impedía empaquetar bundles mínimos y standalone (`dist/` + `bin/server.js`).

## Decision Drivers

1. **Velocidad de arranque (Cold Start):** Reducir el tiempo de inicio de la CLI de segundos a milisegundos en producción.
2. **Desacople estricto de dependencias pesadas en runtime:** La ejecución en producción no debe depender de transformadores de código o compiladores en caliente.
3. **Preservación de la experiencia de desarrollo (DX):** Mantener Vite y HMR intactos cuando un desarrollador trabaje localmente con el código fuente.
4. **Cero configuración adicional:** El usuario final de `gripm` sigue ejecutando un único comando (`npx @gripm/board` o `node bin/gripm.js`) en un único puerto y sin proxy inverso.

## Opciones consideradas

### Opción A - Seguir usando Vite embebido (`createServer`) en producción
- **A favor:** Mantiene un único path de ejecución de servidor.
- **En contra:** Alto cold start, sobrecarga de RAM y dependencia pesada en producción.
- **Veredicto:** Descartada. Causa raíz de la lentitud de arranque identificada en DEV-290.

### Opción B - Framework externo de producción (Express / Fastify)
- **A favor:** Ecosistema maduro de middlewares estáticos.
- **En contra:** Añade dependencias de terceros al tarball publicado y no reutiliza el middleware de seguridad ni el router nativo existente.
- **Veredicto:** Descartada. Contraria al principio de diff mínimo viable y distribución liviana.

### Opción C - Servidor HTTP nativo de Node.js (`node:http`) sirviendo `dist/` precompilado y API desacoplada
- **A favor:** Cero dependencias adicionales, arranque casi instantáneo (<50ms), consumo mínimo de memoria, y reutilización directa del middleware de seguridad y servicios en `bin/server.js`.
- **En contra:** Requiere compilar el frontend (`npm run build`) antes de empaquetar o publicar, manteniendo un branch condicional en `bin/gripm.js` (`isDev` vs default).
- **Veredicto:** Adoptada.

## Decisión

**Adoptamos un servidor HTTP nativo (`node:http`) para la ejecución por defecto en producción, desacoplado de Vite, reservando Vite exclusivamente para el modo desarrollo (`--dev`).**

1. **Ruta de producción (`bin/gripm.js` por defecto):**
   - Utiliza `node:http.createServer()`.
   - Sirve archivos estáticos precompilados desde `dist/` (HTML, JS, CSS, assets, con soporte de SPA fallback a `index.html`).
   - Conecta el middleware de API cargando el bundle standalone `bin/server.js` (o `server/plugin.ts` en fallback) a través de `gripmApi()`.
   - Mantiene compatibilidad total con SSE (`/api/events`), WebSocket/polling y endpoints REST.
2. **Ruta de desarrollo (`bin/gripm.js --dev`):**
   - Inicia Vite con `createServer()` y `vite.config.ts` preservando HMR y source maps.
3. **Build Pipeline:**
   - `npm run build` compila tanto el frontend Vite a `dist/` como los binarios backend a `bin/server.js` y `bin/gripm-mcp.js`.

Esta decisión sustituye formalmente a [ADR-0002](0002-backend-embebido-como-plugin-de-vite.md).

## Consecuencias

### Positivas
- Arranque instantáneo del CLI en entornos locales y contenedores.
- Menor superficie de riesgo y menor consumo de memoria.
- Aislamiento limpio entre compilación (build-time) y ejecución (run-time).

### Negativas
- Requiere ejecutar `npm run build` tras modificar código fuente de frontend o backend antes de validar el comportamiento en modo producción.

### Neutras o a vigilar
- Las rutas estáticas servidas por `node:http` deben manejar correctamente MIME types comunes (`.html`, `.js`, `.css`, `.svg`, `.json`) y cabeceras de caché.
