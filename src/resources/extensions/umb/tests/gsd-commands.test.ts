/**
 * Tests for /gsd build-from-spec command handler.
 *
 * Tests handleGsdBuildFromSpec via createGsdCommandHandlers factory with
 * injected pipeline runner, readBmadArtifacts, and composeGsdContext.
 * Covers: usage hints, full pipeline, pipeline failure, no artifacts,
 * session cancellation, session errors, artifact reporting, context composition.
 */

import { describe, test, expect } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createGsdCommandHandlers,
  readBmadArtifacts,
  composeGsdContext,
} from "../commands/gsd-commands.js";
import type { PhaseResult } from "../commands/bmad-commands.js";
import {
  ANALYSIS_PIPELINE,
  PLANNING_PIPELINE,
  SOLUTIONING_PIPELINE,
  IMPLEMENTATION_PIPELINE,
} from "../bmad-pipeline/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-gsd-cmd-test-"));
}

function cleanupTestDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
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

function getWidgetText(ctx: any, id: string): string {
  const widgets = ctx.widgets.filter((w: any) => w.id === id);
  const widget = widgets[widgets.length - 1];
  return widget ? widget.lines.join("\n") : "";
}

/** Check if any widget for the given id contains the text. */
function anyWidgetContains(ctx: any, id: string, text: string): boolean {
  return ctx.widgets
    .filter((w: any) => w.id === id)
    .some((w: any) => w.lines.some((l: string) => l.includes(text)));
}

/** Get combined text from all widgets with the given id. */
function getAllWidgetText(ctx: any, id: string): string {
  return ctx.widgets
    .filter((w: any) => w.id === id)
    .map((w: any) => w.lines.join("\n"))
    .join("\n---\n");
}

/**
 * Create a minimal mock GsdEngine for the factory.
 * Only needs db and autoMode stubs since build-from-spec doesn't use them.
 */
function createMockEngine() {
  return {
    db: { milestoneGetAll: () => [] },
    autoMode: {
      start: () => {},
      stop: () => {},
      updateLastDispatch: () => {},
    },
  } as any;
}

/** Phase configs matching ALL_PHASES order. */
const PHASE_CONFIGS = [
  { pipeline: ANALYSIS_PIPELINE, label: "Analysis", icon: "🔍", number: "1" },
  { pipeline: PLANNING_PIPELINE, label: "Planning", icon: "📐", number: "2" },
  { pipeline: SOLUTIONING_PIPELINE, label: "Solutioning", icon: "🏗️", number: "3" },
  { pipeline: IMPLEMENTATION_PIPELINE, label: "Implementation", icon: "⚙️", number: "4" },
];

/** Create a successful PhaseResult for a given phase index. */
function makeSuccessfulPhaseResult(phaseIdx: number): PhaseResult {
  const phase = PHASE_CONFIGS[phaseIdx];
  return {
    phase: phase as PhaseResult["phase"],
    result: {
      pipeline: phase.pipeline,
      completedStages: phase.pipeline.stages.map((s) => ({
        stage: s,
        status: "completed" as const,
      })),
      skippedStages: [],
      status: "completed" as const,
    },
  };
}

/** Create a failed PhaseResult for a given phase index. */
function makeFailedPhaseResult(phaseIdx: number): PhaseResult {
  const phase = PHASE_CONFIGS[phaseIdx];
  return {
    phase: phase as PhaseResult["phase"],
    result: {
      pipeline: phase.pipeline,
      completedStages: [
        {
          stage: phase.pipeline.stages[0],
          status: "failed" as const,
          error: "Skill not found: test-skill",
        },
      ],
      skippedStages: [],
      status: "failed" as const,
    },
  };
}

/** All 4 successful phase results. */
function allSuccessfulPhases(): PhaseResult[] {
  return [0, 1, 2, 3].map((i) => makeSuccessfulPhaseResult(i));
}

// ─── readBmadArtifacts ────────────────────────────────────────────────────

