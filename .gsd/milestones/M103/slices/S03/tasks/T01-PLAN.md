---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T01: Verify build and binary after rebrand

1. Verify the build completes successfully after rebranding
2. Run node dist/loader.js --version — should print version
3. Run node dist/loader.js --help — should show umb branding
4. Verify dist/loader.js has process.title = 'umb'
5. Verify dist/app-paths.js references ~/.umb

## Inputs

- `Rebranded source from S02`

## Expected Output

- `Build succeeds`
- `Version prints`
- `Help shows umb branding`

## Verification

cd /home/cid/projects-personal/umb && node dist/loader.js --version && node dist/loader.js --help | head -1
