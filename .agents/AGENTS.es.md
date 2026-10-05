# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **{{projectName}}**. Al trabajar en este repositorio, tanto agentes de IA (Antigravity, Cursor, Claude Code) como desarrolladores humanos deben adherirse a las siguientes normas:

## 1. Dogfooding y Backlog Vivo
- **Toda modificación de código debe estar asociada a una tarea en `backlog/tasks/`**.
- Pasa la tarea a `doing` antes de comenzar a codificar.
- Tilda los criterios de aceptación (`- [x]`) en vivo a medida que se cumplan.
- **Límite Canónico del Desarrollo: Sólo hasta `ready`**. El agente NUNCA promueve una tarea a `done` durante el sprint. El estado `ready` (Ready for Release) es el estado terminal del desarrollo en el sprint.
- El estado `done` pertenece exclusivamente al Release formalmente liberado.
- Incluye el archivo `.md` de la tarea en el mismo commit que el código.

## 2. Servidor MCP de gripm
Usa las herramientas de gripm (`gripm-mcp`, `npm run mcp` o `devboard-mcp`):
- `gripm_list_tasks` / `devboard_list_tasks`: Lista y filtra tareas con mínimo consumo de tokens.
- `gripm_get_task` / `devboard_get_task`: Lee detalles y criterios de aceptación.
- `gripm_update_task` / `devboard_update_task`: Actualiza estado, plan y tilda criterios secuencialmente.
- `gripm_sync_backlog` / `devboard_sync_backlog`: Reconcilia tareas y regenera `BACKLOG.md` automáticamente.

## 3. Salvaguarda Pre-Commit y Soberanía del Desarrollador
- **Prohibido `git commit` por deducción**: El agente solo prepara los cambios en el árbol de trabajo y valida pruebas y tipado (`tsc`). Se ejecuta `git commit` **única y exclusivamente ante una orden textual y explícita del usuario**.
- **Cero Releases Falsos**: Pertenecer a un sprint no implica tener versión asignada. Los campos de release permanecen sin asignar hasta decisión expresa del usuario.
