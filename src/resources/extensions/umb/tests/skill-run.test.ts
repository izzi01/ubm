/**
 * Smoke tests for /skill run command.
 *
 * Tests the handleSkillRun handler with a mock ExtensionCommandContext.
 * Covers: usage hints, skill not found, invalid skill, model resolution,
 * session creation, cancellation, and error handling.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { handleSkillRun } from "../commands/skill-commands.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-skill-run-test-"));
}

function createMockCtx(cwd: string) {
  const notifications: Array<{ msg: string; level: string }> = [];
  const widgets: Array<{ id: string; lines: string[] }> = [];
  const sessionCalls: Array<{
    setup: (sm: any) => Promise<void>;
  }> = [];

  return {
    cwd,
    notifications,
    widgets,
    sessionCalls,
    ui: {
      notify(msg: string, level: string) {
        notifications.push({ msg, level });
      },
      setWidget(id: string, lines: string[]) {
        widgets.push({ id, lines });
      },
    },
    modelRegistry: {
      find(provider: string, modelId: string) {
        return { id: `${provider}/${modelId}`, name: modelId };
      },
    },
    newSession: async (opts: any) => {
      sessionCalls.push(opts);
      if (opts._shouldCancel) return { cancelled: true };
      if (opts._shouldThrow) throw new Error(opts._shouldThrow);
      return { cancelled: false };
    },
  };
}

function createValidSkill(dir: string, name: string, description: string): void {
  const skillDir = join(dir, ".opencode", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "---",
    "",
    `# ${name}`,
    "",
    description,
  ].join("\n"));
}

function createInvalidSkill(dir: string, name: string): void {
  const skillDir = join(dir, ".opencode", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), [
    "---",
    `name: ${name}`,
    "---",
    "",
    `# ${name}`,
  ].join("\n"));
}

function writeModelConfig(dir: string, content: string): void {
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), content, "utf-8");
}

function getWidget(ctx: any, id: string) {
  return ctx.widgets.find((w: any) => w.id === id);
}

// ─── handleSkillRun ────────────────────────────────────────────────────────

test("handleSkillRun shows usage hint when no args provided", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Usage")),
      `Expected Usage notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx, "skill-run");
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("Specify a skill"),
      `Expected usage hint in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun shows usage hint when only skill name provided (no message)", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("my-skill", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("message is required")),
      `Expected message required notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun shows error widget when skill not found", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("nonexistent Optimize my page", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("not found")),
      `Expected not found notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx, "skill-run");
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");
    assert.ok(text.includes("nonexistent"), `Expected skill name in widget`);
    assert.ok(text.includes("Available skills: none"), `Expected available skills in widget`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun shows error widget when skill is invalid", async () => {
  const dir = createTestDir();
  createInvalidSkill(dir, "bad-skill");
  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("bad-skill Do something", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("invalid")),
      `Expected invalid notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx, "skill-run");
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("validation errors"),
      `Expected validation errors in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun creates session with skill context when skill is valid", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "commit", "Create git commits");

  const capturedSetup: any = {};
  const ctx = createMockCtx(dir);
  ctx.newSession = async (opts: any) => {
    const mockSm = {
      appendModelChange: (p: string, m: string) => { capturedSetup.modelChange = { p, m }; },
      appendSessionInfo: (info: string) => { capturedSetup.sessionInfo = info; },
      appendMessage: (msg: any) => { capturedSetup.message = msg; },
    };
    await opts.setup(mockSm);
    ctx.sessionCalls.push(opts);
    return { cancelled: false };
  };

  try {
    await handleSkillRun("commit Fix the login bug", ctx as any, {} as any);

    assert.equal(ctx.sessionCalls.length, 1, `Expected 1 session call, got ${ctx.sessionCalls.length}`);

    // Session info should include skill name
    assert.equal(capturedSetup.sessionInfo, "skill: commit");

    // Message should have skill context
    assert.equal(capturedSetup.message.role, "user");
    assert.ok(capturedSetup.message.content.includes("## Skill: commit"));
    assert.ok(capturedSetup.message.content.includes("Fix the login bug"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun session setup includes skill context in the message", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "commit", "Create git commits");

  const capturedMessage: any = {};
  const ctx = createMockCtx(dir);
  ctx.newSession = async (opts: any) => {
    const mockSm = {
      appendModelChange: () => {},
      appendSessionInfo: () => {},
      appendMessage: (msg: any) => { capturedMessage.msg = msg; },
    };
    await opts.setup(mockSm);
    ctx.sessionCalls.push(opts);
    return { cancelled: false };
  };

  try {
    await handleSkillRun("commit Fix the login bug", ctx as any, {} as any);

    // Verify the full SKILL.md content is included in the session message
    assert.ok(capturedMessage.msg.content.includes("## Skill: commit"));
    assert.ok(capturedMessage.msg.content.includes("Create git commits"));
    assert.ok(capturedMessage.msg.content.includes("## User Message"));
    assert.ok(capturedMessage.msg.content.includes("Fix the login bug"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun resolves model from .umb/models.yaml when skill has assignment", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "seo-mastery", "SEO expert skill");
  writeModelConfig(dir, "skills:\n  seo-mastery: openai/gpt-4o\n");

  const ctx = createMockCtx(dir);
  const registryCalls: Array<{ provider: string; modelId: string }> = [];
  ctx.modelRegistry.find = (provider: string, modelId: string) => {
    registryCalls.push({ provider, modelId });
    return { id: `${provider}/${modelId}`, name: modelId };
  };

  try {
    await handleSkillRun("seo-mastery Analyze my keywords", ctx as any, {} as any);

    assert.ok(
      registryCalls.some((c) => c.provider === "openai" && c.modelId === "gpt-4o"),
      `Expected modelRegistry.find('openai', 'gpt-4o'), got: ${JSON.stringify(registryCalls)}`
    );

    assert.equal(ctx.sessionCalls.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun skips model change when no skill-specific model configured", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "commit", "Create commits");
  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("commit Make a commit", ctx as any, {} as any);

    assert.equal(ctx.sessionCalls.length, 1);
    // No model config means no model registry lookup happens
    // Session should be created successfully without model change
    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("session started")),
      `Expected session started notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun shows error when model not found in registry", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "research", "Research skill");
  writeModelConfig(dir, "skills:\n  research: fake-provider/nonexistent-model\n");

  const ctx = createMockCtx(dir);
  ctx.modelRegistry.find = () => undefined as any;

  try {
    await handleSkillRun("research Investigate React 19", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("not found in registry")),
      `Expected not found in registry notification, got: ${JSON.stringify(ctx.notifications)}`
    );
    assert.equal(ctx.sessionCalls.length, 0, "Session should not be created");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun handles cancelled session", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "commit", "Create commits");
  const ctx = createMockCtx(dir);
  ctx.newSession = async (opts: any) => {
    ctx.sessionCalls.push(opts);
    return { cancelled: true };
  };

  try {
    await handleSkillRun("commit Fix typo", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("cancelled")),
      `Expected cancelled notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx, "skill-run");
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("cancelled"),
      `Expected cancelled in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun shows error for model string without / separator", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "bad-model", "Bad model format");
  writeModelConfig(dir, "skills:\n  bad-model: invalidmodelstring\n");

  const ctx = createMockCtx(dir);

  try {
    await handleSkillRun("bad-model Do something", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Invalid model format")),
      `Expected Invalid model format notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    assert.equal(ctx.sessionCalls.length, 0, "Session should not be created");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillRun handles session creation throwing exception", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "commit", "Create commits");
  const ctx = createMockCtx(dir);
  ctx.newSession = async () => {
    throw new Error("Session engine error");
  };

  try {
    await handleSkillRun("commit Fix bug", ctx as any, {} as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Failed to start session")),
      `Expected Failed to start session notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx, "skill-run");
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("Session engine error"),
      `Expected error message in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
