# M101: Model Config + BMAD Discovery + PRD Import

## Vision
Complete the full "Discovery → Planning → Execution" pipeline from the PRD. Users can configure per-phase model routing via .umb/models.yaml, run BMAD discovery commands (/bmad research/brief/prd/arch) with the correct model per agent role, and import PRD output into GSD requirements — closing the loop from research to structured execution.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | User creates .umb/models.yaml, runs /umb model, sees all phase/agent assignments displayed. Invalid model produces a warning. Tier preset applies sensible defaults. |
| S02 | S02 | high | — | ✅ | User runs /bmad research 'OAuth providers', analyst agent is invoked with configured model, research output saved to _bmad-output/planning-artifacts/research-{topic}.md. Same flow works for brief, prd, arch. |
| S03 | S03 | low | — | ✅ | User runs /gsd import _bmad-output/planning-artifacts/prd.md, system extracts functional requirements (FR1-FR6) and creates corresponding GSD requirements. Requirements appear in REQUIREMENTS.md. |
