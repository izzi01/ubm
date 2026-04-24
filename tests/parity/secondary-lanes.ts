import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type SecondarySurfaceInventory,
  type SecondarySurfaceInventorySurface,
  createSecondarySurfaceInventory,
  SURFACE_STATUSES,
} from "./secondary-surface-inventory.ts"

export const SECONDARY_PARITY_MANIFEST_VERSION = 1 as const
export const SECONDARY_PARITY_MANIFEST_PATH = "tests/fixtures/secondary-parity-manifest.json" as const

export const SECONDARY_PROOF_CLASSES = [
  "report-contract",
  "integration-contract",
  "unit-contract",
  "repo-recording",
  "installed-recording",
] as const

export const SECONDARY_LANE_REQUIREMENTS = ["required", "optional"] as const
export const SECONDARY_LANE_IMPLEMENTATION_STATUSES = ["existing-proof", "planned-proof"] as const
export const SECONDARY_FIXTURE_KINDS = ["manifest", "artifact", "integration-test", "unit-test", "recording"] as const
export const SECONDARY_FIXTURE_STATUSES = ["present", "planned"] as const

export type SecondaryProofClass = (typeof SECONDARY_PROOF_CLASSES)[number]
export type SecondaryLaneRequirement = (typeof SECONDARY_LANE_REQUIREMENTS)[number]
export type SecondaryLaneImplementationStatus = (typeof SECONDARY_LANE_IMPLEMENTATION_STATUSES)[number]
export type SecondaryFixtureKind = (typeof SECONDARY_FIXTURE_KINDS)[number]
export type SecondaryFixtureStatus = (typeof SECONDARY_FIXTURE_STATUSES)[number]

export interface SecondaryParityLaneDefinition {
  name: string
  title: string
  surfaceId: string
  proofClass: SecondaryProofClass
  requirement: SecondaryLaneRequirement
  implementationStatus: SecondaryLaneImplementationStatus
  releaseReadable: boolean
  description: string
}

export interface SecondaryParityFixtureDefinition {
  id: string
  surfaceId: string
  title: string
  kind: SecondaryFixtureKind
  status: SecondaryFixtureStatus
  path: string
  deterministic: boolean
  purpose: string
  laneName?: string
}

export interface SecondaryParitySurfaceContract {
  id: string
  title: string
  inventoryStatus: SecondarySurfaceInventorySurface["status"]
  scopeBoundary: string
  requiredLaneNames: string[]
  optionalLaneNames: string[]
  deterministicFixtures: SecondaryParityFixtureDefinition[]
  coverageGaps: SecondarySurfaceInventorySurface["uncoveredAreas"]
}

export interface SecondaryParityManifestSummary {
  totalSurfaces: number
  totalLanes: number
  requiredLanes: number
  optionalLanes: number
  presentFixtures: number
  plannedFixtures: number
  partialSurfaces: number
  uncoveredSurfaces: number
  coveredSurfaces: number
}

export interface SecondaryParityManifest {
  version: typeof SECONDARY_PARITY_MANIFEST_VERSION
  generatedFrom: string
  inventoryVersion: SecondarySurfaceInventory["version"]
  uncoveredSurfaceSemantics: {
    partial: string
    uncovered: string
    covered: string
  }
  proofClasses: Array<{
    name: SecondaryProofClass
    description: string
  }>
  lanes: SecondaryParityLaneDefinition[]
  surfaces: SecondaryParitySurfaceContract[]
  summary: SecondaryParityManifestSummary
}

