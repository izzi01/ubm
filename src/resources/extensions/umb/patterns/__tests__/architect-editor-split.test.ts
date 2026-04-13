import { describe, expect, it } from 'vitest';
import ArchitectEditorSplit, { Phase } from '../architect-editor-split.js';

describe('architect-editor-split pattern', () => {
  it('starts in architect phase with read-only tool access', () => {
    const split = new ArchitectEditorSplit();
    expect(split.currentPhase).toBe(Phase.ARCHITECT);
    expect(split.getToolAccess()).toEqual({
      canRead: true,
      canGrep: true,
      canLSP: true,
      canEdit: false,
      canWrite: false,
      canBash: false,
    });
    expect(() => split.assertCanWrite()).toThrow('Write operations not allowed');
  });

  it('creates plan and transitions to editor phase', () => {
    const split = new ArchitectEditorSplit();
    const plan = split.createPlan({ files: ['src/a.ts'], functions: ['run'], planPath: 'PLAN.md' });

    expect(plan.files).toEqual(['src/a.ts']);
    split.transitionToEditor();

    expect(split.currentPhase).toBe(Phase.EDITOR);
    expect(() => split.assertCanWrite()).not.toThrow();
    expect(() => split.assertCanEdit()).not.toThrow();
    expect(() => split.assertCanBash()).not.toThrow();
  });

  it('validates implementation files against plan and can reset', () => {
    const split = new ArchitectEditorSplit();
    split.createPlan({ files: ['src/a.ts', 'src/b.ts'] });

    const valid = split.validateImplementation(['src/a.ts']);
    expect(valid).toEqual({ valid: true, deviations: [] });

    const invalid = split.validateImplementation(['src/c.ts']);
    expect(invalid.valid).toBe(false);
    expect(invalid.deviations[0]).toContain('File not in plan: src/c.ts');

    const rendered = split.renderPlan();
    expect(rendered).toContain('# Implementation Plan');
    expect(rendered).toContain('## Files');

    split.reset();
    expect(split.currentPhase).toBe(Phase.ARCHITECT);
    expect(split.getPlan()).toBeNull();
  });
});
