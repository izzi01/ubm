# M106: Git-based skill install

## Vision
Add /skill install <git-url> command that clones a git repo, finds the skill directory, validates it against the Skills Spec, and copies it into .opencode/skills/. Also add /skill remove <name> for cleanup. Both commands wire into the existing scanner/validator infrastructure.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | /skill install <git-url> clones repo, validates skill, copies to .opencode/skills/, shows success widget |
| S02 | S02 | low | — | ✅ | /skill remove <name> deletes skill directory, /skill help shows all commands including install and remove |