const SECONDARY_LANES: SecondaryParityLaneDefinition[] = [
  {
    name: "secondary-parity-report",
    title: "Release-readable secondary parity report",
    surfaceId: "web-mode",
    proofClass: "report-contract",
    requirement: "required",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Publishes the machine-readable report row that downstream release gates consume for web-mode parity.",
  },
  {
    name: "integration:web-mode",
    title: "Web-mode integration contract lane",
    surfaceId: "web-mode",
    proofClass: "integration-contract",
    requirement: "required",
    implementationStatus: "existing-proof",
    releaseReadable: false,
    description: "Uses the tracked web-mode integration tests as the current deterministic proof lane for launch, onboarding, and session/recovery command-surface behavior.",
  },
  {
    name: "repo-recording:web-mode",
    title: "Representative repo-mode web recording",
    surfaceId: "web-mode",
    proofClass: "repo-recording",
    requirement: "optional",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Defines a future deterministic repo/dev recording for browser-only web mode beyond the current integration contracts.",
  },
  {
    name: "installed-recording:web-mode",
    title: "Representative installed-mode web recording",
    surfaceId: "web-mode",
    proofClass: "installed-recording",
    requirement: "optional",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Defines a future packaged web-mode parity recording if the matrix needs repo/install dual proof instead of a documented exception.",
  },
  {
    name: "secondary-parity-report:mcp",
    title: "Release-readable MCP parity report",
    surfaceId: "mcp",
    proofClass: "report-contract",
    requirement: "required",
    implementationStatus: "existing-proof",
    releaseReadable: true,
    description: "Publishes the machine-readable report row that downstream release gates consume for MCP parity.",
  },
  {
    name: "unit:mcp",
    title: "MCP contract/unit lane",
    surfaceId: "mcp",
    proofClass: "unit-contract",
    requirement: "required",
    implementationStatus: "existing-proof",
    releaseReadable: false,
    description: "Uses the existing deterministic MCP server and client schema tests as the current scoped proof lane.",
  },
  {
    name: "integration:mcp-session",
    title: "Representative MCP interaction lane",
    surfaceId: "mcp",
    proofClass: "installed-recording",
    requirement: "optional",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Defines a future representative MCP client/server interaction recording for parity closure.",
  },
  {
    name: "secondary-parity-report:workflow-bmad",
    title: "Release-readable workflow parity report",
    surfaceId: "workflow-bmad",
    proofClass: "report-contract",
    requirement: "required",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Publishes the machine-readable report row that downstream release gates consume for representative workflow/BMAD parity.",
  },
  {
    name: "integration:workflow-contracts",
    title: "Workflow action contract lane",
    surfaceId: "workflow-bmad",
    proofClass: "integration-contract",
    requirement: "required",
    implementationStatus: "existing-proof",
    releaseReadable: false,
    description: "Uses tracked web workflow control/action contracts and command-routing coverage as the current deterministic workflow proof lane.",
  },
  {
    name: "repo-recording:workflow-bmad",
    title: "Representative workflow fixture lane",
    surfaceId: "workflow-bmad",
    proofClass: "repo-recording",
    requirement: "optional",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Defines a future deterministic workflow/BMAD fixture proving one representative end-to-end guided flow.",
  },
  {
    name: "secondary-parity-report:worktree-session-recovery",
    title: "Release-readable worktree/session parity report",
    surfaceId: "worktree-session-recovery",
    proofClass: "report-contract",
    requirement: "required",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Publishes the machine-readable report row that downstream release gates consume for worktree/session/recovery parity.",
  },
  {
    name: "integration:session-recovery",
    title: "Session and recovery integration lane",
    surfaceId: "worktree-session-recovery",
    proofClass: "integration-contract",
    requirement: "required",
    implementationStatus: "existing-proof",
    releaseReadable: false,
    description: "Uses tracked session, resume, headless, and web recovery diagnostics contracts as the current deterministic parity lane.",
  },
  {
    name: "installed-recording:worktree-session-recovery",
    title: "Representative installed worktree/session recording",
    surfaceId: "worktree-session-recovery",
    proofClass: "installed-recording",
    requirement: "optional",
    implementationStatus: "planned-proof",
    releaseReadable: true,
    description: "Defines a future packaged representative worktree/session recovery recording if parity closure requires installed-mode proof beyond contract coverage.",
  },
]

