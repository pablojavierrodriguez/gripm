---
id: DEV-263
title: "Registro del pipeline de despliegue de la demo web: qué es manual y por qué"
status: draft
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
  - "ci-cd"
  - "vercel"
  - "deploy"
  - "infra"
dependencies:
  - DEV-222
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La demo web de DEV-222 está publicada en `https://gripm.vercel.app` y el despliegue es
**deliberadamente manual**: `npm run deploy:prod` desde una máquina con la sesión iniciada y parada en `main` (blindado por DEV-340).

> [!IMPORTANT]
> **El deploy manual es la decisión, no la deuda.** Se evaluó conectar el repositorio de
> GitHub a Vercel para obtener auto-deploy, y se descartó: en este proyecto los releases
> son decisiones deliberadas, y conectar el repo implica que cualquier push a `main` sale
> vivo sin revisión. Eso es **menos** control, no más.

Este ítem queda como **registro del estado real** del pipeline y de las dos acciones
menores que sí quedan abiertas. No es urgente.

## Estado verificado

| Aspecto | Estado |
| :--- | :--- |
| Método de despliegue | Manual, `npm run deploy:prod` desde `main` (DEV-340) |
| `gripm.vercel.app` | **Es la URL de producción del proyecto.** El segundo deploy la devolvió como `productionUrl` de sí mismo, así que los deploys siguientes la sirven |
| Build en Vercel | `npm run build` sobre Node `24.x`, salida `dist/` |
| `.vercelignore` | Presente; protege el backlog y el `.env.local` con el OIDC token |
| Redeploy tras cambio en `main` | Manual, a criterio de quien haga el cambio |

## Lo que realmente queda abierto

### 1. Divergencia de Node entre el CI y la producción

Este es el hallazgo real, y es el **inverso** del que se suponía al redactar este ítem:

```
local:        v24.21.0
Vercel:       24.x          ← coincide con local
CI (ci.yml):  22.6.0 y 22.x (matriz)
publish.yml:  22.6.0
test:linux:   node:22.6.0-bookworm
.nvmrc:       22.6.0
```

**El desalineado es el CI, no Vercel.** Local y producción corren 24; el CI valida en 22.6.

El impacto es acotado: Vercel solo ejecuta `npm run build` (`tsc`, `vite build`, `esbuild`)
y después sirve archivos estáticos. No corre la suite ni el daemon, así que la versión de
Node no cambia el bundle, y el build ya pasó limpio en 24.x.

**El riesgo real es el inverso:** el CI valida en 22.6 algo que local y producción corren en
24. Si alguna vez eso diverge, el síntoma va a ser "en local y en producción funciona, en CI
no", que es más difícil de leer que el inverso.

> [!NOTE]
> Corregir esto **no es parte de este ítem**: es un tema de requisitos de entorno que
> pertenece a **DEV-141**. Acá queda registrado porque se descubrió acá.

### 2. Credenciales para pruebas end-to-end

Con protección de deployment activa a nivel de proyecto, una prueba automatizada contra la
URL recibe un 401/403. Hoy la demo es pública porque su dominio está exento
(`ssoProtection.deploymentType: all_except_custom_domains`), y eso es intencional.

Si alguna vez se corre una e2e contra la URL desplegada, hace falta provisionar el bypass
de automatización como secreto del proyecto.

## Fuera de alcance

- **Auto-deploy.** Descartado por decisión, no por dificultad. Ver la nota importante arriba.
- **Landing pública** en `/` con la sandbox en `/demo`. Se evaluó y se descartó: la sandbox
  se explica a sí misma con un banner, y mantener una segunda superficie tiene costo.
- **Alinear la versión de Node.** Pertenece a DEV-141.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Documentado en `CONTRIBUTING.md` que el despliegue de la demo es manual, con el comando exacto y la precondition de tener sesión iniciada en Vercel
- [ ] #2 Documentado en `CONTRIBUTING.md` que un cambio en `main` **no** llega a la demo por sí solo, y quién decide cuándo redesplegar
- [ ] #3 Registrado que `gripm.vercel.app` es la URL de producción del proyecto, no un alias, con la evidencia del `productionUrl` devuelto por el deploy
- [ ] #4 La divergencia de Node entre CI y producción está registrada como ítem propio en DEV-141, o resuelta ahí
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** detectado al desplegar la demo de DEV-222.
- **Corrección de alcance (2026-10-14).** La primera versión de este ítem pedía conectar el
  repositorio para obtener auto-deploy y pinear Node en Vercel. Ambas recomendaciones
  eran **incorrectas**:
  - el auto-deploy no es necesario, y en un proyecto con releases deliberados resta control
  - Vercel ya coincidía con el Node local; el desalineado es el CI, y la corrección apunta
    al otro lado

  Se reescribió el ítem con el estado verificado en lugar de con acciones que no
  corresponden. Los AC #1, #3, #4 y #5 de la versión anterior describían un riesgo que ya
  no existe: el concern del alias quedó resuelto por el propio deploy.
- **La `priority` bajó de `medium` a `low`** por lo mismo: lo que queda es documentación y
  una derivación a DEV-141.
<!-- SECTION:NOTES:END -->