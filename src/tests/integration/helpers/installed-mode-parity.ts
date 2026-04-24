import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { BaselineLaneResult, ManifestCoverageStatus, RepoModeBrowserDiagnostic, RepoModeCommandDiagnostic, RepoModePhaseName, RepoModePhaseResult } from "../../../../tests/parity/baseline-lanes.ts"

export const INSTALLED_MODE_LANE_NAME = "pack-install" as const
export const DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH = "tests/fixtures/recordings/installed-mode-parity-web-task.json" as const

export interface InstalledModeProofArtifact {
  version: number
  fixtureId: string
  laneName: typeof INSTALLED_MODE_LANE_NAME
  artifactPath: string
  status: "passed" | "failed"
  phaseResults: RepoModePhaseResult[]
}

export function resolveInstalledModeArtifactPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.GSD_INSTALLED_MODE_PARITY_ARTIFACT?.trim() || DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH
}

function validateInstalledModePhaseResult(value: unknown, pointer: string): RepoModePhaseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer} must be an object`)
  }

  const entry = value as Record<string, unknown>
  const allowedPhases: readonly RepoModePhaseName[] = ["inspect", "edit", "test", "dev-server", "browser"]
  if (typeof entry.phase !== "string" || !allowedPhases.includes(entry.phase as RepoModePhaseName)) {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer}.phase must be one of ${allowedPhases.join(", ")}`)
  }
  if (entry.status !== "passed" && entry.status !== "failed") {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer}.status must be passed or failed`)
  }
  if (typeof entry.summary !== "string" || entry.summary.trim().length === 0) {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer}.summary must be a non-empty string`)
  }

  const command = entry.command
  if (command != null && (typeof command !== "object" || Array.isArray(command))) {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer}.command must be an object when present`)
  }
  const browser = entry.browser
  if (browser != null && (typeof browser !== "object" || Array.isArray(browser))) {
    throw new Error(`Invalid installed-mode parity artifact: ${pointer}.browser must be an object when present`)
  }

  const parsedCommand = command
    ? (() => {
        const candidate = command as Record<string, unknown>
        if (typeof candidate.command !== "string" || candidate.command.trim().length === 0) {
          throw new Error(`Invalid installed-mode parity artifact: ${pointer}.command.command must be a non-empty string`)
        }
        if (candidate.exitCode != null && (!Number.isInteger(candidate.exitCode) || typeof candidate.exitCode !== "number")) {
          throw new Error(`Invalid installed-mode parity artifact: ${pointer}.command.exitCode must be an integer or null`)
        }
        return {
          command: candidate.command,
          exitCode: (candidate.exitCode as number | null | undefined) ?? null,
          ...(typeof candidate.stdoutSnippet === "string" ? { stdoutSnippet: candidate.stdoutSnippet } : {}),
          ...(typeof candidate.stderrSnippet === "string" ? { stderrSnippet: candidate.stderrSnippet } : {}),
        } satisfies RepoModeCommandDiagnostic
      })()
    : undefined

  const parsedBrowser = browser
    ? (() => {
        const candidate = browser as Record<string, unknown>
        if (typeof candidate.assertion !== "string" || candidate.assertion.trim().length === 0) {
          throw new Error(`Invalid installed-mode parity artifact: ${pointer}.browser.assertion must be a non-empty string`)
        }
        if (typeof candidate.expected !== "string") {
          throw new Error(`Invalid installed-mode parity artifact: ${pointer}.browser.expected must be a string`)
        }
        if (typeof candidate.actual !== "string") {
          throw new Error(`Invalid installed-mode parity artifact: ${pointer}.browser.actual must be a string`)
        }
        return {
          assertion: candidate.assertion,
          expected: candidate.expected,
          actual: candidate.actual,
        } satisfies RepoModeBrowserDiagnostic
      })()
    : undefined

  return {
    phase: entry.phase as RepoModePhaseName,
    status: entry.status,
    summary: entry.summary,
    ...(parsedCommand ? { command: parsedCommand } : {}),
    ...(parsedBrowser ? { browser: parsedBrowser } : {}),
  }
}

export function loadInstalledModeProofArtifact(targetPath: string = DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH, cwd: string = process.cwd()): InstalledModeProofArtifact {
  const absolutePath = join(cwd, targetPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Installed-mode parity artifact not found at ${targetPath}`)
  }

  let raw: string
  try {
    raw = readFileSync(absolutePath, "utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read installed-mode parity artifact at ${targetPath}: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse installed-mode parity artifact at ${targetPath}: ${message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: expected a JSON object at the root`)
  }

  const candidate = parsed as Record<string, unknown>
  if (!Number.isInteger(candidate.version) || Number(candidate.version) <= 0) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: version must be a positive integer`)
  }
  if (candidate.fixtureId !== "parity-web-task") {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: fixtureId must be parity-web-task`)
  }
  if (candidate.laneName !== INSTALLED_MODE_LANE_NAME) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: laneName must be ${INSTALLED_MODE_LANE_NAME}`)
  }
  if (typeof candidate.artifactPath !== "string" || candidate.artifactPath.trim().length === 0) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: artifactPath must be a non-empty string`)
  }
  if (candidate.status !== "passed" && candidate.status !== "failed") {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: status must be passed or failed`)
  }
  if (!Array.isArray(candidate.phaseResults)) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: phaseResults must be an array`)
  }

  const expectedPhases: readonly RepoModePhaseName[] = ["inspect", "edit", "test", "dev-server", "browser"]
  const phaseResults = candidate.phaseResults.map((entry, index) =>
    validateInstalledModePhaseResult(entry, `phaseResults[${index}]`),
  )

  const counts = new Map<RepoModePhaseName, number>()
  for (const entry of phaseResults) {
    counts.set(entry.phase, (counts.get(entry.phase) ?? 0) + 1)
  }
  for (const phase of expectedPhases) {
    const count = counts.get(phase) ?? 0
    if (count === 0) {
      throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: missing phase result for ${phase}`)
    }
    if (count > 1) {
      throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: duplicate phase result for ${phase}`)
    }
  }

  const failedPhase = phaseResults.find((entry) => entry.status === "failed")?.phase ?? null
  if (candidate.status === "passed" && failedPhase) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: status cannot be passed when phase ${failedPhase} failed`)
  }
  if (candidate.status === "failed" && !failedPhase) {
    throw new Error(`Invalid installed-mode parity artifact at ${targetPath}: status failed requires at least one failed phase result`)
  }

  return {
    version: candidate.version as number,
    fixtureId: candidate.fixtureId as string,
    laneName: candidate.laneName as typeof INSTALLED_MODE_LANE_NAME,
    artifactPath: candidate.artifactPath as string,
    status: candidate.status as "passed" | "failed",
    phaseResults,
  }
}

const CAPABILITY_PHASE: Record<string, RepoModePhaseName> = {
  "inspect-repository-context": "inspect",
  "edit-application-code": "edit",
  "run-targeted-tests": "test",
  "manage-dev-server-lifecycle": "dev-server",
  "verify-browser-behavior": "browser",
}

export function deriveInstalledModeLaneCoverage(
  laneResult: BaselineLaneResult | undefined,
  capabilityName: string,
): { coverage: ManifestCoverageStatus; currentGap?: string } {
  const mappedPhase = CAPABILITY_PHASE[capabilityName]
  if (!mappedPhase) {
    return { coverage: "not-covered" }
  }
  if (!laneResult) {
    return { coverage: "not-covered", currentGap: `Installed-mode proof lane ${INSTALLED_MODE_LANE_NAME} is missing from the parity report.` }
  }
  if (!laneResult.artifactPath) {
    return { coverage: "not-covered", currentGap: `Installed-mode proof lane ${INSTALLED_MODE_LANE_NAME} is missing an artifact path.` }
  }

  const phaseResult = laneResult.phaseResults.find((entry) => entry.phase === mappedPhase)
  if (!phaseResult) {
    return { coverage: "not-covered", currentGap: `Installed-mode proof lane ${INSTALLED_MODE_LANE_NAME} is missing diagnostics for phase ${mappedPhase}.` }
  }
  if (phaseResult.status === "passed") {
    return { coverage: "covered" }
  }
  return {
    coverage: "partial",
    currentGap: `Installed-mode proof failed during ${mappedPhase}; inspect ${laneResult.artifactPath} for phase-local diagnostics.`,
  }
}
