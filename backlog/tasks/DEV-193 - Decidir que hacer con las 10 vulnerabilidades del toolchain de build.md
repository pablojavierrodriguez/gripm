---
id: DEV-193
title: "Decidir qué hacer con las 10 vulnerabilidades del toolchain de build"
status: draft
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "security"
  - "dependencies"
  - "decision"
dependencies:
  - DEV-113
  - DEV-121
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`npm audit` reporta 10 vulnerabilidades (3 moderadas, 7 altas) en el árbol de dependencias:

```
DIRECTO   high      tailwindcss
DIRECTO   high      vite
  transito high     braces
  transito high     chokidar
  transito high     fast-glob
  transito high     micromatch
  transito moderate esbuild
  transito moderate postcss-nested
  transito moderate postcss-selector-parser
  transito high     source-map-js
```

Ninguna es de React ni del runtime. Todas son del toolchain de build.

### Por qué un consumidor ve esto

Porque las dependencias de build están en `dependencies` y no en `devDependencies`. Eso fue una decisión deliberada: DEV-113 documenta que npm omite `devDependencies` al instalar de forma global, y los binarios publicados fallaban con `Cannot find package 'vite'`. DEV-121 lo revirtió.

La consecuencia es que quien instala `gripm` global recibe el toolchain de build completo aunque no lo use.

### Cuál es el riesgo real

Verificado: **`bin/gripm.js` y `bin/gripm-mcp.js` no importan ningún paquete externo**, solo built-ins de Node (`fs`, `path`, `url`, `child_process`). El código vulnerable se instala pero nunca se ejecuta en el camino de runtime de un consumidor.

- **Consumidor que usa `gripm`**: riesgo práctico nulo. Instala paquetes que no ejecuta.
- **Desarrollador del repo**: riesgo moderado. Son el dev server y su cadena. El más concreto es `source-map-js`, un DoS de event loop al parsear un source map malicioso, que exige abrir un source map de terceros.

### Por qué no es un fix automático

`npm audit fix` sin `--force` cambia 1 paquete. Las 10 restantes exigen `--force`, que quiere instalar `tailwindcss@4` y `vite@8`: dos majors, con cambios de configuración y de API.

Esta tarea es una **decisión con trade-off**, no un bug con parche.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Está decidido y documentado si se actualizan vite y tailwindcss a las majors, o se aceptan los avisos con el riesgo Justificado por escrito
- [ ] #2 Si se actualizan: la pirámide completa pasa en macOS y en Linux, incluido `npm run test:linux`
- [ ] #3 Si se actualizan: `npm run build` produce un `dist/` funcional y `npm run publish:check` sigue en verde
- [ ] #4 Si se actualizan: el bundle publicado se compara contra el actual y el crecimiento se justifica en el release notes
- [ ] #5 Si se aceptan los avisos: queda escrito por qué el riesgo no alcanza al runtime del consumidor, con la evidencia de que los binarios solo importan built-ins
- [ ] #6 El aviso no vuelve a sorprender en el `npm ci` de quien integra el repo: queda registrado en el README o en CONTRIBUTING qué esperar
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### El costo real de esta decisión es de mantenimiento, no de seguridad

Actualizar a `vite@8` y `tailwindcss@4` no es un bump: es migrar configuración de Tailwind y revisar el plugin de React. Es trabajo con riesgo de romper el build, a cambio de eliminar avisos que **no afectan a quien usa la herramienta**.

La decisión honesta puede ser no actualizar. Lo que no es honesto es dejar el `npm audit` en rojo sin explicar por qué se acepta.

### Por qué esto es visible ahora y no antes

Aparece al instalar el repo, no al usar `gripm`. Nadie lo ejecutó en el camino de consumo de la herramienta, que es el único que importa para el usuario final. Es el mismo patrón de siempre: **la señal llega por el canal que no estabas mirando.**

### Verificación mínima si se decide actualizar

El riesgo de un cambio de build toolchain es que el fallo no sea de sintaxis sino de salida. Por eso el AC #4 pide comparar el bundle antes y después, y el AC #2 corre la suite en las dos plataformas. Un `tsc` en verde no dice nada sobre si el CSS compiló bien.
<!-- SECTION:NOTES:END -->