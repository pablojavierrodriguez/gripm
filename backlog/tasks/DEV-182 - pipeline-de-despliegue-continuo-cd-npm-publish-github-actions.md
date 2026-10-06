---
id: DEV-182
title: "Pipeline de Despliegue Continuo (CD): Automatización de npm publish con GitHub Actions y Provenance"
status: review
created_date: '2026-10-05'
updated_date: '2026-10-06'
labels:
  - "ci-cd"
  - "devops"
  - "npm"
  - "automation"
dependencies:
  - DEV-174
  - DEV-181
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar e implementar el workflow automatizado de despliegue continuo (CD) para la publicación en el registro público de npm (`@gripm/board` y `@gripm/playbook`) ante la creación de releases o tags en GitHub, eliminando la necesidad de publicación manual desde terminales locales.

**Puntos clave identificados en auditoría (R19):**
1. **Disparador:** Ejecución automática en eventos `release: [published]` o push de tags `v*`.
2. **Seguridad y Provenance:** Publicación con flag `--provenance` mediante permisos OIDC (`id-token: write`, `contents: read`).
3. **Validación previa:** Ejecutar `prepublishOnly` verificando build y `publish:check` sin fugas antes de publicar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear workflow .github/workflows/publish.yml en gripm con trigger de release/tag
- [x] #2 Configurar permisos OIDC id-token: write y contents: read para soporte de npm provenance
- [x] #3 Documentar en docs o README el uso del secret NPM_TOKEN o Trusted Publishing
- [x] #5 Validar que un dry-run de empaquetado y build ejecute exitosamente en CI antes del publish
- [-] #4 Replicar el workflow automatizado en el repositorio de gripm-playbook
      → **Reasignado a upstream.** `@gripm/playbook` es un paquete distinto, con su
      propio registro y su propio ciclo de release. El plan de entrega lo mueve
      explícitamente fuera del alcance de este repo (`Fase 1: 100% @gripm/board`).
      Corresponde al repo `pablojavierrodriguez/gripm-playbook`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Diseñar el archivo `.github/workflows/publish.yml` configurando Node 22 y setup de registry npm.
2. Añadir paso de verificación de tests, build y surface check.
3. Añadir comando `npm publish --access public --provenance` condicionado al environment de release.
4. Documentar los pasos de aprovisionamiento del token en GitHub Secrets.

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Gates agregados por encima del mínimo del AC

El workflow no se limita a "publicar": cada paso existe para que un tag mal
cortado no llegue al registro público, que es irreversible.

- **Tag ↔ `package.json`.** El paso *Resolve the version to publish* falla si el
  tag no es exactamente `v` + la versión de `package.json`.
- **Annotated tag obligatorio.** Verificado con `git cat-file -t` (no con
  `grep '^$'` sobre el mensaje: sobre salida vacía `grep` no matchea, así que un
  tag lightweight habría pasado el filtro).
- **Idempotencia.** *Verify the tag is not already published* consulta
  `npm view` y corta si la versión ya existe, evitando un 403 confuso en el
  `npm publish`.
- **Changelog como contrato.** El workflow regenera `CHANGELOG.md` desde
  `backlog/releases.json` y falla si el diff no es limpio. El changelog no puede
  desviarse de las releases reales.
- **Dry-run obligatorio.** `npm run build` + `npm pack --dry-run` antes de
  publicar, con `publish:check` y `audit:ux` en la puerta.

### Verificación ejecutable

Los pasos del workflow se replicaron localmente contra el estado real del repo:

```bash
TAG=v$(node -p "require('./package.json').version")   # v1.0.2
[ "$TAG" = "v$(node -p "require('./package.json').version")" ] && echo OK
[ "$(git cat-file -t "$TAG")" = "tag" ] && echo "OK annotated"
npm run changelog && git diff --quiet -- CHANGELOG.md  # OK sin drift
npm run build && npm pack --dry-run                    # OK
```

> Los 3 tags del repo (`v1.0.0`, `v1.0.1`, `v1.0.2`) son annotated, así que el
> gate es compatible con el historial existente.

### Pendiente operativo (no bloquea el código)

El secret **`NPM_TOKEN`** (Automation token con scope de publicación sobre
`@gripm/board`) debe aprovisionarse en GitHub → Settings → Secrets and
variables → Actions. Está documentado en `CONTRIBUTING.md`, sección *Publicar un
release*. Hasta que exista, el job fallará en el último paso; es un acto de
configuración del repositorio, no de código.
<!-- SECTION:NOTES:END -->
<!-- SECTION:PLAN:END -->
