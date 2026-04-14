---
id: S01
parent: M101
milestone: M101
provides:
  - ["loadModelConfig() function for reading/validating .umb/models.yaml", "TIER_PRESETS record with budget/standard/premium agent→model mappings", "KNOWN_AGENTS set of 20 validated BMAD agent names", "/umb model slash command for config inspection"]
requires:
  []
affects:
  - ["S02"]
key_files:
  - ["src/model-config/types.ts", "src/model-config/tier-presets.ts", "src/model-config/loader.ts", "src/model-config/index.ts", "src/commands/umb-commands.ts", "src/extension/index.ts", "tests/model-config/loader.test.ts", "tests/commands/umb-commands.test.ts"]
key_decisions:
  - ["Used custom line-based YAML parser instead of adding a YAML dependency — config is flat so simple regex parsing is sufficient", "Sourced tier presets from existing opencode-config directories for consistency", "Exported KNOWN_AGENTS set for reuse by /umb model command"]
patterns_established:
  - ["Simple YAML parsing for flat configs — no dependency needed", "Tier preset merging pattern (defaults + user overrides, user wins)", "/umb command registration follows existing /gsd and /bmad patterns"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M101/slices/S01/tasks/T01-SUMMARY.md", ".gsd/milestones/M101/slices/S01/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-10T22:01:49.140Z
blocker_discovered: false
---

# S01: Model Configuration System

**Created .umb/models.yaml config schema, tier presets (budget/standard/premium), dependency-free YAML loader with agent validation, and /umb model command — 33 passing tests.**

## What Happened

T01 built the core data layer: TypeScript types (TierPreset, ModelConfig, ValidatedModelConfig, LoadResult), tier presets sourced from the three existing opencode-config directories mapping 20 BMAD agents to real model strings per tier, a line-based YAML parser that handles the deliberately flat config format without any YAML dependency, and loadModelConfig() that reads/validates/merges tier defaults with user overrides while collecting warnings for unrecognized agents. T02 wired the /umb command namespace into the extension entry point, created handleUmbModel that formats resolved agent→model assignments as a widget with tier badges, source icons (✏️ user / 📦 tier), and warning/error lines, and registered /umb model + /umb help commands. All 33 tests pass (25 loader unit + 8 command integration).

## Verification

All 33 S01-specific tests pass: 25 loader tests (YAML parsing, all loader scenarios, tier preset completeness, known agent coverage) and 8 integration tests (no config, valid config, tier badge, warnings, source icons, empty config, widget key). Pre-existing flaky tests in background-manager.test.ts (6 failures) and agent-babysitter.test.ts are timing-related and unrelated to S01 — they were present before this slice started.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

- []

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

Model strings are not validated against any provider — that's explicitly out of scope per the plan. The YAML parser handles only flat structures (tier + agents key-value pairs).

## Follow-ups

None.

## Files Created/Modified

- `src/model-config/types.ts` — TypeScript types: TierPreset, ModelConfig, ValidatedModelConfig, LoadResult
- `src/model-config/tier-presets.ts` — Three tier presets with 20 agent→model mappings sourced from opencode-config
- `src/model-config/loader.ts` — Dependency-free YAML parser + loadModelConfig() with validation and tier merging
- `src/model-config/index.ts` — Re-exports for clean public API
- `src/commands/umb-commands.ts` — /umb model and /umb help commands with widget formatting
- `src/extension/index.ts` — Wired registerUmbCommands() into extension entry point
- `tests/model-config/loader.test.ts` — 25 unit tests for YAML parsing and config loading
- `tests/commands/umb-commands.test.ts` — 8 integration tests for /umb model command
