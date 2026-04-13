/**
 * /skill slash commands.
 *
 * User-facing commands for the skill registry system:
 * - /skill list — Display all indexed skills from .opencode/skills/
 * - /skill — Usage hint pointing to subcommands
 *
 * Commands use ctx.ui.notify() and ctx.ui.setWidget() for output,
 * consistent with the existing /umb and /gsd command patterns.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@gsd/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanSkillDirs } from "../skill-registry/index.js";
import type { SkillMetadata } from "../skill-registry/index.js";
import { validateSkill } from "../skill-registry/index.js";
import { loadModelConfig } from "../model-config/loader.js";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Name format enforced by the Agent Skills Spec. */
const VALID_NAME_RE = /^[a-z0-9-]+$/;

/** Minimum length for a skill name. */
const MIN_NAME_LENGTH = 1;

/** Maximum length for a skill name (arbitrary safety bound). */
const MAX_NAME_LENGTH = 64;

// ─── Command handlers ──────────────────────────────────────────────────────

/**
 * /skill list — Display all indexed skills from .opencode/skills/.
 *
 * Scans the skills directory, validates each skill, and formats
 * the result as a widget table with name, description, and status.
 */
export async function handleSkillList(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const skillsDir = `${ctx.cwd}/.opencode/skills`;
  const skills = scanSkillDirs(skillsDir);

  if (skills.length === 0) {
    ctx.ui.notify("No skills found", "warning");
    ctx.ui.setWidget("skill-list", [
      "📚 Skills",
      "",
      "No skills found in .opencode/skills/",
      "",
      "Create a skill with: /skill new <name> \"description\"",
    ]);
    return;
  }

  const lines: string[] = ["📚 Skills\n"];

  let validCount = 0;
  let invalidCount = 0;

  for (const skill of skills) {
    const validation = validateSkill(skill);
    if (validation.valid) {
      validCount++;
      const desc = skill.description ? ` — ${skill.description}` : "";
      lines.push(`  ✅ ${skill.name}${desc}`);
    } else {
      invalidCount++;
      const issues = validation.errors.join(", ");
      lines.push(`  ❌ ${skill.name} — ${issues}`);
    }
  }

  lines.push("");
  lines.push(`${skills.length} skill(s) indexed (${validCount} valid, ${invalidCount} invalid)`);

  if (invalidCount > 0) {
    ctx.ui.notify(
      `${skills.length} skill(s) found, ${invalidCount} invalid`,
      "warning",
    );
  } else {
    ctx.ui.notify(
      `${skills.length} skill(s) indexed, all valid`,
      "info",
    );
  }

  ctx.ui.setWidget("skill-list", lines);
}

/**
 * /skill — Usage hint for the /skill command namespace.
 */
export async function handleSkillHelp(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  ctx.ui.setWidget("skill", [
    "📚 Skill Commands",
    "",
    "  /skill list — Show all indexed skills",
    "  /skill new <name> \"desc\" — Create a new skill",
    "  /skill run <name> <message> — Run a skill in a new session",
  ]);
}

/**
 * /skill new <name> "description" — Create a new skill.
 *
 * Steps:
 * 1. Parse args: first token is name, rest (stripped of surrounding quotes) is description.
 * 2. Validate name format (lowercase alphanumeric + hyphen).
 * 3. Check that the skill directory doesn't already exist.
 * 4. Create .opencode/skills/{name}/ directory.
 * 5. Write SKILL.md with YAML frontmatter template.
 * 6. Re-scan and validate the new skill.
 * 7. Display success or validation failure.
 */
