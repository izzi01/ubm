/**
 * Tests for BMAD skill executor (loader, config resolution, prompt composition).
 *
 * Uses node:test built-in test runner with temp directory fixtures
 * that mimic real _bmad/ structure.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  findBmadSkills,
  loadBmadSkill,
  resolveBmadConfig,
  composeExecutionPrompt,
} from "../bmad-executor/index.js";
import type { BmadSkillInfo } from "../bmad-executor/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-bmad-exec-test-"));
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
    manifest?: Record<string, unknown>;
    extraFrontmatter?: Record<string, string>;
    module?: string; // 'bmm' or 'core'
  } = {},
): void {
  const module = opts.module || "bmm";
  // Build path: {base}/_bmad/{module}/{phase}/{skillName}
  // For core module, phase is ignored (skills are direct in _bmad/core/)
  const skillDir = module === "core"
    ? join(base, "_bmad", "core", skillName)
    : join(base, "_bmad", module, phase, skillName);
  mkdirSync(skillDir, { recursive: true });

  const frontmatterLines = [
    "---",
    `name: ${skillName}`,
    ...(opts.description ? [`description: ${opts.description}`] : []),
    ...(opts.extraFrontmatter
      ? Object.entries(opts.extraFrontmatter).map(([k, v]) => `${k}: ${v}`)
      : []),
    "---",
  ];

  const body = `# ${skillName}\n\nThis is the skill instructions for ${skillName}.\n`;
  writeFileSync(
    join(skillDir, "SKILL.md"),
    [...frontmatterLines, "", body].join("\n"),
  );

  // Prompt files
  if (opts.promptFiles) {
    const promptsDir = join(skillDir, "prompts");
    mkdirSync(promptsDir, { recursive: true });
    for (const pf of opts.promptFiles) {
      writeFileSync(join(promptsDir, pf.name), pf.content);
    }
  }

  // Agent files
  if (opts.agentFiles) {
    const agentsDir = join(skillDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    for (const af of opts.agentFiles) {
      writeFileSync(join(agentsDir, af.name), af.content);
    }
  }

  // Manifest
  if (opts.manifest) {
    writeFileSync(
      join(skillDir, "bmad-manifest.json"),
      JSON.stringify(opts.manifest, null, 2),
    );
  }
}

function createConfig(
  dir: string,
  values: Record<string, string>,
): void {
  const bmmDir = join(dir, "_bmad", "bmm");
  mkdirSync(bmmDir, { recursive: true });
  const lines = Object.entries(values).map(
    ([k, v]) => `${k}: ${v}`,
  );
  writeFileSync(join(bmmDir, "config.yaml"), lines.join("\n") + "\n");
}

// ─── findBmadSkills ─────────────────────────────────────────────────────

test("findBmadSkills discovers skills from _bmad/bmm/ phase directories", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    createSkill(dir, "2-plan-workflows", "bmad-prd", {
      description: "Create PRDs",
    });

    const skills = findBmadSkills(dir);

    assert.equal(skills.length, 2);
    assert.ok(skills.some((s) => s.name === "bmad-product-brief"));
    assert.ok(skills.some((s) => s.name === "bmad-prd"));

    // Verify module is set
    const brief = skills.find((s) => s.name === "bmad-product-brief")!;
    assert.equal(brief.module, "bmm");
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills discovers skills from _bmad/core/", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "core", "bmad-help", {
      description: "BMad help system",
      module: "core",
    });

    const skills = findBmadSkills(dir);

    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "bmad-help");
    assert.equal(skills[0].module, "core");
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills discovers from both bmm and core", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Product briefs",
    });
    createSkill(dir, "core", "bmad-help", {
      description: "Help system",
      module: "core",
    });

    const skills = findBmadSkills(dir);

    assert.equal(skills.length, 2);
    assert.ok(skills.some((s) => s.module === "bmm"));
    assert.ok(skills.some((s) => s.module === "core"));
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills returns empty array when _bmad/ does not exist", () => {
  const dir = createTestDir();
  try {
    const skills = findBmadSkills(dir);
    assert.equal(skills.length, 0);
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills skips directories without SKILL.md", () => {
  const dir = createTestDir();
  try {
    const phaseDir = join(dir, "1-analysis", "not-a-skill");
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(join(phaseDir, "README.md"), "# Not a skill\n");

    const skills = findBmadSkills(dir);
    assert.equal(skills.length, 0);
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills skips SKILL.md with no name in frontmatter", () => {
  const dir = createTestDir();
  try {
    const skillDir = join(dir, "1-analysis", "bmad-broken");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\ndescription: no name here\n---\n# Broken\n",
    );

    const skills = findBmadSkills(dir);
    assert.equal(skills.length, 0);
  } finally {
    cleanupTestDir(dir);
  }
});

test("findBmadSkills results are sorted by name", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-z-last", { description: "Z" });
    createSkill(dir, "1-analysis", "bmad-a-first", { description: "A" });

    const skills = findBmadSkills(dir);
    assert.equal(skills[0].name, "bmad-a-first");
    assert.equal(skills[1].name, "bmad-z-last");
  } finally {
    cleanupTestDir(dir);
  }
});

// ─── loadBmadSkill ──────────────────────────────────────────────────────

test("loadBmadSkill loads skill by exact name", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });

    const skill = loadBmadSkill("bmad-product-brief", dir);
    assert.ok(skill);
    assert.equal(skill!.name, "bmad-product-brief");
    assert.equal(skill!.description, "Create product briefs");
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill matches by suffix (e.g. 'product-brief' matches 'bmad-product-brief')", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });

    const skill = loadBmadSkill("product-brief", dir);
    assert.ok(skill);
    assert.equal(skill!.name, "bmad-product-brief");
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill matches by prefix with bmad- prefix", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });

    const skill = loadBmadSkill("bmad-product-brief", dir);
    assert.ok(skill);
    assert.equal(skill!.name, "bmad-product-brief");
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill returns null when skill not found", () => {
  const dir = createTestDir();
  try {
    const skill = loadBmadSkill("nonexistent-skill", dir);
    assert.equal(skill, null);
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill loads prompt files from prompts/ directory", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      promptFiles: [
        { name: "contextual-discovery.md", content: "# Contextual Discovery\nFind artifacts." },
        { name: "guided-elicitation.md", content: "# Guided Elicitation\nAsk questions." },
      ],
    });

    const skill = loadBmadSkill("bmad-product-brief", dir);
    assert.ok(skill);
    assert.equal(skill!.prompts.length, 2);
    assert.equal(skill!.prompts[0].name, "contextual-discovery.md");
    assert.equal(skill!.prompts[1].name, "guided-elicitation.md");
    assert.ok(skill!.prompts[0].content.includes("Find artifacts"));
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill loads agent files from agents/ directory", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      agentFiles: [
        { name: "skeptic-reviewer.md", content: "# Skeptic Reviewer\nChallenge everything." },
      ],
    });

    const skill = loadBmadSkill("bmad-product-brief", dir);
    assert.ok(skill);
    assert.equal(skill!.agents.length, 1);
    assert.equal(skill!.agents[0].name, "skeptic-reviewer.md");
    assert.ok(skill!.agents[0].content.includes("Challenge everything"));
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill loads bmad-manifest.json if present", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      manifest: {
        "module-code": "bmm",
        "replaces-skill": "bmad-create-product-brief",
        capabilities: [{ name: "create-brief", description: "Produces briefs." }],
      },
    });

    const skill = loadBmadSkill("bmad-product-brief", dir);
    assert.ok(skill);
    assert.ok(skill!.manifest);
    assert.equal(skill!.manifest!["module-code"], "bmm");
    assert.equal(skill!.manifest!["replaces-skill"], "bmad-create-product-brief");
    assert.ok(skill!.manifest!.capabilities);
    assert.equal(skill!.manifest!.capabilities![0].name, "create-brief");
  } finally {
    cleanupTestDir(dir);
  }
});

test("loadBmadSkill extracts body content after frontmatter", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-test-skill", {
      description: "Test skill",
    });

    const skill = loadBmadSkill("bmad-test-skill", dir);
    assert.ok(skill);
    assert.ok(skill!.content.includes("skill instructions for bmad-test-skill"));
    // Body should NOT contain frontmatter
    assert.ok(!skill!.content.includes("name:"));
  } finally {
    cleanupTestDir(dir);
  }
});

// ─── resolveBmadConfig ──────────────────────────────────────────────────

test("resolveBmadConfig parses config.yaml", () => {
  const dir = createTestDir();
  try {
    createConfig(dir, {
      user_name: "Cid",
      communication_language: "English",
      document_output_language: "English",
      planning_artifacts: "{project-root}/_bmad-output/planning-artifacts",
      project_knowledge: "{project-root}/docs",
    });

    const config = resolveBmadConfig(dir);
    assert.equal(config.values["user_name"], "Cid");
    assert.equal(config.values["communication_language"], "English");
  } finally {
    cleanupTestDir(dir);
  }
});

test("resolveBmadConfig resolves {project-root} template variable", () => {
  const dir = createTestDir();
  try {
    createConfig(dir, {
      planning_artifacts: "{project-root}/_bmad-output/planning-artifacts",
      project_knowledge: "{project-root}/docs",
    });

    const config = resolveBmadConfig(dir);
    assert.equal(
      config.values["planning_artifacts"],
      `${dir}/_bmad-output/planning-artifacts`,
    );
    assert.equal(config.values["project_knowledge"], `${dir}/docs`);
  } finally {
    cleanupTestDir(dir);
  }
});

test("resolveBmadConfig resolves inter-variable references transitively", () => {
  const dir = createTestDir();
  try {
    createConfig(dir, {
      output_folder: "{project-root}/_bmad-output",
      planning_artifacts: "{output_folder}/planning-artifacts",
    });

    const config = resolveBmadConfig(dir);
    assert.equal(
      config.values["output_folder"],
      `${dir}/_bmad-output`,
    );
    assert.equal(
      config.values["planning_artifacts"],
      `${dir}/_bmad-output/planning-artifacts`,
    );
  } finally {
    cleanupTestDir(dir);
  }
});

test("resolveBmadConfig returns empty config when config.yaml not found", () => {
  const dir = createTestDir();
  try {
    const config = resolveBmadConfig(dir);
    assert.equal(Object.keys(config.values).length, 0);
  } finally {
    cleanupTestDir(dir);
  }
});

test("resolveBmadConfig handles quoted values", () => {
  const dir = createTestDir();
  try {
    const bmmDir = join(dir, "_bmad", "bmm");
    mkdirSync(bmmDir, { recursive: true });
    writeFileSync(
      join(bmmDir, "config.yaml"),
      'user_name: "Cid"\ncommunication_language: \'English\'\n',
    );

    const config = resolveBmadConfig(dir);
    assert.equal(config.values["user_name"], "Cid");
    assert.equal(config.values["communication_language"], "English");
  } finally {
    cleanupTestDir(dir);
  }
});

// ─── composeExecutionPrompt ─────────────────────────────────────────────

test("composeExecutionPrompt builds prompt with skill content and user message", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
    });
    createConfig(dir, { user_name: "TestUser" });

    const skill = loadBmadSkill("bmad-product-brief", dir)!;
    const config = resolveBmadConfig(dir);

    const prompt = composeExecutionPrompt(skill, config, "Build an OAuth provider");

    assert.ok(prompt.includes("# Skill: bmad-product-brief"));
    assert.ok(prompt.includes("Create product briefs"));
    assert.ok(prompt.includes("## Skill Instructions"));
    assert.ok(prompt.includes("skill instructions"));
    assert.ok(prompt.includes("## Configuration"));
    assert.ok(prompt.includes("user_name: TestUser"));
    assert.ok(prompt.includes("## User Request"));
    assert.ok(prompt.includes("Build an OAuth provider"));
  } finally {
    cleanupTestDir(dir);
  }
});

test("composeExecutionPrompt includes stage prompts", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      promptFiles: [
        { name: "contextual-discovery.md", content: "# Discovery\nFind things." },
        { name: "draft-and-review.md", content: "# Draft\nWrite things." },
      ],
    });

    const skill = loadBmadSkill("bmad-product-brief", dir)!;
    const config = resolveBmadConfig(dir);

    const prompt = composeExecutionPrompt(skill, config, "Test message");

    assert.ok(prompt.includes("## Stage Prompts"));
    assert.ok(prompt.includes("### contextual-discovery"));
    assert.ok(prompt.includes("### draft-and-review"));
    assert.ok(prompt.includes("Find things."));
    assert.ok(prompt.includes("Write things."));
  } finally {
    cleanupTestDir(dir);
  }
});

test("composeExecutionPrompt includes agent definitions", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-product-brief", {
      description: "Create product briefs",
      agentFiles: [
        { name: "skeptic-reviewer.md", content: "# Skeptic\nChallenge assumptions." },
      ],
    });

    const skill = loadBmadSkill("bmad-product-brief", dir)!;
    const config = resolveBmadConfig(dir);

    const prompt = composeExecutionPrompt(skill, config, "Test message");

    assert.ok(prompt.includes("## Agent Definitions"));
    assert.ok(prompt.includes("### skeptic-reviewer"));
    assert.ok(prompt.includes("Challenge assumptions."));
  } finally {
    cleanupTestDir(dir);
  }
});

test("composeExecutionPrompt omits config section when config is empty", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-test", { description: "Test" });

    const skill = loadBmadSkill("bmad-test", dir)!;
    const config: BmadConfig = { values: {}, configPath: "/fake" };

    const prompt = composeExecutionPrompt(skill, config, "Test");

    assert.ok(!prompt.includes("## Configuration"));
  } finally {
    cleanupTestDir(dir);
  }
});

test("composeExecutionPrompt preserves order: header, config, skill, prompts, agents, user message", () => {
  const dir = createTestDir();
  try {
    createSkill(dir, "1-analysis", "bmad-test", {
      description: "Test skill",
      promptFiles: [{ name: "stage1.md", content: "# Stage 1" }],
      agentFiles: [{ name: "reviewer.md", content: "# Reviewer" }],
    });
    createConfig(dir, { user_name: "Test" });

    const skill = loadBmadSkill("bmad-test", dir)!;
    const config = resolveBmadConfig(dir);
    const prompt = composeExecutionPrompt(skill, config, "Do the thing");

    const headerIdx = prompt.indexOf("# Skill:");
    const configIdx = prompt.indexOf("## Configuration");
    const skillIdx = prompt.indexOf("## Skill Instructions");
    const promptsIdx = prompt.indexOf("## Stage Prompts");
    const agentsIdx = prompt.indexOf("## Agent Definitions");
    const userIdx = prompt.indexOf("## User Request");

    assert.ok(headerIdx < configIdx, "header before config");
    assert.ok(configIdx < skillIdx, "config before skill instructions");
    assert.ok(skillIdx < promptsIdx, "skill instructions before prompts");
    assert.ok(promptsIdx < agentsIdx, "prompts before agents");
    assert.ok(agentsIdx < userIdx, "agents before user request");
  } finally {
    cleanupTestDir(dir);
  }
});

// ─── Integration: real _bmad/ structure ─────────────────────────────────

test("findBmadSkills works against real _bmad/ directory in project", () => {
  const projectRoot = process.cwd();
  const skills = findBmadSkills(projectRoot);

  // Should find both bmm and core skills
  assert.ok(skills.length >= 30, `Expected at least 30 skills, got ${skills.length}`);

  // Should include known skills
  const brief = skills.find((s) => s.name === "bmad-product-brief");
  assert.ok(brief, "Should find bmad-product-brief");
  assert.ok(brief!.description.includes("product brief"));

  // bmad-product-brief should have prompts
  assert.ok(brief!.prompts.length >= 4, `Expected at least 4 prompts, got ${brief!.prompts.length}`);

  // Should have both bmm and core skills
  assert.ok(skills.some((s) => s.module === "bmm"));
  assert.ok(skills.some((s) => s.module === "core"));
});

test("loadBmadSkill loads bmad-product-brief with full structure from real _bmad/", () => {
  const projectRoot = process.cwd();
  const skill = loadBmadSkill("product-brief", projectRoot);

  assert.ok(skill, "Should load bmad-product-brief via suffix match");
  assert.equal(skill!.name, "bmad-product-brief");
  assert.ok(skill!.description.includes("product brief"));
  assert.ok(skill!.prompts.length > 0);
  assert.ok(skill!.agents.length > 0);
  assert.ok(skill!.manifest);

  // Check manifest
  assert.equal(skill!.manifest!["module-code"], "bmm");
  assert.ok(skill!.manifest!.capabilities);
  assert.ok(skill!.manifest!.capabilities!.some((c) => c.name === "create-brief"));
});

test("resolveBmadConfig resolves real config.yaml from project", () => {
  const projectRoot = process.cwd();
  const config = resolveBmadConfig(projectRoot);

  assert.equal(config.values["user_name"], "Cid");
  assert.equal(config.values["communication_language"], "English");
  assert.ok(
    config.values["planning_artifacts"].includes("_bmad-output"),
    `Expected planning_artifacts to contain _bmad-output, got: ${config.values["planning_artifacts"]}`,
  );
  // {project-root} should be resolved to actual path
  assert.ok(
    !config.values["planning_artifacts"].includes("{project-root}"),
    `{project-root} should be resolved`,
  );
});

test("composeExecutionPrompt produces valid prompt from real bmad-product-brief skill", () => {
  const projectRoot = process.cwd();
  const skill = loadBmadSkill("product-brief", projectRoot)!;
  const config = resolveBmadConfig(projectRoot);

  const prompt = composeExecutionPrompt(skill, config, "OAuth provider");

  // Should have all sections
  assert.ok(prompt.includes("# Skill: bmad-product-brief"));
  assert.ok(prompt.includes("## Configuration"));
  assert.ok(prompt.includes("## Skill Instructions"));
  assert.ok(prompt.includes("## Stage Prompts"));
  assert.ok(prompt.includes("## Agent Definitions"));
  assert.ok(prompt.includes("## User Request"));
  assert.ok(prompt.includes("OAuth provider"));

  // Should have actual content from the real skill
  assert.ok(prompt.includes("contextual-discovery"));
  assert.ok(prompt.includes("guided-elicitation"));

  // Should be a substantial prompt
  assert.ok(prompt.length > 1000, `Prompt should be substantial, got ${prompt.length} chars`);
});
