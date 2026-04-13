/**
 * Tier Preset Definitions
 *
 * Maps each tier (budget/standard/premium) to a set of default agent→model assignments.
 * Values are sourced from the existing opencode-config directories:
 *   - budget:  opencode-config/01-budget/opencode.json
 *   - standard: opencode-config/03-standard/opencode.json
 *   - premium:  opencode-config/05-premium/opencode.json
 */

import type { TierPreset } from './types.js';

export const TIER_PRESETS: Record<TierPreset, Record<string, string>> = {
  budget: {
    'bmad-master': 'zhipuai-coding-plan/glm-4.7',
    'agent-builder': 'zhipuai-coding-plan/glm-4.7',
    'module-builder': 'zhipuai-coding-plan/glm-4.7',
    'workflow-builder': 'zhipuai-coding-plan/glm-4.7',
    analyst: 'google/antigravity-gemini-3-pro',
    architect: 'zhipuai-coding-plan/glm-4.7',
    dev: 'zhipuai-coding-plan/glm-4.7',
    pm: 'google/antigravity-gemini-3-pro',
    'quick-flow-solo-dev': 'zhipuai-coding-plan/glm-4.7',
    sm: 'google/antigravity-gemini-3-pro',
    tea: 'opencode/minimax-m2.1-free',
    'tech-writer': 'zhipuai-coding-plan/glm-4.7',
    'ux-designer': 'zhipuai-coding-plan/glm-4.7',
    'brainstorming-coach': 'zhipuai-coding-plan/glm-4.7',
    'creative-problem-solver': 'zhipuai-coding-plan/glm-4.7',
    'design-thinking-coach': 'zhipuai-coding-plan/glm-4.7',
    'innovation-strategist': 'zhipuai-coding-plan/glm-4.7',
    'presentation-master': 'zhipuai-coding-plan/glm-4.7',
    storyteller: 'zhipuai-coding-plan/glm-4.7',
  },

  standard: {
    'bmad-master': 'openai/gpt-5.2-codex',
    'agent-builder': 'anthropic/claude-opus-4-5',
    'module-builder': 'anthropic/claude-opus-4-5',
    'workflow-builder': 'anthropic/claude-opus-4-5',
    analyst: 'anthropic/claude-sonnet-4-5',
    architect: 'openai/gpt-5.2-codex',
    dev: 'zhipuai-coding-plan/glm-4.7',
    pm: 'openai/gpt-5.2-codex',
    'quick-flow-solo-dev': 'zhipuai-coding-plan/glm-4.7',
    sm: 'openai/gpt-5.2-codex',
    tea: 'opencode/minimax-m2.1-free',
    'tech-writer': 'google/antigravity-gemini-3-flash',
    'ux-designer': 'google/antigravity-gemini-3-pro',
    'brainstorming-coach': 'google/antigravity-gemini-3-pro',
    'creative-problem-solver': 'google/antigravity-gemini-3-pro',
    'design-thinking-coach': 'google/antigravity-gemini-3-pro',
    'innovation-strategist': 'google/antigravity-gemini-3-pro',
    'presentation-master': 'google/antigravity-gemini-3-pro',
    storyteller: 'google/antigravity-gemini-3-pro',
  },

  premium: {
    'bmad-master': 'openai/gpt-5.2-codex',
    'agent-builder': 'anthropic/claude-opus-4-5',
    'module-builder': 'anthropic/claude-opus-4-5',
    'workflow-builder': 'anthropic/claude-opus-4-5',
    analyst: 'anthropic/claude-opus-4-5',
    architect: 'anthropic/claude-opus-4-5',
    dev: 'openai/gpt-5.2-codex',
    pm: 'openai/gpt-5.2-codex',
    'quick-flow-solo-dev': 'openai/gpt-5.2-codex',
    sm: 'openai/gpt-5.2-codex',
    tea: 'openai/gpt-5.2-codex',
    'tech-writer': 'openai/gpt-5.2-codex',
    'ux-designer': 'anthropic/claude-opus-4-5',
    'brainstorming-coach': 'anthropic/claude-opus-4-5',
    'creative-problem-solver': 'anthropic/claude-opus-4-5',
    'design-thinking-coach': 'anthropic/claude-opus-4-5',
    'innovation-strategist': 'anthropic/claude-opus-4-5',
    'presentation-master': 'anthropic/claude-opus-4-5',
    storyteller: 'anthropic/claude-opus-4-5',
  },
};

/** All valid tier preset names. */
export const VALID_TIERS: readonly TierPreset[] = ['budget', 'standard', 'premium'] as const;