const proofClassDescriptions: SecondaryParityManifest["proofClasses"] = [
  {
    name: "report-contract",
    description: "Machine-readable release/report surfaces that downstream gates can consume without rediscovering the underlying tests.",
  },
  {
    name: "integration-contract",
    description: "Deterministic integration tests that lock scoped behavior for a secondary surface.",
  },
  {
    name: "unit-contract",
    description: "Deterministic unit/schema contracts for lower-level secondary surfaces such as MCP.",
  },
  {
    name: "repo-recording",
    description: "Representative recorded repo/dev proof intended to show a realistic secondary-surface parity path without live reruns.",
  },
  {
    name: "installed-recording",
    description: "Representative recorded packaged/install proof intended to show the same parity surface under installed mode where required.",
  },
]

const fixturesBySurface: Record<string, SecondaryParityFixtureDefinition[]> = {
  "web-mode": [
    {
      id: "web-mode-inventory-artifact",
      surfaceId: "web-mode",
      title: "Secondary surface inventory artifact",
      kind: "artifact",
      status: "present",
      path: "tests/parity/artifacts/secondary-surface-inventory.json",
      deterministic: true,
      purpose: "Provides the truthful current-state audit row that anchors web-mode parity scope and known gaps.",
      laneName: "secondary-parity-report",
    },
    {
      id: "web-mode-command-contract",
      surfaceId: "web-mode",
      title: "Web-mode integration contract",
      kind: "integration-test",
      status: "present",
      path: "src/tests/integration/web-mode-cli.test.ts",
      deterministic: true,
      purpose: "Locks the current deterministic launch/path/behavior contract for web mode.",
      laneName: "integration:web-mode",
    },
    {
      id: "web-mode-release-row-artifact",
      surfaceId: "web-mode",
      title: "Future release-readable web-mode parity row",
      kind: "artifact",
      status: "planned",
      path: "tests/parity/artifacts/secondary-parity-report.json#web-mode",
      deterministic: true,
      purpose: "Reserved output path for the downstream release-readable web-mode report row.",
      laneName: "secondary-parity-report",
    },
  ],
  mcp: [
    {
      id: "mcp-inventory-artifact",
      surfaceId: "mcp",
      title: "Secondary surface inventory artifact",
      kind: "artifact",
      status: "present",
      path: "tests/parity/artifacts/secondary-surface-inventory.json",
      deterministic: true,
      purpose: "Provides the truthful current-state audit row that anchors MCP parity scope and known gaps.",
      laneName: "secondary-parity-report:mcp",
    },
    {
      id: "mcp-schema-contract",
      surfaceId: "mcp",
      title: "MCP schema contract",
      kind: "unit-test",
      status: "present",
      path: "src/tests/mcp-client-schema.test.ts",
      deterministic: true,
      purpose: "Locks the deterministic MCP tool-schema contract already shipping in-repo.",
      laneName: "unit:mcp",
    },
    {
      id: "mcp-representative-session-recording",
      surfaceId: "mcp",
      title: "MCP parity artifact",
      kind: "artifact",
      status: "planned",
      path: "tests/parity/artifacts/mcp-parity.json",
      deterministic: true,
      purpose: "Tracked release-readable MCP parity artifact proving discovery, schema, success, and failure diagnostics.",
      laneName: "integration:mcp-session",
    },
  ],
  "workflow-bmad": [
    {
      id: "workflow-inventory-artifact",
      surfaceId: "workflow-bmad",
      title: "Secondary surface inventory artifact",
      kind: "artifact",
      status: "present",
      path: "tests/parity/artifacts/secondary-surface-inventory.json",
      deterministic: true,
      purpose: "Provides the truthful current-state audit row that anchors workflow/BMAD parity scope and known gaps.",
      laneName: "secondary-parity-report:workflow-bmad",
    },
    {
      id: "workflow-action-contract",
      surfaceId: "workflow-bmad",
      title: "Workflow action execution contract",
      kind: "integration-test",
      status: "present",
      path: "src/tests/integration/web-workflow-action-execution.test.ts",
      deterministic: true,
      purpose: "Locks the deterministic workflow action plumbing already present in the repo.",
      laneName: "integration:workflow-contracts",
    },
    {
      id: "workflow-representative-fixture",
      surfaceId: "workflow-bmad",
      title: "Future representative workflow parity fixture manifest",
      kind: "manifest",
      status: "planned",
      path: "tests/fixtures/workflow-parity-manifest.json",
      deterministic: true,
      purpose: "Reserved tracked manifest path for one representative workflow/BMAD planning-to-execution parity loop.",
      laneName: "repo-recording:workflow-bmad",
    },
  ],
  "worktree-session-recovery": [
    {
      id: "worktree-inventory-artifact",
      surfaceId: "worktree-session-recovery",
      title: "Secondary surface inventory artifact",
      kind: "artifact",
      status: "present",
      path: "tests/parity/artifacts/secondary-surface-inventory.json",
      deterministic: true,
      purpose: "Provides the truthful current-state audit row that anchors worktree/session/recovery parity scope and known gaps.",
      laneName: "secondary-parity-report:worktree-session-recovery",
    },
    {
      id: "session-recovery-contract",
      surfaceId: "worktree-session-recovery",
      title: "Session and recovery integration contract",
      kind: "integration-test",
      status: "present",
      path: "src/tests/integration/web-session-parity-contract.test.ts",
      deterministic: true,
      purpose: "Locks deterministic session-browser, resume, rename, and settings contracts already tracked in-repo.",
      laneName: "integration:session-recovery",
    },
    {
      id: "worktree-installed-recording",
      surfaceId: "worktree-session-recovery",
      title: "Future installed worktree/session recovery recording",
      kind: "recording",
      status: "planned",
      path: "tests/fixtures/recordings/secondary-worktree-session-recovery.json",
      deterministic: true,
      purpose: "Reserved tracked recording path for a representative installed worktree/session recovery proof.",
      laneName: "installed-recording:worktree-session-recovery",
    },
  ],
}