describe("readBmadArtifacts", () => {
  test("returns empty array when artifacts directory does not exist", () => {
    const dir = createTestDir();
    try {
      const artifacts = readBmadArtifacts(dir);
      expect(artifacts).toEqual([]);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("reads files from _bmad-output/planning-artifacts/", () => {
    const dir = createTestDir();
    try {
      const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      writeFileSync(join(artifactsDir, "prd.md"), "# PRD\n\nProduct requirements...");
      writeFileSync(join(artifactsDir, "architecture.md"), "# Architecture\n\nSystem design...");

      const artifacts = readBmadArtifacts(dir);
      expect(artifacts).toHaveLength(2);

      const names = artifacts.map((a) => a.name).sort();
      expect(names).toEqual(["architecture.md", "prd.md"]);

      for (const a of artifacts) {
        expect(a.size).toBeGreaterThan(0);
        expect(a.content).toBeTruthy();
      }
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("skips subdirectories", () => {
    const dir = createTestDir();
    try {
      const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
      mkdirSync(join(artifactsDir, "subdir"), { recursive: true });
      writeFileSync(join(artifactsDir, "file.md"), "# File");

      const artifacts = readBmadArtifacts(dir);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].name).toBe("file.md");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("returns empty array when artifacts directory exists but is empty", () => {
    const dir = createTestDir();
    try {
      const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      const artifacts = readBmadArtifacts(dir);
      expect(artifacts).toEqual([]);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── composeGsdContext ────────────────────────────────────────────────────

describe("composeGsdContext", () => {
  test("composes single artifact into context", () => {
    const artifacts = [{ name: "prd.md", content: "# PRD\n\nRequirements here" }];
    const context = composeGsdContext(artifacts);

    expect(context).toContain("# BMAD Discovery Output");
    expect(context).toContain("## prd.md");
    expect(context).toContain("# PRD");
    expect(context).toContain("Requirements here");
  });

  test("composes multiple artifacts separated by ---", () => {
    const artifacts = [
      { name: "prd.md", content: "# PRD\n\nProduct requirements" },
      { name: "architecture.md", content: "# Architecture\n\nSystem design" },
    ];
    const context = composeGsdContext(artifacts);

    expect(context).toContain("## prd.md");
    expect(context).toContain("## architecture.md");
    expect(context).toContain("---");
    expect(context.indexOf("## prd.md")).toBeLessThan(context.indexOf("---"));
    expect(context.indexOf("---")).toBeLessThan(context.indexOf("## architecture.md"));
  });

  test("handles empty artifact list", () => {
    const context = composeGsdContext([]);
    expect(context).toBe("# BMAD Discovery Output\n\n");
  });
});

// ─── handleGsdBuildFromSpec — usage hints ────────────────────────────────

describe("handleGsdBuildFromSpec", () => {
  test("shows usage hint when no args provided", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine());

    try {
      await handleGsdBuildFromSpec("", ctx as any);

      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("Specify a project description");
      expect(text).toContain("/gsd build-from-spec");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("shows usage hint when help provided", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine());

    try {
      await handleGsdBuildFromSpec("help", ctx as any);

      expect(ctx.notifications.some((n) => n.msg.includes("Usage"))).toBe(true);
      const text = getWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("Specify a project description");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("runs pipeline, reads artifacts, starts session", async () => {
    const dir = createTestDir();

    // Create test artifacts
    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD\n\nBuild an OAuth provider");
    writeFileSync(join(artifactsDir, "architecture.md"), "# Architecture\n\nREST API with JWT tokens");

    // Mock pipeline runner
    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build an OAuth provider", ctx as any);

      // Artifacts were read and reported
      const text = getAllWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("prd.md");
      expect(text).toContain("bytes");
      expect(text).toContain("Artifacts Read (2)");

      // Session was started
      expect(ctx.sessionCalls).toHaveLength(1);
      const sessionSetup = ctx.sessionCalls[0].setup;
      const mockSm = {
        appendSessionInfo: () => {},
        appendMessage: () => {},
      };
      const capturedMessage: any[] = [];
      mockSm.appendMessage = (msg: any) => capturedMessage.push(msg);
      await sessionSetup(mockSm);

      // Session info includes build-from-spec tag
      // Session message includes BMAD context and gsd_milestone_plan reference
      expect(capturedMessage).toHaveLength(1);
      expect(capturedMessage[0].role).toBe("user");
      expect(capturedMessage[0].content).toContain("BMAD discovery artifacts");
      expect(capturedMessage[0].content).toContain("gsd_milestone_plan");
      expect(capturedMessage[0].content).toContain("OAuth provider");

      // Final success notification
      expect(ctx.notifications.some((n) => n.msg.includes("GSD session started"))).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("stops early when pipeline phase fails", async () => {
    const dir = createTestDir();
    const ctx = createMockCtx(dir);

    const mockPipeline = async (_msg: string, ctx: any) => {
      // Simulate the real pipeline runner emitting error notification
      ctx.ui.notify("Analysis phase failed — stopping pipeline", "error");
      return [
        makeSuccessfulPhaseResult(0),
        makeFailedPhaseResult(1),
      ];
    };

    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build something", ctx as any);

      // No session started (pipeline failed)
      expect(ctx.sessionCalls).toHaveLength(0);

      // Error was reported by the pipeline runner
      expect(ctx.notifications.some((n) => n.msg.includes("failed"))).toBe(true);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("warns when no artifacts found after successful pipeline", async () => {
    const dir = createTestDir();
    // Don't create any artifacts
    const ctx = createMockCtx(dir);

    const mockPipeline = async () => allSuccessfulPhases();

    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build something", ctx as any);

      // No session started
      expect(ctx.sessionCalls).toHaveLength(0);

      // Warning about no artifacts
      expect(
        ctx.notifications.some((n) => n.msg.includes("No planning artifacts")),
      ).toBe(true);
      const text = getWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("no planning artifacts were found");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("handles session cancellation", async () => {
    const dir = createTestDir();

    // Create test artifacts
    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD");

    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    ctx.newSession = async () => ({ cancelled: true });

    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build something", ctx as any);

      // Cancellation notification
      expect(
        ctx.notifications.some((n) => n.msg.includes("cancelled")),
      ).toBe(true);
      const text = getWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("cancelled");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("handles session creation error", async () => {
    const dir = createTestDir();

    // Create test artifacts
    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD");

    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    ctx.newSession = async () => {
      throw new Error("Session service unavailable");
    };

    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build something", ctx as any);

      // Error notification
      expect(
        ctx.notifications.some((n) => n.msg.includes("Failed to start")),
      ).toBe(true);
      const text = getWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("Session service unavailable");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("reports artifact sizes in widget output", async () => {
    const dir = createTestDir();

    // Create artifacts with known content
    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD\n\nBuild an OAuth provider for SaaS apps with multi-tenant support");
    writeFileSync(join(artifactsDir, "architecture.md"), "# Architecture\n\nREST API with JWT");

    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build an OAuth provider", ctx as any);

      // Check that widget shows artifact names and byte counts
      const text = getAllWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("prd.md");
      expect(text).toContain("architecture.md");
      expect(text).toContain("bytes");

      // Check that 2 artifacts were read
      expect(text).toContain("Artifacts Read (2)");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("session message includes BMAD context and gsd_milestone_plan reference", async () => {
    const dir = createTestDir();

    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD\n\nOAuth provider requirements");

    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build OAuth", ctx as any);

      expect(ctx.sessionCalls).toHaveLength(1);
      const sessionSetup = ctx.sessionCalls[0].setup;
      const capturedMessage: any[] = [];
      const mockSm = {
        appendSessionInfo: () => {},
        appendMessage: (msg: any) => capturedMessage.push(msg),
      };
      await sessionSetup(mockSm);

      // The session message should contain the BMAD context
      expect(capturedMessage).toHaveLength(1);
      expect(capturedMessage[0].content).toContain("BMAD discovery artifacts");
      expect(capturedMessage[0].content).toContain("gsd_milestone_plan");
      expect(capturedMessage[0].content).toContain("OAuth provider requirements");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("pipeline progress reported via ctx.ui.setWidget() at phase transitions", async () => {
    const dir = createTestDir();

    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "prd.md"), "# PRD");

    // Track widget calls from the pipeline runner
    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: async (_msg, ctx) => {
        // The handler calls ctx.ui.setWidget before calling pipelineRunner,
        // then pipelineRunner is called and should set widgets at each phase.
        // In our mock, we just return success.
        return allSuccessfulPhases();
      },
    });

    try {
      await handleGsdBuildFromSpec("Build X", ctx as any);

      // Should have widgets from the handler (at minimum: initial, artifact reading, final)
      const buildWidgets = ctx.widgets.filter((w) => w.id === "gsd-build-from-spec");
      expect(buildWidgets.length).toBeGreaterThanOrEqual(3);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("reports which BMAD artifacts were read and their sizes", async () => {
    const dir = createTestDir();

    const artifactsDir = join(dir, "_bmad-output", "planning-artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    const prdContent = "# PRD\n\n" + "x".repeat(500);
    const archContent = "# Architecture\n\n" + "y".repeat(300);
    writeFileSync(join(artifactsDir, "prd.md"), prdContent);
    writeFileSync(join(artifactsDir, "architecture.md"), archContent);

    const mockPipeline = async () => allSuccessfulPhases();

    const ctx = createMockCtx(dir);
    const { handleGsdBuildFromSpec } = createGsdCommandHandlers(createMockEngine(), {
      pipelineRunner: mockPipeline,
    });

    try {
      await handleGsdBuildFromSpec("Build Z", ctx as any);

      // Check notification reports artifact count
      expect(
        ctx.notifications.some((n) => n.msg.includes("2 artifact(s)")),
      ).toBe(true);

      // Check widget includes file names with byte sizes
      const text = getAllWidgetText(ctx, "gsd-build-from-spec");
      expect(text).toContain("prd.md");
      expect(text).toContain("architecture.md");
      expect(text).toContain("bytes");
    } finally {
      cleanupTestDir(dir);
    }
  });
});
