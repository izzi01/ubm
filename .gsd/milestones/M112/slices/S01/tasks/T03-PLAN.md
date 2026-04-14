---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Configure _bmad/bmm/config.yaml with umb defaults

Update _bmad/bmm/config.yaml with sensible defaults for umb: user_name, communication_language: English, document_output_language: English, planning_artifacts pointing to _bmad-output/planning-artifacts, implementation_artifacts to _bmad-output/implementation-artifacts, project_knowledge to docs/. Ensure output directories exist.

## Inputs

- `_bmad/ directory from T01`

## Expected Output

- `_bmad/bmm/config.yaml`
- `_bmad-output/planning-artifacts/`
- `_bmad-output/implementation-artifacts/`
- `docs/`

## Verification

test -f _bmad/bmm/config.yaml && grep -q 'planning_artifacts' _bmad/bmm/config.yaml && test -d _bmad-output/planning-artifacts && echo 'OK'

## Observability Impact

none
