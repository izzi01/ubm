---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T01: Create pi-mono extension scaffold with two-file loader pattern

Set up the extension directory structure, install pi-mono SDK dependencies, create the two-file loader pattern (loader.ts sets PI_PACKAGE_DIR before cli.ts imports SDK), the extension entry point (index.ts), and the extension manifest. The extension exports a default function receiving ExtensionAPI but registers nothing yet — that comes in S02.

## Inputs

- `package.json`
- `tsconfig.json`

## Expected Output

- `src/extension/loader.ts`
- `src/extension/cli.ts`
- `src/extension/index.ts`
- `src/extension/extension-manifest.json`
- `package.json`

## Verification

npx tsc --noEmit && test -f src/extension/index.ts && test -f src/extension/extension-manifest.json && grep -q 'export default' src/extension/index.ts
