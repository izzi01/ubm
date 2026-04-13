/**
 * Smoke tests for /bmad discovery commands and discovery-types utilities.
 *
 * Tests handleBmadDiscovery (shared handler for research/brief/prd/arch),
 * parseModelString, resolveDiscovery, and wrapper handlers.
 * Covers: topic parsing, error states, success flow, model resolution.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  handleBmadResearch,
  handleBmadBrief,
  handleBmadPrd,
  handleBmadArch,
} from "../commands/discovery-commands.js";
import {
  parseModelString,
  resolveDiscovery,
  DISCOVERY_TYPES,
} from "../commands/discovery-types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-discovery-test-"));
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
      return { cancelled: false };
    },
  };
}

function writeModelConfig(dir: string, content: string): void {
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), content, "utf-8");
}

function getWidget(ctx: any, id = "bmad-discovery") {
  return ctx.widgets.find((w: any) => w.id === id);
}

// ─── parseModelString ──────────────────────────────────────────────────────

test("parseModelString splits provider/modelId correctly", () => {
  const result = parseModelString("openai/gpt-5.2-codex");
  assert.deepEqual(result, { provider: "openai", modelId: "gpt-5.2-codex" });
});

test("parseModelString handles no-slash case", () => {
  const result = parseModelString("gpt-5.2-codex");
  assert.deepEqual(result, { provider: "", modelId: "gpt-5.2-codex" });
});

test("parseModelString handles multiple slashes — first slash is separator", () => {
  const result = parseModelString("org/sub/model-id");
  assert.deepEqual(result, { provider: "org", modelId: "sub/model-id" });
});

test("parseModelString handles empty string", () => {
  const result = parseModelString("");
  assert.deepEqual(result, { provider: "", modelId: "" });
});

// ─── resolveDiscovery ──────────────────────────────────────────────────────

test("resolveDiscovery returns correct agent, output path, and prompt for research", () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");

  try {
    const result = resolveDiscovery("research", "OAuth providers", dir);

    assert.equal(result.type.agent, "analyst");
    assert.equal(result.type.command, "research");
    assert.ok(result.outputPath.includes("research-oauth-providers.md"));
    assert.ok(result.prompt.includes("OAuth providers"));
    assert.ok(result.prompt.includes("research analysis"));
    assert.equal(result.modelString, "anthropic/claude-sonnet-4-5");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveDiscovery returns correct agent and prompt for brief", () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  pm: openai/gpt-5.2-codex");

  try {
    const result = resolveDiscovery("brief", "Mobile app MVP", dir);

    assert.equal(result.type.agent, "pm");
    assert.ok(result.prompt.includes("product brief"));
    assert.ok(result.outputPath.includes("brief-mobile-app-mvp.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveDiscovery returns correct agent and prompt for prd", () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  pm: openai/gpt-5.2-codex");

  try {
    const result = resolveDiscovery("prd", "Payment gateway", dir);

    assert.equal(result.type.agent, "pm");
    assert.ok(result.prompt.includes("Product Requirements Document"));
    assert.ok(result.outputPath.includes("prd-payment-gateway.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveDiscovery returns correct agent and prompt for arch", () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  architect: anthropic/claude-opus-4-5");

  try {
    const result = resolveDiscovery("arch", "Microservices migration", dir);

    assert.equal(result.type.agent, "architect");
    assert.ok(result.prompt.includes("system architecture"));
    assert.ok(result.outputPath.includes("arch-microservices-migration.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveDiscovery warns when no model config file exists", () => {
  const dir = createTestDir();

  try {
    const result = resolveDiscovery("research", "test topic", dir);

    assert.equal(result.modelString, null);
    assert.ok(result.warnings.length > 0);
    assert.ok(
      result.warnings.some((w) => w.includes("No model configuration")),
      `Expected no config warning, got: ${JSON.stringify(result.warnings)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — Usage ───────────────────────────────────────────

test("handleBmadResearch shows usage hint when no topic", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleBmadResearch("", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Usage")),
      `Expected Usage notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("research"),
      `Expected command name in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadBrief shows usage hint when no topic", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleBmadBrief("", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Usage")),
      `Expected Usage notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadPrd shows usage hint when no topic", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleBmadPrd("", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Usage")),
      `Expected Usage notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadArch shows usage hint when no topic", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleBmadArch("", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Usage")),
      `Expected Usage notification, got: ${JSON.stringify(ctx.notifications)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — No Model Error ──────────────────────────────────

test("handleBmadResearch shows no-model error when agent has no assignment", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  dev: google/gemini-3-pro");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadResearch("test topic", ctx as any);

    // research maps to 'analyst', but only 'dev' is configured
    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("No model configured")),
      `Expected no model notification, got: ${JSON.stringify(ctx.notifications)}`
    );
    assert.equal(ctx.sessionCalls.length, 0, "Session should not be created");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadArch shows no-model error when no config file exists", async () => {
  const dir = createTestDir();
  const ctx = createMockCtx(dir);

  try {
    await handleBmadArch("test topic", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("No model configured")),
      `Expected no model notification, got: ${JSON.stringify(ctx.notifications)}`
    );
    assert.equal(ctx.sessionCalls.length, 0, "Session should not be created");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — Model Not Found ─────────────────────────────────

test("handleBmadResearch shows model-not-found error when model missing from registry", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: unknown-provider/fake-model");
  const ctx = createMockCtx(dir);
  ctx.modelRegistry.find = () => undefined as any;

  try {
    await handleBmadResearch("test topic", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("not found in registry")),
      `Expected not found notification, got: ${JSON.stringify(ctx.notifications)}`
    );
    assert.equal(ctx.sessionCalls.length, 0, "Session should not be created");

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("unknown-provider/fake-model"),
      `Expected model string in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — Success Flow ────────────────────────────────────

test("handleBmadResearch creates session with correct model and prompt when configured", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadResearch("OAuth providers", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1, "Session should be created");

    // Verify notification
    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("claude-sonnet-4-5")),
      `Expected model in notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    // Verify widget
    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");
    assert.ok(text.includes("analyst"), `Expected agent name in widget`);
    assert.ok(text.includes("anthropic/claude-sonnet-4-5"), `Expected model in widget`);
    assert.ok(text.includes("OAuth providers"), `Expected topic in widget`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadBrief creates session with correct model and prompt when configured", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  pm: openai/gpt-5.2-codex");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadBrief("Mobile app MVP", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("gpt-5.2-codex")),
      `Expected model in notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");
    assert.ok(text.includes("pm"), `Expected agent name in widget`);
    assert.ok(text.includes("Mobile app MVP"), `Expected topic in widget`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadPrd creates session with correct model and prompt when configured", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  pm: openai/gpt-5.2-codex");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadPrd("Payment gateway", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");
    assert.ok(text.includes("Payment gateway"), `Expected topic in widget`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadArch creates session with correct model and prompt when configured", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  architect: anthropic/claude-opus-4-5");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadArch("Microservices migration", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    const text = widget!.lines.join("\n");
    assert.ok(text.includes("architect"), `Expected agent name in widget`);
    assert.ok(text.includes("claude-opus-4-5"), `Expected model in widget`);
    assert.ok(text.includes("Microservices migration"), `Expected topic in widget`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — Session Setup Verification ─────────────────────

test("handleBmadResearch session setup includes agent context", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");

  const capturedSetup: any = {};
  const ctx = createMockCtx(dir);
  ctx.newSession = async (opts: any) => {
    // Capture and execute the setup function
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
    await handleBmadResearch("AI trends", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);
    assert.deepEqual(capturedSetup.modelChange, { p: "anthropic", m: "claude-sonnet-4-5" });
    assert.equal(capturedSetup.sessionInfo, "research: AI trends");
    assert.equal(capturedSetup.message.role, "user");
    assert.ok(capturedSetup.message.content.includes("AI trends"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadBrief session setup includes agent context", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  pm: openai/gpt-5.2-codex");

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
    await handleBmadBrief("Healthcare app", ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);
    assert.deepEqual(capturedSetup.modelChange, { p: "openai", m: "gpt-5.2-codex" });
    assert.equal(capturedSetup.sessionInfo, "brief: Healthcare app");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── handleBmadDiscovery — Error Handling ──────────────────────────────────

test("handleBmadResearch handles cancelled session", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");
  const ctx = createMockCtx(dir);
  ctx.newSession = async (opts: any) => {
    ctx.sessionCalls.push(opts);
    return { cancelled: true };
  };

  try {
    await handleBmadResearch("test topic", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("cancelled")),
      `Expected cancelled notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("cancelled"),
      `Expected cancelled in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadResearch handles session creation failure", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");
  const ctx = createMockCtx(dir);
  ctx.newSession = async () => {
    throw new Error("Session engine error");
  };

  try {
    await handleBmadResearch("test topic", ctx as any);

    assert.ok(
      ctx.notifications.some((n) => n.msg.includes("Failed to start session")),
      `Expected Failed to start session notification, got: ${JSON.stringify(ctx.notifications)}`
    );

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("Session engine error"),
      `Expected error in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadResearch handles model string with no slash", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: gpt-5.2-codex");
  const ctx = createMockCtx(dir);

  const registryCalls: Array<{ provider: string; modelId: string }> = [];
  ctx.modelRegistry.find = (provider: string, modelId: string) => {
    registryCalls.push({ provider, modelId });
    return { id: `${provider}/${modelId}`, name: modelId };
  };

  try {
    await handleBmadResearch("bare model test", ctx as any);

    // parseModelString('gpt-5.2-codex') → provider='', modelId='gpt-5.2-codex'
    assert.ok(
      registryCalls.some((c) => c.provider === "" && c.modelId === "gpt-5.2-codex"),
      `Expected find('', 'gpt-5.2-codex'), got: ${JSON.stringify(registryCalls)}`
    );
    assert.equal(ctx.sessionCalls.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handleBmadResearch accepts quoted topic strings", async () => {
  const dir = createTestDir();
  writeModelConfig(dir, "agents:\n  analyst: anthropic/claude-sonnet-4-5");
  const ctx = createMockCtx(dir);

  try {
    await handleBmadResearch('"OAuth 2.0 providers"', ctx as any);

    assert.equal(ctx.sessionCalls.length, 1);

    const widget = getWidget(ctx);
    assert.notEqual(widget, undefined);
    assert.ok(
      widget!.lines.join("\n").includes("OAuth 2.0 providers"),
      `Expected unquoted topic in widget`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
