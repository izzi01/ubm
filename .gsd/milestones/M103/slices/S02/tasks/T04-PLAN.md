---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T04: Rebrand logo.ts with UMB ASCII art

1. Replace GSD ASCII block letters with UMB block letters
2. Update GSD_LOGO constant name to UMB_LOGO
3. Update JSDoc comments

## Inputs

- `src/logo.ts`

## Expected Output

- `src/logo.ts with UMB ASCII art`

## Verification

grep -ci 'GSD' src/logo.ts — should be 0