function createSurfaceContract(surface: SecondarySurfaceInventorySurface): SecondaryParitySurfaceContract {
  const surfaceLanes = SECONDARY_LANES.filter((lane) => lane.surfaceId === surface.id)
  const requiredLaneNames = surfaceLanes.filter((lane) => lane.requirement === "required").map((lane) => lane.name)
  const optionalLaneNames = surfaceLanes.filter((lane) => lane.requirement === "optional").map((lane) => lane.name)

  return {
    id: surface.id,
    title: surface.title,
    inventoryStatus: surface.status,
    scopeBoundary: surface.scopeBoundary,
    requiredLaneNames,
    optionalLaneNames,
    deterministicFixtures: fixturesBySurface[surface.id] ?? [],
    coverageGaps: surface.uncoveredAreas,
  }
}

function buildSummary(surfaces: SecondaryParitySurfaceContract[], lanes: SecondaryParityLaneDefinition[]): SecondaryParityManifestSummary {
  const allFixtures = surfaces.flatMap((surface) => surface.deterministicFixtures)
  return {
    totalSurfaces: surfaces.length,
    totalLanes: lanes.length,
    requiredLanes: lanes.filter((lane) => lane.requirement === "required").length,
    optionalLanes: lanes.filter((lane) => lane.requirement === "optional").length,
    presentFixtures: allFixtures.filter((fixture) => fixture.status === "present").length,
    plannedFixtures: allFixtures.filter((fixture) => fixture.status === "planned").length,
    partialSurfaces: surfaces.filter((surface) => surface.inventoryStatus === "partial").length,
    uncoveredSurfaces: surfaces.filter((surface) => surface.inventoryStatus === "uncovered").length,
    coveredSurfaces: surfaces.filter((surface) => surface.inventoryStatus === "covered").length,
  }
}

