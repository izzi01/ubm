/**
 * Tests for BMAD pipeline definitions and executor.
 *
 * Covers: pipeline structure, lookup, dryRun execution, sequential
 * stage execution with mock sessionFactory, optional stage skipping,
 * required stage failure, and context accumulation between stages.
 */

import { describe, test, expect } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  ANALYSIS_PIPELINE,
  getPipeline,
  listPipelines,
  runPipeline,
} from "../bmad-pipeline/index.js";
import type { SessionFactory, PipelineResult } from "../bmad-pipeline/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-bmad-pipeline-test-"));
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

  const body = `# ${skillName}\n\nInstructions for ${skillName}.\n`;
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
}

function createConfig(dir: string, values: Record<string, string>): void {
  const bmmDir = join(dir, "_bmad", "bmm");
  mkdirSync(bmmDir, { recursive: true });
  const lines = Object.entries(values).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(join(bmmDir, "config.yaml"), lines.join("\n") + "\n");
}

/**
 * Create all 6 analysis pipeline skills in a test directory.
 */
function createAllAnalysisSkills(dir: string): void {
  createSkill(dir, "1-analysis/research", "bmad-domain-research", {
    description: "Research the domain",
  });
  createSkill(dir, "1-analysis/research", "bmad-market-research", {
    description: "Analyze the market",
  });
  createSkill(dir, "1-analysis/research", "bmad-technical-research", {
    description: "Technical feasibility",
  });
  createSkill(dir, "1-analysis", "bmad-product-brief", {
    description: "Create product brief",
  });
  createSkill(dir, "1-analysis", "bmad-prfaq", {
    description: "Press release FAQ",
  });
  createSkill(dir, "1-analysis", "bmad-document-project", {
    description: "Document the project",
  });
}

// ─── ANALYSIS_PIPELINE structure ───────────────────────────────────────────

describe("ANALYSIS_PIPELINE structure", () => {
  test("has 6 stages in correct order", () => {
    expect(ANALYSIS_PIPELINE.id).toBe("analysis");
    expect(ANALYSIS_PIPELINE.stages.length).toBe(6);

    const skillNames = ANALYSIS_PIPELINE.stages.map((s) => s.skill);
    expect(skillNames).toEqual([
      "bmad-domain-research",
      "bmad-market-research",
      "bmad-technical-research",
      "bmad-product-brief",
      "bmad-prfaq",
      "bmad-document-project",
    ]);
  });

  test("has correct phase assignments", () => {
    expect(ANALYSIS_PIPELINE.stages[0].phase).toBe("1-analysis/research");
    expect(ANALYSIS_PIPELINE.stages[1].phase).toBe("1-analysis/research");
    expect(ANALYSIS_PIPELINE.stages[2].phase).toBe("1-analysis/research");
    expect(ANALYSIS_PIPELINE.stages[3].phase).toBe("1-analysis");
    expect(ANALYSIS_PIPELINE.stages[4].phase).toBe("1-analysis");
    expect(ANALYSIS_PIPELINE.stages[5].phase).toBe("1-analysis");
  });

  test("marks bmad-prfaq as optional", () => {
    expect(ANALYSIS_PIPELINE.stages[4].optional).toBe(true);

    for (let i = 0; i < ANALYSIS_PIPELINE.stages.length; i++) {
      if (i === 4) continue;
      expect(
        ANALYSIS_PIPELINE.stages[i].optional,
        `Stage at index ${i} (${ANALYSIS_PIPELINE.stages[i].skill}) should be required`,
      ).toBe(false);
    }
  });
});

// ─── getPipeline / listPipelines ───────────────────────────────────────────

