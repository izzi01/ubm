import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { spawn } from "node:child_process"

export const BASELINE_REPORT_VERSION = 1 as const
export const BASELINE_REPORT_PATH = "tests/parity/artifacts/baseline-report.json" as const

export const PROOF_CLASSES = [
  "smoke",
  "repo-infra",
  "installed-binary",
  "live-spot-check",
  "uncovered-coding-loop",
] as const

export const LANE_STATUSES = ["passed", "failed", "skipped", "timed_out"] as const
export const PARITY_SCOPES = ["repo-mode", "installed-mode", "live-only", "partial"] as const
export const SUMMARY_VERDICTS = ["failing", "partial", "covered"] as const

export type ProofClass = (typeof PROOF_CLASSES)[number]
export type LaneStatus = (typeof LANE_STATUSES)[number]
export type ParityScope = (typeof PARITY_SCOPES)[number]
export type SummaryVerdict = (typeof SUMMARY_VERDICTS)[number]

export interface BaselineLaneDefinition {
  name: string
  target: string
  runner: "node-script" | "node-test"
  proofClass: ProofClass
  parityScope: ParityScope
  provesCodingLoop: boolean
  timeoutMs: number
  skip: "never" | "requires-live-env" | "requires-smoke-binary"
  description: string
}

export interface BaselineLaneResult {
  name: string
  target: string
  runner: BaselineLaneDefinition["runner"]
  proofClass: ProofClass
  parityScope: ParityScope
  provesCodingLoop: boolean
  status: LaneStatus
  skipReason: string | null
  exitCode: number | null
  durationMs: number
  command: string[]
}

export interface BaselineSummary {
  verdict: SummaryVerdict
  totalLanes: number
  passed: number
  failed: number
  skipped: number
  timedOut: number
  provesCodingLoop: boolean
  uncoveredLaneNames: string[]
  proofClassCounts: Record<ProofClass, number>
}

export interface BaselineReport {
  version: typeof BASELINE_REPORT_VERSION
  generatedAt: string
  cwd: string
  artifactPath: string
  summary: BaselineSummary
  lanes: BaselineLaneResult[]
}

export const BASELINE_LANES: readonly BaselineLaneDefinition[] = [
  {
    name: "smoke-runner",
    target: "tests/smoke/run.ts",
    runner: "node-script",
    proofClass: "smoke",
    parityScope: "partial",
    provesCodingLoop: false,
    timeoutMs: 30_000,
    skip: "never",
    description: "Basic CLI startup and help/version smoke checks.",
  },
  {
    name: "fixtures-runner",
    target: "tests/fixtures/run.ts",
    runner: "node-script",
    proofClass: "uncovered-coding-loop",
    parityScope: "partial",
    provesCodingLoop: false,
    timeoutMs: 30_000,
    skip: "never",
    description: "Deterministic fixture replay coverage without proving the real coding loop.",
  },
  {
    name: "live-runner",
    target: "tests/live/run.ts",
    runner: "node-script",
    proofClass: "live-spot-check",
    parityScope: "live-only",
    provesCodingLoop: false,
    timeoutMs: 60_000,
    skip: "requires-live-env",
    description: "Live provider spot-checks gated behind explicit live-test opt-in.",
  },
  {
    name: "live-regression-runner",
    target: "tests/live-regression/run.ts",
    runner: "node-script",
    proofClass: "installed-binary",
    parityScope: "installed-mode",
    provesCodingLoop: false,
    timeoutMs: 60_000,
    skip: "requires-smoke-binary",
    description: "Installed-binary regression lane that validates packaged/runtime behavior.",
  },
  {
    name: "e2e-smoke",
    target: "src/tests/integration/e2e-smoke.test.ts",
    runner: "node-test",
    proofClass: "repo-infra",
    parityScope: "repo-mode",
    provesCodingLoop: false,
    timeoutMs: 60_000,
    skip: "never",
    description: "Repo-mode packaged CLI smoke coverage.",
  },
  {
    name: "e2e-headless",
    target: "src/tests/integration/e2e-headless.test.ts",
    runner: "node-test",
    proofClass: "repo-infra",
    parityScope: "repo-mode",
    provesCodingLoop: false,
    timeoutMs: 60_000,
    skip: "never",
    description: "Repo-mode headless execution and output contract coverage.",
  },
  {
    name: "pack-install",
    target: "src/tests/integration/pack-install.test.ts",
    runner: "node-test",
    proofClass: "installed-binary",
    parityScope: "installed-mode",
    provesCodingLoop: false,
    timeoutMs: 120_000,
    skip: "never",
    description: "Pack/install contract coverage for the published tarball/binary shape.",
  },
] as const

