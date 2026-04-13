/**
 * Tests for /bmad slash command handlers.
 *
 * Tests handleBmadRun, handleBmadSkills, handleBmadAutoAnalysis, handleBmadAuto
 * with mock ExtensionCommandContext. Covers: usage hints, skill not found, missing
 * message, fuzzy matching, session creation, cancellation, errors, skill listing,
 * pipeline execution, auto-phase routing, umbrella mode, and stop-after flag.
 */

import { describe, test, expect } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  handleBmadRun,
  handleBmadSkills,
  handleBmadAutoAnalysis,
  handleBmadAutoPlanning,
  handleBmadAutoSolutioning,
  handleBmadAutoImplementation,
  handleBmadAuto,
  executeAutoPipeline,
} from "../commands/bmad-commands.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-bmad-cmd-test-"));
}

function cleanupTestDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function createSkill(
  base: string,
  phase: string,
  skillName: string,
  opts: {
    description?: string;
    promptFiles?: Array<{ name: string; content: string }>;
    agentFiles?: Array<{ name: string; content: string }>;
    module?: string;
  } = {},
): void {
  const module = opts.module || "bmm";
  const skillDir = module === "core"
    ? join(base, "_bmad", "core", skillName)
    : join(base, "_bmad", module, phase, skillName);
  mkdirSync(skillDir, { recursive: true });

  const frontmatterLines = [
    "---",
    `name: ${skillName}`,
    ...(opts.description ? [`description: ${opts.description}`] : []),
    "---",
  ];

  const body = `# ${skillName}\n\nThis is the skill instructions for ${skillName}.\n`;
  writeFileSync(
    join(skillDir, "SKILL.md"),
    [...frontmatterLines, "", body].join("\n"),
  );

  if (opts.promptFiles) {
    const promptsDir = join(skillDir, "prompts");
    mkdirSync(promptsDir, { recursive: true });
    for (const pf of opts.promptFiles) {
      writeFileSync(join(promptsDir, pf.name), pf.content);
    }
  }

  if (opts.agentFiles) {
    const agentsDir = join(skillDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    for (const af of opts.agentFiles) {
      writeFileSync(join(agentsDir, af.name), af.content);
    }
  }
}

function createConfig(dir: string, values: Record<string, string>): void {
  const bmmDir = join(dir, "_bmad", "bmm");
  mkdirSync(bmmDir, { recursive: true });
  const lines = Object.entries(values).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(join(bmmDir, "config.yaml"), lines.join("\n") + "\n");
}

function createMockCtx(cwd: string) {
  const notifications: Array<{ msg: string; level: string }> = [];
  const widgets: Array<{ id: string; lines: string[] }> = [];
  const sessionCalls: Array<{ setup: (sm: any) => Promise<void> }> = [];

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
    newSession: async (opts: any) => {
      sessionCalls.push(opts);
      if (opts._shouldCancel) return { cancelled: true };
      if (opts._shouldThrow) throw new Error(opts._shouldThrow);
      return { cancelled: false };
    },
  };
}

function getWidget(ctx: any, id: string) {
  return ctx.widgets.find((w: any) => w.id === id);
}

function getWidgetText(ctx: any, id: string): string {
  const widget = getWidget(ctx, id);
  return widget ? widget.lines.join("\n") : "";
}

/** Create all skills for a given set of phases in a test directory. */
function createAllSkillsForPhases(
  dir: string,
  phases: Array<{
    phase: string;
    skills: Array<{ name: string; desc: string }>;
  }>,
): void {
  for (const p of phases) {
    for (const s of p.skills) {
      createSkill(dir, p.phase, s.name, { description: s.desc });
    }
  }
}

/** Setup mock context that captures session calls. */
function setupSessionMock(ctx: any) {
  ctx.newSession = async (opts: any) => {
    const mockSm = {
      appendSessionInfo: () => {},
      appendMessage: () => {},
    };
    await opts.setup(mockSm);
    ctx.sessionCalls.push(opts);
    return { cancelled: false };
  };
}

// ─── handleBmadRun — usage hints ──────────────────────────────────────────