export function getSecondaryParityLanes(): SecondaryParityLaneDefinition[] {
  return SECONDARY_LANES.map((lane) => ({ ...lane }))
}

export function createSecondaryParityManifest(): SecondaryParityManifest {
  const inventory = createSecondarySurfaceInventory()
  const surfaces = inventory.surfaces.map((surface) => createSurfaceContract(surface))
  const lanes = getSecondaryParityLanes()

  return {
    version: SECONDARY_PARITY_MANIFEST_VERSION,
    generatedFrom: "M115/S01/T02 parity lane definitions",
    inventoryVersion: inventory.version,
    uncoveredSurfaceSemantics: {
      partial:
        "A partial surface must cite existing deterministic evidence, retain one or more coverage gaps, and still be missing at least one required planned-proof lane or planned deterministic fixture.",
      uncovered:
        "An uncovered surface has scoped contract metadata but no currently implemented required proof lane and must enumerate the missing deterministic fixture/report path needed for downstream work.",
      covered:
        "A covered surface is only truthful when every required lane is already implemented and no coverage gaps or planned deterministic fixtures remain.",
    },
    proofClasses: proofClassDescriptions.map((entry) => ({ ...entry })),
    lanes,
    surfaces,
    summary: buildSummary(surfaces, lanes),
  }
}

