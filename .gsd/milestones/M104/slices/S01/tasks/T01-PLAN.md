---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T01: Copy iz-to-mo-vu source into fork extension dir

1. Create src/resources/extensions/umb/ directory in the fork
2. Copy src/ subdirectories from iz-to-mo-vu (commands, dashboard, db, import, model-config, patterns, skill-registry, state-machine, tools, extension/) — exclude tests for now
3. Create package.json for the umb extension
4. Create extension-manifest.json

## Inputs

- `/home/cid/projects-personal/iz-to-mo-vu/src/`

## Expected Output

- `src/resources/extensions/umb/ with all source files`
- `package.json`
- `extension-manifest.json`

## Verification

ls /home/cid/projects-personal/umb/src/resources/extensions/umb/
