---
id: DEV-161
title: "Corte Limpio de Identidad: Eliminar Alias de Marca Previos al Rebranding (gripm)"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 17:23'
labels:
  - "branding"
  - "packaging"
  - "breaking-change"
  - "open-source-launch"
  - "technical-debt"
dependencies:
  - "DEV-144"
  - "DEV-149"
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminar la superficie de compatibilidad hacia atrás de los nombres previos al rebranding (`devboard`, `dev-board`), **conservando la compatibilidad de lectura** de datos legacy.

### Contexto: por qué ahora

El rebranding de DevBoard a gripm construyó alias retrocompatibles bajo el supuesto de que existirían usuarios heredados que migrar. Ese supuesto **no se sostiene para el lanzamiento público**: el repositorio público es un proyecto nuevo, sin usuarios externos, y el único conjunto de consumidores real son los proyectos del propio autor.

Un alias público no es código descartable: es un **contrato que ya no puede quitarse** sin romper a alguien, y que obliga a documentarlo en cada README, CONTRIBUTING, issue y respuesta de soporte. Mantenerlo sin usuarios que migren es deuda pura.

Este es el mismo análisis que ya quedó registrado en `BACKLOG.md:3117` al decidir la bifurcación de repositorio, y que nunca se ejecutó sobre el código.

### Qué se elimina (identidad instalada — lo que el usuario ve y escribe)

1. **Entradas `bin` redundantes en `package.json`.** Hoy hay seis: `gripm`, `gripm-mcp`, `devboard`, `devboard-mcp`, `dev-board`, `dev-board-mcp`. Solo deben sobrevivir las dos canónicas.
2. **Alias de herramientas MCP.** `scripts/mcp-server.ts:442` normaliza `devboard_*` → `gripm_*` en la entrada. Eliminar esa línea.
3. **Skill duplicado `.agents/skills/devboard/`.** `--init` instala hoy dos directorios de skills: el canónico `gripm/` y un alias `devboard/`. Es el **único punto donde la marca vieja se propaga activamente** al repositorio del consumidor.
4. **Shims de binarios `bin/devboard.js` y `bin/devboard-mcp.js`**, y su generación en `scripts/build-binaries.js`.
5. **Fallbacks `devboard 2>/dev/null ||` en los scripts scaffoldeados** por `scripts/initScaffold.js`.
6. **Menciones del nombre anterior en documentación** (README, README.es, CONTRIBUTING, AGENTS, docs, templates de skills), reemplazadas por el nombre canónico o por formulación neutra.

### Qué se conserva (compatibilidad de lectura — invisible y protectora)

**No tocar** las lecturas de rutas legacy. Son costo cero (el nombre no se muestra al usuario) y valor real: Protegen los proyectos locales del autor que aún tengan datos en directorios anteriores.

- `vite.config.ts`: resolución de `.devboard/config.json` y `.devboard/backlog.json` (líneas ~140, ~220, ~231, ~255, ~1113, ~1892).
- Migración automática `.devboard/config.json` → `.gripm/config.json` en `vite.config.ts`.
- Detección de `.devboard/` como repo con backlog al inicializar.

> [!NOTE]
> La distinción es: **eliminamos la marca vieja como identidad pública y la conservamos como formato de lectura.** Quien tenga datos legacy los conserva; quien instale el producto solo conoce `gripm`.

### Caso particular: el alias MCP

Merece justificación propia porque es el más costoso y el menos útil.

- **No se anuncia.** `tools/list` expone únicamente las 12 herramientas `gripm_*`. Ningún agente puede descubrir que el alias existe.
- **Pero sí funciona.** `scripts/verify-mcp-binary.js` lo valida explícitamente (`✅ [6/6] Alias retrocompatible devboard_get_stats OK`).

Es decir: código que se mantiene y tests que lo cubren, a cambio de **cero beneficio descubrible**. Y si se anunciara, el costo sería peor: el catálogo pasaría de **12 a 24 herramientas**, duplicando el contexto de schemas que cada agente LLM carga en cada sesión — exactamente lo contrario del objetivo de eficiencia con agentes que declara el producto.

### Impacto esperado

