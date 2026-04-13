/**
 * Smoke tests for model-config: parseSimpleYaml and loadModelConfig.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parseSimpleYaml, loadModelConfig } from "../model-config/loader.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "umb-model-config-test-"));
}

// ─── parseSimpleYaml ────────────────────────────────────────────────────────

test("parseSimpleYaml parses tier, agents block, and skills block", () => {
  const yaml = [
    "tier: standard",
    "",
    "agents:",
    "  dev: google/gemini-3-pro",
    "  pm: openai/gpt-5",
    "",
    "skills:",
    "  seo-mastery: anthropic/claude-sonnet-4",
  ].join("\n");

  const config = parseSimpleYaml(yaml);
  assert.notEqual(config, null);
  assert.equal(config!.tier, "standard");
  assert.equal(config!.agents!["dev"], "google/gemini-3-pro");
  assert.equal(config!.agents!["pm"], "openai/gpt-5");
  assert.equal(config!.skills!["seo-mastery"], "anthropic/claude-sonnet-4");
});

test("parseSimpleYaml returns null for empty input", () => {
  assert.equal(parseSimpleYaml(""), null);
  assert.equal(parseSimpleYaml("   \n  \n"), null);
});

test("parseSimpleYaml returns null for comment-only input", () => {
  assert.equal(parseSimpleYaml("# just a comment"), null);
  assert.equal(parseSimpleYaml("# line 1\n# line 2"), null);
});

test("parseSimpleYaml returns null for invalid YAML-like content", () => {
  // Content that has no parseable keys
  assert.equal(parseSimpleYaml("!!!invalid yaml!!!"), null);
});

test("parseSimpleYaml parses tier-only config", () => {
  const config = parseSimpleYaml("tier: budget");
  assert.notEqual(config, null);
  assert.equal(config!.tier, "budget");
});

test("parseSimpleYaml ignores invalid tier values", () => {
  const config = parseSimpleYaml("tier: nonexistent");
  // Tier is set to undefined because it's not in VALID_TIERS, but agents block is empty
  // so if no agents either, it should return null
  assert.equal(config, null);
});

test("parseSimpleYaml handles comments in agents block", () => {
  const yaml = [
    "agents:",
    "  # This is a comment",
    "  dev: google/gemini-3-pro",
    "  pm: openai/gpt-5  # inline comment",
  ].join("\n");

  const config = parseSimpleYaml(yaml);
  assert.notEqual(config, null);
  assert.equal(config!.agents!["dev"], "google/gemini-3-pro");
  assert.equal(config!.agents!["pm"], "openai/gpt-5");
});

// ─── loadModelConfig ────────────────────────────────────────────────────────

test("loadModelConfig returns null config when no file exists", () => {
  const dir = createTestDir();
  try {
    const result = loadModelConfig(dir);
    assert.equal(result.config, null);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadModelConfig returns resolved config with tier defaults and user overrides", () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), [
    "tier: standard",
    "",
    "agents:",
    "  dev: google/custom-model",
  ].join("\n"));

  try {
    const result = loadModelConfig(dir);
    assert.notEqual(result.config, null);
    assert.equal(result.config!.tier, "standard");

    // User override should be present
    const devAssignment = result.config!.assignments.find(a => a.agent === "dev");
    assert.notEqual(devAssignment, undefined);
    assert.equal(devAssignment!.model, "google/custom-model");
    assert.equal(devAssignment!.source, "user");

    // Tier defaults should be present for other agents
    const pmAssignment = result.config!.assignments.find(a => a.agent === "pm");
    assert.notEqual(pmAssignment, undefined);
    assert.equal(pmAssignment!.source, "tier");

    // Total assignments should include all tier defaults + user overrides
    assert.ok(result.config!.assignments.length > 5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadModelConfig handles malformed YAML gracefully", () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), "{{{not valid yaml{{{");

  try {
    const result = loadModelConfig(dir);
    // Malformed YAML that parseSimpleYaml can't parse anything from should return null config
    // parseSimpleYaml won't throw — it returns null for unparseable content
    assert.equal(result.config, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadModelConfig handles empty config file", () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), "");

  try {
    const result = loadModelConfig(dir);
    assert.equal(result.config, null);
    assert.ok(result.warnings.some(w => w.includes("No model assignments")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadModelConfig shows warnings for unknown agents", () => {
  const dir = createTestDir();
  mkdirSync(join(dir, ".umb"), { recursive: true });
  writeFileSync(join(dir, ".umb", "models.yaml"), [
    "agents:",
    "  totally-fake-agent: google/gemini-3-pro",
  ].join("\n"));

  try {
    const result = loadModelConfig(dir);
    assert.notEqual(result.config, null);
    assert.ok(
      result.config!.warnings.some(w => w.includes("totally-fake-agent") && w.includes("not a recognized")),
      `Expected warning about unknown agent, got: ${JSON.stringify(result.config!.warnings)}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
