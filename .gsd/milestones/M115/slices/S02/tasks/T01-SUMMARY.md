---
id: T01
parent: S02
milestone: M115
key_files:
  - tests/fixtures/web-mode-parity-fixture/TASK.md
  - tests/fixtures/web-mode-parity-fixture/package.json
  - tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/M101-ROADMAP.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/slices/S01/S01-PLAN.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/slices/S01/tasks/T01-PLAN.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/package.json
  - tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/M202-ROADMAP.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/slices/S03/S03-PLAN.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/slices/S03/tasks/T02-PLAN.md
  - tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/package.json
  - tests/fixtures/web-mode-parity-manifest.json
  - src/tests/integration/web-mode-fixture-contract.test.ts
key_decisions:
  - Used a tracked manifest plus tracked fixture directory as the source of truth for web-mode parity semantics, matching the existing parity-manifest pattern in this repo.
  - Locked browser-visible success conditions to shipped `data-testid` selectors already exercised by existing web runtime tests so downstream parity evidence stays truthful and debuggable.
duration: 
verification_result: passed
completed_at: 2026-04-24T10:06:25.291Z
blocker_discovered: false
---

# T01: Added the tracked web-mode parity fixture, manifest, and passing contract test for deterministic startup/switch/browser observables.

**Added the tracked web-mode parity fixture, manifest, and passing contract test for deterministic startup/switch/browser observables.**

## What Happened

I defined a new tracked fixture at `tests/fixtures/web-mode-parity-fixture/` to represent the deterministic browser-hosted operator path this slice needs to prove. The fixture uses a tracked `dev-root` with two brownfield projects, `alpha-app` and `beta-app`, each seeded with milestone/slice/task state so downstream web-mode parity work can exercise scoped startup and project retargeting without depending on external services. I added `tests/fixtures/web-mode-parity-manifest.json` as the machine-readable source of truth for the startup project, switch target, expected project discovery, required startup diagnostics, and browser-visible observables tied to shipped selectors such as `workspace-project-cwd`, `sidebar-current-scope`, `status-bar-unit`, and `projects-panel`. I then added `src/tests/integration/web-mode-fixture-contract.test.ts` to lock the fixture layout, tracked-only discipline, manifest semantics, selector alignment with the shipped UI, and the service-free discovery contract. The first verification run failed because my initial fixture brief referenced `.gsd/` paths directly; I treated that as a concrete hypothesis about violating the tracked-only brief discipline, updated only `TASK.md` to reference tracked fixture files instead, and reran the contract test successfully.

## Verification

Ran the task-plan verification command: `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts`. The test suite passed all 5 contract checks, confirming the manifest contents, tracked fixture layout, shipped selector alignment, deterministic discovery assumptions, and recorded operator-path acceptance brief. Slice-level verification for this intermediate task is partially satisfied through the new deterministic contract surface; downstream tasks still need to implement the actual web-mode parity lane and report artifacts that consume this fixture.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/integration/web-mode-fixture-contract.test.ts` | 0 | ✅ pass | 132ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/fixtures/web-mode-parity-fixture/TASK.md`
- `tests/fixtures/web-mode-parity-fixture/package.json`
- `tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/M101-ROADMAP.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/slices/S01/S01-PLAN.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/.gsd/milestones/M101/slices/S01/tasks/T01-PLAN.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app/package.json`
- `tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/M202-ROADMAP.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/slices/S03/S03-PLAN.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/.gsd/milestones/M202/slices/S03/tasks/T02-PLAN.md`
- `tests/fixtures/web-mode-parity-fixture/dev-root/beta-app/package.json`
- `tests/fixtures/web-mode-parity-manifest.json`
- `src/tests/integration/web-mode-fixture-contract.test.ts`