export function validateBaselineLaneDefinitions(
  lanes: readonly BaselineLaneDefinition[],
  options: { cwd?: string; requireTargets?: boolean } = {},
): void {
  const cwd = options.cwd ?? process.cwd()
  const seen = new Set<string>()

  for (const lane of lanes) {
    if (!lane.name || typeof lane.name !== "string") {
      throw new Error(`Invalid lane metadata: every lane must have a non-empty name`)
    }
    if (seen.has(lane.name)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: duplicate lane name`)
    }
    seen.add(lane.name)

    if (!PROOF_CLASSES.includes(lane.proofClass)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported proofClass ${String(lane.proofClass)}`)
    }
    if (!PARITY_SCOPES.includes(lane.parityScope)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported parityScope ${String(lane.parityScope)}`)
    }
    if (!LANE_STATUSES.includes("passed")) {
      throw new Error(`Lane status registry is unexpectedly empty`)
    }
    if (!lane.target || lane.target.startsWith("/") || lane.target.includes("..")) {
      throw new Error(`Invalid lane metadata for ${lane.name}: target must stay inside the repo (${lane.target})`)
    }
    if (lane.timeoutMs <= 0) {
      throw new Error(`Invalid lane metadata for ${lane.name}: timeoutMs must be positive`)
    }
    if (!Number.isFinite(lane.timeoutMs)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: timeoutMs must be finite`)
    }
    if (!["node-script", "node-test"].includes(lane.runner)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported runner ${String(lane.runner)}`)
    }
    if (!["never", "requires-live-env", "requires-smoke-binary"].includes(lane.skip)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported skip policy ${String(lane.skip)}`)
    }

    if (options.requireTargets) {
      const absoluteTarget = join(cwd, lane.target)
      if (!existsSync(absoluteTarget)) {
        throw new Error(`Missing lane target for ${lane.name}: ${lane.target}`)
      }
    }
  }
}

export function resolveLaneCommand(lane: BaselineLaneDefinition): string[] {
  if (lane.runner === "node-script") {
    return ["--experimental-strip-types", lane.target]
  }

  return [
    "--import",
    "./src/resources/extensions/gsd/tests/resolve-ts.mjs",
    "--experimental-strip-types",
    "--test",
    lane.target,
  ]
}

