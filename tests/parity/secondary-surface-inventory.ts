export const SECONDARY_SURFACE_INVENTORY_VERSION = 1 as const

export const SURFACE_STATUSES = ["covered", "partial", "uncovered"] as const
export const DRIFT_SEVERITIES = ["high", "medium", "low"] as const
export const DRIFT_KINDS = ["runtime-diagnostic", "help-text", "packaging", "test-fixture", "comment", "doc"] as const

export type SecondarySurfaceStatus = (typeof SURFACE_STATUSES)[number]
export type DriftSeverity = (typeof DRIFT_SEVERITIES)[number]
export type DriftKind = (typeof DRIFT_KINDS)[number]

export interface SecondarySurfaceInventoryEvidence {
  path: string
  note: string
}

export interface SecondarySurfaceInventoryGap {
  id: string
  summary: string
  downstreamNeed: string
}

export interface SecondarySurfaceInventorySurface {
  id: string
  title: string
  status: SecondarySurfaceStatus
  scopeBoundary: string
  alreadyCoveredBy: SecondarySurfaceInventoryEvidence[]
  uncoveredAreas: SecondarySurfaceInventoryGap[]
  plannedProofLanes: string[]
}

export interface RebrandDriftFinding {
  id: string
  surfaceId: string
  severity: DriftSeverity
  kind: DriftKind
  path: string
  line: number
  match: string
  whyItMatters: string
}

export interface SecondarySurfaceInventory {
  version: typeof SECONDARY_SURFACE_INVENTORY_VERSION
  generatedFrom: string
  summary: {
    totalSurfaces: number
    partialSurfaces: number
    uncoveredSurfaces: number
    coveredSurfaces: number
    totalDriftFindings: number
    severityCounts: Record<DriftSeverity, number>
  }
  surfaces: SecondarySurfaceInventorySurface[]
  rebrandDrift: RebrandDriftFinding[]
}