export async function handleSkillNew(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  // --- Parse arguments ---
  const trimmed = args.trim();
  if (!trimmed) {
    ctx.ui.notify("Usage: /skill new <name> \"description\"", "warning");
    return;
  }

  // First token is the name; the rest (after space) is the description.
  // Description may be quoted — strip surrounding quotes.
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    ctx.ui.notify(
      "Usage: /skill new <name> \"description\" — description is required",
      "warning",
    );
    return;
  }

  let name = trimmed.slice(0, spaceIdx).trim();
  let description = trimmed.slice(spaceIdx + 1).trim();

  // Strip surrounding quotes from description (single or double)
  if (
    (description.startsWith('"') && description.endsWith('"')) ||
    (description.startsWith("'") && description.endsWith("'"))
  ) {
    description = description.slice(1, -1);
  }

  // --- Validate name format ---
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    ctx.ui.notify(
      `Invalid name "${name}" — must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters`,
      "warning",
    );
    return;
  }

  if (!VALID_NAME_RE.test(name)) {
    ctx.ui.notify(
      `Invalid name "${name}" — must match /^[a-z0-9-]+$/ (lowercase alphanumeric + hyphen only)`,
      "warning",
    );
    return;
  }

  // --- Validate description ---
  if (!description) {
    ctx.ui.notify("Description cannot be empty", "warning");
    return;
  }

  // --- Check for existing skill ---
  const skillsDir = join(ctx.cwd, ".opencode", "skills");
  const skillDir = join(skillsDir, name);

  if (existsSync(skillDir)) {
    ctx.ui.notify(`Skill "${name}" already exists`, "warning");
    return;
  }

  // --- Create skill directory and SKILL.md ---
  try {
    mkdirSync(skillDir, { recursive: true });

    const skillMdContent = [
      "---",
      `name: ${name}`,
      `description: ${description}`,
      "---",
      "",
      `# ${name}`,
      "",
      description,
      "",
      "## Usage",
      "",
      "Describe how to use this skill.",
      "",
    ].join("\n");

    const skillMdPath = join(skillDir, "SKILL.md");
    writeFileSync(skillMdPath, skillMdContent, "utf-8");
  } catch (err) {
    ctx.ui.notify(
      `Failed to create skill "${name}": ${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
    return;
  }

  // --- Validate the newly created skill ---
  const skills = scanSkillDirs(skillsDir);
  const created = skills.find((s: SkillMetadata) => s.name === name);

  if (!created) {
    ctx.ui.notify(
      `Skill "${name}" was created but could not be parsed — check SKILL.md`,
      "error",
    );
    return;
  }

  const validation = validateSkill(created);
  if (validation.valid) {
    ctx.ui.notify(`Skill "${name}" created successfully`, "info");
    ctx.ui.setWidget("skill-new", [
      "✨ Skill Created",
      "",
      `  Name: ${created.name}`,
      `  Description: ${created.description}`,
      `  Path: ${skillDir}`,
    ]);
  } else {
    ctx.ui.notify(
      `Skill "${name}" created but has validation errors: ${validation.errors.join(", ")}`,
      "warning",
    );
    ctx.ui.setWidget("skill-new", [
      "⚠️ Skill Created (with issues)",
      "",
      `  Name: ${created.name}`,
      `  Description: ${created.description}`,
      `  Errors: ${validation.errors.join(", ")}`,
    ]);
  }
}

/**
 * /skill run <name> <message> — Run a skill in a new session.
 *
 * Steps:
 * 1. Parse args: first token = skill name, rest = user message.
 * 2. Scan skills directory and find the skill by name (exact match).
 * 3. Validate the skill for compliance.
 * 4. Resolve model routing from .umb/models.yaml (skills section).
 * 5. If skill has a model assignment, validate it in the model registry.
 * 6. Read full SKILL.md content.
 * 7. Create a new session with skill context + user message.
 * 8. Show success/error/cancellation widgets.
 */
export async function handleSkillRun(
  args: string,
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
): Promise<void> {
  // --- Parse arguments ---
  const trimmed = args.trim();
  if (!trimmed) {
    ctx.ui.notify("Usage: /skill run <name> <message>", "warning");
    ctx.ui.setWidget("skill-run", [
      "❓ Specify a skill and message",
      "",
      "  /skill run <name> <message>",
      "",
      "Example:",
      "  /skill run seo-mastery Optimize my landing page",
    ]);
    return;
  }

  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    ctx.ui.notify("Usage: /skill run <name> <message> — message is required", "warning");
    return;
  }

  let skillName = trimmed.slice(0, spaceIdx).trim();
  const userMessage = trimmed.slice(spaceIdx + 1).trim();

  // Strip surrounding quotes from skill name
  if (
    (skillName.startsWith('"') && skillName.endsWith('"')) ||
    (skillName.startsWith("'") && skillName.endsWith("'"))
  ) {
    skillName = skillName.slice(1, -1);
  }

  if (!userMessage) {
    ctx.ui.notify("Message cannot be empty", "warning");
    return;
  }

  // --- Find skill ---
  const skillsDir = `${ctx.cwd}/.opencode/skills`;
  const skills = scanSkillDirs(skillsDir);
  const skill = skills.find((s: SkillMetadata) => s.name === skillName);

  if (!skill) {
    const available = skills.map((s: SkillMetadata) => s.name).join(", ") || "none";
    ctx.ui.notify(`Skill "${skillName}" not found`, "error");
    ctx.ui.setWidget("skill-run", [
      `❌ Skill "${skillName}" not found`,
      "",
      `Available skills: ${available}`,
      "",
      "Create a skill with: /skill new <name> \"description\"",
    ]);
    return;
  }

  // --- Validate skill ---
  const validation = validateSkill(skill);
  if (!validation.valid) {
    ctx.ui.notify(`Skill "${skillName}" is invalid: ${validation.errors.join(", ")}`, "error");
    ctx.ui.setWidget("skill-run", [
      `❌ Skill "${skillName}" has validation errors`,
      "",
      `Errors: ${validation.errors.join(", ")}`,
    ]);
    return;
  }

  // --- Resolve model routing ---
  const { config } = loadModelConfig(ctx.cwd);
  let modelProvider: string | undefined;
  let modelId: string | undefined;
  let modelString: string | undefined;

  if (config) {
    const assignment = config.assignments.find((a) => a.agent === skillName);
    if (assignment) {
      modelString = assignment.model;
      const slashIdx = assignment.model.indexOf("/");
      if (slashIdx === -1) {
        ctx.ui.notify(
          `Invalid model format "${assignment.model}" for skill "${skillName}" — expected provider/modelId`,
          "error",
        );
        ctx.ui.setWidget("skill-run", [
          `❌ Invalid model format for skill "${skillName}"`,
          "",
          `Expected: provider/modelId (e.g. openai/gpt-4o)`,
          `Got: ${assignment.model}`,
        ]);
        return;
      }
      modelProvider = assignment.model.slice(0, slashIdx);
      modelId = assignment.model.slice(slashIdx + 1);

      // Validate model in registry
      const model = ctx.modelRegistry.find(modelProvider, modelId);
      if (!model) {
        ctx.ui.notify(`Model "${modelString}" not found in registry`, "error");
        ctx.ui.setWidget("skill-run", [
          `❌ Model not available: ${modelString}`,
          "",
          `The configured model "${modelString}" for skill "${skillName}" was not found in the model registry.`,
          "",
          "Possible causes:",
          "  • API key not set for the provider",
          "  • Model ID is incorrect or deprecated",
        ]);
        return;
      }
    }
  }

  // --- Read SKILL.md content ---
  let skillMdContent: string;
  try {
    skillMdContent = readFileSync(skill.skillMdPath, "utf-8");
  } catch (err) {
    ctx.ui.notify(
      `Failed to read SKILL.md for "${skillName}": ${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
    return;
  }

  // --- Build prompt ---
  const prompt = [
    `## Skill: ${skillName}`,
    "",
    skillMdContent,
    "",
    `## User Message`,
    "",
    userMessage,
  ].join("\n");

  // --- Create new session ---
  try {
    const result = await ctx.newSession({
      setup: async (sm) => {
        if (modelProvider && modelId) {
          sm.appendModelChange(modelProvider, modelId);
        }
        sm.appendSessionInfo(`skill: ${skillName}`);
        sm.appendMessage({
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        });
      },
    });

    if (result.cancelled) {
      ctx.ui.notify("Session creation cancelled", "warning");
      ctx.ui.setWidget("skill-run", [
        "⚠️ Session creation was cancelled.",
      ]);
      return;
    }

    // Success
    const modelInfo = modelString ?? "default model";
    ctx.ui.notify(`Skill "${skillName}" session started with ${modelInfo}`, "info");
    ctx.ui.setWidget("skill-run", [
      `🎭 Skill: ${skillName}`,
      "",
      `Model: ${modelInfo}`,
      `Message: ${userMessage}`,
      "",
      "Session started — skill context loaded.",
    ]);
  } catch (err) {
    ctx.ui.notify("Failed to start session", "error");
    ctx.ui.setWidget("skill-run", [
      `❌ Failed to start session: ${err instanceof Error ? err.message : String(err)}`,
    ]);
  }
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register all /skill slash commands with the pi extension system.
 */
export function registerSkillCommands(pi: ExtensionAPI): void {
  pi.registerCommand("skill list", {
    description: "Display all indexed skills from .opencode/skills/",
    handler: handleSkillList,
  });

  pi.registerCommand("skill new", {
    description: 'Create a new skill: /skill new <name> "description"',
    handler: handleSkillNew,
  });

  pi.registerCommand("skill run", {
    description: "Run a skill: /skill run <name> <message>",
    handler: (args, ctx) => handleSkillRun(args, ctx, pi),
  });

  pi.registerCommand("skill", {
    description: "Skill commands (use 'list' to show indexed skills)",
    handler: handleSkillHelp,
  });
}
