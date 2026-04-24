import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const resolveTs = join(repoRoot, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const artifactPath = join(repoRoot, "tests", "parity", "artifacts", "workflow-parity.json")
const recordingPath = join(repoRoot, "tests", "fixtures", "recordings", "workflow-parity.json")

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

test("baseline parity runner emits a tracked workflow parity artifact and report row", () => {
  const result = runParity()
  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)

  const report = JSON.parse(result.stdout)
  assert.ok(report.workflowParity, "expected workflowParity payload in baseline report")
  assert.equal(report.workflowParity.id, "workflow-bmad")
  assert.equal(report.workflowParity.parityArtifactPath, "tests/parity/artifacts/workflow-parity.json")
  assert.equal(report.workflowParity.recordingPath, "tests/fixtures/recordings/workflow-parity.json")
  assert.equal(report.workflowParity.reportPath, "tests/parity/artifacts/workflow-parity.json#workflowParity")
  assert.equal(report.workflowParity.diagnostics.verificationEvidence.status, "passed")
  assert.ok(report.workflowParity.diagnostics.artifactChecks.every((check: { exists: boolean }) => check.exists), "expected all required workflow artifacts to exist")
  assert.ok(report.workflowParity.diagnostics.stateTransitions.every((check: { status: string }) => check.status === "passed"), "expected all workflow state transitions to pass")

  assert.ok(existsSync(artifactPath), "expected tracked parity artifact to be written")
  assert.ok(existsSync(recordingPath), "expected tracked fixture recording to be written")

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"))
  const recording = JSON.parse(readFileSync(recordingPath, "utf8"))
  assert.deepEqual(recording, artifact)
  assert.equal(artifact.status, report.workflowParity.parityStatus)
  assert.deepEqual(artifact.diagnostics, report.workflowParity.diagnostics)
})
