import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join } from "node:path"
import {
  SECONDARY_PARITY_MANIFEST_PATH,
  type SecondaryParityManifest,
  type SecondaryParitySurfaceContract,
  loadSecondaryParityManifest,
} from "./secondary-lanes.ts"

export const SECONDARY_PARITY_REPORT_VERSION = 1 as const
export const SECONDARY_PARITY_REPORT_PATH = "tests/parity/artifacts/secondary-parity-report.json" as const
export const WORKTREE_SESSION_MANIFEST_PATH = "tests/fixtures/worktree-session-parity-manifest.json" as const
export const PROMOTED_SECONDARY_SURFACES = ["web-mode", "worktree-session-recovery"] as const

export type PromotedSecondarySurfaceId = (typeof PROMOTED_SECONDARY_SURFACES)[number]
export type SecondaryParityRowStatus = "covered"
export type SecondaryParityLaneRequirement = "required" | "optional"
export type SecondaryParityLaneImplementationStatus = "existing-proof" | "planned-proof"

export interface SecondaryParityRowLane {
  name: string
  requirement: SecondaryParityLaneRequirement
  proofClass: string
  implementationStatus: SecondaryParityLaneImplementationStatus
  releaseReadable: boolean
  blocking: boolean
  artifactPaths: string[]
  summary: string
}

export interface SecondaryParityFailureSummary {
  optionalLaneNamesStillPlanned: string[]
  coverageGapIds: string[]
  scopedExceptionNote: string
}

export interface SecondaryParityReportRow {
  surfaceId: PromotedSecondarySurfaceId
  title: string
  status: SecondaryParityRowStatus
  reportPath: string
  sourceManifestPath: string
  requiredLaneNames: string[]
  optionalLaneNames: string[]
  presentFixturePaths: string[]
  plannedFixturePaths: string[]
  artifactPaths: string[]
  lanes: SecondaryParityRowLane[]
  failureSummary: SecondaryParityFailureSummary
}

export interface SecondaryParityReport {
  version: typeof SECONDARY_PARITY_REPORT_VERSION
  generatedAt: string
  cwd: string
  artifactPath: string
  manifestPaths: {
    secondaryParity: string
    worktreeSession: string
  }
  promotedSurfaceIds: PromotedSecondarySurfaceId[]
  summary: {
    totalRows: number
    coveredRows: number
    optionalPlannedLaneCount: number
    releaseReadableSurfaceIds: PromotedSecondarySurfaceId[]
  }
  rows: SecondaryParityReportRow[]
}

export type WorktreeSessionManifest = {
  version: number
  surfaceId: string
  goal: string
  requiredContracts: {
    worktreeSession: Array<{ id: string; kind: string; path: string; symbol: string; status: string }>
    operatorHelp: Array<{ id: string; kind: string; path: string; match: string; status: string }>
  }
  rebrandDrift: Array<{ id: string; path: string; match: string; line: number; status: string }>
}

type SecondaryParityCliOptions = {
  format: "json"
  artifactPath: string
}

function assertRepoRelativePath(path: string, label: string): void {
  if (typeof path !== "string" || path.trim().length === 0) {
    throw new Error(`${label} must be a non-empty repo-relative path`)
  }
  if (isAbsolute(path) || path.includes("..")) {
    throw new Error(`${label} must be a repo-relative tracked path, received ${path}`)
  }
}

function readJsonFile(path: string, cwd: string): unknown {
  assertRepoRelativePath(path, path)
  const absolutePath = join(cwd, path)
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing tracked JSON artifact at ${path}`)
  }

  try {
    return JSON.parse(readFileSync(absolutePath, "utf8"))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON artifact at ${path}: ${message}`)
  }
}

export function loadWorktreeSessionManifest(
  manifestPath: string = WORKTREE_SESSION_MANIFEST_PATH,
  cwd: string = process.cwd(),
): WorktreeSessionManifest {
  const parsed = readJsonFile(manifestPath, cwd)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: expected a JSON object at the root`)
  }

  const candidate = parsed as Record<string, unknown>
  if (candidate.surfaceId !== "worktree-session-recovery") {
    throw new Error(
      `Invalid worktree/session parity manifest at ${manifestPath}: surfaceId must equal worktree-session-recovery`,
    )
  }
  if (typeof candidate.goal !== "string" || candidate.goal.trim().length === 0) {
    throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: goal must be a non-empty string`)
  }
  if (!candidate.requiredContracts || typeof candidate.requiredContracts !== "object" || Array.isArray(candidate.requiredContracts)) {
    throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: requiredContracts must be an object`)
  }

  const requiredContracts = candidate.requiredContracts as Record<string, unknown>
  const worktreeSession = requiredContracts.worktreeSession
  const operatorHelp = requiredContracts.operatorHelp
  if (!Array.isArray(worktreeSession) || worktreeSession.length === 0) {
    throw new Error(
      `Invalid worktree/session parity manifest at ${manifestPath}: requiredContracts.worktreeSession must be a non-empty array`,
    )
  }
  if (!Array.isArray(operatorHelp) || operatorHelp.length === 0) {
    throw new Error(
      `Invalid worktree/session parity manifest at ${manifestPath}: requiredContracts.operatorHelp must be a non-empty array`,
    )
  }

  for (const [index, entry] of worktreeSession.entries()) {
    const pointer = `requiredContracts.worktreeSession[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }
    const record = entry as Record<string, unknown>
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.id must be a non-empty string`)
    }
    if (typeof record.path !== "string" || record.path.trim().length === 0) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.path must be a non-empty string`)
    }
    assertRepoRelativePath(record.path, `${manifestPath} ${pointer}.path`)
    if (!existsSync(join(cwd, record.path))) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: missing contract path ${record.path}`)
    }
    if (record.status !== "covered") {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.status must equal covered`)
    }
  }

  for (const [index, entry] of operatorHelp.entries()) {
    const pointer = `requiredContracts.operatorHelp[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }
    const record = entry as Record<string, unknown>
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.id must be a non-empty string`)
    }
    if (typeof record.path !== "string" || record.path.trim().length === 0) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.path must be a non-empty string`)
    }
    assertRepoRelativePath(record.path, `${manifestPath} ${pointer}.path`)
    if (!existsSync(join(cwd, record.path))) {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: missing contract path ${record.path}`)
    }
    if (record.status !== "covered") {
      throw new Error(`Invalid worktree/session parity manifest at ${manifestPath}: ${pointer}.status must equal covered`)
    }
  }

  return candidate as WorktreeSessionManifest
}

