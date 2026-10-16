---
id: DEV-245
title: "Autenticacion por token efimero en escucha LAN (--host 0.0.0.0)"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-16'
labels:
  - "security"
  - "lan"
  - "auth"
dependencies:
  - "DEV-242"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aislamiento de acceso en redes de área local (LAN) cuando el servidor se ejecuta con `--host 0.0.0.0`:

Cuando gripm corre escuchando en `0.0.0.0`, cualquier dispositivo de la LAN puede conectarse a la IP del host y acceder o mutar el backlog sin restricciones. Para permitir previsualización móvil en redes Wi-Fi sin exponer el backlog a otros participantes de la red:
1. Al arrancar con `0.0.0.0`, el daemon genera un token criptográfico efímero en memoria (`crypto.randomBytes(16)`).
2. Se muestra en consola la URL con el token pre-cargado: `http://<ip-lan>:4100/?token=<token>`.
3. Peticiones que se originen desde interfaces externas requieren el token en query param (`?token=...`) o cabecera `X-Gripm-Token`.
4. El tráfico local en loopback (`127.0.0.1` / `localhost`) se mantiene transparente sin exigir token para no degradar la ergonomía de desarrollo local.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Al iniciar con --host 0.0.0.0, genera un token efímero aleatorio en memoria e imprime URL de acceso en consola
- [x] #2 Peticiones mutantes y lecturas de backlog desde IPs externas exigen token respondiendo 401 Unauthorized si falta o es inválido
- [x] #3 Peticiones en loopback (127.0.0.1 / localhost) mantienen acceso transparente sin fricción
- [x] #4 UI web almacena y reenvía el token si fue provisto en la URL inicial
- [x] #5 Pruebas en test-api-security.js validan rechazo 401 en LAN sin token y 200 con token
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `vite.config.ts`, generar `ephemeralToken` cuando `host === '0.0.0.0'`.
2. Validar token en `apiMiddleware` para requests provenientes de IPs que no sean loopback.
3. En `src/api.ts`, incluir header `X-Gripm-Token` si existe token guardado en `sessionStorage`.
4. Probar en `scripts/test-api-security.js`.
<!-- SECTION:PLAN:END -->
