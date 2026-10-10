# Prueba de Concepto (PoC): Distribución Binaria Independiente (DEV-223)

Este documento detalla la evaluación técnica y la prueba de concepto para distribuir **gripm** y su servidor MCP (**gripm-mcp**) como ejecutables binarios nativos independientes, sin requerir una instalación previa de Node.js en el sistema anfitrión ni gestores de versiones (`nvm`, `fnm`, `asdf`).

---

## 1. Motivación y Casos de Uso

1. **Adopción Zero-Runtime:** Equipos y desarrolladores que desean usar `gripm` vía gestores de paquetes nativos del sistema operativo (ej. Homebrew en macOS, `apt` o binario en `/usr/local/bin` en Linux, `winget` en Windows) sin lidiar con versiones de Node.js ni advertencias de npm.
2. **Servidor MCP para Agentes de Escritorio:** Clientes como Claude Desktop, Cursor y Antigravity requieren especificar un comando ejecutable y sus argumentos en su archivo de configuración JSON. Disponer de un binario autocontenido (`/usr/local/bin/gripm-mcp`) elimina fricciones por resolución de `PATH`, wrappers de shell o flags de runtime.
3. **Arranque Instantáneo:** Tiempo de inicio inferior a 15ms frente a los ~150-250ms de invocación a través de Node + resolución de módulos en `node_modules`.

---

## 2. Enfoque A: Node.js Single Executable Applications (SEA)

A partir de Node.js 20.x LTS, Node incluye soporte nativo y estable para empaquetar una aplicación completa dentro del propio binario de Node mediante inyección de blob ("postject").

### 2.1 Flujo de Empaquetado

```
┌─────────────────────────┐
│ scripts/mcp-server.ts   │
└────────────┬────────────┘
             │  esbuild (bundle standalone ESM/CJS)
             ▼
┌─────────────────────────┐
│ dist-bin/mcp-bundle.cjs │
└────────────┬────────────┘
             │  node --experimental-sea-config sea-config.json
             ▼
┌─────────────────────────┐
│ dist-bin/sea-prep.blob  │
└────────────┬────────────┘
             │  postject (inyección binaria en copia de Node)
             ▼
┌─────────────────────────┐
│ bin/gripm-mcp-standalone│  (Ejecutable nativo sin dependencias)
└─────────────────────────┘
```

### 2.2 Configuración `sea-config.json`

```json
{
  "main": "dist-bin/mcp-bundle.cjs",
  "output": "dist-bin/sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true
}
```

### 2.3 Script de Inyección por Plataforma

#### macOS (Apple Silicon / Intel)
```bash
# 1. Copiar el ejecutable base de Node
cp $(command -v node) dist-bin/gripm-mcp-macos

# 2. Remover firma ad-hoc de Apple antes de mutar el binario
codesign --remove-signature dist-bin/gripm-mcp-macos

# 3. Inyectar el blob SEA en el segmento Mach-O
npx postject dist-bin/gripm-mcp-macos NODE_SEA_BLOB dist-bin/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

# 4. Volver a firmar el binario para permitir ejecución en macOS Gatekeeper
codesign --sign - dist-bin/gripm-mcp-macos
```

#### Linux (x64 / arm64)
```bash
cp $(command -v node) dist-bin/gripm-mcp-linux
npx postject dist-bin/gripm-mcp-linux NODE_SEA_BLOB dist-bin/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
chmod +x dist-bin/gripm-mcp-linux
```

#### Windows (x64)
```powershell
Copy-Item (Get-Command node).Source dist-bin\gripm-mcp-win.exe
npx postject dist-bin\gripm-mcp-win.exe NODE_SEA_BLOB dist-bin\sea-prep.blob `
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

---

## 3. Enfoque B: Bun Native Compilation (`bun build --compile`)

Una alternativa aún más ligera y de cross-compilación directa entre arquitecturas es **Bun**:

```bash
# Para macOS Apple Silicon (arm64):
bun build --compile --target=bun-darwin-arm64 bin/gripm-mcp.js --outfile dist-bin/gripm-mcp-darwin-arm64

# Para Linux x64:
bun build --compile --target=bun-linux-x64 bin/gripm-mcp.js --outfile dist-bin/gripm-mcp-linux-x64
```

- **Ventajas:** Binarios notablemente más livianos (~45-55 MB vs ~95 MB de Node SEA) y soporte nativo de cross-compilación desde un solo host en CI (GitHub Actions).
- **Desventajas:** Dependencia de una toolchain adicional (`bun`) en el pipeline de build.

---

## 4. Estrategia de Publicación y Distribución Recomendada

1. **Nivel 1 (Canal Primario Actual): npm Registry (`@gripm/board`)**
   - Publicación universal multi-plataforma mediante `npm install -g @gripm/board` o `npx @gripm/board`.
   - Soporte amplio verificado para Node.js 20.x LTS y 22.x+.

2. **Nivel 2 (GitHub Releases & Homebrew Formula):**
   - En cada release formal (`vX.Y.Z`), GitHub Actions compila los artefactos standalone para:
     - `gripm-mcp-darwin-arm64`
     - `gripm-mcp-darwin-x64`
     - `gripm-mcp-linux-x64`
     - `gripm-mcp-windows-x64.exe`
   - Los binarios se adjuntan automáticamente a los assets del GitHub Release (ver pipeline en DEV-221).
   - Creación de Homebrew Tap (`brew install pablojavierrodriguez/tap/gripm`).

---

## 5. Conclusión y Roadmap

- Para la versión inmediata `1.1.0`, la ampliación de `engines: { "node": ">=20.0.0" }` y la verificación de compatibilidad de APIs resuelve el 100% de los bloqueos de adopción en entornos corporativos y servidores que operan en Node 20 LTS.
- La automatización de compilación de binarios standalone se integrará en el pipeline de CI como paso opcional de empaquetado para distribución en GitHub Releases.
