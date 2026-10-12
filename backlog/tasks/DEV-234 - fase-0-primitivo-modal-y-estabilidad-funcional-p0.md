---
id: DEV-234
title: "Fase 0: Primitivo Modal accesible y Estabilidad Funcional P0"
status: done
created_date: '2026-10-10'
updated_date: '2026-10-10'
labels:
  - "audit"
  - "modal"
  - "a11y"
  - "bugfix"
  - "p0"
dependencies:
  - "DEV-233"
priority: high
type: bugfix
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación de la Fase 0 del plan de remediación de la auditoría integral (DEV-233):
Resolución de defectos funcionales P0, crashes en tiempo de ejecución al abrir modales y consolidación del componente primitivo accesible `<Modal>`.

### Problemas abordados

1. **BUG-01 / ARCH-06:** En cinco modales (`ProjectModal`, `ImportWizardModal`, `SprintModal`, `FolderPickerModal`, `CompleteSprintModal`), `useFocusTrap` se invocaba después de `if (!isOpen) return null`. Al cambiar `isOpen` a `true`, React lanzaba *"Rendered more hooks than during the previous render"* crasheando la app. Además, el andamiaje de diálogo estaba duplicado a mano en 8 archivos sin un primitivo común y 10 de 13 overlays carecían de portal sobre `document.body` (BUG-16).
2. **BUG-03:** En `ConfirmModal.tsx`, un listener global de `window` a la tecla `Enter` ejecutaba el borrado incluso cuando el foco del usuario estaba posicionado sobre el botón "Cancelar". Además, `onConfirm()` carecía de `catch`, ocultando excepciones y cerrando el modal erróneamente en caso de fallo.
3. **BUG-15 / BUG-18 / BUG-19:** Notificaciones `Toast.tsx` invisibles para lectores de pantalla (sin `role="status"` ni `aria-live`), botones de solo icono sin `aria-label` descriptivo, y elementos `<label>` sin vinculación `htmlFor`/`id`.
4. **BUG-17:** Elementos fijos móviles (barra inferior, header, toasts) sin soporte de `env(safe-area-inset-*)`, provocando solapamiento en dispositivos con home bar o notch.
5. **GATE-09:** `scripts/verify-focus-trap.js` solo validaba el orden de hooks en `ItemModal`, dejando ciegos a los demás diálogos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Extraer primitivo `Modal.tsx` con soporte de portal en `document.body`, `role="dialog"`, `aria-modal="true"`, trampa de foco y backdrop click (ARCH-06, BUG-16)
- [x] #2 Corregir el orden de hooks en los modales (`ProjectModal`, `PlanGuardModal`, `ImportWizardModal`, `SprintModal`, `FolderPickerModal`, `CompleteSprintModal`), invocando `useFocusTrap` antes de cualquier early return condicional (BUG-01)
- [x] #3 Blindar `ConfirmModal.tsx` removiendo listener global de Enter ciego al foco y manejando rechazos de `onConfirm` con `try/catch` sin cerrar el modal en error (BUG-03)
- [x] #4 Incorporar accesibilidad en `Toast.tsx` (`role="status"`, `aria-live="polite"`, `aria-label` en botón de descarte) y nombres accesibles en botones icon-only (BUG-15, BUG-18)
- [x] #5 Asociar etiquetas `<label htmlFor>` con `<input id>` en `PlanGuardModal`, `ItemModal` y selectores (BUG-19)
- [x] #6 Aplicar variables de `env(safe-area)` en navegación inferior móvil, encabezado superior y toasts (`grep -c 'env(safe-area' src/` >= 3) (BUG-17)
- [x] #7 Actualizar `scripts/verify-focus-trap.js` para certificar mecánicamente que `hookIndex < closedGuardIndex` en todos los 8 diálogos de la aplicación (GATE-09)
- [x] #8 Pirámide de verificación pasa en verde: `npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build` y `npm run publish:check`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear el componente `src/components/ui/Modal.tsx` encapsulando portal, backdrop, animación, container `role="dialog"` y móvil handle.
2. Refactorizar los 8 modales para posicionar `useFocusTrap` al tope del componente (antes de cualquier early return) y montar el contenido dentro de un portal/Modal seguro.
3. Actualizar `ConfirmModal.tsx`: remover keydown de Enter global en window, usar form submit o eventos locales de botón, y agregar manejo de excepciones en `handleConfirm`.
4. Mejorar accesibilidad de `Toast.tsx`, `PlanGuardModal.tsx`, `SprintModal.tsx`, `ItemModal.tsx` y `FilterBar.tsx` (aria-label, role, labels/ids).
5. Ajustar safe-areas en `App.tsx`, `Header.tsx` y `Toast.tsx`.
6. Extender `scripts/verify-focus-trap.js` para verificar el orden de hooks en los 8 modales.
7. Ejecutar la Pirámide de Verificación completa y validar con el script de §3 de la auditoría.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Invariante: Preservar paridad visual, estilo Glassmorphism y animaciones fluidas en todos los modales.
- Invariante: No romper `OK-01` (cero `@ts-ignore`) ni `OK-04` (i18n).
<!-- SECTION:NOTES:END -->
