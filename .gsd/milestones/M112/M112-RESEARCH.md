# M112 Research: BMAD Method Implementation

## Source Material

- **BMAD-METHOD repo**: https://github.com/bmad-code-org/BMAD-METHOD (44k stars, MIT license)
- **Docs site**: https://docs.bmad-method.org/
- **llms-full.txt**: https://docs.bmad-method.org/llms-full.txt (consolidated docs for LLM consumption)

## What BMAD Is

BMAD (Build More Architect Dreams) is an AI-driven agile development framework. It's not code — it's a collection of **markdown-based skill definitions** (SKILL.md files + prompt files) that guide AI agents through structured workflows. Key characteristics:

- **Skills are markdown**: Each skill is a directory with SKILL.md (frontmatter + workflow stages) and prompts/ subdirectory (stage-specific instructions)
- **4 phases**: Analysis → Planning → Solutioning → Implementation
- **6 agents**: Analyst (Mary), PM (John), Architect (Winston), Developer (Amelia), UX Designer (Sally), Tech Writer (Paige)
- **20+ skills/workflows**: brainstorming, market-research, domain-research, technical-research, product-brief, prfaq, create-prd, create-ux-design, create-architecture, create-epics-and-stories, implementation-readiness, sprint-planning, dev-story, code-review, quick-dev, etc.
- **Artifact chaining**: Each phase produces documents that feed the next (brief → PRD → architecture → epics → stories → code)
- **Config-driven**: `_bmad/bmm/config.yaml` controls user_name, language, output paths

## Installation Structure

After `npx bmad-method install`, the project gets:

```
_bmad/
  bmm/
    config.yaml
    skills/
      bmad-agent-analyst/SKILL.md + prompts/
      bmad-pm/SKILL.md + prompts/
      bmad-architect/SKILL.md + prompts/
      bmad-agent-dev/SKILL.md + prompts/
      bmad-ux-designer/SKILL.md + prompts/
      bmad-tech-writer/SKILL.md + prompts/
      bmad-brainstorming/SKILL.md
      bmad-product-brief/SKILL.md + prompts/
      bmad-create-prd/SKILL.md + prompts/
      bmad-create-architecture/SKILL.md + prompts/
      bmad-create-epics-and-stories/SKILL.md + prompts/
      bmad-quick-dev/SKILL.md + prompts/
      ... (20+ more)
    agents/
      analyst.md, pm.md, architect.md, dev.md, ux-designer.md, tech-writer.md
_bmad-output/
  planning-artifacts/
  implementation-artifacts/
```

## Existing Code in Umb

### Already Built (M101-S02, M102-S01)
- `bmad-commands.ts` — `/bmad <agent>` and `/bmad list` commands (reads `_bmad/` directory, finds agent definitions, displays widget)
- `discovery-types.ts` — Type definitions and resolver for 4 discovery commands (research, brief, prd, arch)
- `discovery-commands.ts` — `/bmad research|brief|prd|arch <topic>` commands (resolves agent → model → session)
- `model-config/loader.ts` — Loads `.umb/models.yaml` for agent → model mapping

### Missing (What M112 Must Build)
1. **No `_bmad/` directory** — Skills not installed
2. **No skill execution engine** — Can't load SKILL.md, parse stages, chain them
3. **No /bmad auto** — No pipeline orchestration across phases
4. **No gsd-orchestrator integration** — build-from-spec doesn't use BMAD
5. **Discovery commands create sessions but don't execute workflows** — They just open a chat session with a generic prompt, not the actual BMAD skill workflow

## Architecture Approach

### Skill Execution Engine (`src/bmad-engine/`)
- `loader.ts` — Parse SKILL.md frontmatter, detect workflow stages, load prompt files
- `executor.ts` — Execute a single skill: resolve model, create session, inject SKILL.md + stage prompts, collect output
- `pipeline.ts` — Chain skills across phases: feed Phase 1 artifacts as context into Phase 2, etc.

### /bmad auto Pipeline
```
/bmad auto "Build X"
  → Phase 1: research → brief → prd (analyst agent)
  → Phase 2: create-prd → create-ux-design (pm agent)
  → Phase 3: create-architecture → create-epics-and-stories → implementation-readiness (architect agent)
  → Phase 4: sprint-planning → create-story → dev-story → code-review (dev agent)
  → Summary: list all artifacts with paths
```

### gsd-orchestrator Integration
```
gsd-orchestrator build-from-spec:
  1. Run /bmad auto (produces brief, PRD, architecture, epics)
  2. Concatenate PRD + architecture into spec.md
  3. gsd headless new-milestone --context spec.md --auto
  4. Monitor and report
```

## Key Decisions

1. **Install BMAD skills via npx bmad-method install** — Don't vendor the skill files. Use the official installer. This keeps skills up-to-date and avoids maintenance burden.
2. **Build execution engine as TypeScript module** — Not a separate process. The engine runs within the umb extension, using pi SDK's `ctx.newSession()` for each skill.
3. **Artifact format: markdown files on disk** — BMAD outputs markdown. GSD consumes markdown. No format conversion needed — just file path references.
4. **Phase boundaries as checkpoints** — /bmad auto can pause between phases for human review. Not forced-autonomous.
