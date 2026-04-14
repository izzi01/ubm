---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T03: Rebrand help-text.ts

1. Replace all 'GSD' with 'UMB' in help text headers
2. Replace 'gsd' with 'umb' in command examples
3. Replace 'Get Shit Done' with 'Umbrella Blade'
4. Update npm install commands to use umb-cli
5. Update GitHub issue URL

## Inputs

- `src/help-text.ts`

## Expected Output

- `src/help-text.ts with umb branding`

## Verification

grep -ci 'gsd' src/help-text.ts — should be 0
