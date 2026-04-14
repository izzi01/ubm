# S07: Integrate BMAD pipeline with gsd-orchestrator + /bmad auto umbrella command — UAT

**Milestone:** M112
**Written:** 2026-04-13T17:23:55.300Z

# UAT: S07 — BMAD Pipeline + GSD Orchestrator Integration

## Preconditions
- umb binary available (or `npx vitest run` working)
- `_bmad/` directory exists with BMAD skill definitions
- `_bmad-output/` directory writable for pipeline output

---

## Test Case 1: /bmad auto shows usage help
**Steps:**
1. Invoke `/bmad auto` with no arguments
**Expected:** Widget displays usage showing 3 modes (all phases, single phase, --stop-after) with all 4 phases listed and marked ✅

## Test Case 2: /bmad auto umbrella mode (all 4 phases)
**Steps:**
1. Invoke `/bmad auto 'Build a REST API for task management'`
2. Observe phase transition widgets
**Expected:**
- Phase 1/4: 🔍 Analysis widget displayed
- Phase 2/4: 📐 Planning widget displayed
- Phase 3/4: 🏗️ Solutioning widget displayed
- Phase 4/4: ⚙️ Implementation widget displayed
- Final summary widget shows per-phase status with ✅/⚠️/❌ icons
- Notify says "BMAD auto pipeline completed"

## Test Case 3: /bmad auto --stop-after planning
**Steps:**
1. Invoke `/bmad auto --stop-after planning 'Build a REST API'`
**Expected:**
- Only Analysis and Planning phases run
- Widget shows "stopping after planning"
- Summary shows 2 phases completed
- Solutioning and Implementation phases NOT executed

## Test Case 4: /bmad auto --stop-after with invalid phase
**Steps:**
1. Invoke `/bmad auto --stop-after invalid-phase 'Build X'`
**Expected:** Error widget with "Invalid phase" message and list of valid phases

## Test Case 5: /bmad auto --stop-after without message
**Steps:**
1. Invoke `/bmad auto --stop-after planning` (no message)
**Expected:** Warning widget with "Message is required after --stop-after <phase>"

## Test Case 6: /bmad auto single-phase delegation (backward compat)
**Steps:**
1. Invoke `/bmad auto analysis 'Research OAuth providers'`
**Expected:** Delegates to analysis phase handler, runs analysis pipeline only

## Test Case 7: Pipeline failure stops umbrella
**Steps:**
1. Invoke `/bmad auto` with a message (assuming a phase will fail)
**Expected:** Pipeline stops at failed phase, widget shows which phase failed and which phases completed

## Test Case 8: /gsd build-from-spec shows usage
**Steps:**
1. Invoke `/gsd build-from-spec` with no arguments
**Expected:** Widget displays usage with 4-step workflow description

## Test Case 9: /gsd build-from-spec full workflow
**Steps:**
1. Invoke `/gsd build-from-spec 'Build an OAuth provider for SaaS apps'`
2. Observe BMAD pipeline execution
3. Observe artifact reading
4. Observe session creation
**Expected:**
- Step 1: All 4 BMAD phases execute sequentially
- Step 2: Artifacts read from `_bmad-output/planning-artifacts/`
- Step 3: Widget reports artifact names and byte sizes
- Step 4: New session started with composed context including `gsd_milestone_plan` instruction

## Test Case 10: /gsd build-from-spec with no artifacts
**Steps:**
1. Remove/rename `_bmad-output/planning-artifacts/` directory
2. Invoke `/gsd build-from-spec 'Build X'`
**Expected:** Warning widget: "No planning artifacts found in _bmad-output/planning-artifacts/"

## Test Case 11: /gsd build-from-spec with pipeline failure
**Steps:**
1. Invoke `/gsd build-from-spec` with a message that causes pipeline failure
**Expected:** Error reported at failed phase, no session creation attempted

---

## Edge Cases

### E1: /bmad auto with empty message after phase name
- `/bmad auto analysis` → shows analysis phase help (no execution)

### E2: /bmad auto help
- `/bmad auto help` → shows usage (same as no args)

### E3: Session cancellation in build-from-spec
- If `ctx.newSession()` returns `cancelled: true`, widget shows warning with artifact count and retry suggestion
