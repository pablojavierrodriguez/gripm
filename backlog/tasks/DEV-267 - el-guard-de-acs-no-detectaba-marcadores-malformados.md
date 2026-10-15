---
id: DEV-267
title: 'El guard de ACs no detectaba marcadores malformados y daba verde sobre datos descartados'
status: done
type: bug
priority: high
sprint: ''
release: ''
assignee: ''
created_date: '2026-10-14'
updated_date: '2026-10-15'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

`scripts/verify-backlog-sync.js` parsea el bloque de Acceptance Criteria con
`/<!-\- AC:BEGIN ->([\s\S]*?)<!-\- AC:END ->/` y, si no matchea, hace **`continue`**: pasa a la
siguiente tarea sin verificar nada y sin decir nada.

La consecuencia es que **un marcador malformado era indistinguible de una tarea sin ACs**. Un
archivo que abre `<!-\- AC:BEGIN ->` y no lo cierra:

- se saltaba **todas** las invariantes de ACs (conteo, ids, checks cruzados contra el código),
- sus ACs **no llegaban a `BACKLOG.md`**,
- y `npm run backlog:check` informaba **`✅ Backlog 100% sincronizado y coherente con el
  código`**.

**Verde sobre datos que nunca leyó.** Siete archivos estaban en ese estado, arrastrando el
defecto desde v1.3.0: todos cerraban su bloque de ACs con `<!-\- SECTION:DESCRIPTION:END ->`
—un marcador duplicado del que ya usan correctamente más arriba— en vez del de cierre de ACs.
Dos de los siete son de la sesión del 2026-10-14 (DEV-258 y DEV-259, ambos en `ready`).

Esto es peor que un falso positivo: un falso positivo detiene el flujo con un diagnóstico
equivocido. Esto **dejaba pasar** el flujo con un diagnóstico correcto sobre un conjunto de
datos incompleto.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `verify-backlog-sync.js` trata un `AC:BEGIN` sin `AC:END` como **error**, no como ausencia de ACs: mensaje explícito que nombre el archivo, `errorsFound++` y exit 1
- [x] #2 Los siete archivos malformados (DEV-253 a DEV-259) quedan reparados con el marcador correcto
- [x] #3 Los ACs de DEV-253 a DEV-259 aparecen en `BACKLOG.md`, verificado por grep sobre el consolidado
- [x] #4 El guard **demuestra** que dispara: roto un marcador a propósito, `verify-backlog-sync.js` devuelve exit 1 con el mensaje; restaurado, vuelve a 0
- [x] #5 `npm run backlog:sync`, `npm run backlog:check` y `npm test` en verde tras la reparación
- [x] #6 `npx tsc --noEmit` y `node scripts/verify-changes.js --all` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **El defecto era del guard, no de los archivos.** Reparar los siete `.md` sin tocar el
  `continue` deja la clase viva: el próximo archivo malformado vuelve a desaparecer en
  silencio. Por eso el AC #1 va primero.
- **Verificación del AC #4, ejecutada:** se cambió el marcador de cierre de ACs por el de
  cierre de descripción en DEV-259 a propósito y se corrió el guard:
  `⚠️ [Marcador AC Malformado] DEV-259 - alinear-config-oss-canonica-del-repo.md` + exit 1.
  Restaurado el archivo, exit 0. El check no se da por bueno por lectura.
- **Lo que NO hace este ítem:** no valida que un archivo sin `AC:BEGIN` tenga ACs. Un archivo
  que nunca abrió el bloque sigue pasando por `continue` en la línea del frontmatter
  (`if (!fmMatch) continue`). Es el mismo patrón en un sitio distinto y queda abierto.
- **Corolario incómodo:** `Set-Content` de PowerShell 5.1 leyó los `.md` como latin1 y convirtió
  el `Í` de `Ítem` (UTF-8 `C3 8D`) en `Ã` + control `U+008D`. `verify-changes.js` lo cazó en
  DEV-222; **DEV-261 quedó con doble codificación (`cosmÃ©tico`) y verify-changes NO lo
  detecta**, porque mojibake es UTF-8 válido. Ambos archivos se restauraron desde `git` y se
  reeditaron con la herramienta de edición, que respeta el encoding.
- **Deuda real que esto destapa:** un UTF-8 válido con texto equivocado es indistinguible de
  texto correcto para cualquier chequeo de bytes. Vale un ítem aparte que busque el patrón
  `Ã`/`Â`/`â€` en el árbol, no solo caracteres de control.
<!-- SECTION:NOTES:END -->
