/**
 * Smoke tests for /umb commands: handleUmbHelp and handleUmbModel.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { handleUmbHelp, handleUmbModel } from "../commands/umb-commands.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-commands-test-"));
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

// ─── handleUmbHelp ──────────────────────────────────────────────────────────

test("handleUmbHelp shows usage widget with /umb model hint", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  await handleUmbHelp("", ctx as any);

  assert.equal(ctx.widgets.length, 1);
  assert.equal(ctx.widgets[0].id, "umb");
  const text = ctx.widgets[0].lines.join("\n");
  assert.ok(text.includes("Umbrella Blade Commands"), `Expected "Umbrella Blade Commands" in:\n${text}`);
  assert.ok(text.includes("/umb model"), `Expected "/umb model" hint in:\n${text}`);

  rmSync(dir, { recursive: true, force: true });
});

// ─── handleUmbModel ─────────────────────────────────────────────────────────

test("handleUmbModel shows config hint when no config file exists", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  await handleUmbModel("", ctx as any);

  // Should notify with warning
  assert.ok(
    ctx.notifications.some(n => n.msg.includes("No model configuration")),
    `Expected warning notification, got: ${JSON.stringify(ctx.notifications)}`
  );

  // Should show widget with instructions
  assert.ok(ctx.widgets.length >= 1);
  const modelWidget = ctx.widgets.find(w => w.id === "umb-model");
  assert.notEqual(modelWidget, undefined);
  const text = modelWidget!.lines.join("\n");
  assert.ok(text.includes(".umb/models.yaml"), `Expected config path hint in:\n${text}`);

  rmSync(dir, { recursive: true, force: true });
});

test("handleUmbModel shows config widget with tier badge and agent assignments", async () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), [
    "tier: standard",
    "",
    "agents:",
    "  dev: google/custom-dev-model",
  ].join("\n"));

  const ctx = createMockCtx(dir);

  try {
    await handleUmbModel("", ctx as any);

    // Should have a success/info notification
    assert.ok(
      ctx.notifications.some(n => n.msg.includes("agent(s) configured") || n.msg.includes("agent(s)")),
      `Expected info notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    // Should show widget with tier badge
    const modelWidget = ctx.widgets.find(w => w.id === "umb-model");
    assert.notEqual(modelWidget, undefined);
    const text = modelWidget!.lines.join("\n");
    assert.ok(text.includes("[standard]"), `Expected tier badge "[standard]" in:\n${text}`);

    // Should show user override
    assert.ok(text.includes("custom-dev-model"), `Expected model in:\n${text}`);
    assert.ok(text.includes("dev"), `Expected agent "dev" in:\n${text}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleUmbModel shows warnings for unknown agents", async () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), [
    "agents:",
    "  not-a-real-agent: google/gemini-3-pro",
  ].join("\n"));

  const ctx = createMockCtx(dir);

  try {
    await handleUmbModel("", ctx as any);

    // Should have a warning notification
    assert.ok(
      ctx.notifications.some(n => n.level === "warning"),
      `Expected warning notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    // Widget should include warning text
    const modelWidget = ctx.widgets.find(w => w.id === "umb-model");
    assert.notEqual(modelWidget, undefined);
    const text = modelWidget!.lines.join("\n");
    assert.ok(
      text.includes("not-a-real-agent") && text.includes("not a recognized"),
      `Expected unknown agent warning in:\n${text}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