const surfaces: SecondarySurfaceInventorySurface[] = [
  {
    id: "web-mode",
    title: "Browser-only web mode parity surface",
    status: "partial",
    scopeBoundary:
      "Covers the shipped `umb --web` / `umb web` launch path, host/network flags, onboarding lock state, command-surface parity, runtime startup diagnostics, and recovery/session diagnostics exposed in the web UI. It does not yet prove a dedicated parity fixture through the release-gate artifact.",
    alreadyCoveredBy: [
      {
        path: "src/tests/integration/web-mode-cli.test.ts",
        note: "Verifies CLI branching, path handling, launch/stop behavior, and package script expectations for web mode.",
      },
      {
        path: "src/tests/integration/web-mode-onboarding.test.ts",
        note: "Exercises browser onboarding lock/unlock behavior for fresh web sessions.",
      },
      {
        path: "src/tests/integration/web-session-parity-contract.test.ts",
        note: "Locks command-surface session, resume, rename, and settings state shared by the web UI.",
      },
      {
        path: "src/tests/integration/web-state-surfaces-contract.test.ts",
        note: "Locks recovery diagnostics and git-summary state on the shared web command surface.",
      },
    ],
    uncoveredAreas: [
      {
        id: "web-parity-artifact-missing",
        summary: "No dedicated secondary-surface parity artifact reports web-mode coverage in the parity release workflow.",
        downstreamNeed: "Publish a machine-readable lane/report entry so release-gate consumers can read web-mode parity without re-inferring it from individual tests.",
      },
      {
        id: "web-installed-mode-proof-missing",
        summary: "Current web-mode evidence is integration-heavy but not framed as installed-mode parity proof alongside repo-mode parity.",
        downstreamNeed: "Define whether web mode needs repo/install dual proof or an explicit scoped exception in the parity matrix.",
      },
    ],
    plannedProofLanes: ["integration:web-mode", "secondary-parity-report"],
  },
  {
    id: "mcp",
    title: "MCP server and client parity surface",
    status: "partial",
    scopeBoundary:
      "Covers `--mode mcp` startup, operator-visible startup branding, packaged MCP module importability, bundled MCP extension conflicts, and MCP-related package server contracts. It does not yet prove an end-to-end secondary parity lane that a downstream release gate can read as MCP parity.",
    alreadyCoveredBy: [
      {
        path: "src/mcp-server.ts",
        note: "Shipped native MCP server entrypoint exists and is wired from the CLI mode switch.",
      },
      {
        path: "src/tests/mcp-server.test.ts",
        note: "Verifies MCP server module import/start behavior at the built artifact layer.",
      },
      {
        path: "src/tests/mcp-client-schema.test.ts",
        note: "Locks the MCP client tool schema contract.",
      },
      {
        path: "src/tests/package-mcp-server-elicitation.test.ts",
        note: "Verifies packaged MCP server tool exposure for ask_user_questions.",
      },
    ],
    uncoveredAreas: [
      {
        id: "mcp-parity-lane-missing",
        summary: "No secondary parity lane currently emits MCP-specific covered/uncovered status into a tracked parity artifact.",
        downstreamNeed: "Add a deterministic MCP parity contract/report lane so downstream slices stop treating MCP support as an implicit side effect of unit tests.",
      },
      {
        id: "mcp-installed-session-proof-missing",
        summary: "Existing MCP tests do not yet demonstrate the installed packaged CLI serving a representative MCP parity interaction in the parity report surface.",
        downstreamNeed: "Define a representative MCP interaction and attach it to the parity matrix.",
      },
    ],
    plannedProofLanes: ["unit:mcp", "secondary-parity-report"],
  },
  {
    id: "workflow-bmad",
    title: "Workflow / BMAD representative parity surface",
    status: "partial",
    scopeBoundary:
      "Covers representative workflow command routing, workflow CTA execution, and the shipped skill/workflow assets that shape guided flows. It does not yet include a deterministic parity fixture that proves a representative workflow/BMAD loop end to end.",
    alreadyCoveredBy: [
      {
        path: "src/tests/integration/web-workflow-controls-contract.test.ts",
        note: "Locks workflow control derivation and exposed action contracts.",
      },
      {
        path: "src/tests/integration/web-workflow-action-execution.test.ts",
        note: "Verifies workflow action execution plumbing in the web layer.",
      },
      {
        path: "src/tests/integration/web-command-parity-contract.test.ts",
        note: "Verifies command-root routing, including `/gsd status` surface dispatch and passthrough behavior.",
      },
      {
        path: "src/resources/skills/create-skill/workflows/create-new-skill.md",
        note: "Tracked workflow assets exist, proving the product ships workflow-oriented guidance surfaces.",
      },
    ],
    uncoveredAreas: [
      {
        id: "workflow-fixture-missing",
        summary: "No tracked parity fixture yet exercises one representative workflow/BMAD path as a release-readable contract.",
        downstreamNeed: "Define a deterministic workflow fixture or manifest entry so the parity report can state exactly what workflow parity means.",
      },
      {
        id: "bmad-scope-not-explicit",
        summary: "BMAD-relevant workflow coverage exists only indirectly through command/action contracts and shipped workflow assets.",
        downstreamNeed: "Publish explicit scope semantics describing which workflow/BMAD experiences are in or out of parity scope.",
      },
    ],
    plannedProofLanes: ["integration:workflow-contracts", "secondary-parity-report"],
  },
  {
    id: "worktree-session-recovery",
    title: "Worktree, session, and recovery parity surface",
    status: "partial",
    scopeBoundary:
      "Covers CLI session listing/resume, headless resume semantics, worktree subcommands/help, and web command-surface recovery/session diagnostics. It does not yet publish a dedicated parity artifact that unifies those proofs and the remaining drift points.",
    alreadyCoveredBy: [
      {
        path: "src/help-text.ts",
        note: "Defines the user-facing worktree and sessions help contract for the renamed CLI.",
      },
      {
        path: "src/headless.ts",
        note: "Implements resume-session parsing and error reporting for headless mode.",
      },
      {
        path: "src/tests/integration/e2e-headless.test.ts",
        note: "Verifies `--resume` failure messaging and headless output behavior.",
      },
      {
        path: "src/tests/integration/web-recovery-diagnostics-contract.test.ts",
        note: "Locks recovery diagnostics state and payload contracts for the web surface.",
      },
      {
        path: "src/tests/integration/web-session-parity-contract.test.ts",
        note: "Locks session-browser, resume, rename, and settings state on the web command surface.",
      },
    ],
    uncoveredAreas: [
      {
        id: "worktree-parity-artifact-missing",
        summary: "Worktree/session/recovery evidence is scattered across CLI and web tests but not summarized in a parity artifact.",
        downstreamNeed: "Publish one machine-readable matrix row that downstream slices and release gates can consume directly.",
      },
      {
        id: "worktree-installed-proof-missing",
        summary: "There is no deterministic installed-mode parity fixture demonstrating representative worktree/session recovery behavior beyond individual contract tests.",
        downstreamNeed: "Decide whether a worktree/session fixture is required or whether scoped contract coverage is sufficient for parity closure.",
      },
    ],
    plannedProofLanes: ["integration:session-recovery", "secondary-parity-report"],
  },
]

