---
id: DEV-174
title: "Matriz de CI: Múltiples Sistemas Operativos y la Versión Mínima de Node Declarada"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 10:00'
labels:
  - "ci"
  - "portability"
  - "testing"
  - "post-launch"
dependencies: []
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI corre en un solo sistema operativo y contra una versión de Node flotante que no es la mínima declarada como soportada.

### Evidencia (verificada sobre `6a50230`)

```yaml
# .github/workflows/ci.yml
runs-on: ubuntu-latest          # un solo SO
node-version: '22.x'            # flotante: "la última 22.x"
```

Frente a lo declarado por el propio proyecto:

```
.nvmrc                → 22.6.0
package.json engines  → node >=22.6.0
```

### Dos consecuencias concretas

**1. La versión mínima soportada nunca se testea.** CI corre `22.x`, que es la última 22.x disponible, no `22.6.0`. Una regresión que rompa en la mínima — por ejemplo, usando una API o sintaxis disponible recién en una 22.x posterior — pasaría la suite en verde mientras el producto declara soportar algo que no funciona.

**2. Solo se verifica un SO, y ya hay un bug que lo demuestra.** El bug de bind de red registrado en DEV-169 (el servidor escuchaba solo en IPv6, por lo que `127.0.0.1` daba connection refused) fue encontrado probando manualmente en macOS. Windows y Linux nunca fueron ejercitados en CI. En un lanzamiento público, los issues de otros sistemas operativos son la primera fuente de reportes.

### Objetivo

Que CI verifique lo que el proyecto dice soportar, y que la matriz sirva de detector temprano de problemas de portabilidad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `.github/workflows/ci.yml` declara `strategy.matrix.os` con `ubuntu-latest`, `macos-latest` y `windows-latest`
- [x] #2 `.github/workflows/ci.yml` declara `strategy.matrix.node-version` que **incluye explícitamente `22.6.0`**, el valor de `.nvmrc` y el mínimo de `engines.node`
- [x] #3 Los pasos sensibles a plataforma están resueltos de forma agnóstica (`prepare` en `package.json` migrado a `node scripts/prepare-hooks.js` sin redirección shell POSIX `/dev/null`)
- [x] #4 La matriz declara `strategy.fail-fast: false` para que un runner fallido no cancele los demás jobs
- [x] #5 `timeout-minutes` se ajusta a 15 minutos para acomodar la ejecución paralela
- [x] #6 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Declarar `strategy.fail-fast: false` para que un SO fallido no cancele los demás y el reporte muestre el panorama completo.
2. Añadir `os: [ubuntu-latest, macos-latest, windows-latest]` y `node-version: ['22.6.0', '22.x']`.
3. Revisar los pasos que asumen POSIX: `lsof -nP -iTCP:$PORT -sTCP:LISTEN` es el candidato principal, ya que `AGENTS.md` §6.9 lo documenta como verificador de puerto.
4. Convertir esos pasos en cross-platform o condicionarlos por `if: runner.os != 'Windows'`.
5. Verificar el tiempo total de la matriz y ajustar `timeout-minutes`.
6. Registrar en `AGENTS.md` §6 que la verificación de puerto en Windows usa otro mecanismo.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué `fail-fast: false`

Con `fail-fast: true` (el default) un SO que falla cancela el resto y el developer solo ve un error. Con `false` ve la matriz completa, que es justamente la información que se busca al agregar una matriz.

### El AC #3 es donde está el trabajo real

Agregar Windows a la matriz sin auditar los pasos de shell va a producir un workflow rojo. `lsof` no existe en Windows con la misma semántica. La matriz es el disparador; el trabajo es hacer los pasos portables.

### Beneficio secundario

Una matriz de SO convierte en automáticos los bugs de portabilidad que hoy solo se encuentran si alguien prueba en ese SO. Es la forma barata de evitar el reporte de issue número uno de un lanzamiento público.
<!-- SECTION:NOTES:END -->