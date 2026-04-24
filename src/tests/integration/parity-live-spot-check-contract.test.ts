import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const releaseGatePath = join(repoRoot, "tests", "parity", "release-gate.ts")
const baselineReportPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")

async function importReleaseGateModule() {
  return await import("../../../tests/parity/release-gate.ts")
}

function createSyntheticBaselineReport(): any {
  return JSON.parse(readFileSync(baselineReportPath, "utf8"))
}

function runReleaseGate(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--experimental-strip-types", releaseGatePath, ...args], {
      cwd: repoRoot,
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

test("release gate reports a precise skip when live is not requested", async () => {
  const releaseGate = await importReleaseGateModule()
  const report = releaseGate.createReleaseGateReport(createSyntheticBaselineReport(), {
    includeLive: false,
    env: { ...process.env, GSD_LIVE_TESTS: "0", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  })

  assert.equal(report.version, 2)
  assert.equal(report.optionalLive.status, "skipped")
  assert.equal(report.optionalLive.includeLiveRequested, false)
  assert.equal(report.optionalLive.enabled, false)
  assert.equal(report.optionalLive.configured, false)
  assert.equal(report.optionalLive.skipReason, "not-enabled")
  assert.match(String(report.optionalLive.reason), /GSD_LIVE_TESTS is not enabled/)
})

test("release gate reports a precise skip when include-live is requested but no live provider is configured", async () => {
  const releaseGate = await importReleaseGateModule()
  const report = releaseGate.createReleaseGateReport(createSyntheticBaselineReport(), {
    includeLive: true,
    env: { ...process.env, GSD_LIVE_TESTS: "1", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  })

  assert.equal(report.optionalLive.status, "skipped")
  assert.equal(report.optionalLive.includeLiveRequested, true)
  assert.equal(report.optionalLive.enabled, true)
  assert.equal(report.optionalLive.configured, false)
  assert.equal(report.optionalLive.skipReason, "no-provider-configured")
  assert.match(String(report.optionalLive.reason), /no live provider API key is configured/)

  const rendered = releaseGate.renderReleaseGateReport(report)
  assert.match(rendered, /optionalLive: status=skipped required=no includeLiveRequested=yes enabled=yes configured=no/)
  assert.match(rendered, /optionalLiveSkipReason: no-provider-configured/)
})

test("release gate include-live cli remains green when deterministic lanes pass and live is skipped for missing config", () => {
  const result = runReleaseGate(["--format", "json", "--include-live"], {
    ...process.env,
    GSD_LIVE_TESTS: "0",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
  })

  assert.equal(result.status, 0)
  const report = JSON.parse(result.stdout)
  assert.equal(report.verdict, "passed")
  assert.equal(report.requiredLanesPassed, true)
  assert.equal(report.optionalLive.status, "skipped")
  assert.equal(report.optionalLive.includeLiveRequested, true)
  assert.equal(report.optionalLive.enabled, true)
  assert.equal(report.optionalLive.configured, false)
  assert.equal(report.optionalLive.skipReason, "no-provider-configured")
  assert.match(String(report.optionalLive.reason), /no live provider API key is configured/)
})