describe("handleBmadRun", () => {
  test("shows usage hint when no args provided", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);

    try {
      await handleBmadRun("", ctx as any);

      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Specify a skill name");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage hint when only skill name provided (no message)", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    const ctx = createMockCtx(dir);

    try {
      await handleBmadRun("product-brief", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("message is required"))).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadRun — skill not found ──────────────────────────────────────

describe("handleBmadRun — skill not found", () => {
  test("shows error widget when skill not found", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);

    try {
      await handleBmadRun("nonexistent Do something", ctx as any);

      expect(ctx.notifications.some((n) => n.msg.includes("not found"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("nonexistent");
      expect(text).toContain("Available skills: none");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadRun — session creation ─────────────────────────────────────

describe("handleBmadRun — session creation", () => {
  test("creates session with composed prompt from matched skill", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      promptFiles: [
        { name: "discovery.md", content: "# Discovery\nFind artifacts." },
      ],
      agentFiles: [
        { name: "reviewer.md", content: "# Reviewer\nChallenge assumptions." },
      ],
    });
    createConfig(dir, { user_name: "TestUser" });

    const capturedMessage: any = {};
    const ctx = createMockCtx(dir);
    ctx.newSession = async (opts: any) => {
      const mockSm = {
        appendSessionInfo: (info: string) => {},
        appendMessage: (msg: any) => {
          capturedMessage.msg = msg;
        },
      };
      await opts.setup(mockSm);
      ctx.sessionCalls.push(opts);
      return { cancelled: false };
    };

    try {
      await handleBmadRun("product-brief Build an OAuth provider", ctx as any);

      expect(ctx.sessionCalls.length).toBe(1);
      expect(capturedMessage.msg.content).toContain("bmad-product-brief");
      expect(capturedMessage.msg.content).toContain("# Skill: bmad-product-brief");
      expect(capturedMessage.msg.content).toContain("Create product briefs");
      expect(capturedMessage.msg.content).toContain("## Configuration");
      expect(capturedMessage.msg.content).toContain("user_name: TestUser");
      expect(capturedMessage.msg.content).toContain("## Skill Instructions");
      expect(capturedMessage.msg.content).toContain("## Stage Prompts");
      expect(capturedMessage.msg.content).toContain("### discovery");
      expect(capturedMessage.msg.content).toContain("## Agent Definitions");
      expect(capturedMessage.msg.content).toContain("### reviewer");
      expect(capturedMessage.msg.content).toContain("## User Request");
      expect(capturedMessage.msg.content).toContain("Build an OAuth provider");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("supports fuzzy matching (suffix match)", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });

    const capturedMessage: any = {};
    const ctx = createMockCtx(dir);
    ctx.newSession = async (opts: any) => {
      const mockSm = {
        appendSessionInfo: () => {},
        appendMessage: (msg: any) => {
          capturedMessage.msg = msg;
        },
      };
      await opts.setup(mockSm);
      ctx.sessionCalls.push(opts);
      return { cancelled: false };
    };

    try {
      await handleBmadRun("brief Write a product brief for auth system", ctx as any);
      expect(ctx.sessionCalls.length).toBe(1);
      expect(capturedMessage.msg.content).toContain("bmad-product-brief");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows success widget with skill metadata", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      promptFiles: [
        { name: "discovery.md", content: "# Discovery" },
        { name: "elicitation.md", content: "# Elicitation" },
      ],
      agentFiles: [
        { name: "skeptic.md", content: "# Skeptic" },
      ],
    });
    createConfig(dir, { user_name: "TestUser", output_folder: "/tmp/out" });

    const ctx = createMockCtx(dir);

    try {
      await handleBmadRun("product-brief Build OAuth provider", ctx as any);
      expect(ctx.sessionCalls.length).toBe(1);
      expect(ctx.notifications.some((n) => n.msg.includes("session started"))).toBe(true);

      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("bmad-product-brief");
      expect(text).toContain("Create product briefs");
      expect(text).toContain("Build OAuth provider");
      expect(text).toContain("2 prompt file(s)");
      expect(text).toContain("1 agent definition(s)");
      expect(text).toContain("2 variable(s)");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadRun — cancellation and errors ──────────────────────────────

describe("handleBmadRun — error handling", () => {
  test("handles cancelled session", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    const ctx = createMockCtx(dir);
    ctx.newSession = async (opts: any) => {
      ctx.sessionCalls.push(opts);
      return { cancelled: true };
    };

    try {
      await handleBmadRun("product-brief Do something", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("cancelled"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("cancelled");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows error when session creation throws", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    const ctx = createMockCtx(dir);
    ctx.newSession = async () => {
      throw new Error("Session engine failure");
    };

    try {
      await handleBmadRun("product-brief Do something", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Failed to start"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("Session engine failure");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadRun — no session on validation failure ────────────────────

describe("handleBmadRun — validation", () => {
  test("does not create session when skill not found", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadRun("nonexistent Some message", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("does not create session when no message provided", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    const ctx = createMockCtx(dir);
    try {
      await handleBmadRun("product-brief", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("does not create session when no args provided", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadRun("", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadSkills ─────────────────────────────────────────────────────

describe("handleBmadSkills", () => {
  test("shows warning when no skills found", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadSkills("", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("No BMAD skills found"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("No BMAD skills found");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("lists skills grouped by module", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "1-analysis", "bmad-product-brief", {
        description: "Create product briefs",
      });
      createSkill(dir, "2-plan-workflows", "bmad-prd", {
        description: "Create PRDs",
      });
      createSkill(dir, "core", "bmad-help", {
        description: "Help system",
        module: "core",
      });

      const ctx = createMockCtx(dir);
      await handleBmadSkills("", ctx as any);

      expect(ctx.notifications.some((n) => n.msg.includes("3 BMAD skill"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("bmad-product-brief");
      expect(text).toContain("Create product briefs");
      expect(text).toContain("bmad-prd");
      expect(text).toContain("bmad-help");
      expect(text).toContain("Business Management");
      expect(text).toContain("Core");
      expect(text).toContain("Total: 3 skill(s)");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("includes prompt and agent counts", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "1-analysis", "bmad-full-skill", {
        description: "A full skill",
        promptFiles: [
          { name: "stage1.md", content: "# Stage 1" },
          { name: "stage2.md", content: "# Stage 2" },
          { name: "stage3.md", content: "# Stage 3" },
        ],
        agentFiles: [
          { name: "reviewer.md", content: "# Reviewer" },
          { name: "skeptic.md", content: "# Skeptic" },
        ],
      });

      const ctx = createMockCtx(dir);
      await handleBmadSkills("", ctx as any);

      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("3 prompt(s)");
      expect(text).toContain("2 agent(s)");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("omits bracket metadata when skill has no prompts/agents", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "1-analysis", "bmad-minimal", {
        description: "Minimal skill",
      });

      const ctx = createMockCtx(dir);
      await handleBmadSkills("", ctx as any);

      const text = getWidgetText(ctx, "bmad");
      expect(text).not.toContain("[0 prompt(s)]");
      expect(text).not.toContain("[0 agent(s)]");
      expect(text).not.toContain("prompt(s)");
      expect(text).not.toContain("agent(s)");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── Integration: real _bmad/ directory ───────────────────────────────────

describe("handleBmadRun — integration with real _bmad/", () => {
  test("works against real bmad-product-brief skill", async () => {
    const projectRoot = process.cwd();

    const capturedMessage: any = {};
    const ctx = createMockCtx(projectRoot);
    ctx.newSession = async (opts: any) => {
      const mockSm = {
        appendSessionInfo: (info: string) => {},
        appendMessage: (msg: any) => {
          capturedMessage.msg = msg;
        },
      };
      await opts.setup(mockSm);
      ctx.sessionCalls.push(opts);
      return { cancelled: false };
    };

    await handleBmadRun("product-brief OAuth provider", ctx as any);

    expect(ctx.sessionCalls.length).toBe(1);
    const prompt = capturedMessage.msg.content;
    expect(prompt).toContain("# Skill: bmad-product-brief");
    expect(prompt).toContain("## Configuration");
    expect(prompt).toContain("## Skill Instructions");
    expect(prompt).toContain("## Stage Prompts");
    expect(prompt).toContain("## Agent Definitions");
    expect(prompt).toContain("## User Request");
    expect(prompt).toContain("OAuth provider");
    expect(prompt).toContain("user_name: Cid");
    expect(prompt.length).toBeGreaterThan(2000);
  });
});

describe("handleBmadSkills — integration with real _bmad/", () => {
  test("works against real _bmad/ directory", async () => {
    const projectRoot = process.cwd();
    const ctx = createMockCtx(projectRoot);

    await handleBmadSkills("", ctx as any);

    expect(ctx.notifications.some((n) => n.msg.match(/\d+ BMAD skill/))).toBe(true);
    const text = getWidgetText(ctx, "bmad");
    expect(text).toContain("bmad-product-brief");
    expect(text).toContain("Total:");
  });
});

// ─── handleBmadAutoAnalysis (delegates to executeAutoPipeline) ────────────

describe("handleBmadAutoAnalysis", () => {
  test("shows usage with no args", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoAnalysis("", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Auto-Analysis");
      expect(text).toContain("bmad-domain-research");
      expect(text).toContain("6 stage");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage with 'help'", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoAnalysis("help", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("--list");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows pipeline stages with --list", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoAnalysis("--list", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("pipeline"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Available Pipelines");
      expect(text).toContain("Phase 1 Analysis");
      expect(text).toContain("bmad-domain-research");
      expect(text).toContain("bmad-market-research");
      expect(text).toContain("bmad-technical-research");
      expect(text).toContain("bmad-product-brief");
      expect(text).toContain("bmad-prfaq");
      expect(text).toContain("bmad-document-project");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows dry-run stages without creating sessions with --dry-run", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoAnalysis("--dry-run", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0, "No sessions should be created in dry-run");
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Dry Run");
      expect(text).toContain("✅ bmad-domain-research");
      expect(text).toContain("✅ bmad-market-research");
      expect(text).toContain("✅ bmad-technical-research");
      expect(text).toContain("✅ bmad-product-brief");
      expect(text).toContain("✅ bmad-prfaq");
      expect(text).toContain("✅ bmad-document-project");
      expect(text).toContain("completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("creates sessions for each stage with user message", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research the domain" },
        { name: "bmad-market-research", desc: "Analyze the market" },
        { name: "bmad-technical-research", desc: "Technical feasibility" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Create product brief" },
        { name: "bmad-prfaq", desc: "Press release FAQ" },
        { name: "bmad-document-project", desc: "Document the project" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoAnalysis("Build a REST API", ctx as any);
      expect(ctx.sessionCalls.length).toBe(6, "Should create 6 sessions for 6 stages");

      for (const call of ctx.sessionCalls) {
        expect(call.setup).toBeDefined();
      }
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows progress widget during pipeline execution", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research the domain" },
        { name: "bmad-market-research", desc: "Analyze the market" },
        { name: "bmad-technical-research", desc: "Technical feasibility" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Create product brief" },
        { name: "bmad-prfaq", desc: "Press release FAQ" },
        { name: "bmad-document-project", desc: "Document the project" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoAnalysis("Build a REST API", ctx as any);

      expect(ctx.widgets.length).toBeGreaterThanOrEqual(2);

      const startWidget = ctx.widgets[0];
      expect(startWidget.lines.join("\n")).toContain("Starting");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("✅");
      expect(finalText).toContain("Summary");
      expect(finalText).toContain("6 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows failed stage in summary when pipeline fails", async () => {
    const dir = createTestDir();
    createSkill(dir, "1-analysis/research", "bmad-domain-research", {
      description: "Research the domain",
    });
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoAnalysis("Build a REST API", ctx as any);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("❌");
      expect(finalText).toContain("bmad-market-research");
      expect(finalText).toContain("not found");
      expect(ctx.notifications.some((n) => n.level === "error")).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAutoPlanning (delegates to executeAutoPipeline) ────────────

describe("handleBmadAutoPlanning", () => {
  test("shows usage with no args", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoPlanning("", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Auto-Planning");
      expect(text).toContain("bmad-create-prd");
      expect(text).toContain("bmad-create-ux-design");
      expect(text).toContain("2 stage");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage with 'help'", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoPlanning("help", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("--list");
      expect(getWidgetText(ctx, "bmad")).toContain("--dry-run");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows pipeline stages with --list", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoPlanning("--list", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("pipeline"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Available Pipelines");
      expect(text).toContain("Phase 2 Planning");
      expect(text).toContain("bmad-create-prd");
      expect(text).toContain("bmad-create-ux-design");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows dry-run stages without creating sessions with --dry-run", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoPlanning("--dry-run", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0, "No sessions should be created in dry-run");
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Dry Run");
      expect(text).toContain("✅ bmad-create-prd");
      expect(text).toContain("✅ bmad-create-ux-design");
      expect(text).toContain("completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("creates sessions for each stage with user message", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "2-plan-workflows", skills: [
        { name: "bmad-create-prd", desc: "Create a product requirements document" },
        { name: "bmad-create-ux-design", desc: "Plan UX patterns and design specifications" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoPlanning("Build a REST API", ctx as any);
      expect(ctx.sessionCalls.length).toBe(2, "Should create 2 sessions for 2 stages");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows progress widget during execution", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "2-plan-workflows", skills: [
        { name: "bmad-create-prd", desc: "Create a product requirements document" },
        { name: "bmad-create-ux-design", desc: "Plan UX patterns and design specifications" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoPlanning("Build a REST API", ctx as any);

      expect(ctx.widgets.length).toBeGreaterThanOrEqual(2);

      const startWidget = ctx.widgets[0];
      expect(startWidget.lines.join("\n")).toContain("Starting");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("✅");
      expect(finalText).toContain("Summary");
      expect(finalText).toContain("2 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows failed stage in summary when pipeline fails", async () => {
    const dir = createTestDir();
    createSkill(dir, "2-plan-workflows", "bmad-create-prd", {
      description: "Create a product requirements document",
    });
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoPlanning("Build a REST API", ctx as any);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("❌");
      expect(finalText).toContain("bmad-create-ux-design");
      expect(finalText).toContain("not found");
      expect(ctx.notifications.some((n) => n.level === "error")).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAutoSolutioning (delegates to executeAutoPipeline) ─────────

describe("handleBmadAutoSolutioning", () => {
  test("shows usage with no args", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoSolutioning("", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Auto-Solutioning");
      expect(text).toContain("bmad-create-architecture");
      expect(text).toContain("bmad-create-epics-and-stories");
      expect(text).toContain("bmad-check-implementation-readiness");
      expect(text).toContain("3 stage");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage with 'help'", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoSolutioning("help", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("--list");
      expect(getWidgetText(ctx, "bmad")).toContain("--dry-run");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows pipeline stages with --list", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoSolutioning("--list", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("pipeline"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Available Pipelines");
      expect(text).toContain("Phase 3 Solutioning");
      expect(text).toContain("bmad-create-architecture");
      expect(text).toContain("bmad-create-epics-and-stories");
      expect(text).toContain("bmad-check-implementation-readiness");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows dry-run stages without creating sessions with --dry-run", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoSolutioning("--dry-run", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0, "No sessions should be created in dry-run");
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Dry Run");
      expect(text).toContain("✅ bmad-create-architecture");
      expect(text).toContain("✅ bmad-create-epics-and-stories");
      expect(text).toContain("✅ bmad-check-implementation-readiness");
      expect(text).toContain("completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("creates sessions for each stage with user message", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "3-solutioning", skills: [
        { name: "bmad-create-architecture", desc: "Design system architecture" },
        { name: "bmad-create-epics-and-stories", desc: "Generate epics and user stories" },
        { name: "bmad-check-implementation-readiness", desc: "Verify implementation readiness" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoSolutioning("Build a REST API", ctx as any);
      expect(ctx.sessionCalls.length).toBe(3, "Should create 3 sessions for 3 stages");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows progress widget during execution", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "3-solutioning", skills: [
        { name: "bmad-create-architecture", desc: "Design system architecture" },
        { name: "bmad-create-epics-and-stories", desc: "Generate epics and user stories" },
        { name: "bmad-check-implementation-readiness", desc: "Verify implementation readiness" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoSolutioning("Build a REST API", ctx as any);

      expect(ctx.widgets.length).toBeGreaterThanOrEqual(2);

      const startWidget = ctx.widgets[0];
      expect(startWidget.lines.join("\n")).toContain("Starting");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("✅");
      expect(finalText).toContain("Summary");
      expect(finalText).toContain("3 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows failed stage in summary when pipeline fails", async () => {
    const dir = createTestDir();
    createSkill(dir, "3-solutioning", "bmad-create-architecture", {
      description: "Design system architecture",
    });
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoSolutioning("Build a REST API", ctx as any);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("❌");
      expect(finalText).toContain("bmad-create-epics-and-stories");
      expect(finalText).toContain("not found");
      expect(ctx.notifications.some((n) => n.level === "error")).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAuto — single-phase routing ────────────────────────────────

describe("handleBmadAuto", () => {
  test("shows available phases with no args", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("", ctx as any);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("analysis");
      expect(text).toContain("planning");
      expect(text).toContain("solutioning");
      expect(text).toContain("implementation");
      expect(text).not.toContain("coming soon");
      expect(text).toContain("✅");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows available phases with 'help'", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("help", ctx as any);
      expect(getWidgetText(ctx, "bmad")).toContain("analysis");
      expect(getWidgetText(ctx, "bmad")).not.toContain("coming soon");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("delegates to auto-analysis for 'analysis' phase", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("analysis Build a REST API", ctx as any);

      expect(ctx.widgets.length).toBeGreaterThanOrEqual(1);
      const lastWidget = ctx.widgets[ctx.widgets.length - 1];
      const text = lastWidget.lines.join("\n");
      expect(
        text.includes("Starting") || text.includes("Summary") || text.includes("Pipeline"),
      ).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("delegates to auto-planning for 'planning' phase", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("planning Design workflows", ctx as any);
      const text = getWidgetText(ctx, "bmad");
      expect(text).not.toContain("coming soon");
      expect(text).toContain("Planning Pipeline");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("delegates to auto-solutioning for 'solutioning' phase", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("solutioning Design architecture", ctx as any);
      const text = getWidgetText(ctx, "bmad");
      expect(text).not.toContain("coming soon");
      expect(text).toContain("Solutioning Pipeline");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows phase help when phase name given without message", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("analysis", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Auto-Analysis");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("delegates to auto-implementation for 'implementation' phase", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("implementation Build it", ctx as any);
      const text = getWidgetText(ctx, "bmad");
      expect(text).not.toContain("coming soon");
      expect(text).toContain("Implementation Pipeline");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAuto — umbrella mode (no phase specified) ─────────────────

describe("handleBmadAuto — umbrella mode", () => {
  test("runs all 4 phases when message has no phase prefix", async () => {
    const dir = createTestDir();
    // Create all skills for all 4 phases
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
      { phase: "2-plan-workflows", skills: [
        { name: "bmad-create-prd", desc: "PRD" },
        { name: "bmad-create-ux-design", desc: "UX" },
      ]},
      { phase: "3-solutioning", skills: [
        { name: "bmad-create-architecture", desc: "Architecture" },
        { name: "bmad-create-epics-and-stories", desc: "Epics" },
        { name: "bmad-check-implementation-readiness", desc: "Readiness" },
      ]},
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Sprint" },
        { name: "bmad-create-story", desc: "Story" },
        { name: "bmad-dev-story", desc: "Dev" },
        { name: "bmad-code-review", desc: "Review" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("Build a REST API", ctx as any);

      // Should create sessions for all 4 phases: 6 + 2 + 3 + 4 = 15
      expect(ctx.sessionCalls.length).toBe(15, "Should create 15 sessions across all 4 phases");

      // Should show phase transitions and final summary
      const allWidgetText = ctx.widgets.map((w: any) => w.lines.join("\n")).join("\n");

      // Phase transitions
      expect(allWidgetText).toContain("Phase 1/4");
      expect(allWidgetText).toContain("Phase 2/4");
      expect(allWidgetText).toContain("Phase 3/4");
      expect(allWidgetText).toContain("Phase 4/4");

      // Final summary
      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("Complete");
      expect(finalText).toContain("Analysis");
      expect(finalText).toContain("Planning");
      expect(finalText).toContain("Solutioning");
      expect(finalText).toContain("Implementation");
      expect(finalText).toContain("4 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows phase transition progress via setWidget", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
      { phase: "2-plan-workflows", skills: [
        { name: "bmad-create-prd", desc: "PRD" },
        { name: "bmad-create-ux-design", desc: "UX" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("Build something", ctx as any);

      // Should have initial + phase transitions + per-phase results + summary
      const allText = ctx.widgets.map((w: any) => w.lines.join("\n")).join("\n");

      // First widget should be the "All Phases" header
      expect(ctx.widgets[0].lines.join("\n")).toContain("All Phases");

      // Should have phase transition widgets
      expect(allText).toContain("Phase 1/4");
      expect(allText).toContain("Phase 2/4");

      // Should have per-phase results (at least for analysis which has 6 stages)
      expect(allText).toContain("6 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("stops pipeline when a phase fails", async () => {
    const dir = createTestDir();
    // Create analysis skills but NO planning skills — planning will fail
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("Build something", ctx as any);

      // Analysis completes (6 sessions), planning fails (0 sessions for missing skills)
      expect(ctx.sessionCalls.length).toBe(6, "Should only create analysis sessions before planning fails");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("stopped");
      expect(finalText).toContain("Planning");
      expect(finalText).toContain("failed");
      expect(ctx.notifications.some((n) => n.msg.includes("failed"))).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAuto — stop-after flag ─────────────────────────────────────

describe("handleBmadAuto — stop-after flag", () => {
  test("runs only analysis and planning with --stop-after planning", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
      { phase: "2-plan-workflows", skills: [
        { name: "bmad-create-prd", desc: "PRD" },
        { name: "bmad-create-ux-design", desc: "UX" },
      ]},
      { phase: "3-solutioning", skills: [
        { name: "bmad-create-architecture", desc: "Architecture" },
        { name: "bmad-create-epics-and-stories", desc: "Epics" },
        { name: "bmad-check-implementation-readiness", desc: "Readiness" },
      ]},
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Sprint" },
        { name: "bmad-create-story", desc: "Story" },
        { name: "bmad-dev-story", desc: "Dev" },
        { name: "bmad-code-review", desc: "Review" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("--stop-after planning Build a REST API", ctx as any);

      // Only analysis (6) + planning (2) = 8 sessions
      expect(ctx.sessionCalls.length).toBe(8, "Should create 8 sessions for analysis + planning only");

      // Should show stop-after in the initial widget
      const firstWidget = ctx.widgets[0];
      expect(firstWidget.lines.join("\n")).toContain("stopping after planning");

      // Final summary should mention stop-after
      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("stopped after planning");
      expect(finalText).toContain("Analysis");
      expect(finalText).toContain("Planning");
      expect(finalText).toContain("2 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows error for invalid stop-after phase", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("--stop-after nonexistent Build something", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Invalid"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("nonexistent");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage when stop-after has no message", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAuto("--stop-after planning", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      expect(getWidgetText(ctx, "bmad")).toContain("Message is required");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("stops after analysis only with --stop-after analysis", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("--stop-after analysis Build something", ctx as any);

      expect(ctx.sessionCalls.length).toBe(6, "Should only create 6 analysis sessions");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("stopped after analysis");
      expect(finalText).toContain("1 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("stops pipeline early when a phase fails in stop-after mode", async () => {
    const dir = createTestDir();
    // Create analysis skills but no planning skills
    createAllSkillsForPhases(dir, [
      { phase: "1-analysis/research", skills: [
        { name: "bmad-domain-research", desc: "Research" },
        { name: "bmad-market-research", desc: "Market" },
        { name: "bmad-technical-research", desc: "Tech" },
      ]},
      { phase: "1-analysis", skills: [
        { name: "bmad-product-brief", desc: "Brief" },
        { name: "bmad-prfaq", desc: "PRFAQ" },
        { name: "bmad-document-project", desc: "Doc" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAuto("--stop-after solutioning Build something", ctx as any);

      // Analysis completes (6), planning fails
      expect(ctx.sessionCalls.length).toBe(6);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("stopped");
      expect(finalText).toContain("Planning");
      expect(finalText).toContain("failed");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── handleBmadAutoImplementation (delegates to executeAutoPipeline) ──────

describe("handleBmadAutoImplementation", () => {
  test("shows help text with no args", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoImplementation("", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Phase 4");
      expect(text).toContain("Implementation");
      expect(text).toContain("bmad-sprint-planning");
      expect(text).toContain("bmad-create-story");
      expect(text).toContain("bmad-dev-story");
      expect(text).toContain("bmad-code-review");
      expect(text).toContain("4 stage");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows help text with 'help'", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoImplementation("help", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("--list");
      expect(text).toContain("--dry-run");
      expect(text).toContain("Phase 4");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows pipeline stages with --list", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoImplementation("--list", ctx as any);
      expect(ctx.notifications.some((n) => n.msg.includes("pipeline"))).toBe(true);
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Available Pipelines");
      expect(text).toContain("Phase 4 Implementation");
      expect(text).toContain("bmad-sprint-planning");
      expect(text).toContain("bmad-create-story");
      expect(text).toContain("bmad-dev-story");
      expect(text).toContain("bmad-code-review");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows dry run with --dry-run", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Plan sprint scope" },
        { name: "bmad-create-story", desc: "Create a story" },
        { name: "bmad-dev-story", desc: "Develop the story" },
        { name: "bmad-code-review", desc: "Review the code" },
      ]},
    ]);
    const ctx = createMockCtx(dir);
    try {
      await handleBmadAutoImplementation("--dry-run", ctx as any);
      expect(ctx.sessionCalls.length).toBe(0, "No sessions should be created in dry-run");
      const text = getWidgetText(ctx, "bmad");
      expect(text).toContain("Dry Run");
      expect(text).toContain("✅ bmad-sprint-planning");
      expect(text).toContain("✅ bmad-create-story");
      expect(text).toContain("✅ bmad-dev-story");
      expect(text).toContain("✅ bmad-code-review");
      expect(text).toContain("completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("executes pipeline and shows results", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Plan sprint scope" },
        { name: "bmad-create-story", desc: "Create a story" },
        { name: "bmad-dev-story", desc: "Develop the story" },
        { name: "bmad-code-review", desc: "Review the code" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoImplementation("Build a REST API", ctx as any);
      expect(ctx.sessionCalls.length).toBe(4, "Should create 4 sessions for 4 stages");

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("✅");
      expect(finalText).toContain("Completed");
      expect(finalText).toContain("bmad-sprint-planning");
      expect(finalText).toContain("bmad-create-story");
      expect(finalText).toContain("bmad-dev-story");
      expect(finalText).toContain("bmad-code-review");
      expect(finalText).toContain("Summary");
      expect(finalText).toContain("4 completed");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("reports failure when stage skill is missing", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Plan sprint scope" },
        { name: "bmad-create-story", desc: "Create a story" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    const ctx = createMockCtx(dir);
    setupSessionMock(ctx);

    try {
      await handleBmadAutoImplementation("Build a REST API", ctx as any);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("❌");
      expect(finalText).toContain("bmad-dev-story");
      expect(finalText).toContain("not found");
      expect(ctx.notifications.some((n) => n.level === "error")).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("reports cancellation correctly", async () => {
    const dir = createTestDir();
    createAllSkillsForPhases(dir, [
      { phase: "4-implementation", skills: [
        { name: "bmad-sprint-planning", desc: "Plan sprint scope" },
        { name: "bmad-create-story", desc: "Create a story" },
        { name: "bmad-dev-story", desc: "Develop the story" },
        { name: "bmad-code-review", desc: "Review the code" },
      ]},
    ]);
    createConfig(dir, { user_name: "TestUser" });

    let callCount = 0;
    const ctx = createMockCtx(dir);
    ctx.newSession = async (opts: any) => {
      callCount++;
      if (callCount >= 2) return { cancelled: true };
      const mockSm = {
        appendSessionInfo: () => {},
        appendMessage: () => {},
      };
      await opts.setup(mockSm);
      ctx.sessionCalls.push(opts);
      return { cancelled: false };
    };

    try {
      await handleBmadAutoImplementation("Build a REST API", ctx as any);

      const finalWidget = ctx.widgets[ctx.widgets.length - 1];
      const finalText = finalWidget.lines.join("\n");
      expect(finalText).toContain("❌");
    } finally {
      cleanupTestDir(dir);
    }
  });
});