const rebrandDrift: RebrandDriftFinding[] = [
  {
    id: "drift-package-docker-image",
    surfaceId: "mcp",
    severity: "medium",
    kind: "packaging",
    path: "package.json",
    line: 95,
    match: "ghcr.io/gsd-build/gsd-pi",
    whyItMatters: "Packaging metadata still publishes the old image naming convention instead of the renamed product surface.",
  },
  {
    id: "drift-web-subprocess-comment",
    surfaceId: "web-mode",
    severity: "low",
    kind: "comment",
    path: "src/web/ts-subprocess-flags.ts",
    line: 9,
    match: "node_modules/gsd-pi/src/...",
    whyItMatters: "Internal comments still encode the old package root, which can mislead future maintenance around packaged web mode.",
  },
  {
    id: "drift-live-regression-install-comment",
    surfaceId: "workflow-bmad",
    severity: "medium",
    kind: "comment",
    path: "tests/live-regression/run.ts",
    line: 16,
    match: "npm install -g gsd-pi@<version>",
    whyItMatters: "The live-regression lane still documents global install using the old package name, weakening parity-report trust.",
  },
  {
    id: "drift-docker-template-test",
    surfaceId: "mcp",
    severity: "medium",
    kind: "test-fixture",
    path: "src/tests/docker-template.test.ts",
    line: 21,
    match: "docker/Dockerfile.sandbox installs gsd-pi globally",
    whyItMatters: "Tests still codify the old install package name, so downstream packaging work must retire this drift intentionally.",
  },
  {
    id: "drift-packaged-web-test-fixtures",
    surfaceId: "web-mode",
    severity: "medium",
    kind: "test-fixture",
    path: "src/tests/integration/web-subprocess-module-resolution.test.ts",
    line: 20,
    match: "/usr/lib/node_modules/gsd-pi",
    whyItMatters: "Packaged web-mode tests still model the old global package root, so parity claims need an explicit drift note rather than silent acceptance.",
  },
]

function countBySeverity(findings: readonly RebrandDriftFinding[]): Record<DriftSeverity, number> {
  return {
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
  }
}