function readJsonFile(path: string, cwd: string): unknown {
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

export function loadSecondaryParityManifest(
  manifestPath: string = SECONDARY_PARITY_MANIFEST_PATH,
  cwd: string = process.cwd(),
): SecondaryParityManifest {
  return validateSecondaryParityManifest(readJsonFile(manifestPath, cwd), { manifestPath, cwd })
}

export function validateSecondaryParityManifest(
  manifest: unknown,
  options: { manifestPath?: string; cwd?: string } = {},
): SecondaryParityManifest {
  const manifestPath = options.manifestPath ?? SECONDARY_PARITY_MANIFEST_PATH
  const cwd = options.cwd ?? process.cwd()
  const inventory = createSecondarySurfaceInventory()
  const inventoryById = new Map(inventory.surfaces.map((surface) => [surface.id, surface]))

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: expected a JSON object at the root`)
  }

  const candidate = manifest as Record<string, unknown>
  if (candidate.version !== SECONDARY_PARITY_MANIFEST_VERSION) {
    throw new Error(
      `Invalid secondary parity manifest at ${manifestPath}: version must equal ${SECONDARY_PARITY_MANIFEST_VERSION}`,
    )
  }
  if (candidate.inventoryVersion !== inventory.version) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: inventoryVersion must match the inventory contract`)
  }
  if (typeof candidate.generatedFrom !== "string" || candidate.generatedFrom.trim().length === 0) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: generatedFrom must be a non-empty string`)
  }

  if (!candidate.uncoveredSurfaceSemantics || typeof candidate.uncoveredSurfaceSemantics !== "object" || Array.isArray(candidate.uncoveredSurfaceSemantics)) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: uncoveredSurfaceSemantics must be an object`)
  }

  const semantics = candidate.uncoveredSurfaceSemantics as Record<string, unknown>
  for (const key of ["partial", "uncovered", "covered"] as const) {
    if (typeof semantics[key] !== "string" || semantics[key]!.trim().length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: uncoveredSurfaceSemantics.${key} must be a non-empty string`)
    }
  }

  if (!Array.isArray(candidate.proofClasses) || candidate.proofClasses.length !== proofClassDescriptions.length) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: proofClasses must list the tracked proof classes exactly once`)
  }

  const seenProofClasses = new Set<string>()
  const proofClasses = candidate.proofClasses.map((entry, index) => {
    const pointer = `proofClasses[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }
    const proofClass = entry as Record<string, unknown>
    if (typeof proofClass.name !== "string" || !SECONDARY_PROOF_CLASSES.includes(proofClass.name as SecondaryProofClass)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.name must be one of ${SECONDARY_PROOF_CLASSES.join(", ")}`)
    }
    if (seenProofClasses.has(proofClass.name)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: duplicate proof class ${proofClass.name}`)
    }
    seenProofClasses.add(proofClass.name)
    if (typeof proofClass.description !== "string" || proofClass.description.trim().length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.description must be a non-empty string`)
    }
    return {
      name: proofClass.name as SecondaryProofClass,
      description: proofClass.description,
    }
  })

  if (!Array.isArray(candidate.lanes) || candidate.lanes.length === 0) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: lanes must be a non-empty array`)
  }

  const laneNames = new Set<string>()
  const lanes = candidate.lanes.map((entry, index) => {
    const pointer = `lanes[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }

    const lane = entry as Record<string, unknown>
    if (typeof lane.name !== "string" || lane.name.trim().length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.name must be a non-empty string`)
    }
    if (laneNames.has(lane.name)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: duplicate lane ${lane.name}`)
    }
    laneNames.add(lane.name)

    if (typeof lane.title !== "string" || lane.title.trim().length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.title must be a non-empty string`)
    }
    if (typeof lane.surfaceId !== "string" || !inventoryById.has(lane.surfaceId)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.surfaceId must reference a known surface`)
    }
    if (typeof lane.proofClass !== "string" || !SECONDARY_PROOF_CLASSES.includes(lane.proofClass as SecondaryProofClass)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.proofClass must be one of ${SECONDARY_PROOF_CLASSES.join(", ")}`)
    }
    if (typeof lane.requirement !== "string" || !SECONDARY_LANE_REQUIREMENTS.includes(lane.requirement as SecondaryLaneRequirement)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.requirement must be one of ${SECONDARY_LANE_REQUIREMENTS.join(", ")}`)
    }
    if (
      typeof lane.implementationStatus !== "string" ||
      !SECONDARY_LANE_IMPLEMENTATION_STATUSES.includes(lane.implementationStatus as SecondaryLaneImplementationStatus)
    ) {
      throw new Error(
        `Invalid secondary parity manifest at ${manifestPath}: ${pointer}.implementationStatus must be one of ${SECONDARY_LANE_IMPLEMENTATION_STATUSES.join(", ")}`,
      )
    }
    if (typeof lane.releaseReadable !== "boolean") {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.releaseReadable must be a boolean`)
    }
    if (typeof lane.description !== "string" || lane.description.trim().length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.description must be a non-empty string`)
    }

    return {
      name: lane.name,
      title: lane.title,
      surfaceId: lane.surfaceId,
      proofClass: lane.proofClass as SecondaryProofClass,
      requirement: lane.requirement as SecondaryLaneRequirement,
      implementationStatus: lane.implementationStatus as SecondaryLaneImplementationStatus,
      releaseReadable: lane.releaseReadable,
      description: lane.description,
    } satisfies SecondaryParityLaneDefinition
  })

  if (!Array.isArray(candidate.surfaces) || candidate.surfaces.length !== inventory.surfaces.length) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: surfaces must match the tracked inventory surface count`)
  }

  const surfaces = candidate.surfaces.map((entry, index) => {
    const pointer = `surfaces[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }

    const surface = entry as Record<string, unknown>
    if (typeof surface.id !== "string" || !inventoryById.has(surface.id)) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.id must reference a known inventory surface`)
    }
    const inventorySurface = inventoryById.get(surface.id)!

    if (surface.title !== inventorySurface.title) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.title must match the inventory contract`) 
    }
    if (surface.inventoryStatus !== inventorySurface.status || !SURFACE_STATUSES.includes(surface.inventoryStatus as SecondarySurfaceInventorySurface["status"])) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.inventoryStatus must match the inventory contract`)
    }
    if (surface.scopeBoundary !== inventorySurface.scopeBoundary) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.scopeBoundary must match the inventory contract`)
    }

    const validateLaneNameArray = (value: unknown, field: "requiredLaneNames" | "optionalLaneNames") => {
      if (!Array.isArray(value) || value.length === 0 || value.some((name) => typeof name !== "string" || !laneNames.has(name))) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.${field} must reference known lanes`)
      }
      return value as string[]
    }

    const requiredLaneNames = validateLaneNameArray(surface.requiredLaneNames, "requiredLaneNames")
    const optionalLaneNames = validateLaneNameArray(surface.optionalLaneNames, "optionalLaneNames")

    for (const laneName of requiredLaneNames) {
      const lane = lanes.find((candidateLane) => candidateLane.name === laneName)
      if (!lane || lane.requirement !== "required" || lane.surfaceId !== surface.id) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.requiredLaneNames must contain required lanes for the same surface`)
      }
    }
    for (const laneName of optionalLaneNames) {
      const lane = lanes.find((candidateLane) => candidateLane.name === laneName)
      if (!lane || lane.requirement !== "optional" || lane.surfaceId !== surface.id) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.optionalLaneNames must contain optional lanes for the same surface`)
      }
    }

    if (!Array.isArray(surface.deterministicFixtures) || surface.deterministicFixtures.length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.deterministicFixtures must be a non-empty array`)
    }

    const deterministicFixtures = surface.deterministicFixtures.map((fixtureEntry, fixtureIndex) => {
      const fixturePointer = `${pointer}.deterministicFixtures[${fixtureIndex}]`
      if (!fixtureEntry || typeof fixtureEntry !== "object" || Array.isArray(fixtureEntry)) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer} must be an object`)
      }
      const fixture = fixtureEntry as Record<string, unknown>
      if (typeof fixture.id !== "string" || fixture.id.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.id must be a non-empty string`)
      }
      if (fixture.surfaceId !== surface.id) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.surfaceId must match ${surface.id}`)
      }
      if (typeof fixture.title !== "string" || fixture.title.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.title must be a non-empty string`)
      }
      if (typeof fixture.kind !== "string" || !SECONDARY_FIXTURE_KINDS.includes(fixture.kind as SecondaryFixtureKind)) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.kind must be one of ${SECONDARY_FIXTURE_KINDS.join(", ")}`)
      }
      if (typeof fixture.status !== "string" || !SECONDARY_FIXTURE_STATUSES.includes(fixture.status as SecondaryFixtureStatus)) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.status must be one of ${SECONDARY_FIXTURE_STATUSES.join(", ")}`)
      }
      if (typeof fixture.path !== "string" || fixture.path.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.path must be a non-empty string`)
      }
      if (typeof fixture.deterministic !== "boolean" || fixture.deterministic !== true) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.deterministic must be true`)
      }
      if (typeof fixture.purpose !== "string" || fixture.purpose.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.purpose must be a non-empty string`)
      }
      if (fixture.laneName != null && (typeof fixture.laneName !== "string" || !laneNames.has(fixture.laneName))) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${fixturePointer}.laneName must reference a known lane when present`)
      }

      if (fixture.status === "present") {
        const filePath = String(fixture.path).split("#", 1)[0]
        if (!existsSync(join(cwd, filePath))) {
          throw new Error(`Invalid secondary parity manifest at ${manifestPath}: present fixture path does not exist: ${fixture.path}`)
        }
      }

      return {
        id: fixture.id,
        surfaceId: fixture.surfaceId,
        title: fixture.title,
        kind: fixture.kind as SecondaryFixtureKind,
        status: fixture.status as SecondaryFixtureStatus,
        path: fixture.path,
        deterministic: fixture.deterministic,
        purpose: fixture.purpose,
        ...(fixture.laneName ? { laneName: fixture.laneName } : {}),
      } satisfies SecondaryParityFixtureDefinition
    })

    if (!Array.isArray(surface.coverageGaps) || surface.coverageGaps.length === 0) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer}.coverageGaps must stay non-empty for truthful partial/uncovered surfaces`)
    }

    const coverageGaps = surface.coverageGaps.map((gapEntry, gapIndex) => {
      const gapPointer = `${pointer}.coverageGaps[${gapIndex}]`
      if (!gapEntry || typeof gapEntry !== "object" || Array.isArray(gapEntry)) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${gapPointer} must be an object`)
      }
      const gap = gapEntry as Record<string, unknown>
      if (typeof gap.id !== "string" || gap.id.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${gapPointer}.id must be a non-empty string`)
      }
      if (typeof gap.summary !== "string" || gap.summary.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${gapPointer}.summary must be a non-empty string`)
      }
      if (typeof gap.downstreamNeed !== "string" || gap.downstreamNeed.trim().length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${gapPointer}.downstreamNeed must be a non-empty string`)
      }
      return {
        id: gap.id,
        summary: gap.summary,
        downstreamNeed: gap.downstreamNeed,
      }
    })

    const requiredLanesForSurface = lanes.filter((lane) => lane.surfaceId === surface.id && lane.requirement === "required")
    const plannedRequiredLanes = requiredLanesForSurface.filter((lane) => lane.implementationStatus === "planned-proof")
    const plannedFixtures = deterministicFixtures.filter((fixture) => fixture.status === "planned")

    if (surface.inventoryStatus === "partial") {
      if (coverageGaps.length === 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} partial surfaces must list coverageGaps`)
      }
      if (plannedRequiredLanes.length === 0 && plannedFixtures.length === 0) {
        throw new Error(
          `Invalid secondary parity manifest at ${manifestPath}: ${pointer} partial surfaces must still be missing a required planned-proof lane or planned deterministic fixture`,
        )
      }
    }

    if (surface.inventoryStatus === "uncovered") {
      const existingRequiredLanes = requiredLanesForSurface.filter((lane) => lane.implementationStatus === "existing-proof")
      if (existingRequiredLanes.length > 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} uncovered surfaces cannot claim an existing required lane`)
      }
    }

    if (surface.inventoryStatus === "covered") {
      if (coverageGaps.length > 0 || plannedRequiredLanes.length > 0 || plannedFixtures.length > 0) {
        throw new Error(`Invalid secondary parity manifest at ${manifestPath}: ${pointer} covered surfaces cannot retain gaps or planned required proof`)
      }
    }

    return {
      id: surface.id,
      title: surface.title,
      inventoryStatus: surface.inventoryStatus as SecondarySurfaceInventorySurface["status"],
      scopeBoundary: surface.scopeBoundary as string,
      requiredLaneNames,
      optionalLaneNames,
      deterministicFixtures,
      coverageGaps,
    } satisfies SecondaryParitySurfaceContract
  })

  if (!candidate.summary || typeof candidate.summary !== "object" || Array.isArray(candidate.summary)) {
    throw new Error(`Invalid secondary parity manifest at ${manifestPath}: summary must be an object`)
  }

  const expectedSummary = buildSummary(surfaces, lanes)
  const summary = candidate.summary as Record<string, unknown>
  for (const [key, expectedValue] of Object.entries(expectedSummary)) {
    if (summary[key] !== expectedValue) {
      throw new Error(`Invalid secondary parity manifest at ${manifestPath}: summary.${key} must equal ${String(expectedValue)}`)
    }
  }

  return {
    version: candidate.version as typeof SECONDARY_PARITY_MANIFEST_VERSION,
    generatedFrom: candidate.generatedFrom as string,
    inventoryVersion: candidate.inventoryVersion as SecondarySurfaceInventory["version"],
    uncoveredSurfaceSemantics: {
      partial: semantics.partial as string,
      uncovered: semantics.uncovered as string,
      covered: semantics.covered as string,
    },
    proofClasses,
    lanes,
    surfaces,
    summary: expectedSummary,
  }
}
