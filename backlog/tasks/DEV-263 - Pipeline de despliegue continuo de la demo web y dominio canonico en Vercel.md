---
id: DEV-263
title: "Pipeline de despliegue continuo de la demo web y dominio canónico en Vercel"
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
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La demo web está publicada y verificada, pero el despliegue **depende de que alguien se
acuerde de correrlo**. Hoy el repo de GitHub no está conectado a Vercel: el build en
producción salió de un `vercel deploy` manual, y nada avisa cuando `main` avanza.

Eso tiene dos consecuencias concretas:

1. **La URL puede quedar sirviendo un build viejo sin que nadie lo note.** Hoy
   `https://gripm.vercel.app` quedó como *deployment alias* y no como dominio del
   proyecto. Un `vercel deploy --prod` nuevo mueve producción y la URL puede seguir
   apuntando al deployment anterior: una demo congelada que se ve normal.
2. **Cada cambio en `main` exige una acción manual** para verse reflejado, y esa acción
   no está en ningún checklist ni en ningún ítem.

## Qué resuelve

### 1. Conectar el repo y obtener auto-deploy

Importar el repositorio en Vercel con `main` como rama de producción. Cada push a `main`
despliega solo, y el dominio deja de depender de un aliasmanual.

### 2. Declarar el dominio como dominio del proyecto

Agregar `gripm.vercel.app` en **Settings → Domains** para que Vercel lo rastree como
dominio del proyecto y no como alias de un deployment puntual. Es la diferencia entre
"la URL sigue funcionando después del próximo deploy" y "hay que acordarse".

### 3. Pinear la versión de Node

Vercel quedó en **`24.x`**, pero `.nvmrc` dice `22.6.0` y `engines` pide `>=22.6.0`. El
build pasó igual, pero **el entorno de producción no es el que validó `npm run
test:linux`**, que corrió la suite completa en `node:22.6.0-bookworm`. Es exactamente el
drift que después cuesta explicar: "en local y en CI pasa, en producción no".

Pinear el proyecto a 22.6.0 hace que los tres entornos coincidan.

### 4. Credenciales para pruebas end-to-end

Con protección de deployment activa, una prueba automatizada contra la URL recibe un
401/403. El bypass de automatización es un secreto del proyecto que hay que provisionar
para que una e2e pueda correr contra la URL real en vez de contra un servidor local.

> [!NOTE]
> **Hoy la demo es pública sin autenticación** y eso es intencional. La protección por
> Vercel Authentication sigue activa a nivel de proyecto y lo que se exempted es el
> dominio. Si en el futuro se decide proteger el sitio, el paso 4 deja de ser opcional.

## Fuera de alcance

La decisión de una **landing pública** en `/` con la sandbox en `/demo`. Se evaluó y se
descartó por ahora: la sandbox se explica a sí misma con un banner, y mantener una
segunda superficie tiene costo. Si algún día se revisa, es un ítem aparte.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El repositorio de GitHub está conectado a Vercel con `main` como rama de producción
- [ ] #2 Un push a `main` produce un deployment sin intervención manual, y eso queda documentado en `CONTRIBUTING.md`
- [ ] #3 `gripm.vercel.app` figura como **dominio del proyecto** y no como alias de un deployment
- [ ] #4 La versión de Node del proyecto queda fijada en `22.6.0`, coincidiendo con `.nvmrc` y con el runtime que valida `npm run test:linux`
- [ ] #5 Verificado que un deployment nuevo desde `main` deja `gripm.vercel.app` sirviendo el build nuevo, no el anterior
- [ ] #6 El bypass de automatización para pruebas está provisionado como secreto, si se decide correr e2e contra la URL desplegada
- [ ] #7 `npm run test:linux` en verde con el runtime pineado, y `npm test`, `npm run backlog:check` con código 0
- [ ] #8 Documentado qué hace falta para promover a producción en cada ambiente, y qué ocurre si falta algún paso
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** detectado al desplegar la demo de DEV-222. El `vercel deploy` manual fue
  deliberado (se pidió revisar antes de publicar), pero la ausencia de pipeline se
  convirtió en deuda en el momento en que la URL quedó sirviendo un build sin commit
  asociado.
- **Los pasos 1, 3 y 6 son acciones de cuenta, no de código**: se hacen en el panel de
  Vercel o en GitHub. El paso 4 sí es configuración del proyecto.
- **Node 24 no rompió nada observable**, pero la divergencia entre el runtime validado y
  el de producción es exactamente lo que este ítem elimina.
<!-- SECTION:NOTES:END -->