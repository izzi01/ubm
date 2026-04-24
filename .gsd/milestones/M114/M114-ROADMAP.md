# M114: AI Coding App Parity Gate

**Vision:** Given the code has done so far, add smoke-test, UAT, and parity proof so the software really works — specifically so it indeed can be used to make software, because it is an AI coding app and should work like current gsd2 works.

## Success Criteria

- umb proves the agreed core coding loop on a purpose-built small web-task fixture in repo/dev mode.
- The installed packaged `umb` binary proves the same core coding-loop behavior on the same fixture.
- The project has a strict release-style parity gate plus a human-readable UAT path that together support the claim that umb can be used to make software.
- Parity failures preserve actionable diagnostics instead of noisy or ambiguous output.
- Optional live-model proof remains available without becoming the main source of release flakiness.

## Slices

- [ ] **S01: S01** `risk:high` `depends:[]`
  > After this: After this: one baseline parity command/report shows what the repo already proves, what it does not, and the stale M113 cleanup drift is reconciled so downstream work starts from a truthful contract.

- [ ] **S02: Repo-mode coding-loop proof** `risk:high` `depends:[S01]`
  > After this: After this: the repo/dev build of umb can complete the agreed small web-task fixture end-to-end, including code edits, test execution, dev-server management, and browser verification.

- [ ] **S03: Installed-binary packaged parity** `risk:high` `depends:[S02]`
  > After this: After this: the installed packaged `umb` binary can pass the same small web-task parity proof, so packaged behavior is no longer assumed to match the repo build.

- [ ] **S04: Diagnostics and human UAT** `risk:medium` `depends:[S02,S03]`
  > After this: After this: parity failures tell you what broke and where, and there is a human-readable UAT script that demonstrates the claim that umb can be used to make software on the parity fixture.

- [ ] **S05: Release gate and live spot-check** `risk:medium` `depends:[S03,S04]`
  > After this: After this: one strict parity command/report can be run before release to prove umb behaves like a usable AI coding app for the agreed core loop in repo/dev and installed modes, with an optional live-model spot-check.

## Boundary Map

## Boundary Map

### S01 → S02
Produces:
- `parity` baseline runner contract that can execute existing smoke / integration / pack-install lanes and label results by proof class
- reconciled M113 cleanup state so downstream parity work does not build on stale requirement drift
- fixture acceptance manifest describing the core coding-loop steps the repo-mode proof must satisfy

Consumes:
- existing smoke, integration, pack-install, live, and live-regression harnesses already present in the repo

### S02 → S03
Produces:
- purpose-built small web-task fixture under `tests/fixtures/` with deterministic acceptance targets
- repo/dev-mode proof path for inspect → edit → test → dev-server → browser verification → completion
- repo-mode parity assertions for the agreed core coding loop

Consumes from S01:
- parity runner contract and baseline coverage map
- fixture acceptance manifest

### S03 → S04
Produces:
- installed-binary packaged parity path that runs the same core coding-loop proof against shipped `umb`
- explicit repo-vs-installed comparison points for the deterministic fixture
- packaged-mode parity assertions and failure surfaces

Consumes from S02:
- deterministic fixture app
- repo-mode coding-loop proof contract

### S03 → S05
Produces:
- validated packaged parity path that the final release gate can call directly

Consumes from S02:
- deterministic fixture app
- repo-mode coding-loop proof contract

### S04 → S05
Produces:
- actionable diagnostics for parity failures, including mode-aware evidence
- human-readable UAT script showing that umb can be used to make software on the parity fixture
- artifact/report structure for debugging browser, dev-server, and packaged parity failures

Consumes from S03:
- installed-binary parity results and packaged failure surfaces

### S05 → milestone-complete
Produces:
- one strict release-style parity command/report covering repo/dev mode, installed `umb` mode, and optional live-model spot-check behavior
- final integrated proof that umb behaves like a usable AI coding app for the agreed core loop

Consumes from S03:
- packaged parity proof path

Consumes from S04:
- diagnostics contract and human-readable UAT path
