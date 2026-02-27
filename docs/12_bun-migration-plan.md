# Bun Migration Plan

## Overview

This document outlines the migration from npm to bun as the primary package manager for the Natively project. Bun offers significantly faster package installation and script execution compared to npm/yarn.

## Migration Summary

| Aspect | Before | After |
|--------|--------|-------|
| Package Manager | npm/pnpm | bun |
| Lock File | package-lock.json, pnpm-lock.yaml | bun.lockb |
| Postinstall | npm rebuild + npx electron-rebuild | bunx electron-rebuild |

## New Scripts

| Script | Description |
|--------|-------------|
| `bun install` | Install dependencies (runs postinstall automatically) |
| `bun run dev` | Start Vite dev server |
| `bun run electron:dev` | Run Electron in dev mode |
| `bun run app:dev` | Full dev workflow |
| `bun run build` | Build production assets |
| `bun run app:build` | Build Electron app |
| `bun run dist` | Create distributable packages |
| `bun run setup` | Full setup (install + rebuild + native) |
| `bun run build:native` | Build Rust native module |
| `bun run rebuild` | Rebuild native modules for Electron |
| `bun run postinstall` | Rebuild native modules only |

## Complete Setup Workflow

```bash
# Option 1: Full setup (recommended for first install)
bun run setup

# Option 2: Step by step
bun install              # 1. Install dependencies
bun run build:native    # 2. Build Rust native module (optional)
```

## Scripts Breakdown

### postinstall
Runs automatically after `bun install`. Rebuilds native modules for Electron:

```json
"postinstall": "bunx electron-rebuild || echo 'electron-rebuild completed with warnings'"
```

### build:native
Builds the Rust native audio module. Requires Rust toolchain:

```json
"build:native": "cd native-module && bunx napi build --platform --release"
```

### setup
Full setup command combining all steps:

```json
"setup": "bun install && bun run postinstall && bun run build:native"
```

### rebuild
Manual rebuild of native modules:

```json
"rebuild": "bunx electron-rebuild"
```

## Package.json Changes

### Before:
```json
{
  "scripts": {
    "build": "npm run clean && tsc && vite build",
    "postinstall": "cross-env SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm rebuild sharp && npx electron-rebuild -f -w better-sqlite3 -w keytar || echo 'electron-rebuild completed with warnings' && (npm run build:native || echo 'native-module build failed')",
    "app:dev": "concurrently \"npm run backend:dev\" \"wait-on http://localhost:5180 && npm run electron:dev\"",
    "app:build": "npm run build && tsc -p electron/tsconfig.json && electron-builder",
    "build:native": "cd native-module && npx napi build --platform --release"
  }
}
```

### After:
```json
{
  "scripts": {
    "build": "bun run clean && tsc && vite build",
    "postinstall": "bunx electron-rebuild || echo 'electron-rebuild completed with warnings'",
    "app:dev": "concurrently \"bun run backend:dev\" \"wait-on http://localhost:5180 && bun run electron:dev\"",
    "app:build": "bun run build && tsc -p electron/tsconfig.json && electron-builder",
    "build:native": "cd native-module && bunx napi build --platform --release",
    "setup": "bun install && bun run postinstall && bun run build:native",
    "rebuild": "bunx electron-rebuild"
  }
}
```

## Verified Working

| Command | Status |
|---------|--------|
| `bun install` | ✅ 172 packages installed |
| `bunx electron-rebuild` | ✅ Rebuild Complete |
| `bun run build:native` | ✅ Compiled in 30s |

## Testing Checklist

- [x] `bun install` completes without errors
- [x] `bunx electron-rebuild` works
- [x] `bun run build:native` works
- [ ] `bun run dev` starts Vite dev server
- [ ] `bun run electron:dev` launches Electron app
- [ ] `bun run app:dev` works for full development
- [ ] `bun run build` produces production assets
- [ ] `bun run app:build` creates Electron distributable
- [ ] Production `.exe` runs without issues

## Known Issues

### Windows Environment

On Windows, some native module build issues may occur:

1. **Native module (Rust)**: Requires Visual Studio Build Tools with MSVC linker
   - Install: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Select: "Desktop development with C++"

#### Automated Visual Studio Build Tools Installation

Add to `package.json` scripts for automated VS installation:

```json
"install:vs": "powershell -Command \"Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile vs_buildtools.exe; Start-Process -FilePath '.\\vs_buildtools.exe' -ArgumentList '--quiet', '--wait', '--norestart', '--nocache', '--add', 'Microsoft.VisualStudio.Workload.VCTools', '--add', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '--add', 'Microsoft.VisualStudio.Component.Windows10SDK.19041' -Wait; Remove-Item vs_buildtools.exe\"",
"install:rust": "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
```

**Manual Installation (Recommended):**

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Run installer with admin rights
3. Select "Desktop development with C++"
4. Ensure "Windows 10 SDK" is selected
5. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`

## Rollback Plan

If migration fails:

1. Remove `bun.lockb`
2. Restore `package-lock.json` or `pnpm-lock.yaml` from git
3. Revert `package.json` script changes
4. Use `npm install` and `npm run *` commands

## References

- [Bun Documentation](https://bun.sh/docs)
- [electron-rebuild](https://github.com/electron/electron-rebuild)
- [napi-rs](https://napi.rs/) - Rust native module build system
