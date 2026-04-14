---
estimated_steps: 4
estimated_files: 2
skills_used: []
---

# T02: Install dependencies and build workspace packages

1. cd /home/cid/projects-personal/umb
2. npm install
3. Verify all workspace packages built (native, pi-tui, pi-ai, pi-agent-core, pi-coding-agent)
4. Check for errors in postinstall scripts

## Inputs

- `Cloned repo`

## Expected Output

- `node_modules/ with all deps`
- `packages/*/dist/ built`

## Verification

ls /home/cid/projects-personal/umb/node_modules/.package-lock.json 2>/dev/null && ls /home/cid/projects-personal/umb/packages/pi-coding-agent/dist/
