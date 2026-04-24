import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const resolveTs = join(repoRoot, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const artifactPath = join(repoRoot, "tests", "parity", "artifacts", "mcp-parity.json")
const recordingPath = join(repoRoot, "tests", "fixtures", "recordings", "mcp-parity.json")

function runParity(): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [
      "--import",
      resolveTs,
      "--experimental-strip-types",
      runnerPath,
      "--format",
      "json",
    ], {
      cwd: repoRoot,
      env: { ...process.env, GSD_LIVE_TESTS: "0" },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout, stderr: "", status: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      status: error.status ?? 1,
    }
  }
}

test("baseline parity runner emits a tracked MCP parity artifact and report row", () => {
  const result = runParity()
  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)

  const report = JSON.parse(result.stdout)
  assert.ok(report.mcpParity, "expected mcpParity payload in baseline report")
  assert.equal(report.mcpParity.id, "mcp")
  assert.equal(report.mcpParity.parityArtifactPath, "tests/parity/artifacts/mcp-parity.json")
  assert.equal(report.mcpParity.recordingPath, "tests/fixtures/recordings/mcp-parity.json")
  assert.equal(report.mcpParity.reportPath, "tests/parity/artifacts/mcp-parity.json#mcpParity")
  assert.equal(report.mcpParity.diagnostics.configuredServer.name, "mcp-parity-fixture")
  assert.equal(report.mcpParity.diagnostics.discoveredTools.status, "passed")
  assert.equal(report.mcpParity.diagnostics.schemaInspection.status, "passed")
  assert.equal(report.mcpParity.diagnostics.successInvocation.status, "passed")
  assert.equal(report.mcpParity.diagnostics.failureInvocation.status, "passed")

  assert.ok(existsSync(artifactPath), "expected tracked parity artifact to be written")
  assert.ok(existsSync(recordingPath), "expected tracked fixture recording to be written")

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"))
  const recording = JSON.parse(readFileSync(recordingPath, "utf8"))
  assert.deepEqual(recording, artifact)
  assert.equal(artifact.status, report.mcpParity.parityStatus)
  assert.deepEqual(artifact.diagnostics, report.mcpParity.diagnostics)
})
