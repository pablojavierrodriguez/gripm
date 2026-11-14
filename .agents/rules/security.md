# Superficie de Seguridad y Mitigaciones (Gripm Board)

Este documento resume los guardarraíles y directivas de seguridad técnicas aplicables a **Gripm Board** (`@gripm/board`). Para la política completa de reporte de vulnerabilidades y modelo de amenazas, consultar [SECURITY.md](../../SECURITY.md).

---

## Directivas Técnicas (SEC-01 a SEC-10)

- **Daemon local sin autenticación HTTP (SEC-10):** gripm es una herramienta local monousuario. La API REST no incluye autenticación ni tokens. La frontera de aislamiento es el proceso del usuario.
- **Exposición en LAN con `--host 0.0.0.0` (SEC-06):** Iniciar el servidor en `0.0.0.0` permite el acceso a cualquier dispositivo en la misma red local. Usar exclusivamente en redes de confianza; nunca en redes públicas.
- **Contención en `/api/fs/browse` (SEC-07):** El explorador de carpetas valida contención estricta mediante `path.relative` y `realpathSync` contra raíces permitidas (`home`, `cwd`, proyectos registrados), evitando traversals.
- **Servidor MCP stdio y validación estricta (SEC-03, SEC-05):** `gripm-mcp` opera mediante `stdin`/`stdout`. Valida todos los parámetros de entrada (`limit`, `offset`, `taskId`, `toggleAcIndex`) y asegura contención estricta de rutas en `--repo`.
- **Ejecución segura en el Gatekeeper (SEC-01):** El Gatekeeper de certificación ejecuta `verifyCommand` **únicamente si fue provisto como argumento explícito** en la llamada MCP, con timeout estricto de 15 segundos. **Queda terminantemente prohibido leer o ejecutar comandos desde el frontmatter de los archivos `.md` en disco, y el servidor MCP nunca persiste scripts en el frontmatter.**
- **Cero fabricación de ACs (SEC-02):** `gripm_sync_backlog` opera con `autoFix: false` por defecto. Queda prohibido alterar checkboxes `- [ ]` a `- [x]` sin verificación real en tareas `done`.
- **Trazabilidad en bypass (SEC-09):** El uso de `force: true` para sortear el Gatekeeper emite una advertencia formal y persiste metadata de auditoría en la respuesta.
