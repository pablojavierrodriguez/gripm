---
id: DEV-288
title: "Visibilidad de la versión de la aplicación en el pie del modal de atajos en Modo Sandbox"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "sandbox"
  - "shortcuts"
dependencies: []
priority: low
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En el pie del modal de ayuda de atajos de teclado (`KeyboardShortcutsModal.tsx`), la marca `gripm` muestra la versión activa de la aplicación mediante la expresión:
`gripm{updateAvailable?.currentVersion ? ' v' + updateAvailable.currentVersion : ''}`

En entornos locales con el backend daemon activo, `updateAvailable` se resuelve a través del sondeo de `/api/updates`. Sin embargo, en el **Modo Sandbox interactivo** (deploy estático en Vercel sin servidor Node.js), `/api/updates` no responde, por lo que `updateAvailable` permanece como `null` y la versión nunca se visualiza (quedando solo el texto "gripm").

### Solución propuesta:
1. Inyectar o disponer la versión estática de la aplicación en tiempo de compilación mediante `__APP_VERSION__` (vía `vite.config.ts` `define`) o constante importada del paquete.
2. Utilizar `__APP_VERSION__` como valor canónico o fallback directo cuando `updateAvailable?.currentVersion` no esté definido:
   `const displayVersion = updateAvailable?.currentVersion || APP_VERSION;`
3. Garantizar que tanto en Modo Local como en Modo Sandbox (Vercel) el pie del modal renderice siempre `gripm vX.Y.Z` de forma consistente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Proveer una constante de versión estática (`APP_VERSION` o `__APP_VERSION__`) disponible en el bundle frontend
- [ ] #2 Renderizar la versión en el pie de `KeyboardShortcutsModal.tsx` tanto con daemon local como en Modo Sandbox
- [ ] #3 Validar en entorno sandbox que el texto muestre `gripm v<version>` y no solo `gripm`
- [ ] #4 Verificar tipado estricto (`npx tsc --noEmit`) y suite de pruebas en verde
<!-- AC:END -->