- Bundle de binarios distribuido: se eliminan dos shims redundantes.
- Superficie pública de nombres: de 6 bins a 2.
- `.agents/skills/` instalado por `--init`: de 2 directorios a 1.
- Sin impacto funcional: no hay usuarios externos que migren.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `node -e "console.log(Object.keys(require('./package.json').bin).join(' '))"` devuelve exactamente `gripm gripm-mcp` (verificación: el comando debe imprimir solo esos dos, sin `devboard`, `devboard-mcp`, `dev-board` ni `dev-board-mcp`)
- [x] #2 `ls bin/` NO lista `devboard.js` ni `devboard-mcp.js`, y `scripts/build-binaries.js` ya no los genera
- [x] #3 `grep -n "replace(/^devboard_" scripts/mcp-server.ts` no devuelve ninguna coincidencia (el alias de normalización fue eliminado)
- [x] #4 `grep -c "name: 'devboard_" scripts/mcp-server.ts` devuelve `0`, y `grep -c "name: 'gripm_" scripts/mcp-server.ts` devuelve `12` (el catálogo canónico queda intacto)
- [x] #5 `scripts/verify-mcp-binary.js` actualizado para dejar de validar el alias `devboard_*` y sigue validando en verde las 12 herramientas `gripm_*`
- [x] #6 `scripts/initScaffold.js` instala **solo** `.agents/skills/gripm/` en el repositorio destino; el directorio `.agents/skills/devboard/` del paquete fue eliminado y su lectura como fallback removida del código
- [x] #7 `grep -rn "devboard 2>/dev/null" scripts/initScaffold.js` devuelve `0` (sin fallbacks de nombre antiguo en los scripts scaffoldeados)
- [x] #8 Las rutas legacy de **lectura** siguen intactas: `grep -c "\.devboard" vite.config.ts` devuelve un valor `>= 6` (verificación negativa explícita: NO se deben borrar las resoluciones de `.devboard/config.json` ni `.devboard/backlog.json`)
- [x] #9 `npm run backlog:sync` tras la tarea y `npm run backlog:check` en verde
- [x] #10 `npx tsc --noEmit` con 0 errores
- [x] #11 `npm test` con exit 0 (suite completa de 9 scripts)
- [x] #12 `npm run publish:check` en verde
- [x] #13 `npm run build` sin errores y `node bin/gripm.js --help` ejecutable desde el tarball
- [x] #14 `grep -rniE "devboard|dev-board" README.md README.es.md CONTRIBUTING.md AGENTS.md docs/*.md .github/` devuelve únicamente coincidencias justificadas por la compatibilidad de lectura o por historia de releases, sin alias prescriptivos en la documentación de usuario
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. `package.json`: reducir el mapa `bin` a `{ "gripm": "./bin/gripm.js", "gripm-mcp": "./bin/gripm-mcp.js" }`.
2. `scripts/build-binaries.js`: eliminar la generación de los shims `devboard*`.
3. `bin/`: borrar `devboard.js` y `devboard-mcp.js` (dejar solo los dos canónicos).
4. `scripts/mcp-server.ts`: eliminar la línea de normalización `rawName.replace(/^devboard_/, 'gripm_')` y su comentario.
5. `scripts/verify-mcp-binary.js`: eliminar la aserción del alias retrocompatible, conservando la validación de las 12 herramientas canónicas.
6. `.agents/skills/devboard/`: eliminar el directorio; en `scripts/initScaffold.js` borrar la rama de lectura del skill legacy y el bloque que crea el alias `devboard/` en el repo destino, conservando la instalación canónica `gripm/`.
7. `scripts/initScaffold.js`: limpiar los fallbacks `devboard 2>/dev/null ||` de los scripts generados.
8. Documentación: sustituir referencias prescriptivas al nombre anterior por el canónico. Conservar menciones que describan la compatibilidad de lectura o la historia de releases.
9. **No tocar** las resoluciones de `.devboard/` en `vite.config.ts` (AC #8).
10. Regenerar `BACKLOG.md`, correr la pirámide completa y verificar cada AC con su comando.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué la pirámide de verificación no alcanza para este AC

Cada AC de esta tarea incluye su comando de verificación. Los AC #1 a #8 son literalmente `grep`/`node -e`/`ls` que deben devolver el valor indicado. Esto sigue el contrato establecido en `AGENTS.md` §4 (*Gate de Calidad Verificable*): un AC tildado debe estar respaldado por una aserción ejecutable, no por inspección.

El AC #8 es un **AC negativo explícito**: verifica que algo *no* se rompió. Es la forma de garantizar que la eliminación de identidad no arrastre por debajo la compatibilidad de lectura, que es justo el error que haría un recorte inconsulto de "todo lo que diga devboard".

### Orden de eliminación recomendado

Aplicar los cambios de forma que cada paso deje el producto funcional: primero los shims y el mapa `bin`, después el alias MCP, luego el scaffolding y las skills, y por último la documentación. Así, si un paso rompe algo, el corte queda aislado y diagnosticable.

### Punto de no retorno

Esta tarea es un **breaking change** del contrato público. Una vez publicada la v1.0.0 pública, cualquier alias que se elimine aquí no puede reintroducirse sin romper a alguien. Es exactamente por eso que la decisión debe tomarse **antes** de publicar y no después.
<!-- SECTION:NOTES:END -->