export function getLaneSkipReason(
  lane: BaselineLaneDefinition,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string | null {
  if (lane.skip === "requires-live-env" && env.GSD_LIVE_TESTS !== "1") {
    return "live lane skipped because GSD_LIVE_TESTS is not enabled"
  }

  if (lane.skip === "requires-smoke-binary") {
    if (env.GSD_SMOKE_BINARY && env.GSD_SMOKE_BINARY.trim().length > 0) {
      return null
    }
    if (existsSync(join(cwd, "dist", "loader.js"))) {
      return null
    }
    return "installed-binary lane skipped because dist/loader.js and GSD_SMOKE_BINARY are unavailable"
  }

  return null
}

export async function executeBaselineLane(
  lane: BaselineLaneDefinition,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<BaselineLaneResult> {
  const cwd = options.cwd ?? process.cwd()
  const env = { ...process.env, ...(options.env ?? {}) }
  const command = resolveLaneCommand(lane)
  const skipReason = getLaneSkipReason(lane, env, cwd)

  if (skipReason) {
    return {
      name: lane.name,
      target: lane.target,
      runner: lane.runner,
      proofClass: lane.proofClass,
      parityScope: lane.parityScope,
      provesCodingLoop: lane.provesCodingLoop,
      status: "skipped",
      skipReason,
      exitCode: null,
      durationMs: 0,
      command,
    }
  }

  const startedAt = Date.now()

  return await new Promise<BaselineLaneResult>((resolve) => {
    const child = spawn(process.execPath, command, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let settled = false
    let timedOut = false

    const finish = (status: LaneStatus, exitCode: number | null, reason: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        name: lane.name,
        target: lane.target,
        runner: lane.runner,
        proofClass: lane.proofClass,
        parityScope: lane.parityScope,
        provesCodingLoop: lane.provesCodingLoop,
        status,
        skipReason: reason,
        exitCode,
        durationMs: Date.now() - startedAt,
        command,
      })
    }

    child.stdout.resume()
    child.stderr.resume()

    child.on("error", (error) => {
      finish("failed", null, `${lane.name} spawn failed: ${error.message}`)
    })

    child.on("close", (code) => {
      if (timedOut) {
        finish("timed_out", code, `${lane.name} exceeded timeout of ${lane.timeoutMs}ms`)
        return
      }
      if (code === 0) {
        finish("passed", 0, null)
        return
      }
      finish("failed", code ?? 1, `${lane.name} exited with code ${String(code ?? 1)}`)
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), 250).unref()
    }, lane.timeoutMs)
  })
}

export function summarizeBaselineResults(results: readonly BaselineLaneResult[]): BaselineSummary {
  const proofClassCounts = Object.fromEntries(PROOF_CLASSES.map((proofClass) => [proofClass, 0])) as Record<ProofClass, number>

  for (const result of results) {
    proofClassCounts[result.proofClass] += 1
  }

  const passed = results.filter((result) => result.status === "passed").length
  const failed = results.filter((result) => result.status === "failed").length
  const skipped = results.filter((result) => result.status === "skipped").length
  const timedOut = results.filter((result) => result.status === "timed_out").length
  const provesCodingLoop = results.some((result) => result.provesCodingLoop && result.status === "passed")
  const uncoveredLaneNames = results.filter((result) => !result.provesCodingLoop).map((result) => result.name)

  let verdict: SummaryVerdict = "covered"
  if (failed > 0 || timedOut > 0) {
    verdict = "failing"
  } else if (!provesCodingLoop || skipped > 0 || uncoveredLaneNames.length > 0) {
    verdict = "partial"
  }

  return {
    verdict,
    totalLanes: results.length,
    passed,
    failed,
    skipped,
    timedOut,
    provesCodingLoop,
    uncoveredLaneNames,
    proofClassCounts,
  }
}

export async function createBaselineReport(
  options: { cwd?: string; env?: NodeJS.ProcessEnv; artifactPath?: string } = {},
): Promise<BaselineReport> {
  const cwd = options.cwd ?? process.cwd()
  validateBaselineLaneDefinitions(BASELINE_LANES, { cwd, requireTargets: true })

  const lanes: BaselineLaneResult[] = []
  for (const lane of BASELINE_LANES) {
    lanes.push(await executeBaselineLane(lane, { cwd, env: options.env }))
  }

  const artifactPath = options.artifactPath ?? BASELINE_REPORT_PATH
  return {
    version: BASELINE_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    cwd,
    artifactPath,
    summary: summarizeBaselineResults(lanes),
    lanes,
  }
}

export async function writeBaselineReport(report: BaselineReport, cwd: string = process.cwd()): Promise<string> {
  const outputPath = join(cwd, report.artifactPath)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  return outputPath
}
