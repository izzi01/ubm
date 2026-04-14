---
id: S02
parent: M101
milestone: M101
provides:
  - ["DISCOVERY_TYPES registry mapping commands to agents", "parseModelString() utility for provider/model-id parsing", "resolveDiscovery() function combining config resolution with output path generation", "handleBmadDiscovery() shared command handler with session delegation", "4 registered /bmad subcommands: research, brief, prd, arch"]
requires:
  []
affects:
  - ["S03"]
key_files:
  - ["src/commands/discovery-types.ts", "src/commands/discovery-commands.ts", "tests/commands/discovery-types.test.ts", "tests/commands/discovery-commands.test.ts", "src/extension/index.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["Resolver layer (discovery-types.ts) produces ResolvedDiscovery context consumed by handler (discovery-commands.ts) — clean separation for testability", "Shared handler pattern with thin wrappers for each command variant", "Model string parsing with first-slash semantics for provider/modelId extraction"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M101/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M101/slices/S02/tasks/T02-SUMMARY.md", ".gsd/milestones/M101/slices/S02/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-10T22:08:12.701Z
blocker_discovered: false
---

# S02: BMAD Discovery Commands

**Added /bmad research, brief, prd, and arch commands that resolve agent→model from .umb/models.yaml and delegate to the correct BMAD agent via new sessions**

## What Happened

S02 delivered the four BMAD discovery commands (/bmad research, /bmad brief, /bmad prd, /bmad arch) that form the discovery half of the "Discovery → Planning → Execution" pipeline. Three tasks were executed:

T01 created the data/configuration layer: a DISCOVERY_TYPES registry mapping each command to its BMAD agent (research→analyst, brief→pm, prd→pm, arch→architect), a parseModelString() utility splitting 'provider/model-id' with first-slash semantics, an ensureOutputDir() helper for _bmad-output/planning-artifacts/, and a resolveDiscovery() function that ties everything together with model config from S01's loadModelConfig(). 27 unit tests cover all exports and edge cases.

T02 built the command handlers: a shared handleBmadDiscovery() function that parses topic, resolves agent→model, validates the model in ctx.modelRegistry.find(), creates a new session with correct model/prompt via ctx.newSession(), and surfaces success/error widgets. Four thin wrappers delegate to the shared handler. registerDiscoveryCommands() wires all 4 commands and is called from src/extension/index.ts.

T03 added 8 integration tests covering model parsing edge cases, output path format verification, and widget content validation for both success and error states. All 31 discovery command tests pass alongside the 27 discovery-types tests from T01.

The key pattern established: discovery commands use a resolver layer (T01) that produces a ResolvedDiscovery context, which the handler (T02) consumes to set up sessions. This separation makes testing straightforward and allows the resolver to be reused by other features (e.g., S03 PRD import could use it to validate output paths).

## Verification

All 58 discovery tests pass (27 discovery-types + 31 discovery-commands). All 91 command tests across 5 files pass. Full test suite has 595 passing tests with 2 pre-existing failures in unrelated files (background-manager, renderer-summaries). TypeScript compiles clean. The verification gate failure was caused by using Jest's --grep flag on a Vitest project; the correct command is `npx vitest run -t 'discovery'`.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

- Discovery commands set up sessions but do not write output files themselves — the delegated BMAD agent session produces the actual artifact
- Agent YAML prompt loading is mocked in tests; actual prompt assembly depends on _bmad/ agent definitions being present at runtime
- Model validation relies on ctx.modelRegistry.find() which is pi SDK infrastructure — if the registry is incomplete, valid models may be rejected

## Follow-ups

None.

## Files Created/Modified

None.
