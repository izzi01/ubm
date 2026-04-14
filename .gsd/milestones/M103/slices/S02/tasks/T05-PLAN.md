---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T05: Rebrand package.json files and rebuild

1. Change piConfig.name from 'gsd' to 'umb'
2. Change piConfig.configDir from '.gsd' to '.umb'
3. Change package name from '@glittercowboy/gsd' to 'umb-cli'
4. In root package.json: name='umb-cli', bin.umb='dist/loader.js', remove gsd-cli bin entry
5. Update description to 'Umbrella Blade — Coding Terminal'
6. Rebuild and verify: npm run build && node dist/loader.js --version && node dist/loader.js --help

## Inputs

- `pkg/package.json`
- `package.json`

## Expected Output

- `pkg/package.json with umb config`
- `package.json with umb-cli name and bin`
- `dist/ rebuilt successfully`

## Verification

cd /home/cid/projects-personal/umb && npm run build && node dist/loader.js --version && node dist/loader.js --help | head -3
