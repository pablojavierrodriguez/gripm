---
id: DEV-195
title: "Incluir logo en el paquete npm de Gripm"
status: review
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "bug"
  - "packaging"
priority: medium
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En el smoke test con Gripm instalado globalmente en otro repositorio, no se ve el logo. La interfaz lo solicita desde `/logo.png` y el asset vive en `public/logo.png`, pero `package.json` publica una allowlist que incluye `dist` y omite `public`. El CLI levanta Vite desde el paquete instalado, por lo que el archivo público debe estar presente en el tarball.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El tarball de npm contiene `public/logo.png`
- [x] #2 El CLI sirve `/logo.png` correctamente al ejecutarse contra el repo smoke-test
- [x] #3 `npm run publish:check` exige que `public/logo.png` esté presente en el tarball
- [x] #4 El paquete Gripm no se declara a sí mismo como dependencia y el lockfile coincide con el manifiesto
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Se agregó `public` a la allowlist de archivos npm y `public/logo.png` a las entradas obligatorias del guard de publicación.
- `npm pack --dry-run --json` muestra `public/logo.png`; `npm run publish:check` pasa.
- Smoke test visual del CLI: `/logo.png` carga correctamente (384 × 384) y no hay errores de consola.
- Se eliminó la dependencia accidental `@gripm/board` del propio paquete y se regeneró `package-lock.json`; `npm audit` volvió de 11 a 10 avisos.
- El guard de publicación también rechaza futuras dependencias autorreferenciales.
<!-- SECTION:NOTES:END -->
