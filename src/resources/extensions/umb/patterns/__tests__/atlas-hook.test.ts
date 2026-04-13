import { describe, expect, it } from 'vitest';
import {
  AtlasHookImpl,
  DelegationCategory,
  DelegationSkills,
} from '../atlas-hook.js';

describe('atlas-hook pattern', () => {
  const hook = new AtlasHookImpl();

  it('delegates UI work to visual-engineering with frontend skill', () => {
    const decision = hook.shouldDelegate({ description: 'Create responsive navbar component' });
    expect(decision).toEqual({
      delegate: true,
      category: DelegationCategory.VisualEngineering,
      skills: [DelegationSkills.FrontendUiUx],
    });
  });

  it('delegates git work to quick with git-master', () => {
    const decision = hook.shouldDelegate({ description: 'git commit and push changes' });
    expect(decision).toEqual({
      delegate: true,
      category: DelegationCategory.Quick,
      skills: [DelegationSkills.GitMaster],
    });
  });

  it('delegates browser work to quick with browser skills', () => {
    const decision = hook.shouldDelegate({ description: 'Take screenshot with playwright browser' });
    expect(decision).toEqual({
      delegate: true,
      category: DelegationCategory.Quick,
      skills: [DelegationSkills.Playwright, DelegationSkills.AgentBrowser],
    });
  });

  it('allows simple coordination to execute directly', () => {
    const decision = hook.shouldDelegate({ description: 'read file and check status' });
    expect(decision).toEqual({ delegate: false, reason: 'Simple coordination task' });
  });

  it('delegates ambiguous requests by default', () => {
    const decision = hook.shouldDelegate({ description: 'perform unknown workflow' });
    expect(decision).toEqual({
      delegate: true,
      category: DelegationCategory.UnspecifiedLow,
      skills: [],
    });
  });
});
