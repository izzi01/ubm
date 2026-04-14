# M102: 

## Vision
TBD

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | scanSkillDirs() indexes all 172 skills, parseSkillMd() extracts metadata, validateSkill() checks Skills Spec compliance. All 172 existing skills parse without crashing. |
| S02 | S02 | low | — | ✅ | User runs /skill list and sees all indexed skills. /skill new my-skill "desc" creates a valid skill directory. |
| S03 | S03 | high | — | ✅ | User runs /skill run seo-mastery "topic" and a new session starts with skill loaded and correct model. |
