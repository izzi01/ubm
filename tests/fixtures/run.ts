import { existsSync, readFileSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { loadFixture, FixtureReplayer } from "./provider.ts";
import type { FixtureTurn, FixtureRecording } from "./provider.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const recordingsDir = join(__dirname, "recordings");
export const FIXTURES_RUNNER_MANIFEST_PATH = join(__dirname, "fixtures-runner-manifest.json");

export type FixtureRunnerManifestEntry = {
  id: string;
  path: string;
  expectedName: string;
  minimumTurns: number;
  minimumAssistantTurns: number;
  requiredRoles: Array<FixtureTurn["role"]>;
};

export type FixtureRunnerManifest = {
  version: number;
  recordings: FixtureRunnerManifestEntry[];
};

export function loadFixturesRunnerManifest(manifestPath: string = FIXTURES_RUNNER_MANIFEST_PATH): FixtureRunnerManifest {
  const raw = readFileSync(manifestPath, "utf8");
  return JSON.parse(raw) as FixtureRunnerManifest;
}

export function validateFixturesRunnerManifest(manifest: FixtureRunnerManifest, options: { manifestPath?: string; repoRoot?: string } = {}): FixtureRunnerManifest {
  const manifestPath = options.manifestPath ?? FIXTURES_RUNNER_MANIFEST_PATH;
  const root = options.repoRoot ?? repoRoot;

  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error(`${manifestPath}: version must be an integer greater than or equal to 1`);
  }
  if (!Array.isArray(manifest.recordings) || manifest.recordings.length === 0) {
    throw new Error(`${manifestPath}: recordings must be a non-empty array`);
  }

  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();

  manifest.recordings.forEach((entry, index) => {
    const entryLabel = `${manifestPath} recordings[${index}]`;
    if (!entry || typeof entry !== "object") {
      throw new Error(`${entryLabel}: entry must be an object`);
    }
    if (!entry.id || typeof entry.id !== "string") {
      throw new Error(`${entryLabel}: id must be a non-empty string`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`${entryLabel}: duplicate id \"${entry.id}\"`);
    }
    seenIds.add(entry.id);

    if (!entry.path || typeof entry.path !== "string") {
      throw new Error(`${entryLabel}: path must be a non-empty string`);
    }
    if (entry.path.startsWith("/") || entry.path.includes("\\")) {
      throw new Error(`${entryLabel}: path must be repo-relative using forward slashes (${entry.path})`);
    }
    if (!entry.path.startsWith("tests/fixtures/recordings/")) {
      throw new Error(`${entryLabel}: path must stay under tests/fixtures/recordings (${entry.path})`);
    }
    if (entry.path.includes("..")) {
      throw new Error(`${entryLabel}: path must not traverse outside the repo (${entry.path})`);
    }
    if (seenPaths.has(entry.path)) {
      throw new Error(`${entryLabel}: duplicate path \"${entry.path}\"`);
    }
    seenPaths.add(entry.path);

    if (!entry.expectedName || typeof entry.expectedName !== "string") {
      throw new Error(`${entryLabel}: expectedName must be a non-empty string`);
    }
    if (!Number.isInteger(entry.minimumTurns) || entry.minimumTurns < 1) {
      throw new Error(`${entryLabel}: minimumTurns must be an integer greater than 0`);
    }
    if (!Number.isInteger(entry.minimumAssistantTurns) || entry.minimumAssistantTurns < 1) {
      throw new Error(`${entryLabel}: minimumAssistantTurns must be an integer greater than 0`);
    }
    if (entry.minimumAssistantTurns > entry.minimumTurns) {
      throw new Error(`${entryLabel}: minimumAssistantTurns cannot exceed minimumTurns`);
    }
    if (!Array.isArray(entry.requiredRoles) || entry.requiredRoles.length === 0) {
      throw new Error(`${entryLabel}: requiredRoles must be a non-empty array`);
    }
    for (const role of entry.requiredRoles) {
      if (role !== "user" && role !== "assistant") {
        throw new Error(`${entryLabel}: requiredRoles must only contain \"user\" or \"assistant\"`);
      }
    }

    const absolutePath = resolve(root, entry.path);
    if (!absolutePath.startsWith(`${root}/`) && absolutePath !== root) {
      throw new Error(`${entryLabel}: resolved path escapes repo root (${entry.path})`);
    }
    if (!existsSync(absolutePath)) {
      throw new Error(`${entryLabel}: recording file is missing (${entry.path})`);
    }
  });

  return manifest;
}

export function assertRecordingShape(recording: FixtureRecording, label: string, entry?: FixtureRunnerManifestEntry): void {
  if (!recording || typeof recording !== "object") {
    throw new Error(`${label}: recording must be a JSON object`);
  }
  if (!recording.name || typeof recording.name !== "string") {
    throw new Error(`${label}: missing or invalid 'name'`);
  }
  if (entry && recording.name !== entry.expectedName) {
    throw new Error(`${label}: expected recording name \"${entry.expectedName}\" but found \"${recording.name}\"`);
  }
  if (!Array.isArray(recording.turns) || recording.turns.length === 0) {
    throw new Error(`${label}: 'turns' must be a non-empty array`);
  }
  if (entry && recording.turns.length < entry.minimumTurns) {
    throw new Error(`${label}: expected at least ${entry.minimumTurns} turns but found ${recording.turns.length}`);
  }

  const rolesPresent = new Set<FixtureTurn["role"]>();
  let assistantTurns = 0;

  for (const turn of recording.turns) {
    assertTurnShape(turn, label);
    rolesPresent.add(turn.role);
    if (turn.role === "assistant") assistantTurns++;
  }

  if (entry) {
    if (assistantTurns < entry.minimumAssistantTurns) {
      throw new Error(`${label}: expected at least ${entry.minimumAssistantTurns} assistant turns but found ${assistantTurns}`);
    }
    for (const role of entry.requiredRoles) {
      if (!rolesPresent.has(role)) {
        throw new Error(`${label}: missing required role \"${role}\"`);
      }
    }
  }
}