describe("getPipeline / listPipelines", () => {
  test("getPipeline('analysis') returns the analysis pipeline", () => {
    const pipeline = getPipeline("analysis");
    expect(pipeline).not.toBeNull();
    expect(pipeline!.id).toBe("analysis");
    expect(pipeline!.stages.length).toBe(6);
  });

  test("getPipeline('nonexistent') returns null", () => {
    const pipeline = getPipeline("nonexistent");
    expect(pipeline).toBeNull();
  });

  test("listPipelines() returns all registered pipelines", () => {
    const pipelines = listPipelines();
    expect(pipelines.length).toBeGreaterThanOrEqual(3);
    expect(pipelines.some((p) => p.id === "analysis")).toBe(true);
    expect(pipelines.some((p) => p.id === "planning")).toBe(true);
    expect(pipelines.some((p) => p.id === "solutioning")).toBe(true);
  });
});

// ─── runPipeline — dryRun ──────────────────────────────────────────────────

describe("runPipeline — dryRun", () => {
  test("completes all stages without sessions", async () => {
    const sessionCalls: string[] = [];
    const sessionFactory: SessionFactory = async (_prompt, skillName) => {
      sessionCalls.push(skillName);
      return { cancelled: false };
    };

    const result = await runPipeline(
      ANALYSIS_PIPELINE,
      "Build a REST API",
      "/tmp/noexist",
      sessionFactory,
      { dryRun: true },
    );

    expect(result.status).toBe("completed");
    expect(result.completedStages.length).toBe(6);
    expect(result.skippedStages.length).toBe(0);
    expect(sessionCalls.length).toBe(0, "No sessions should be created in dryRun");

    for (const sr of result.completedStages) {
      expect(sr.status).toBe("completed");
    }
  });
});

// ─── runPipeline — sequential execution ────────────────────────────────────

