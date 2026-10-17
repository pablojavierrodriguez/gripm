---
id: DEV-317
title: "Compatibilidad macOS: Excepción de directorio temporal en isSystemRootDir para fsExplorer"
status: done
created_date: '2026-10-17'
updated_date: '2026-10-17'
labels:
  - "security"
  - "macos"
  - "ci"
  - "filesystem"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En sistemas operativos basados en Darwin/macOS, la ruta de directorios temporales asignada por el sistema (`os.tmpdir()`) se ubica bajo `/var/folders/...`, y en ciertas distribuciones Linux bajo `/var/tmp/`.

En la implementación de `server/services/fsExplorer.ts`, la función de protección `isSystemRootDir` bloqueaba preventivamente cualquier ruta que comience con `/var`, catalogándola erróneamente como directorio raíz del sistema (`isSystemRootDir` -> `true`).

Esto causaba que cualquier fixture de prueba o proyecto temporal creado dentro de `os.tmpdir()` fuera bloqueado con `403 Forbidden` en endpoints como `POST /api/projects`, provocando fallos sistemáticos en runners de CI sobre `macos-latest` (por ejemplo en `scripts/verify-optimistic-locking.js`).

### Solución Implementada:
- Incorporada una verificación explícita en `isSystemRootDir` que excluye del bloqueo de raíces de sistema cualquier ruta contenida dentro de `os.tmpdir()` (y su correspondiente `fs.realpathSync(os.tmpdir())`).
- Preservado el bloqueo estricto de `/var`, `/etc`, `/usr`, `C:\Windows` y demás rutas protegidas del sistema operativo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] AC #1: `isSystemRootDir` devuelve `false` para cualquier subdirectorio contenido dentro de `os.tmpdir()` tanto en Windows como en macOS y Linux.
- [x] AC #2: `isAllowedBrowsePath` autoriza la exploración y registro de repositorios temporales creados en `os.tmpdir()` (`POST /api/projects`).
- [x] AC #3: Rutas reales del sistema operativo (`/etc`, `/var`, `/usr`, `C:\Windows`) continúan estrictamente bloqueadas con `403 Forbidden`.
- [x] AC #4: La suite de pruebas de seguridad y concurrencia optimista pasa sin errores en todas las plataformas (`node scripts/test-api-security.js` y `node scripts/verify-optimistic-locking.js`).
<!-- AC:END -->

## Notes

<!-- SECTION:NOTES:BEGIN -->
Identificado tras el release v1.6.0, donde la suite `npm test` aprobó en Windows y Linux (Ubuntu) pero falló en los runners de `macos-latest` en CI debido a la contención en `/var/folders/`.
<!-- SECTION:NOTES:END -->