export function assertTurnShape(turn: FixtureTurn, label: string): void {
  if (turn.role !== "user" && turn.role !== "assistant") {
    throw new Error(`${label}: invalid role \"${(turn as { role?: unknown }).role}\"`);
  }
  if (typeof turn.content !== "string") {
    throw new Error(`${label}: turn content must be a string`);
  }
  if (turn.toolUses !== undefined) {
    if (!Array.isArray(turn.toolUses)) {
      throw new Error(`${label}: toolUses must be an array`);
    }
    for (const tool of turn.toolUses) {
      if (!tool.name || typeof tool.name !== "string") {
        throw new Error(`${label}: tool use missing 'name'`);
      }
      if (!tool.input || typeof tool.input !== "object") {
        throw new Error(`${label}: tool use missing 'input'`);
      }
    }
  }
}

export function validateManifestEntryRecording(entry: FixtureRunnerManifestEntry, options: { repoRoot?: string } = {}): FixtureRecording {
  const root = options.repoRoot ?? repoRoot;
  const filePath = resolve(root, entry.path);
  const label = `${entry.id} (${entry.path})`;
  const recording = loadFixture(filePath);
  assertRecordingShape(recording, label, entry);
  return recording;
}

export function findUnsupportedRecordingCandidates(manifest: FixtureRunnerManifest, options: { recordingsDir?: string; repoRoot?: string } = {}): string[] {
  const directory = options.recordingsDir ?? recordingsDir;
  const root = options.repoRoot ?? repoRoot;
  const allowlistedPaths = new Set(manifest.recordings.map((entry) => resolve(root, entry.path)));

  return Array.from(new Set(
    readDirectoryJson(directory)
      .map((name) => resolve(directory, name))
      .filter((absolutePath) => !allowlistedPaths.has(absolutePath))
      .map((absolutePath) => relative(root, absolutePath).replace(/\\/g, "/")),
  )).sort();
}

function readDirectoryJson(directory: string): string[] {
  return existsSync(directory)
    ? readDirEntries(directory).filter((name) => name.endsWith(".json")).sort()
    : [];
}

function readDirEntries(directory: string): string[] {
  return (awaitImportFs().readdirSync(directory) as string[]);
}

function awaitImportFs(): typeof import("fs") {
  return requireFs;
}

const requireFs = await import("fs");

function replayRecording(recording: FixtureRecording, label: string): void {
  const replayer = new FixtureReplayer(recording);
  const assistantTurns = recording.turns.filter((t) => t.role === "assistant");

  for (let i = 0; i < assistantTurns.length; i++) {
    const response = replayer.nextResponse();
    if (!response) {
      throw new Error(`${label}: Replayer exhausted at turn ${i}, expected ${assistantTurns.length} assistant turns`);
    }
    assertTurnShape(response, `${label} turn ${i}`);

    if (response.content !== assistantTurns[i].content) {
      throw new Error(
        `${label}: turn ${i} content mismatch: \"${response.content}\" !== \"${assistantTurns[i].content}\"`,
      );
    }
  }

  const extra = replayer.nextResponse();
  if (extra !== null) {
    throw new Error(`${label}: Replayer returned extra responses beyond expected count`);
  }
}

export function runFixturesRunner(options: { manifestPath?: string; repoRoot?: string; stdout?: NodeJS.WriteStream; stderr?: NodeJS.WriteStream } = {}): { passed: number; failed: number; unsupportedPaths: string[] } {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const manifestPath = options.manifestPath ?? FIXTURES_RUNNER_MANIFEST_PATH;
  const root = options.repoRoot ?? repoRoot;

  const manifest = validateFixturesRunnerManifest(loadFixturesRunnerManifest(manifestPath), { manifestPath, repoRoot: root });
  const unsupportedPaths = findUnsupportedRecordingCandidates(manifest, { repoRoot: root });

  if (manifest.recordings.length === 0) {
    stderr.write(`No fixture recordings found in manifest ${relative(root, manifestPath).replace(/\\/g, "/")}\n`);
    return { passed: 0, failed: 1, unsupportedPaths };
  }

  if (unsupportedPaths.length > 0) {
    stdout.write(`  INFO  ignored unsupported recording artifacts: ${unsupportedPaths.join(", ")}\n`);
  }

  let passed = 0;
  let failed = 0;

  for (const entry of manifest.recordings) {
    const label = entry.id;

    try {
      const recording = validateManifestEntryRecording(entry, { repoRoot: root });
      replayRecording(recording, `${label} (${entry.path})`);
      stdout.write(`  PASS  ${label}\n`);
      passed++;
    } catch (err: any) {
      stderr.write(`  FAIL  ${label}: ${err.message}\n`);
      failed++;
    }
  }

  stdout.write(`\nFixture tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, unsupportedPaths };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runFixturesRunner();
  if (result.failed > 0) process.exit(1);
}
