# M115: UMB Secondary-Surface Parity Gate

**Vision:** Prove that umb matches the important non-core workflow surfaces users rely on in gsd2 — specifically web mode, MCP/integration behavior, BMAD/workflow execution, and worktree/session/recovery flows — while cleaning remaining stale gsd-era CLI/help/package expectations so parity claims stay truthful and releaseable.

## Success Criteria

- umb proves a deterministic web-mode workflow with startup, project selection/switching, browser-facing verification, and actionable diagnostics.
- umb proves MCP parity on a controlled fixture server, including tool discovery, successful calls, and clear failure surfaces.
- umb proves a representative BMAD/planning-to-execution workflow with expected artifacts and state transitions.
- umb proves worktree/session/recovery parity for create/resume/merge or equivalent current branchless flows, with deterministic verification evidence.
- CLI/help/package/release smoke surfaces are truthfully branded as umb and no parity smoke checks depend on stale gsd-only behavior.
- The parity report distinguishes core coding-loop proof from secondary-surface parity and optional live/provider coverage so remaining gaps stay explicit.

## Slices

- [x] **S01: S01** `risk:medium` `depends:[]`
  > After this: After this: one truthful secondary-surface parity matrix/report says what umb already proves versus gsd2 on web mode, MCP, workflow, and worktree/session surfaces, and defines deterministic fixtures/contracts for the downstream proof slices.

- [ ] **S02: S02** `risk:high` `depends:[]`
  > After this: After this: umb can prove a deterministic web-mode workflow with startup, project selection/switching or equivalent project-context behavior, browser-facing verification, and actionable diagnostics.

- [ ] **S03: MCP parity proof** `risk:high` `depends:[S01]`
  > After this: After this: umb can prove controlled MCP parity for discover → call → failure diagnostics on a repeatable fixture server rather than relying on anecdotal real-server usage.

- [ ] **S04: Workflow/BMAD parity proof** `risk:high` `depends:[S01]`
  > After this: After this: umb can prove a representative planning-to-execution workflow with the expected artifacts and state transitions, supporting a stronger parity claim than the core coding-loop fixture alone.

- [ ] **S05: Integrated secondary-surface release gate** `risk:medium` `depends:[S01,S02,S03]`
  > After this: After this: one integrated parity command/report truthfully composes web mode, MCP, worktree/session/recovery, rebrand smoke checks, and the representative workflow proof into a release-facing secondary-surface parity gate.

## Boundary Map

### S01 → S02
Produces:
- Secondary-surface parity matrix and truthful coverage map for web, MCP, workflow, and worktree/session surfaces
- Deterministic fixture/contract definitions for downstream parity proof lanes
- Rebrand audit inventory for stale gsd-facing smoke/help/package expectations

Consumes:
- M114 parity report/release-gate patterns and the existing core coding-loop fixture architecture

### S01 → S03
Produces:
- Controlled MCP parity contract describing discovery, invocation, and failure-diagnostic expectations

Consumes:
- Existing MCP/tool-discovery infrastructure and parity reporting conventions

### S01 → S04
Produces:
- Representative workflow/BMAD parity scope and artifact expectations

Consumes:
- Existing workflow/planning engines and milestone artifact conventions

### S01 → S05
Produces:
- Rebrand/worktree/session parity inventory and known drift list

Consumes:
- Existing branchless worktree/session architecture from M113 and parity-report patterns from M114

### S02 → S05
Produces:
- Web-mode parity artifacts and diagnostics suitable for release reporting

Consumes from S01:
- Web-mode fixture/contract and secondary parity matrix

### S03 → S05
Produces:
- MCP parity artifacts and diagnostics suitable for release reporting

Consumes from S01:
- Controlled MCP fixture/contract

### S04 → milestone-complete
Produces:
- Representative workflow parity evidence and operator-facing artifact truth for planning/execution flows

Consumes from S01:
- Workflow/BMAD parity scope and artifact contract

### S05 → milestone-complete
Produces:
- One integrated secondary-surface parity report/release gate that truthfully composes web, MCP, workflow, worktree/session, and rebrand checks

Consumes from S02:
- Web-mode parity proof

Consumes from S03:
- MCP parity proof

Consumes from S04:
- Workflow parity proof
