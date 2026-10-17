---
id: DEV-316
title: "Erradicacion de remanentes anti-em-dash en generadores automaticos y documentacion de arquitectura"
status: draft
priority: low
type: debt
owner: Antigravity
estimate: 1d
sprint: ""
release: ""
created: 2026-10-17
updated: 2026-10-17
---

# DEV-316 - Erradicacion de remanentes anti-em-dash en generadores automaticos y documentacion de arquitectura

## Descripcion

A pesar de que la regla canónica Anti-Em-Dash (Anti-IA) prohíbe el uso de guiones largos (em-dash y en-dash) en interfaces, títulos, releases y documentación, persisten remanentes aislados en el código y la documentación histórica del repositorio:
- Generadores automáticos o plantillas en el backend (e.g. `saveTask` o `syncBacklog` al dar formato al encabezado del archivo Markdown con ` - `).
- Archivos de Architecture Decision Records en `docs/adr/` donde algunos títulos o encabezados conservan guiones largos o medianos.
- Reglas de validación en `scripts/verify-changes.js` o hooks para que auditen de forma activa e impidan la introducción de caracteres em-dash (U+2014) y en-dash (U+2013) en cualquier archivo `.md`, `.json`, `.ts` o `.tsx`.

Esta tarea erradica todos los caracteres em-dash / en-dash restantes en el repositorio y fortalece el script de verificación `scripts/verify-changes.js` para que detecte y rechace mecánicamente la presencia de dichos caracteres en commits futuros.

## Criterios de Aceptacion

<!-- AC:BEGIN -->
- [ ] Escanear el repositorio en busca de caracteres em-dash y en-dash en código, plantillas y documentación Markdown.
- [ ] Reemplazar todos los hallazgos por el guión estándar ` - ` con espacios o el guión simple `-`.
- [ ] Incorporar una verificación mecánica en `scripts/verify-changes.js` que falle si algún archivo stageado contiene em-dash o en-dash.
- [ ] Verificar que `npm run backlog:sync` y los generadores de releases y tareas no generen guiones largos bajo ninguna circunstancia.
- [ ] La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `node scripts/verify-changes.js --all`) pasa con 0 errores.
<!-- AC:END -->

## Notas Tecnicas

- Aplicar la regla con exactitud quirúrgica asegurando que ningún texto de UI ni documentación técnica degrade su formato.
- Cero uso de em-dash o en-dash, respetando la regla canónica de guión simple ` - `.
