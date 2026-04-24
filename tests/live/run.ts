import { readdirSync } from "fs"
import { execFileSync } from "child_process"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const LIVE_PROVIDER_ENV_KEYS = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const

export type LiveSpotCheckStatus = "passed" | "failed" | "skipped"
export type LiveSpotCheckSkipReason = "not-enabled" | "no-provider-configured" | null

export interface LiveSpotCheckSummary {
  status: LiveSpotCheckStatus
  reason: string | null
  skipReason: LiveSpotCheckSkipReason
  configured: boolean
  enabled: boolean
  passed: number
  failed: number
  skipped: number
  discoveredTests: string[]
}

export function hasLiveProviderConfiguration(env: NodeJS.ProcessEnv = process.env): boolean {
  return LIVE_PROVIDER_ENV_KEYS.some((key) => typeof env[key] === "string" && env[key]!.trim().length > 0)
}

export function getLiveSpotCheckSkipReason(env: NodeJS.ProcessEnv = process.env): {
  reason: string | null
  skipReason: LiveSpotCheckSkipReason
  configured: boolean
  enabled: boolean
} {
  const enabled = env.GSD_LIVE_TESTS === "1"
  const configured = hasLiveProviderConfiguration(env)

  if (!enabled) {
    return {
      reason: "live lane skipped because GSD_LIVE_TESTS is not enabled",
      skipReason: "not-enabled",
      configured,
      enabled,
    }
  }

  if (!configured) {
    return {
      reason: "live lane skipped because GSD_LIVE_TESTS is enabled but no live provider API key is configured",
      skipReason: "no-provider-configured",
      configured,
      enabled,
    }
  }

  return {
    reason: null,
    skipReason: null,
    configured,
    enabled,
  }
}

function getDiscoveredTestFiles(): string[] {
  return readdirSync(__dirname)
    .filter((f) => f.startsWith("test-") && f.endsWith(".ts"))
    .sort()
}

export function runLiveSpotCheck(env: NodeJS.ProcessEnv = process.env): LiveSpotCheckSummary {
  const gate = getLiveSpotCheckSkipReason(env)
  if (gate.reason) {
    return {
      status: "skipped",
      reason: gate.reason,
      skipReason: gate.skipReason,
      configured: gate.configured,
      enabled: gate.enabled,
      passed: 0,
      failed: 0,
      skipped: 0,
      discoveredTests: getDiscoveredTestFiles(),
    }
  }

  const testFiles = getDiscoveredTestFiles()
  if (testFiles.length === 0) {
    return {
      status: "failed",
      reason: "No live test files found",
      skipReason: null,
      configured: gate.configured,
      enabled: gate.enabled,
      passed: 0,
      failed: 1,
      skipped: 0,
      discoveredTests: [],
    }
  }

  let passed = 0
  let failed = 0
  let skipped = 0

  for (const file of testFiles) {
    const filePath = join(__dirname, file)
    try {
      execFileSync("node", ["--experimental-strip-types", filePath], {
        encoding: "utf8",
        stdio: "pipe",
        timeout: 60_000,
        env,
      })
      console.log(`  PASS  ${file.replace(/\.ts$/, "")}`)
      passed += 1
    } catch (err: any) {
      const output = `${err.stdout || ""}${err.stderr || ""}`
      if (output.includes("SKIPPED")) {
        console.log(`  SKIP  ${file.replace(/\.ts$/, "")}`)
        skipped += 1
      } else {
        console.error(`  FAIL  ${file.replace(/\.ts$/, "")}`)
        if (err.stdout) console.error(err.stdout)
        if (err.stderr) console.error(err.stderr)
        failed += 1
      }
    }
  }

  return {
    status: failed > 0 ? "failed" : "passed",
    reason: failed > 0 ? `live spot-check failed in ${failed} test${failed === 1 ? "" : "s"}` : null,
    skipReason: null,
    configured: gate.configured,
    enabled: gate.enabled,
    passed,
    failed,
    skipped,
    discoveredTests: testFiles,
  }
}

function renderSummary(summary: LiveSpotCheckSummary): void {
  if (summary.status === "skipped") {
    console.log(summary.reason)
    return
  }

  console.log(`\nLive tests: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`)
}

function main(): void {
  const summary = runLiveSpotCheck(process.env)
  renderSummary(summary)
  if (summary.status === "failed") {
    process.exit(1)
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main()
}
