import { test } from "vitest"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const resolveTs = join(repoRoot, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const modulePath = join(repoRoot, "tests", "parity", "baseline-lanes.ts")
const expectedTargets = [
  "tests/smoke/run.ts",
  "tests/fixtures/run.ts",
  "tests/live/run.ts",
  "tests/live-regression/run.ts",
  "src/tests/integration/e2e-smoke.test.ts",
  "src/tests/integration/e2e-headless.test.ts",
  "tests/fixtures/recordings/repo-mode-parity-web-task.json",
  "tests/fixtures/recordings/installed-mode-parity-web-task.json",
] as const

function runNode(args: string[], env: NodeJS.ProcessEnv = process.env, cwd: string = repoRoot): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd,
      env,
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

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

test("baseline lane matrix is fixed, allowlisted, and tied to tracked in-repo targets", async () => {
  const parity = await importParityModule()
  parity.validateBaselineLaneDefinitions(parity.BASELINE_LANES, { cwd: repoRoot, requireTargets: true })

  assert.equal(parity.BASELINE_LANES.length, expectedTargets.length)
  assert.deepEqual(
    parity.BASELINE_LANES.map((lane: any) => lane.target),
    [...expectedTargets],
    "update the parity baseline contract intentionally if lane targets change",
  )

  for (const lane of parity.BASELINE_LANES) {
    assert.match(lane.name, /^[a-z0-9-]+$/)
    assert.equal(lane.target.startsWith("tests/") || lane.target.startsWith("src/tests/integration/"), true)
    assert.equal(existsSync(join(repoRoot, lane.target)), true, `${lane.name} should point at a tracked file`)
  }
})

test("baseline runner emits machine-readable JSON plus an artifact file with proof labels and summary verdict", { timeout: 60000 }, () => {
  const tempHome = mkdtempSync(join(tmpdir(), "umb-parity-home-"))
  try {
    const result = runNode([
      "--import",
      resolveTs,
      "--experimental-strip-types",
      runnerPath,
      "--format",
      "json",
    ], {
      ...process.env,
      HOME: tempHome,
      GSD_LIVE_TESTS: "0",
    })

    assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)

    const report = JSON.parse(result.stdout)
    assert.equal(report.version, 4)
    assert.equal(report.summary.verdict, "partial")
    assert.equal(report.summary.provesCodingLoop, true)
    assert.equal(report.lanes.length, expectedTargets.length)
    assert.equal(typeof report.generatedAt, "string")
    assert.ok(report.artifactPath.endsWith("tests/parity/artifacts/baseline-report.json"))

    const byName = new Map(report.lanes.map((lane: any) => [lane.name, lane]))
    assert.equal(byName.get("smoke-runner").proofClass, "smoke")
    assert.equal(byName.get("smoke-runner").status, "passed")
    assert.equal(byName.get("smoke-runner").skipReason, null)
    assert.equal(byName.get("fixtures-runner").proofClass, "uncovered-coding-loop")
    assert.equal(byName.get("pack-install").proofClass, "installed-binary")
    assert.equal(byName.get("pack-install").status, "passed")
    assert.equal(byName.get("pack-install").artifactPath, "tests/fixtures/recordings/installed-mode-parity-web-task.json")
    assert.deepEqual(byName.get("pack-install").phaseResults.map((phase: any) => phase.phase), ["inspect", "edit", "test", "dev-server", "browser"])
    assert.equal(byName.get("live-runner").status, "skipped")
    assert.match(byName.get("live-runner").skipReason, /GSD_LIVE_TESTS/i)
    assert.equal(byName.get("live-regression-runner").status, "passed")
    assert.equal(report.repoInstalledComparison.repoArtifactPath, "tests/fixtures/recordings/repo-mode-parity-web-task.json")
    assert.equal(report.repoInstalledComparison.installedArtifactPath, "tests/fixtures/recordings/installed-mode-parity-web-task.json")
    assert.equal(report.repoInstalledComparison.comparableWithoutRerun, true)
    assert.deepEqual(report.repoInstalledComparison.divergencePhases, [])
    assert.ok(report.secondaryParity, "baseline report should expose secondary parity metadata")
    assert.equal(report.secondaryParity.inventoryPath, "tests/parity/artifacts/secondary-surface-inventory.json")
    assert.equal(report.secondaryParity.manifestPath, "tests/fixtures/secondary-parity-manifest.json")
    assert.equal(report.secondaryParity.summary.totalSurfaces, 4)
    assert.deepEqual(report.secondaryParity.summary.surfacesMissingReleaseReadableCoverage, [
      "mcp",
      "workflow-bmad",
    ])

    const artifact = JSON.parse(readFileSync(join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json"), "utf8"))
    assert.equal(artifact.summary.verdict, report.summary.verdict)
    assert.equal(artifact.lanes.length, report.lanes.length)
  } finally {
    rmSync(tempHome, { recursive: true, force: true })
  }
})

test("baseline helpers classify invalid metadata, missing targets, skip semantics, failures, and timeouts deterministically", async () => {
  const parity = await importParityModule()

  assert.throws(() => {
    parity.validateBaselineLaneDefinitions([
      {
        ...parity.BASELINE_LANES[0],
        name: "",
      },
    ])
  }, /non-empty name/i)

  assert.throws(() => {
    parity.validateBaselineLaneDefinitions([
      {
        ...parity.BASELINE_LANES[0],
        target: "tests/does-not-exist.ts",
      },
    ], { cwd: repoRoot, requireTargets: true })
  }, /Missing lane target/i)

  const skipped = await parity.executeBaselineLane(parity.BASELINE_LANES[2], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GSD_LIVE_TESTS: "0",
    },
  })
  assert.equal(skipped.name, "live-runner")
  assert.equal(skipped.status, "skipped")
  assert.match(skipped.skipReason, /GSD_LIVE_TESTS/i)

  const failed = await parity.executeBaselineLane(
    {
      ...parity.BASELINE_LANES[0],
      name: "forced-failure",
      target: "-e",
      runner: "node-script",
      timeoutMs: 5_000,
      skip: "never",
    },
    {
      cwd: repoRoot,
      env: {
        ...process.env,
      },
    },
  )
  assert.equal(failed.status, "failed")
  assert.equal(failed.exitCode, 9)
  assert.match(failed.skipReason, /forced-failure exited with code 9/i)

  const timedOutDir = mkdtempSync(join(tmpdir(), "umb-parity-timeout-"))
  const timedOutScriptPath = join(timedOutDir, "parity-forced-timeout.cjs")
  writeFileSync(timedOutScriptPath, "setTimeout(() => {}, 10_000)\n", "utf8")
  const timedOut = await parity.executeBaselineLane(
    {
      ...parity.BASELINE_LANES[0],
      name: "forced-timeout",
      target: timedOutScriptPath,
      runner: "node-script",
      timeoutMs: 25,
      skip: "never",
    },
    {
      cwd: repoRoot,
      env: {
        ...process.env,
      },
    },
  )
  assert.equal(timedOut.status, "timed_out")
  assert.match(timedOut.skipReason, /forced-timeout exceeded timeout/i)
  rmSync(timedOutDir, { recursive: true, force: true })

  const spawnFailure = await parity.executeBaselineLane(
    {
      ...parity.BASELINE_LANES[0],
      name: "spawn-missing-cwd",
    },
    {
      cwd: join(repoRoot, "does-not-exist"),
      env: {
        ...process.env,
      },
    },
  )
  assert.equal(spawnFailure.status, "failed")
  assert.match(spawnFailure.skipReason, /spawn-missing-cwd spawn failed/i)
})