function getSurfaceOrThrow(
  manifest: SecondaryParityManifest,
  surfaceId: PromotedSecondarySurfaceId,
  manifestPath: string,
): SecondaryParitySurfaceContract {
  const surface = manifest.surfaces.find((entry) => entry.id === surfaceId)
  if (!surface) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: missing surface ${surfaceId}`)
  }
  return surface
}

function resolveLaneArtifactPaths(surface: SecondaryParitySurfaceContract, laneName: string): string[] {
  return surface.deterministicFixtures
    .filter((fixture) => fixture.laneName === laneName)
    .map((fixture) => fixture.path)
}

export function createSecondaryParityReportFromInputs(options: {
  cwd?: string
  artifactPath?: string
  manifestPath?: string
  worktreeManifestPath?: string
  manifest: SecondaryParityManifest
  worktreeManifest: WorktreeSessionManifest
}): SecondaryParityReport {
  const cwd = options.cwd ?? process.cwd()
  const artifactPath = options.artifactPath ?? SECONDARY_PARITY_REPORT_PATH
  const manifestPath = options.manifestPath ?? SECONDARY_PARITY_MANIFEST_PATH
  const worktreeManifestPath = options.worktreeManifestPath ?? WORKTREE_SESSION_MANIFEST_PATH

  const rows = PROMOTED_SECONDARY_SURFACES.map((surfaceId) => {
    const surface = getSurfaceOrThrow(options.manifest, surfaceId, manifestPath)
    const laneDefinitions = options.manifest.lanes.filter((lane) => lane.surfaceId === surfaceId)

    if (surface.requiredLaneNames.length === 0) {
      throw new Error(
        `Invalid secondary parity manifest at ${manifestPath}: surface ${surfaceId} requiredLaneNames must not be empty`,
      )
    }

    const requiredLanes = laneDefinitions.filter((lane) => lane.requirement === "required")
    if (requiredLanes.length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: surface ${surfaceId} is missing required lane definitions`)
    }

    const missingRequiredLaneNames = surface.requiredLaneNames.filter(
      (laneName) => !requiredLanes.some((lane) => lane.name === laneName),
    )
    if (missingRequiredLaneNames.length > 0) {
      throw new Error(
        `Invalid secondary parity manifest at ${manifestPath}: surface ${surfaceId} references unknown required lanes ${missingRequiredLaneNames.join(", ")}`,
      )
    }

    const presentFixturePaths = surface.deterministicFixtures
      .filter((fixture) => fixture.status === "present")
      .map((fixture) => fixture.path)
    const plannedFixturePaths = surface.deterministicFixtures
      .filter((fixture) => fixture.status === "planned")
      .map((fixture) => fixture.path)

    for (const path of presentFixturePaths) {
      const filePath = path.split("#", 1)[0]!
      if (!existsSync(join(cwd, filePath))) {
        throw new Error(
          `Invalid secondary parity manifest at ${manifestPath}: present fixture path does not exist: ${path}`,
        )
      }
    }

    const reportPath = `${artifactPath}#rows.${surfaceId}`
    const artifactPaths = [
      manifestPath,
      ...(surfaceId === "worktree-session-recovery" ? [worktreeManifestPath] : []),
      ...presentFixturePaths,
      ...plannedFixturePaths,
    ]

    const lanes: SecondaryParityRowLane[] = laneDefinitions
      .filter((lane) => surface.requiredLaneNames.includes(lane.name) || surface.optionalLaneNames.includes(lane.name))
      .map((lane) => ({
        name: lane.name,
        requirement: lane.requirement,
        proofClass: lane.proofClass,
        implementationStatus: lane.implementationStatus,
        releaseReadable: lane.releaseReadable,
        blocking: lane.requirement === "required",
        artifactPaths: resolveLaneArtifactPaths(surface, lane.name),
        summary:
          lane.requirement === "required"
            ? `${surfaceId} required lane ${lane.name} is already satisfied by tracked deterministic evidence.`
            : `${surfaceId} optional lane ${lane.name} remains visible but non-blocking while still planned.`,
      }))

    if (surfaceId === "worktree-session-recovery") {
      const trackedContractCount =
        options.worktreeManifest.requiredContracts.worktreeSession.length +
        options.worktreeManifest.requiredContracts.operatorHelp.length
      if (trackedContractCount === 0) {
        throw new Error(
          `Invalid worktree/session parity manifest at ${worktreeManifestPath}: expected tracked required contracts for ${surfaceId}`,
        )
      }
      if (options.worktreeManifest.surfaceId !== "worktree-session-recovery") {
        throw new Error(
          `Invalid worktree/session parity manifest at ${worktreeManifestPath}: surfaceId must equal worktree-session-recovery`,
        )
      }
    }

    const optionalLaneNamesStillPlanned = lanes
      .filter((lane) => lane.requirement === "optional" && lane.implementationStatus === "planned-proof")
      .map((lane) => lane.name)

    return {
      surfaceId,
      title: surface.title,
      status: "covered",
      reportPath,
      sourceManifestPath: surfaceId === "worktree-session-recovery" ? worktreeManifestPath : manifestPath,
      requiredLaneNames: [...surface.requiredLaneNames],
      optionalLaneNames: [...surface.optionalLaneNames],
      presentFixturePaths,
      plannedFixturePaths,
      artifactPaths,
      lanes,
      failureSummary: {
        optionalLaneNamesStillPlanned,
        coverageGapIds: surface.coverageGaps.map((gap) => gap.id),
        scopedExceptionNote:
          optionalLaneNamesStillPlanned.length > 0
            ? `${surfaceId} is release-readable via required lanes; optional recordings remain planned and explicitly non-blocking.`
            : `${surfaceId} has no optional planned recordings remaining.`,
      },
    } satisfies SecondaryParityReportRow
  })

  return {
    version: SECONDARY_PARITY_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    cwd,
    artifactPath,
    manifestPaths: {
      secondaryParity: manifestPath,
      worktreeSession: worktreeManifestPath,
    },
    promotedSurfaceIds: [...PROMOTED_SECONDARY_SURFACES],
    summary: {
      totalRows: rows.length,
      coveredRows: rows.filter((row) => row.status === "covered").length,
      optionalPlannedLaneCount: rows.flatMap((row) => row.failureSummary.optionalLaneNamesStillPlanned).length,
      releaseReadableSurfaceIds: rows.map((row) => row.surfaceId),
    },
    rows,
  }
}

