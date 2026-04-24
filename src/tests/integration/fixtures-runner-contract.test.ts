import { existsSync, readFileSync } from "node:fs"
import { Writable } from "node:stream"
import { expect, test } from "vitest"

import {
  FIXTURES_RUNNER_MANIFEST_PATH,
  assertRecordingShape,
  findUnsupportedRecordingCandidates,
  loadFixturesRunnerManifest,
  runFixturesRunner,
  validateFixturesRunnerManifest,
} from "../../../tests/fixtures/run.ts"
import { loadFixture } from "../../../tests/fixtures/provider.ts"

type CapturedStream = Writable & { output: string }

function createCapturedStream(): CapturedStream {
  let output = ""
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  }) as CapturedStream

  Object.defineProperty(stream, "output", {
    get() {
      return output
    },
  })

  return stream
}

test("fixtures-runner manifest only names tracked replay recordings under tests/fixtures/recordings", () => {
  expect(existsSync(FIXTURES_RUNNER_MANIFEST_PATH)).toBe(true)

  const manifest = validateFixturesRunnerManifest(loadFixturesRunnerManifest())
  expect(manifest.version).toBe(1)
  expect(manifest.recordings).toHaveLength(6)
  expect(manifest.recordings.map((entry) => entry.id)).toEqual([
    "agent-creates-file",
    "agent-handles-error",
    "agent-multi-turn-tools",
    "agent-reads-and-edits",
    "installed-mode-parity-web-task",
    "repo-mode-parity-web-task",
  ])

  for (const entry of manifest.recordings) {
    expect(entry.path).toMatch(/^tests\/fixtures\/recordings\/.+\.json$/)
    expect(entry.path).not.toMatch(/^\//)
    expect(entry.path).not.toContain("..")
    expect(entry.path).not.toMatch(/^\.gsd\//)
    expect(existsSync(entry.path), `manifest entry should exist in repo: ${entry.path}`).toBe(true)

    const file = JSON.parse(readFileSync(entry.path, "utf8")) as { name?: string; turns?: unknown[] }
    expect(file.name).toBe(entry.expectedName)
    expect(Array.isArray(file.turns)).toBe(true)
    expect(file.turns?.length ?? 0).toBeGreaterThanOrEqual(entry.minimumTurns)
  }
})

test("fixtures-runner ignores parity artifact JSON files that are not canonical replay fixtures", () => {
  const manifest = validateFixturesRunnerManifest(loadFixturesRunnerManifest())
  const unsupported = findUnsupportedRecordingCandidates(manifest)

  expect(unsupported).toEqual([
    "tests/fixtures/recordings/mcp-parity.json",
    "tests/fixtures/recordings/workflow-parity.json",
  ])
})

test("fixtures-runner replays only allowlisted fixtures and reports ignored unsupported artifacts", () => {
  const stdout = createCapturedStream()
  const stderr = createCapturedStream()

  const result = runFixturesRunner({ stdout, stderr })

  expect(result).toEqual({
    passed: 6,
    failed: 0,
    unsupportedPaths: [
      "tests/fixtures/recordings/mcp-parity.json",
      "tests/fixtures/recordings/workflow-parity.json",
    ],
  })

  expect(stdout.output).toContain("ignored unsupported recording artifacts: tests/fixtures/recordings/mcp-parity.json, tests/fixtures/recordings/workflow-parity.json")
  expect(stdout.output).toContain("PASS  agent-creates-file")
  expect(stdout.output).toContain("PASS  installed-mode-parity-web-task")
  expect(stdout.output).toContain("PASS  repo-mode-parity-web-task")
  expect(stdout.output).not.toContain("PASS  mcp-parity")
  expect(stdout.output).not.toContain("PASS  workflow-parity")
  expect(stderr.output).toBe("")
})

test("recording-shape diagnostics name the unsupported artifact path when parity JSON is treated as a replay recording", () => {
  const artifactPath = "tests/fixtures/recordings/mcp-parity.json"
  const artifact = loadFixture(artifactPath)

  expect(() =>
    assertRecordingShape(artifact, `unsupported artifact (${artifactPath})`, {
      id: "mcp-parity",
      path: artifactPath,
      expectedName: "mcp-parity",
      minimumTurns: 1,
      minimumAssistantTurns: 1,
      requiredRoles: ["user", "assistant"],
    }),
  ).toThrowError(new RegExp(`unsupported artifact \\(${artifactPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\): missing or invalid 'name'`))
})
