## 📌 Descripción

Breve resumen de los cambios introducidos, motivación y contexto técnico.

## 🎯 Tarea del Backlog Asociada

- **ID de Tarea**: [DEV-XXX](backlog/tasks/) <!-- Obligatorio según AGENTS.md y CONTRIBUTING.md -->
- **Tipo de Cambio**:
  - [ ] 🐛 Corrección de bug (`bug`)
  - [ ] ✨ Nueva funcionalidad (`feature`)
  - [ ] 🎨 Mejora visual o de UX (`ux`)
  - [ ] 🧹 Refactor / Deuda técnica (`tech_debt` / `chore`)
  - [ ] 📚 Documentación (`docs`)

## 🧪 Pirámide de Verificación Obligatoria

Por favor, confirma que ejecutaste y aprobaste localmente todos los pasos antes de enviar:

- [ ] `npx tsc --noEmit` — 0 errores de tipado TypeScript
- [ ] `npm test` — Suite de parser e integración pasando al 100%
- [ ] `npm run backlog:check` — Coherencia de backlog y criterios de aceptación
- [ ] `npm run audit:ux` — Cero regresiones de diseño, touch targets o scrollbar jank
- [ ] `npm run build` — Build de Vite y binarios standalone exitosos

## 📸 Capturas de Pantalla (si aplica)

Si los cambios afectan la interfaz de usuario, adjunta una captura comparativa (Dark / Light Mode).
