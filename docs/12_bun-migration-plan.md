# Bun Migration Plan

## Overview

This document outlines the migration strategy for replacing npm with bun as the primary package manager and runtime for the Natively project. Bun offers significant performance improvements for package management and script execution, making it an attractive alternative to npm/yarn.

## Current State Analysis

### Technology Stack

| Component | Current Technology | Notes |
|-----------|-------------------|-------|
| Package Manager | npm (v10+) | Using `pnpm-lock.yaml` and `package-lock.json` present |
| Runtime | Node.js v20+ | Bundled with Electron |
| Bundler | Vite 7.x | Multi-process Electron build |
| Build Tool | electron-builder | Cross-platform builds |
| Native Modules | better-sqlite3, keytar, sharp, native-module (Rust) | Requires special handling |

### Project Structure Relevant to Migration

```
natively-cluely-ai-assistant/
├── package.json              # Main dependencies and scripts
├── pnpm-lock.yaml           # Current lock file
├── package-lock.json         # Legacy lock file
├── vite.config.mts          # Vite configuration
├── tsconfig.json            # TypeScript config (renderer)
├── electron/tsconfig.json   # TypeScript config (main process)
├── native-module/            # Rust native audio module
│   ├── package.json
│   ├── Cargo.toml
│   └── src/
└── renderer/
    └── package.json          # React app dependencies
```

## Migration Goals

1. **Replace npm with bun** for all package management operations
2. **Update scripts** to use `bun` instead of `npm`
3. **Maintain compatibility** with native modules and Electron build process
4. **Preserve CI/CD workflows** with minimal changes
5. **Achieve faster** install times and script execution

## Migration Steps

### Phase 1: Preparation

#### 1.1 Install Bun

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

#### 1.2 Verify Installation

```bash
bun --version  # Should show 1.x.x
```

### Phase 2: Package.json Updates

#### 2.1 Update Scripts

Replace all `npm` commands with `bun` in `package.json`:

| Current Script | New Script | Purpose |
|---------------|------------|---------|
| `npm run clean` | `bun run clean` | Remove build artifacts |
| `npm run dev` | `bun run dev` | Start Vite dev server |
| `npm run build` | `bun run build` | Build production assets |
| `npm run electron:dev` | `bun run electron:dev` | Run Electron in dev mode |
| `npm run electron:build` | `bun run electron:build` | Build Electron app |
| `npm run app:dev` | `bun run app:dev` | Full dev workflow |
| `npm run app:build` | `bun run app:build` | Full production build |
| `npm run dist` | `bun run dist` | Create distributables |
| `npm run postinstall` | `bun run postinstall` | Post-install rebuild |
| `npm run build:native` | `bun run build:native` | Build Rust native module |
| `npm install` | `bun install` | Install dependencies |

#### 2.2 Required package.json Changes

The `postinstall` script needs modification:

**Current:**
```json
"postinstall": "cross-env SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm rebuild sharp && npx electron-rebuild -f -w better-sqlite3 -w keytar || echo 'electron-rebuild completed with warnings' && (npm run build:native || (echo 'Installing Rust...' && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && npm run build:native) || echo 'native-module build failed')"
```

**New:**
```json
"postinstall": "cross-env SHARP_IGNORE_GLOBAL_LIBVIPS=1 bunx sharp --force && bunx electron-rebuild -f -w better-sqlite3 -w keytar || echo 'electron-rebuild completed with warnings' && (bun run build:native || (echo 'Installing Rust...' && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && bun run build:native) || echo 'native-module build failed')"
```

**Alternative - Using bun to rebuild sharp directly:**
```json
"postinstall": "SHARP_IGNORE_GLOBAL_LIBVIPS=1 bunx @aspect-build/native-rebuild sharp || bunx sharp-rebuild || echo 'Sharp rebuild skipped' && bunx electron-rebuild -f -w better-sqlite3 -w keytar && bun run build:native"
```

#### 2.3 Add Bun Configuration

Optionally add bun-specific configuration to `package.json`:

```json
"trustedDependencies": [
  "better-sqlite3",
  "keytar",
  "sharp",
  "electron-rebuild",
  "natively-audio"
]
```

### Phase 3: Lock File Management

#### 3.1 Remove Legacy Lock Files

```bash
rm pnpm-lock.yaml
rm package-lock.json
```

#### 3.2 Generate Bun Lock File

```bash
bun install  # This creates bun.lockb
```

### Phase 4: Native Module Handling

