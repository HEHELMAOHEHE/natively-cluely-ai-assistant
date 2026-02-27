# Dependency Update Plan

## Completed Updates (2026-02-27)

### Successfully Updated:

| Package | From | To | Status |
|---------|------|-----|--------|
| electron | 33.x | 40.6.1 | ✅ |
| electron-builder | old | 26.8.1 | ✅ |
| electron-store | old | 10.1.2 | ✅ |
| @anthropic-ai/sdk | 0.74.0 | 0.78.0 | ✅ |
| react-syntax-highlighter | 15.6.6 | 16.1.1 | ✅ |
| react | 18.3.1 | 19.2.4 | ✅ |
| react-dom | 18.3.1 | 19.2.4 | ✅ |
| @types/react | 18.x | 19.x | ✅ |
| @types/react-dom | 18.x | 19.x | ✅ |
| @tanstack/react-query | v3 | v5 | ✅ |

### Security Fixes Applied:
- electron-rebuild restored in postinstall script
- Native modules (better-sqlite3, keytar) rebuilt for Electron 40

---

## Pending Updates

### Requires Code Changes:

1. **@google/genai** → **@google/generative-ai** (MAJOR)
   - Current: 0.12.0
   - Latest: 0.24.1
   - Issue: Complete API rewrite required
   - Files affected: `electron/rag/EmbeddingPipeline.ts`, `electron/main.ts`, `electron/LLMHelper.ts`, `electron/llm/types.ts`
   - **Recommendation:** Defer until needed

2. **tailwindcss** (MAJOR)
   - Current: 3.4.19
   - Latest: 4.2.1
   - Issue: New configuration format (CSS-first), Vite plugin required
   - **Recommendation:** Defer, requires design review

3. **tesseract.js** (MAJOR)
   - Current: 5.1.1
   - Latest: 7.0.0
   - Issue: API changes in Worker interface
   - **Recommendation:** Test before production

---

## Security Vulnerabilities (npm audit)

**12 vulnerabilities remaining (4 moderate, 8 high):**
- minimatch (high) - ReDoS in glob patterns
- tar (high) - Multiple path traversal vulnerabilities
- prismjs (moderate) - DOM Clobbering

These are in development dependencies (node-gyp, electron-rebuild) and do not affect production builds.

---

## Branch

All updates committed to: `feature/dependency-migration`

## Migration Notes

### React 19 + TanStack Query v5
- Updated imports from `react-query` to `@tanstack/react-query`
- Changed `useQuery` syntax: now requires `queryKey` property
- Changed `cacheTime` to `gcTime` in query options

### Electron 40
- Native modules require rebuild
- postinstall script handles this automatically
- Use `npm run postinstall` or `npx electron-rebuild`
