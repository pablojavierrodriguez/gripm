---
id: DEV-254
title: "Modal de consulta y ayuda de atajos de teclado (Cheat Sheet y disparador ?)"
status: ready
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ux"
  - "accessibility"
  - "shortcuts"
  - "ui"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación del diálogo modal accesible de ayuda y consulta de atajos de teclado (Cheat Sheet):
1. Componente `KeyboardShortcutsModal` con categorías claras (Navegación, Tareas y Acciones, Búsqueda y Modales), badges de teclas estéticos (`<kbd>`) y soporte bilingüe (español e inglés).
2. Apertura universal con la tecla `?` (o `Shift + /`) cuando el usuario no se encuentra escribiendo dentro de inputs, textareas o elementos editables.
3. Botón de acceso directo en el `Header` (versión escritorio junto a los controles de tema/idioma y en el cajón de menú móvil) con ícono de teclado y etiquetas accesibles.
4. Integración estricta con el primitivo accesible `Modal` (`createPortal`, `role="dialog"`, `aria-modal`) y `useFocusTrap` para retorno de foco y cierre con `Esc`.
5. Inclusión en la suite de verificación de trampa de foco (`scripts/verify-focus-trap.js`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Componente KeyboardShortcutsModal implementado con primitivo Modal y useFocusTrap, estructurado en categorías (Navegación, Tareas y Acciones, Búsqueda y Modales) con badges kbd
- [x] #2 Presionar la tecla ? (Shift + /) fuera de campos de texto abre el modal de atajos de teclado
- [x] #3 Botón accesible con ícono de teclado en Header (escritorio y menú móvil) permite abrir el modal con un clic
- [x] #4 Soporte completo de traducción en es.json y en.json para todos los textos del modal y botones
- [x] #5 Integrado en scripts/verify-focus-trap.js y pirámide de verificación en verde (tsc, audit:ux, npm test)
<!-- SECTION:DESCRIPTION:END -->