export function createSecondarySurfaceInventory(): SecondarySurfaceInventory {
  return {
    version: SECONDARY_SURFACE_INVENTORY_VERSION,
    generatedFrom: "M115/S01/T01 repo audit",
    summary: {
      totalSurfaces: surfaces.length,
      partialSurfaces: surfaces.filter((surface) => surface.status === "partial").length,
      uncoveredSurfaces: surfaces.filter((surface) => surface.status === "uncovered").length,
      coveredSurfaces: surfaces.filter((surface) => surface.status === "covered").length,
      totalDriftFindings: rebrandDrift.length,
      severityCounts: countBySeverity(rebrandDrift),
    },
    surfaces,
    rebrandDrift,
  }
}

export function validateSecondarySurfaceInventory(inventory: SecondarySurfaceInventory): void {
  if (inventory.version !== SECONDARY_SURFACE_INVENTORY_VERSION) {
    throw new Error(`Secondary surface inventory version mismatch: expected ${SECONDARY_SURFACE_INVENTORY_VERSION}, received ${inventory.version}`)
  }

  if (inventory.surfaces.length === 0) {
    throw new Error("Secondary surface inventory must contain at least one surface")
  }

  const surfaceIds = new Set<string>()
  for (const surface of inventory.surfaces) {
    if (surfaceIds.has(surface.id)) {
      throw new Error(`Duplicate surface id: ${surface.id}`)
    }
    surfaceIds.add(surface.id)

    if (!SURFACE_STATUSES.includes(surface.status)) {
      throw new Error(`Invalid surface status for ${surface.id}: ${surface.status}`)
    }
    if (surface.alreadyCoveredBy.length === 0) {
      throw new Error(`Surface ${surface.id} must cite at least one evidence path`)
    }
    if (surface.uncoveredAreas.length === 0) {
      throw new Error(`Surface ${surface.id} must list at least one uncovered area to keep the audit truthful`) 
    }
    if (surface.plannedProofLanes.length === 0) {
      throw new Error(`Surface ${surface.id} must declare at least one planned proof lane`)
    }
  }

  const driftIds = new Set<string>()
  for (const finding of inventory.rebrandDrift) {
    if (driftIds.has(finding.id)) {
      throw new Error(`Duplicate drift finding id: ${finding.id}`)
    }
    driftIds.add(finding.id)

    if (!surfaceIds.has(finding.surfaceId)) {
      throw new Error(`Drift finding ${finding.id} references unknown surface ${finding.surfaceId}`)
    }
    if (!DRIFT_SEVERITIES.includes(finding.severity)) {
      throw new Error(`Invalid drift severity for ${finding.id}: ${finding.severity}`)
    }
    if (!DRIFT_KINDS.includes(finding.kind)) {
      throw new Error(`Invalid drift kind for ${finding.id}: ${finding.kind}`)
    }
    if (finding.line < 1) {
      throw new Error(`Invalid drift line for ${finding.id}: ${finding.line}`)
    }
  }

  const recomputed = countBySeverity(inventory.rebrandDrift)
  if (inventory.summary.totalSurfaces !== inventory.surfaces.length) {
    throw new Error("Secondary surface summary totalSurfaces does not match surfaces length")
  }
  if (inventory.summary.totalDriftFindings !== inventory.rebrandDrift.length) {
    throw new Error("Secondary surface summary totalDriftFindings does not match rebrandDrift length")
  }
  if (inventory.summary.partialSurfaces !== inventory.surfaces.filter((surface) => surface.status === "partial").length) {
    throw new Error("Secondary surface summary partialSurfaces does not match surface rows")
  }
  if (inventory.summary.coveredSurfaces !== inventory.surfaces.filter((surface) => surface.status === "covered").length) {
    throw new Error("Secondary surface summary coveredSurfaces does not match surface rows")
  }
  if (inventory.summary.uncoveredSurfaces !== inventory.surfaces.filter((surface) => surface.status === "uncovered").length) {
    throw new Error("Secondary surface summary uncoveredSurfaces does not match surface rows")
  }
  if (JSON.stringify(inventory.summary.severityCounts) !== JSON.stringify(recomputed)) {
    throw new Error("Secondary surface summary severityCounts does not match drift findings")
  }
}
