---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T02: Fix import paths for fork context

1. Replace all '@mariozechner/pi-coding-agent' imports with '@gsd/pi-coding-agent'
2. Fix any other path issues
3. Update extension/index.ts to use correct relative paths within the extension directory
4. Verify extension cli.ts and loader.ts are not needed (the fork has its own)

## Inputs

- `Copied source files`

## Expected Output

- `All imports updated to @gsd/pi-coding-agent`

## Verification

grep -r '@mariozechner' /home/cid/projects-personal/umb/src/resources/extensions/umb/ — should be 0
