---
id: DEV-319
title: "Rediseño y estandarización visual de interfaz CLI en sync-playbook"
status: done
created_date: '2026-10-17'
updated_date: '2026-10-17 17:20'
labels:
  - "cli"
  - "ux"
  - "dx"
  - "playbook"
dependencies: []
priority: medium
type: feature
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rediseñar la salida en terminal del sincronizador de Playbook (`scripts/sync-playbook.mjs`) adoptando la directiva de diseño de interfaz CLI establecida en DEV-252 (estándares clig.dev, Vite, Next.js):
1. Erradicar la caja rígida cerrada Unicode (`┌─┐`, `│`, `└─┘`) en el banner de arranque a favor de un formato abierto con sangría consistente y punteros sobrios (`➜`).
2. Eliminar la saturación de emojis decorativos ("emoji soup": `🛡️`, `➖`, `✨`, `🔄`, `🧩`, `🔏`, `📊`) sustituyéndolos por glifos mono-ancho (`•`, `▲`, `✔`, `✖`) con etiquetas de ancho fijo (`padEnd(10)`) que alinean los nombres de archivo exactamente en la misma columna.
3. Formatear el bloque de resumen (`Summary`) con jerarquía limpia sin emojis decorativos y sangría consistente.
4. Reemplazar guiones largos artificiales (em-dash) por el guión simple estándar con espacios (` - `) en cumplimiento de la Regla 25.
5. Preservar el soporte semántico de colores ANSI respetando entornos `NO_COLOR` y terminales no interactivas (no-TTY).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Erradicada la caja Unicode cerrada en printBanner a favor de un encabezado limpio y abierto con punteros ➜
- [x] #2 Reemplazada la sopa de emojis en las líneas de estado por glifos mono-ancho y etiquetas alineadas a 10 caracteres
- [x] #3 Bloque de resumen formateado limpiamente sin emoji de gráfico y con sangría consistente
- [x] #4 Erradicado el uso de guiones largos (em-dash) en notas de estado y descripciones
- [x] #5 Salida ANSI respeta NO_COLOR y TTY
- [x] #6 Sincronizados los cambios en gripm y gripm-playbook manteniendo la suite de pruebas y pirámide de verificación en verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Sigue la misma directiva y paleta semántica aplicada en `bin/gripm.js`, `scripts/initScaffold.js` y `scripts/uninstall.js` (DEV-252).
- Garantiza alineación visual exacta tanto en terminales Unix como en Windows Terminal y PowerShell.
- `listStacks` actualizado para admitir `sourceDir` en entornos locales u offline sin depender de la red externa.
- `bin/gripm.js` extendido con soporte para `--source` / `--from` en el subcomando `gripm playbook sync`.
<!-- SECTION:NOTES:END -->
