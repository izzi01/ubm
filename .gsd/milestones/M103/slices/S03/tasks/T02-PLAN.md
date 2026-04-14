---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T02: Verify TUI launches with rebranded config

1. Remove ~/.umb/ if it exists (clean test)
2. Set HOME to a temp dir to avoid polluting real home
3. Run node dist/loader.js with minimal flags to verify it starts without crash
4. Check that extension discovery finds shared extensions (browser-tools, subagent, etc.)
5. Verify the gsd extension is still discovered (needed for coupling — removal deferred to M104)

## Inputs

- `Built dist/`

## Expected Output

- `Loader starts without crash`
- `Extensions discovered`
- `~/.umb/ path used`

## Verification

cd /home/cid/projects-personal/umb && grep -c 'UMB_' dist/loader.js | head -1 && grep -c '\.umb' dist/app-paths.js