export function createSecondaryParityReport(options: {
  cwd?: string
  artifactPath?: string
  manifestPath?: string
  worktreeManifestPath?: string
} = {}): SecondaryParityReport {
  const cwd = options.cwd ?? process.cwd()
  const artifactPath = options.artifactPath ?? SECONDARY_PARITY_REPORT_PATH
  const manifestPath = options.manifestPath ?? SECONDARY_PARITY_MANIFEST_PATH
  const worktreeManifestPath = options.worktreeManifestPath ?? WORKTREE_SESSION_MANIFEST_PATH

  const manifest = loadSecondaryParityManifest(manifestPath, cwd)
  const worktreeManifest = loadWorktreeSessionManifest(worktreeManifestPath, cwd)

  return createSecondaryParityReportFromInputs({
    cwd,
    artifactPath,
    manifestPath,
    worktreeManifestPath,
    manifest,
    worktreeManifest,
  })
}

export async function writeSecondaryParityReport(
  report: SecondaryParityReport,
  cwd: string = process.cwd(),
): Promise<string> {
  const outputPath = join(cwd, report.artifactPath)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  return outputPath
}

export function parseSecondaryParityCliArgs(argv: readonly string[]): SecondaryParityCliOptions {
  let format: "json" = "json"
  let artifactPath = SECONDARY_PARITY_REPORT_PATH

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--format") {
      const next = argv[index + 1]
      if (next !== "json") {
        throw new Error(`Unsupported --format value: ${String(next)}. Only json is supported.`)
      }
      format = next
      index += 1
      continue
    }
    if (token === "--report") {
      const next = argv[index + 1]
      if (!next) {
        throw new Error("Missing value for --report")
      }
      artifactPath = next
      index += 1
      continue
    }
    if (token === "--help" || token === "-h") {
      process.stdout.write(
        "Usage: node --experimental-strip-types tests/parity/secondary-parity-report.ts [--format json] [--report tests/parity/artifacts/secondary-parity-report.json]\n",
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  return { format, artifactPath }
}

async function main(): Promise<void> {
  const options = parseSecondaryParityCliArgs(process.argv.slice(2))
  const report = createSecondaryParityReport({ cwd: process.cwd(), artifactPath: options.artifactPath })
  const writtenPath = await writeSecondaryParityReport(report, process.cwd())

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify({ ...report, artifactPath: writtenPath }, null, 2)}\n`)
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
