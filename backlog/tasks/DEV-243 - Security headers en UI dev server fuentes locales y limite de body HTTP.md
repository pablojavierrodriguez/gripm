---
id: DEV-243
title: "Security headers en UI dev server (CSP, frame-ancestors, nosniff), fuentes locales y limite de body HTTP (413)"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-12'
labels:
  - "security"
  - "ui"
  - "offline"
  - "quality-gate"
dependencies:
  - "DEV-242"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación de mitigaciones de seguridad en el dev server y capa UI de gripm identificadas en la auditoría técnica de seguridad:

1. **Security Headers & Anti-Clickjacking:**
   - Inyección de cabeceras de seguridad en respuestas del middleware de `vite.config.ts`:
     - `Content-Security-Policy`: con directivas estrictas (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`).
     - `X-Frame-Options: DENY`: impide que sitios web maliciosos embeban `http://localhost:4100` en iframes para ataques de clickjacking.
     - `X-Content-Type-Options: nosniff`: previene MIME-sniffing de scripts o estilos.
     - `Referrer-Policy: strict-origin-when-cross-origin`: protege la fuga de rutas internas en cabeceras Referer.

2. **Privacidad y Soporte Offline (Self-hosted Fonts):**
   - Retirar enlaces externos a Google Fonts (`fonts.googleapis.com` y `fonts.gstatic.com`) de `index.html`.
   - Utilizar tipografías locales/autohospedadas o font-stack moderna del sistema, permitiendo que gripm sea 100% utilizable offline y sin telemetría de navegación hacia servidores de terceros.

3. **Límite de Tamaño de Body HTTP (Anti-DoS local):**
   - Incorporar guarda `MAX_BODY_SIZE = 10 * 1024 * 1024` (10 MB) en el acumulador de `req.on('data')` en `vite.config.ts`.
   - Responder inmediatamente con `413 Payload Too Large` y destruir el flujo si la carga supera el límite, previniendo DoS por agotamiento de memoria (OOM).

4. **Regresión y Verificación Automatizada:**
   - Ampliar `scripts/test-api-security.js` con aserciones ejecutables contra el middleware real para todas las cabeceras y el límite de body 413.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 vite.config.ts inyecta cabeceras de seguridad (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy) en respuestas HTTP
- [x] #2 CSP declara frame-ancestors 'none' bloqueando clickjacking en localhost
- [x] #3 index.html no realiza peticiones externas a Google Fonts utilizando tipografías locales o del sistema
- [x] #4 vite.config.ts valida tamaño máximo del body (MAX_BODY_SIZE = 10MB) respondiendo 413 Payload Too Large si se excede
- [x] #5 scripts/test-api-security.js incluye pruebas automatizadas para CSP, frame-ancestors, nosniff y límite 413 de body
- [x] #6 Pirámide de verificación en verde (tsc, npm test, backlog:sync, backlog:check, publish:check, build)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `vite.config.ts`:
   - Configurar middleware para añadir `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` y `Referrer-Policy` a todas las respuestas.
   - En el handler de recolección de body POST/PUT, verificar tamaño acumulado contra `MAX_BODY_SIZE` (10MB) y responder 413 si se excede.
2. En `index.html`:
   - Eliminar preconnect y stylesheet de Google Fonts.
   - Configurar font-stack tipográfica local en CSS / Tailwind.
3. En `scripts/test-api-security.js`:
   - Añadir tests para verificar cabeceras de seguridad y respuesta 413 ante bodies superiores a 10MB.
4. Ejecutar la Pirámide de Verificación y certificar la tarea en `ready`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Cabeceras de seguridad (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` con `frame-ancestors 'none'`) añadidas en `apiMiddleware` y en `server.headers` de Vite.
- Eliminados preconnect y links externos a Google Fonts en `index.html`; configurado system font stack resiliente en `tailwind.config.js`.
- Protección anti-DoS con `MAX_BODY_SIZE = 10 * 1024 * 1024` (10MB) en `getBody()`, respondiendo `413 Payload Too Large` y destruyendo el stream.
- Tests automatizados 15 y 16 agregados a `scripts/test-api-security.js` con aserciones sobre middleware real y server.headers.
<!-- SECTION:NOTES:END -->

