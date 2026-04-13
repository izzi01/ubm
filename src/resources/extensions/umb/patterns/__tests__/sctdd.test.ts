import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, it } from 'vitest';
import SCTDDGate from '../sctdd.js';

describe('sctdd pattern', () => {
  it('detects readiness when spec, context, and test baseline exist', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sctdd-ready-'));
    try {
      writeFileSync(join(root, 'PRD.md'), '# spec');
      writeFileSync(join(root, 'AGENTS.md'), '# context');
      mkdirSync(join(root, '__tests__'), { recursive: true });
      writeFileSync(join(root, '__tests__/smoke.test.ts'), 'test("x",()=>{})');

      const gate = new SCTDDGate();
      const ctx = await gate.check(root);

      expect(ctx.hasSpec).toBe(true);
      expect(ctx.hasContext).toBe(true);
      expect(ctx.hasTestBaseline).toBe(true);
      expect(gate.isReady(ctx)).toBe(true);
      expect(gate.report(ctx)).toContain('Ready for implementation');
      expect(() => gate.block(ctx)).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports and blocks when requirements are missing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sctdd-missing-'));
    try {
      const gate = new SCTDDGate();
      const ctx = await gate.check(root);

      expect(gate.isReady(ctx)).toBe(false);
      const report = gate.report(ctx);
      expect(report).toContain('Spec:        ❌ Missing');
      expect(report).toContain('Context:     ❌ Missing');
      expect(report).toContain('Test Base:   ❌ Missing');
      expect(() => gate.block(ctx)).toThrow('SCTDD Gate: Cannot proceed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
