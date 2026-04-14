# S02: Wire umb commands in the TUI — UAT

**Milestone:** M104
**Written:** 2026-04-11T03:41:16.085Z

# UAT: S02 — Wire umb commands in the TUI

## Preconditions
- Fork at `/home/cid/projects-personal/umb/` builds successfully
- `dist-test/` directory exists with compiled extension tests
- Node.js v24+ available

## Test Cases

### TC-01: All 63 smoke tests pass
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/*.test.js` from iz-to-mo-vu root
**Expected:** 63 tests pass, 0 failures, exit code 0

### TC-02: Model config data layer works
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/model-config.test.js`
**Expected:** 12 tests pass covering parseSimpleYaml (tier/agents/skills parsing, null for empty/invalid) and loadModelConfig (missing file, tier defaults, malformed YAML, unknown agent warnings)

### TC-03: /umb command handlers produce correct output
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/umb-commands.test.js`
**Expected:** 4 tests pass — handleUmbHelp shows usage widget, handleUmbModel shows error for missing config, shows config widget with tier badge, shows warnings for unknown agents

### TC-04: /skill list and /skill new work correctly
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/skill-commands.test.js`
**Expected:** 9 tests pass — help widget, empty state warning, valid/invalid skill display, directory creation with SKILL.md, name validation (invalid chars, uppercase, duplicates, missing description)

### TC-05: /skill run creates sessions with correct context
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/skill-run.test.js`
**Expected:** 12 tests pass — usage hints, skill-not-found/invalid errors, session creation with SKILL.md context, model resolution from .umb/models.yaml, model-not-found error, cancelled session, invalid model format, session exception handling

### TC-06: /bmad discovery commands delegate correctly
**Steps:**
1. Run `node --test dist-test/src/resources/extensions/umb/tests/discovery-commands.test.js`
**Expected:** 26 tests pass — parseModelString edge cases, resolveDiscovery for all 4 command types, usage hints, no-model errors, model-not-found errors, success flows with session creation, agent context injection, cancelled/failed sessions, quoted topics

### TC-07: Extension module loads without errors
**Steps:**
1. From umb fork: `node -e "import('./dist-test/src/resources/extensions/umb/index.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
**Expected:** Prints "OK" (import resolution succeeds, no MODULE_NOT_FOUND)

## Edge Cases Verified by Tests
- Empty/malformed YAML config files
- Unknown agent names in config
- Skill names with invalid characters, uppercase, duplicates
- Model strings without provider/model separator
- Session creation failures and cancellations
- Quoted topic strings in discovery commands
- Missing skills directories
