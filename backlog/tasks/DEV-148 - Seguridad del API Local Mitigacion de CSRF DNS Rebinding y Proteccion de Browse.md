---
id: DEV-148
title: "Seguridad del API Local: Mitigación de CSRF, DNS Rebinding, Validación de Host/Origin y Protección de Browse"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-03 19:48'
labels:
  - "security"
  - "api"
  - "middleware"
  - "blocker"
dependencies: []
priority: urgent
type: bug
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mitigar las vulnerabilidades de seguridad identificadas en la auditoría externa en el API local (`vite.config.ts` / `apiMiddleware`):
1. **CSRF y DNS Rebinding:** Validar estrictamente los encabezados `Host` y `Origin` permitiendo únicamente `localhost`, `127.0.0.1`, `[::1]` o el host explícito configurado.
2. **Métodos Mutantes:** Exigir `Content-Type: application/json` en métodos `POST`, `PUT`, `DELETE` para impedir envíos ciegos tipo "simple request" sin preflight CORS desde sitios de terceros.
3. **CORS Abierto:** Eliminar `Access-Control-Allow-Origin: *` de `/api/events` (SSE) y restringirlo a orígenes locales verificados.
4. **Protección de `/api/fs/browse`:** Validar que el directorio explorado pertenezca a directorios seguros del usuario o restringir navegación arbitraria del sistema de archivos.
5. **Advertencia de Red:** Emitir advertencia de seguridad en la consola si el servidor se enlaza a `--host 0.0.0.0` o a interfaces públicas sin token de acceso.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `apiMiddleware` rechaza peticiones con cabeceras `Origin` no coincidentes con el host local o autorizado
- [x] #2 `apiMiddleware` valida la cabecera `Host` para prevenir ataques de DNS Rebinding
- [x] #3 Peticiones mutantes (`POST`, `PUT`, `DELETE`, `PATCH`) rechazan payloads que no especifiquen `Content-Type: application/json`
- [x] #4 `/api/events` no expone `Access-Control-Allow-Origin: *`
- [x] #5 `/api/fs/browse` implementa salvaguardas y rechaza navegación fuera de límites de usuario permitidos
- [x] #6 Tests automatizados verifican el rechazo de peticiones cross-origin no autorizadas
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Agregar helper de validación de seguridad en `vite.config.ts` (o middleware compartido).
2. Interceptar peticiones previas a `handle()`, validando Host, Origin y Content-Type.
3. Actualizar SSE headers.
4. Escribir pruebas en `scripts/test-api-security.js` o integrar en suite de tests.
<!-- SECTION:PLAN:END -->
