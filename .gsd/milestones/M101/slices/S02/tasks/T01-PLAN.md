---
estimated_steps: 16
estimated_files: 2
skills_used: []
---

# T01: Define discovery command types and agent mapping layer

Create the data/configuration layer for BMAD discovery commands. This includes:

1. Discovery type definitions — map each command (research, brief, prd, arch) to its BMAD agent, default prompt template, and output file prefix
2. A resolver function that takes a discovery type + topic and returns: agent name, prompt text, output file path, and the model string from .umb/models.yaml
3. Model string parsing utility — split 'provider/model-id' into {provider, modelId} for use with SessionManager.appendModelChange()
4. Output directory creation helper — ensure _bmad-output/planning-artifacts/ exists before writing

The key data structure:
```typescript
interface DiscoveryType {
  command: 'research' | 'brief' | 'prd' | 'arch';
  agent: string;           // 'analyst', 'pm', 'pm', 'architect'
  outputPrefix: string;    // 'research', 'brief', 'prd', 'arch'
  label: string;           // Human-readable label for session naming
}
```

Model string parsing: 'openai/gpt-5.2-codex' → { provider: 'openai', modelId: 'gpt-5.2-codex' }. Handle edge cases (no slash, multiple slashes — first slash is the separator).

This is pure logic — no pi SDK dependencies beyond types.

## Inputs

- `src/model-config/types.ts`
- `src/model-config/loader.ts`
- `src/model-config/tier-presets.ts`

## Expected Output

- `src/commands/discovery-types.ts`
- `tests/commands/discovery-types.test.ts`

## Verification

npm test -- --grep 'discovery-types'