#### 4.1 Native Module Compatibility

Bun has experimental support for native modules, but with Electron projects, special handling is required:

**Option A: Use bunx for native module rebuilds**

The `electron-rebuild` and sharp rebuilding should use `bunx` (bun's equivalent of npx):

```json
"postinstall": "bunx electron-rebuild -f -w better-sqlite3 -w keytar && bun run build:native"
```

**Option B: Hybrid approach (recommended for safety)**

Keep npm available as fallback for native module builds:

```bash
# Install dependencies with bun
bun install

# Fallback to npm for native rebuilds if needed
npm run postinstall
```

#### 4.2 Native Module Build Script

Update `build:native` script if needed:

**Current:**
```json
"build:native": "cd native-module && npx napi build --platform --release"
```

**New:**
```json
"build:native": "cd native-module && bunx napi build --platform --release"
```

### Phase 5: Vite Configuration

#### 5.1 Verify Vite Compatibility

Vite 7.x is compatible with bun. No changes needed to `vite.config.mts` for basic functionality.

#### 5.2 Optional: Bun-specific Optimizations

Add to `vite.config.mts` for better bun compatibility:

```typescript
// vite.config.mts additions
export default defineConfig({
  // ... existing config
  optimizeDeps: {
    exclude: ['electron', 'chunk-A55SIDN3'],
    // Add bun-specific exclusions if needed
  },
  // Use esbuild for better bun compatibility
  esbuild: {
    // Ensure proper JSX handling
    jsx: 'automatic'
  }
})
```

### Phase 6: CI/CD Updates

#### 6.1 GitHub Actions

Update `.github/workflows` (if exists) to use bun:

**Before:**
```yaml
- run: npm ci
- run: npm run build
```

**After:**
```yaml
- uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
- run: bun install --frozen-lockfile
- run: bun run build
```

### Phase 7: Development Workflow

#### 7.1 New Development Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun run dev` | Start frontend dev server |
| `bun run electron:dev` | Run Electron in dev mode |
| `bun run app:dev` | Full dev workflow (frontend + electron) |
| `bun run build` | Build production assets |
| `bun run app:build` | Build full Electron app |
| `bun run dist` | Create distributable packages |

#### 7.2 Troubleshooting

**Issue: Sharp native module fails to build**

```bash
# Solution: Use fallback to npm for sharp
npm rebuild sharp
```

**Issue: Electron-rebuild fails**

```bash
# Solution: Use npm for electron-rebuild specifically
npm exec electron-rebuild -f -w better-sqlite3 -w keytar
```

**Issue: Native module (natively-audio) build fails**

The Rust native module uses napi-rs. Ensure Rust is installed:

```bash
# Install Rust (if not present)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Build native module
bun run build:native
```

## Rollback Plan

If migration fails:

1. Remove `bun.lockb`
2. Restore `pnpm-lock.yaml` from git
3. Revert `package.json` script changes
4. Use `npm install` and `npm run *` commands

## Testing Checklist

After migration, verify:

- [x] `bun install` completes without errors (172 packages installed)
- [ ] `bun run dev` starts Vite dev server
- [ ] `bun run electron:dev` launches Electron app
- [ ] `bun run app:dev` works for full development
- [ ] `bun run build` produces production assets
- [ ] `bun run app:build` creates Electron distributable
- [ ] Native modules (better-sqlite3, keytar, sharp) work
- [ ] Native audio module (Rust) builds correctly
- [ ] Production `.exe` runs without issues

## Estimated Changes

| File | Changes Required |
|------|------------------|
| `package.json` | Update all npm scripts to bun equivalents |
| `.github/workflows/*` | Update CI to use bun (if exists) |
| Documentation | Update README.md with bun commands |

## Compatibility Notes

- **Electron 40** uses embedded Node.js - bun does not replace this
- **Native modules** are compiled for Electron's Node.js version, not system Node.js
- **bunx** replaces `npx` for package execution
- **Bun's lock file** is `bun.lockb` (binary format)

## Known Issues

### Windows Environment

On Windows, some native module build issues may occur:

1. **Sharp rebuild**: Use `bun rebuild sharp` as fallback
2. **Native module (Rust)**: Requires Visual Studio Build Tools with MSVC linker
   - Install: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Select: "Desktop development with C++"

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun with Electron](https://github.com/oven-sh/bun/issues?q=electron)
- [electron-rebuild](https://github.com/electron/electron-rebuild)
- [napi-rs](https://napi.rs/) - Rust native module build system