describe("runPipeline — sequential execution", () => {
  test("executes stages sequentially with mock sessionFactory", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const executionOrder: string[] = [];
      const sessionFactory: SessionFactory = async (_prompt, skillName) => {
        executionOrder.push(skillName);
        return { cancelled: false };
      };

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("completed");
      expect(result.completedStages.length).toBe(6);
      expect(result.skippedStages.length).toBe(0);

      expect(executionOrder).toEqual([
        "bmad-domain-research",
        "bmad-market-research",
        "bmad-technical-research",
        "bmad-product-brief",
        "bmad-prfaq",
        "bmad-document-project",
      ]);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — skips optional stages ──────────────────────────────────

describe("runPipeline — optional stage handling", () => {
  test("skips optional stages when skill not found", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "1-analysis/research", "bmad-domain-research", {
        description: "Research the domain",
      });
      createSkill(dir, "1-analysis/research", "bmad-market-research", {
        description: "Analyze the market",
      });
      createSkill(dir, "1-analysis/research", "bmad-technical-research", {
        description: "Technical feasibility",
      });
      createSkill(dir, "1-analysis", "bmad-product-brief", {
        description: "Create product brief",
      });
      createSkill(dir, "1-analysis", "bmad-document-project", {
        description: "Document the project",
      });
      createConfig(dir, { user_name: "TestUser" });

      const sessionFactory: SessionFactory = async () => ({ cancelled: false });

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("partial");
      expect(result.completedStages.length).toBe(5);
      expect(result.skippedStages).toEqual(["bmad-prfaq"]);

      const completedNames = result.completedStages.map((s) => s.stage.skill);
      expect(completedNames).not.toContain("bmad-prfaq");
      expect(completedNames).toContain("bmad-document-project");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("fails on required stage skill not found", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "1-analysis/research", "bmad-domain-research", {
        description: "Research the domain",
      });
      createSkill(dir, "1-analysis/research", "bmad-market-research", {
        description: "Analyze the market",
      });
      createConfig(dir, { user_name: "TestUser" });

      const sessionFactory: SessionFactory = async () => ({ cancelled: false });

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      expect(result.completedStages.length).toBe(3);
      expect(result.skippedStages.length).toBe(0);

      const failedStage = result.completedStages.find((s) => s.status === "failed");
      expect(failedStage).not.toBeUndefined();
      expect(failedStage!.stage.skill).toBe("bmad-technical-research");
      expect(failedStage!.error).toContain("not found");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — context accumulation ────────────────────────────────────

describe("runPipeline — context accumulation", () => {
  test("accumulates context between stages", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const capturedPrompts: Array<{ skillName: string; prompt: string }> = [];
      const sessionFactory: SessionFactory = async (prompt, skillName) => {
        capturedPrompts.push({ skillName, prompt });
        return { cancelled: false };
      };

      await runPipeline(ANALYSIS_PIPELINE, "Build a REST API", dir, sessionFactory);

      expect(capturedPrompts.length).toBe(6);

      expect(capturedPrompts[0].prompt).toContain("Build a REST API");
      expect(capturedPrompts[0].prompt).not.toContain("Previous Pipeline Stages Completed");

      expect(capturedPrompts[1].prompt).toContain("Build a REST API");
      expect(capturedPrompts[1].prompt).toContain("Previous Pipeline Stages Completed");
      expect(capturedPrompts[1].prompt).toContain("Completed: bmad-domain-research");

      expect(capturedPrompts[2].prompt).toContain("Completed: bmad-domain-research");
      expect(capturedPrompts[2].prompt).toContain("Completed: bmad-market-research");

      expect(capturedPrompts[5].prompt).toContain("Completed: bmad-domain-research");
      expect(capturedPrompts[5].prompt).toContain("Completed: bmad-market-research");
      expect(capturedPrompts[5].prompt).toContain("Completed: bmad-technical-research");
      expect(capturedPrompts[5].prompt).toContain("Completed: bmad-product-brief");
      expect(capturedPrompts[5].prompt).toContain("Completed: bmad-prfaq");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — cancellation ────────────────────────────────────────────

describe("runPipeline — cancellation handling", () => {
  test("fails pipeline on session cancellation for required stage", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, {});

      let callCount = 0;
      const sessionFactory: SessionFactory = async () => {
        callCount++;
        if (callCount === 2) return { cancelled: true };
        return { cancelled: false };
      };

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      expect(result.completedStages.length).toBe(2);
      expect(result.completedStages[0].status).toBe("completed");
      expect(result.completedStages[1].status).toBe("failed");
      expect(result.completedStages[1].error).toContain("cancelled");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("skips optional stage on session cancellation", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, {});

      let callCount = 0;
      const sessionFactory: SessionFactory = async () => {
        callCount++;
        if (callCount === 5) return { cancelled: true };
        return { cancelled: false };
      };

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("partial");
      expect(result.skippedStages).toEqual(["bmad-prfaq"]);
      expect(result.completedStages.length).toBe(5);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — error handling ──────────────────────────────────────────

describe("runPipeline — error handling", () => {
  test("fails pipeline on session error for required stage", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, {});

      let callCount = 0;
      const sessionFactory: SessionFactory = async () => {
        callCount++;
        if (callCount === 3) return { cancelled: false, error: "LLM rate limited" };
        return { cancelled: false };
      };

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      const failed = result.completedStages.find((s) => s.status === "failed");
      expect(failed).not.toBeUndefined();
      expect(failed!.stage.skill).toBe("bmad-technical-research");
      expect(failed!.error).toContain("LLM rate limited");
    } finally {
      cleanupTestDir(dir);
    }
  });

  test("catches session factory exceptions", async () => {
    const dir = createTestDir();
    try {
      createAllAnalysisSkills(dir);
      createConfig(dir, {});

      let callCount = 0;
      const sessionFactory: SessionFactory = async () => {
        callCount++;
        if (callCount === 2) throw new Error("Network timeout");
        return { cancelled: false };
      };

      const result = await runPipeline(
        ANALYSIS_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      const failed = result.completedStages.find((s) => s.status === "failed");
      expect(failed).not.toBeUndefined();
      expect(failed!.stage.skill).toBe("bmad-market-research");
      expect(failed!.error).toContain("Network timeout");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── PLANNING_PIPELINE structure ───────────────────────────────────────────

import {
  PLANNING_PIPELINE,
  SOLUTIONING_PIPELINE,
  IMPLEMENTATION_PIPELINE,
} from "../bmad-pipeline/index.js";

describe("PLANNING_PIPELINE structure", () => {
  test("has 2 stages in correct order", () => {
    expect(PLANNING_PIPELINE.id).toBe("planning");
    expect(PLANNING_PIPELINE.stages.length).toBe(2);

    const skillNames = PLANNING_PIPELINE.stages.map((s) => s.skill);
    expect(skillNames).toEqual([
      "bmad-create-prd",
      "bmad-create-ux-design",
    ]);
  });

  test("has correct phase assignments", () => {
    for (const stage of PLANNING_PIPELINE.stages) {
      expect(stage.phase).toBe("2-plan-workflows");
    }
  });

  test("all stages are required", () => {
    for (const stage of PLANNING_PIPELINE.stages) {
      expect(stage.optional).toBe(false);
    }
  });
});

// ─── PLANNING_PIPELINE lookup ──────────────────────────────────────────────

describe("getPipeline('planning')", () => {
  test("returns the planning pipeline", () => {
    const pipeline = getPipeline("planning");
    expect(pipeline).not.toBeNull();
    expect(pipeline!.id).toBe("planning");
    expect(pipeline!.stages.length).toBe(2);
  });

  test("getPipeline('nonexistent-planning') returns null", () => {
    const pipeline = getPipeline("nonexistent-planning");
    expect(pipeline).toBeNull();
  });

  test("listPipelines() returns 4 pipelines", () => {
    const pipelines = listPipelines();
    expect(pipelines.length).toBe(4);
    expect(pipelines.some((p) => p.id === "analysis")).toBe(true);
    expect(pipelines.some((p) => p.id === "planning")).toBe(true);
    expect(pipelines.some((p) => p.id === "solutioning")).toBe(true);
    expect(pipelines.some((p) => p.id === "implementation")).toBe(true);
  });
});

// ─── runPipeline — PLANNING_PIPELINE sequential execution ─────────────────

function createAllPlanningSkills(dir: string): void {
  createSkill(dir, "2-plan-workflows", "bmad-create-prd", {
    description: "Create product requirements document",
  });
  createSkill(dir, "2-plan-workflows", "bmad-create-ux-design", {
    description: "Create UX design specifications",
  });
}

describe("runPipeline — PLANNING_PIPELINE sequential execution", () => {
  test("executes stages sequentially with mock sessionFactory", async () => {
    const dir = createTestDir();
    try {
      createAllPlanningSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const executionOrder: string[] = [];
      const sessionFactory: SessionFactory = async (_prompt, skillName) => {
        executionOrder.push(skillName);
        return { cancelled: false };
      };

      const result = await runPipeline(
        PLANNING_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("completed");
      expect(result.completedStages.length).toBe(2);
      expect(result.skippedStages.length).toBe(0);
      expect(executionOrder).toEqual([
        "bmad-create-prd",
        "bmad-create-ux-design",
      ]);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — PLANNING_PIPELINE context accumulation ─────────────────

describe("runPipeline — PLANNING_PIPELINE context accumulation", () => {
  test("second stage prompt includes completed first stage", async () => {
    const dir = createTestDir();
    try {
      createAllPlanningSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const capturedPrompts: Array<{ skillName: string; prompt: string }> = [];
      const sessionFactory: SessionFactory = async (prompt, skillName) => {
        capturedPrompts.push({ skillName, prompt });
        return { cancelled: false };
      };

      await runPipeline(PLANNING_PIPELINE, "Build a REST API", dir, sessionFactory);

      expect(capturedPrompts.length).toBe(2);

      expect(capturedPrompts[0].prompt).toContain("Build a REST API");
      expect(capturedPrompts[0].prompt).not.toContain("Previous Pipeline Stages Completed");

      expect(capturedPrompts[1].prompt).toContain("Build a REST API");
      expect(capturedPrompts[1].prompt).toContain("Previous Pipeline Stages Completed");
      expect(capturedPrompts[1].prompt).toContain("Completed: bmad-create-prd");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — PLANNING_PIPELINE failure on missing required stage ────

describe("runPipeline — PLANNING_PIPELINE failure on missing required stage", () => {
  test("fails when bmad-create-ux-design skill is missing", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "2-plan-workflows", "bmad-create-prd", {
        description: "Create product requirements document",
      });
      createConfig(dir, { user_name: "TestUser" });

      const sessionFactory: SessionFactory = async () => ({ cancelled: false });

      const result = await runPipeline(
        PLANNING_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      expect(result.completedStages.length).toBe(2);
      expect(result.skippedStages.length).toBe(0);

      const failedStage = result.completedStages.find((s) => s.status === "failed");
      expect(failedStage).not.toBeUndefined();
      expect(failedStage!.stage.skill).toBe("bmad-create-ux-design");
      expect(failedStage!.error).toContain("not found");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── SOLUTIONING_PIPELINE structure ───────────────────────────────────────

describe("SOLUTIONING_PIPELINE structure", () => {
  test("has 3 stages in correct order", () => {
    expect(SOLUTIONING_PIPELINE.id).toBe("solutioning");
    expect(SOLUTIONING_PIPELINE.stages.length).toBe(3);

    const skillNames = SOLUTIONING_PIPELINE.stages.map((s) => s.skill);
    expect(skillNames).toEqual([
      "bmad-create-architecture",
      "bmad-create-epics-and-stories",
      "bmad-check-implementation-readiness",
    ]);
  });

  test("has correct phase assignments", () => {
    for (const stage of SOLUTIONING_PIPELINE.stages) {
      expect(stage.phase).toBe("3-solutioning");
    }
  });

  test("all stages are required", () => {
    for (const stage of SOLUTIONING_PIPELINE.stages) {
      expect(stage.optional).toBe(false);
    }
  });
});

// ─── SOLUTIONING_PIPELINE lookup ──────────────────────────────────────────

describe("getPipeline('solutioning')", () => {
  test("returns the solutioning pipeline", () => {
    const pipeline = getPipeline("solutioning");
    expect(pipeline).not.toBeNull();
    expect(pipeline!.id).toBe("solutioning");
    expect(pipeline!.stages.length).toBe(3);
  });

  test("getPipeline('nonexistent-solutioning') returns null", () => {
    const pipeline = getPipeline("nonexistent-solutioning");
    expect(pipeline).toBeNull();
  });
});

// ─── runPipeline — SOLUTIONING_PIPELINE sequential execution ──────────────

function createAllSolutioningSkills(dir: string): void {
  createSkill(dir, "3-solutioning", "bmad-create-architecture", {
    description: "Create system architecture",
  });
  createSkill(dir, "3-solutioning", "bmad-create-epics-and-stories", {
    description: "Generate epics and stories",
  });
  createSkill(dir, "3-solutioning", "bmad-check-implementation-readiness", {
    description: "Check implementation readiness",
  });
}

describe("runPipeline — SOLUTIONING_PIPELINE sequential execution", () => {
  test("executes stages sequentially with mock sessionFactory", async () => {
    const dir = createTestDir();
    try {
      createAllSolutioningSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const executionOrder: string[] = [];
      const sessionFactory: SessionFactory = async (_prompt, skillName) => {
        executionOrder.push(skillName);
        return { cancelled: false };
      };

      const result = await runPipeline(
        SOLUTIONING_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("completed");
      expect(result.completedStages.length).toBe(3);
      expect(result.skippedStages.length).toBe(0);
      expect(executionOrder).toEqual([
        "bmad-create-architecture",
        "bmad-create-epics-and-stories",
        "bmad-check-implementation-readiness",
      ]);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — SOLUTIONING_PIPELINE context accumulation ──────────────

describe("runPipeline — SOLUTIONING_PIPELINE context accumulation", () => {
  test("later stage prompts include all previously completed stages", async () => {
    const dir = createTestDir();
    try {
      createAllSolutioningSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const capturedPrompts: Array<{ skillName: string; prompt: string }> = [];
      const sessionFactory: SessionFactory = async (prompt, skillName) => {
        capturedPrompts.push({ skillName, prompt });
        return { cancelled: false };
      };

      await runPipeline(SOLUTIONING_PIPELINE, "Build a REST API", dir, sessionFactory);

      expect(capturedPrompts.length).toBe(3);

      expect(capturedPrompts[0].prompt).toContain("Build a REST API");
      expect(capturedPrompts[0].prompt).not.toContain("Previous Pipeline Stages Completed");

      expect(capturedPrompts[1].prompt).toContain("Build a REST API");
      expect(capturedPrompts[1].prompt).toContain("Previous Pipeline Stages Completed");
      expect(capturedPrompts[1].prompt).toContain("Completed: bmad-create-architecture");

      expect(capturedPrompts[2].prompt).toContain("Build a REST API");
      expect(capturedPrompts[2].prompt).toContain("Completed: bmad-create-architecture");
      expect(capturedPrompts[2].prompt).toContain("Completed: bmad-create-epics-and-stories");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — SOLUTIONING_PIPELINE failure on missing required stage ─

describe("runPipeline — SOLUTIONING_PIPELINE failure on missing required stage", () => {
  test("fails when bmad-check-implementation-readiness skill is missing", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "3-solutioning", "bmad-create-architecture", {
        description: "Create system architecture",
      });
      createSkill(dir, "3-solutioning", "bmad-create-epics-and-stories", {
        description: "Generate epics and stories",
      });
      createConfig(dir, { user_name: "TestUser" });

      const sessionFactory: SessionFactory = async () => ({ cancelled: false });

      const result = await runPipeline(
        SOLUTIONING_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      expect(result.completedStages.length).toBe(3);
      expect(result.skippedStages.length).toBe(0);

      const failedStage = result.completedStages.find((s) => s.status === "failed");
      expect(failedStage).not.toBeUndefined();
      expect(failedStage!.stage.skill).toBe("bmad-check-implementation-readiness");
      expect(failedStage!.error).toContain("not found");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── IMPLEMENTATION_PIPELINE structure ────────────────────────────────────

describe("IMPLEMENTATION_PIPELINE structure", () => {
  test("has 4 stages in correct order", () => {
    expect(IMPLEMENTATION_PIPELINE.id).toBe("implementation");
    expect(IMPLEMENTATION_PIPELINE.stages.length).toBe(4);

    const skillNames = IMPLEMENTATION_PIPELINE.stages.map((s) => s.skill);
    expect(skillNames).toEqual([
      "bmad-sprint-planning",
      "bmad-create-story",
      "bmad-dev-story",
      "bmad-code-review",
    ]);
  });

  test("has correct phase assignments", () => {
    for (const stage of IMPLEMENTATION_PIPELINE.stages) {
      expect(stage.phase).toBe("4-implementation");
    }
  });

  test("all stages are required", () => {
    for (const stage of IMPLEMENTATION_PIPELINE.stages) {
      expect(stage.optional).toBe(false);
    }
  });
});

// ─── IMPLEMENTATION_PIPELINE lookup ───────────────────────────────────────

describe("getPipeline('implementation')", () => {
  test("returns the implementation pipeline", () => {
    const pipeline = getPipeline("implementation");
    expect(pipeline).not.toBeNull();
    expect(pipeline!.id).toBe("implementation");
    expect(pipeline!.stages.length).toBe(4);
  });

  test("getPipeline('nonexistent-implementation') returns null", () => {
    const pipeline = getPipeline("nonexistent-implementation");
    expect(pipeline).toBeNull();
  });
});

// ─── runPipeline — IMPLEMENTATION_PIPELINE sequential execution ──────────

function createAllImplementationSkills(dir: string): void {
  createSkill(dir, "4-implementation", "bmad-sprint-planning", {
    description: "Plan sprint scope and priorities",
  });
  createSkill(dir, "4-implementation", "bmad-create-story", {
    description: "Create a development story",
  });
  createSkill(dir, "4-implementation", "bmad-dev-story", {
    description: "Develop and implement the story",
  });
  createSkill(dir, "4-implementation", "bmad-code-review", {
    description: "Review the implemented code",
  });
}

describe("runPipeline — IMPLEMENTATION_PIPELINE sequential execution", () => {
  test("executes stages sequentially with mock sessionFactory", async () => {
    const dir = createTestDir();
    try {
      createAllImplementationSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const executionOrder: string[] = [];
      const sessionFactory: SessionFactory = async (_prompt, skillName) => {
        executionOrder.push(skillName);
        return { cancelled: false };
      };

      const result = await runPipeline(
        IMPLEMENTATION_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("completed");
      expect(result.completedStages.length).toBe(4);
      expect(result.skippedStages.length).toBe(0);
      expect(executionOrder).toEqual([
        "bmad-sprint-planning",
        "bmad-create-story",
        "bmad-dev-story",
        "bmad-code-review",
      ]);
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — IMPLEMENTATION_PIPELINE context accumulation ───────────

describe("runPipeline — IMPLEMENTATION_PIPELINE context accumulation", () => {
  test("later stage prompts include all previously completed stages", async () => {
    const dir = createTestDir();
    try {
      createAllImplementationSkills(dir);
      createConfig(dir, { user_name: "TestUser" });

      const capturedPrompts: Array<{ skillName: string; prompt: string }> = [];
      const sessionFactory: SessionFactory = async (prompt, skillName) => {
        capturedPrompts.push({ skillName, prompt });
        return { cancelled: false };
      };

      await runPipeline(IMPLEMENTATION_PIPELINE, "Build a REST API", dir, sessionFactory);

      expect(capturedPrompts.length).toBe(4);

      // First prompt has user message but no previous stages
      expect(capturedPrompts[0].prompt).toContain("Build a REST API");
      expect(capturedPrompts[0].prompt).not.toContain("Previous Pipeline Stages Completed");

      // Second prompt includes first completed stage
      expect(capturedPrompts[1].prompt).toContain("Build a REST API");
      expect(capturedPrompts[1].prompt).toContain("Previous Pipeline Stages Completed");
      expect(capturedPrompts[1].prompt).toContain("Completed: bmad-sprint-planning");

      // Fourth prompt includes all 3 previous completions
      expect(capturedPrompts[3].prompt).toContain("Build a REST API");
      expect(capturedPrompts[3].prompt).toContain("Completed: bmad-sprint-planning");
      expect(capturedPrompts[3].prompt).toContain("Completed: bmad-create-story");
      expect(capturedPrompts[3].prompt).toContain("Completed: bmad-dev-story");
    } finally {
      cleanupTestDir(dir);
    }
  });
});

// ─── runPipeline — IMPLEMENTATION_PIPELINE failure on missing required stage

describe("runPipeline — IMPLEMENTATION_PIPELINE failure on missing required stage", () => {
  test("fails when bmad-dev-story skill is missing", async () => {
    const dir = createTestDir();
    try {
      createSkill(dir, "4-implementation", "bmad-sprint-planning", {
        description: "Plan sprint scope and priorities",
      });
      createSkill(dir, "4-implementation", "bmad-create-story", {
        description: "Create a development story",
      });
      createConfig(dir, { user_name: "TestUser" });

      const sessionFactory: SessionFactory = async () => ({ cancelled: false });

      const result = await runPipeline(
        IMPLEMENTATION_PIPELINE,
        "Build a REST API",
        dir,
        sessionFactory,
      );

      expect(result.status).toBe("failed");
      expect(result.completedStages.length).toBe(3);
      expect(result.skippedStages.length).toBe(0);

      const failedStage = result.completedStages.find((s) => s.status === "failed");
      expect(failedStage).not.toBeUndefined();
      expect(failedStage!.stage.skill).toBe("bmad-dev-story");
      expect(failedStage!.error).toContain("not found");
    } finally {
      cleanupTestDir(dir);
    }
  });
});
