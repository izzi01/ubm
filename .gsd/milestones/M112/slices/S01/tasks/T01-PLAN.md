---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Run npx bmad-method install to scaffold _bmad/ directory

Run `npx bmad-method install` in the project directory with non-interactive flags to install the BMM module. Use `--directory . --modules bmm --yes` for CI-style install. Verify _bmad/ directory structure is created with config.yaml, skills/, and agents/.

## Inputs

- `M112-RESEARCH.md`
- `https://github.com/bmad-code-org/BMAD-METHOD`

## Expected Output

- `_bmad/bmm/config.yaml`
- `_bmad/bmm/skills/`
- `_bmad/bmm/agents/`

## Verification

test -d _bmad/bmm/skills && test -f _bmad/bmm/config.yaml && echo 'OK'

## Observability Impact

none
