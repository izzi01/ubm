/**
 * Smoke tests for /skill commands: handleSkillHelp, handleSkillList, handleSkillNew.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { handleSkillHelp, handleSkillList, handleSkillNew } from "../commands/skill-commands.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-skill-commands-test-"));
}

function createMockCtx(cwd: string) {
  const notifications: Array<{ msg: string; level: string }> = [];
  const widgets: Array<{ id: string; lines: string[] }> = [];
  return {
    cwd,
    notifications,
    widgets,
    ui: {
      notify(msg: string, level: string) {
        notifications.push({ msg, level });
      },
      setWidget(id: string, lines: string[]) {
        widgets.push({ id, lines });
      },
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
  // Missing description — should fail validation
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

// ─── handleSkillHelp ────────────────────────────────────────────────────────

test("handleSkillHelp shows usage widget with list, new, run hints", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  await handleSkillHelp("", ctx as any);

  assert.equal(ctx.widgets.length, 1);
  assert.equal(ctx.widgets[0].id, "skill");
  const text = ctx.widgets[0].lines.join("\n");
  assert.ok(text.includes("Skill Commands"), `Expected "Skill Commands" in:\n${text}`);
  assert.ok(text.includes("/skill list"), `Expected "/skill list" in:\n${text}`);
  assert.ok(text.includes("/skill new"), `Expected "/skill new" in:\n${text}`);
  assert.ok(text.includes("/skill run"), `Expected "/skill run" in:\n${text}`);

  rmSync(dir, { recursive: true, force: true });
});

// ─── handleSkillList ────────────────────────────────────────────────────────

test("handleSkillList shows warning when no skills directory", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  await handleSkillList("", ctx as any);

  assert.ok(
    ctx.notifications.some(n => n.msg.includes("No skills found")),
    `Expected "No skills found" notification, got: ${JSON.stringify(ctx.notifications)}`
  );

  const widget = ctx.widgets.find(w => w.id === "skill-list");
  assert.notEqual(widget, undefined);
  assert.ok(
    widget!.lines.join("\n").includes("No skills found"),
    `Expected empty state message in widget`
  );

  rmSync(dir, { recursive: true, force: true });
});

test("handleSkillList displays valid skills with checkmarks", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "test-skill-a", "A test skill");
  createValidSkill(dir, "test-skill-b", "Another skill");

  const ctx = createMockCtx(dir);

  try {
    await handleSkillList("", ctx as any);

    const widget = ctx.widgets.find(w => w.id === "skill-list");
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");

    assert.ok(text.includes("test-skill-a"), `Expected "test-skill-a" in:\n${text}`);
    assert.ok(text.includes("test-skill-b"), `Expected "test-skill-b" in:\n${text}`);
    assert.ok(text.includes("A test skill"), `Expected description in:\n${text}`);
    assert.match(text, /✅.*test-skill-a/, `Expected checkmark for test-skill-a in:\n${text}`);

    // Should notify with count
    assert.ok(
      ctx.notifications.some(n => n.msg.includes("2 skill")),
      `Expected "2 skill" in notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillList marks invalid skills with errors", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "good-skill", "A valid skill");
  createInvalidSkill(dir, "bad-skill"); // Missing description

  const ctx = createMockCtx(dir);

  try {
    await handleSkillList("", ctx as any);

    const widget = ctx.widgets.find(w => w.id === "skill-list");
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");

    // Valid skill should have checkmark
    assert.match(text, /✅.*good-skill/, `Expected checkmark for good-skill in:\n${text}`);

    // Invalid skill should have X
    assert.match(text, /❌.*bad-skill/, `Expected X for bad-skill in:\n${text}`);

    // Should have warning notification about invalid skills
    assert.ok(
      ctx.notifications.some(n => n.level === "warning"),
      `Expected warning notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleSkillNew ─────────────────────────────────────────────────────────

test("handleSkillNew creates skill directory with SKILL.md", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillNew('my-new-skill "A brand new skill"', ctx as any);

    // Should notify success
    assert.ok(
      ctx.notifications.some(n => n.msg.includes("created successfully")),
      `Expected success notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    // Skill directory should exist
    const skillDir = join(dir, ".opencode", "skills", "my-new-skill");
    assert.ok(existsSync(skillDir), `Expected skill directory at ${skillDir}`);

    // SKILL.md should exist with correct content
    const skillMdPath = join(skillDir, "SKILL.md");
    assert.ok(existsSync(skillMdPath), `Expected SKILL.md at ${skillMdPath}`);
    const content = readFileSync(skillMdPath, "utf-8");
    assert.ok(content.includes("name: my-new-skill"), `Expected name in SKILL.md`);
    assert.ok(content.includes("description: A brand new skill"), `Expected description in SKILL.md`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillNew rejects invalid names", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillNew('Invalid_Name! "test"', ctx as any);

    // Should notify about invalid name
    assert.ok(
      ctx.notifications.some(n => n.msg.includes("Invalid name")),
      `Expected invalid name notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    // No skill directory should be created
    assert.ok(!existsSync(join(dir, ".opencode", "skills", "Invalid_Name!")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillNew rejects names with uppercase", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillNew('MySkill "test"', ctx as any);

    assert.ok(
      ctx.notifications.some(n => n.msg.includes("Invalid name")),
      `Expected invalid name notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillNew rejects duplicate names", async () => {
  const dir = createTestDir();
  createValidSkill(dir, "existing-skill", "Already here");

  const ctx = createMockCtx(dir);

  try {
    await handleSkillNew('existing-skill "Trying to duplicate"', ctx as any);

    assert.ok(
      ctx.notifications.some(n => n.msg.includes("already exists")),
      `Expected duplicate notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleSkillNew rejects missing description", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleSkillNew("name-only", ctx as any);

    assert.ok(
      ctx.notifications.some(n => n.msg.includes("description is required")),
      `Expected missing description notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
