---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T03: Add deps and verify TypeScript compiles

1. Add better-sqlite3 to package.json dependencies
2. Add @types/better-sqlite3 to devDependencies
3. Run npm install
4. Run tsc --noEmit to check for type errors
5. Fix any type errors found

## Inputs

- `Fixed source files`

## Expected Output

- `tsc --noEmit passes with zero errors from umb extension`

## Verification

cd /home/cid/projects-personal/umb && npx tsc --noEmit 2>&1 | grep -c 'error TS'
