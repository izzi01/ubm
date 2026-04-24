import test from "node:test"
import assert from "node:assert/strict"

import {
  type BaselineLaneResult,
  type BaselineReport,
  type RepoInstalledComparison,
  type SecondaryParityReport,
} from "../../../tests/parity/baseline-lanes.ts"
import {
  collectActionableLaneDiagnostics,
  renderParityDiagnostics,
  summarizeLaneDiagnostic,
  summarizePhaseEvidence,
} from "../../../tests/parity/diagnostics.ts"
import { createSecondaryParityManifest } from "../../../tests/parity/secondary-lanes.ts"
import { createSecondarySurfaceInventory } from "../../../tests/parity/secondary-surface-inventory.ts"

function makeLane(overrides: Partial<BaselineLaneResult> & Pick<BaselineLaneResult, "name" | "status">): BaselineLaneResult {
  return {
    name: overrides.name,
    target: overrides.target ?? `tests/fixtures/${overrides.name}.json`,
    runner: overrides.runner ?? "recorded-artifact",
    proofClass: overrides.proofClass ?? "repo-infra",
    parityScope: overrides.parityScope ?? "repo-mode",
    provesCodingLoop: overrides.provesCodingLoop ?? false,
    status: overrides.status,
    skipReason: overrides.skipReason ?? null,
    exitCode: overrides.exitCode ?? (overrides.status === "passed" ? 0 : overrides.status === "skipped" ? null : 1),
    durationMs: overrides.durationMs ?? 42,
    command: overrides.command ?? ["artifact", `tests/fixtures/${overrides.name}.json`],
    artifactPath: overrides.artifactPath ?? null,
    failedPhase: overrides.failedPhase ?? null,
    phaseResults: overrides.phaseResults ?? [],
  }
}

function makeRepoInstalledComparison(overrides: Partial<RepoInstalledComparison> = {}): RepoInstalledComparison {
  return {
    repoLaneName: "repo-mode-coding-loop",
    installedLaneName: "pack-install",
    repoArtifactPath: "tests/fixtures/recordings/repo-mode-parity-web-task.json",
    installedArtifactPath: "tests/fixtures/recordings/installed-mode-parity-web-task.json",
    comparableWithoutRerun: true,
    divergencePhases: [],
    phaseComparisons: [
      {
        phase: "browser",
        repoStatus: "passed",
        installedStatus: "passed",
        matches: true,
      },
    ],
    ...overrides,
  }
}

function makeSecondaryParityReport(): SecondaryParityReport {
  const inventory = createSecondarySurfaceInventory()
  const manifest = createSecondaryParityManifest()
  const webSurface = manifest.surfaces.find((surface) => surface.id === "web-mode")
  assert.ok(webSurface, "expected web-mode surface in secondary parity manifest")

  return {
    inventoryPath: "tests/parity/artifacts/secondary-surface-inventory.json",
    manifestPath: "tests/fixtures/secondary-parity-manifest.json",
    inventoryVersion: inventory.version,
    manifestVersion: manifest.version,
    summary: {
      totalSurfaces: manifest.surfaces.length,
      partialSurfaces: manifest.surfaces.filter((surface) => surface.inventoryStatus === "partial").length,
      coveredSurfaces: manifest.surfaces.filter((surface) => surface.inventoryStatus === "covered").length,
      uncoveredSurfaces: manifest.surfaces.filter((surface) => surface.inventoryStatus === "uncovered").length,
      totalDriftFindings: inventory.rebrandDrift.length,
      surfacesMissingReleaseReadableCoverage: ["web-mode"],
    },
    surfaces: [
      {
        id: webSurface.id,
        title: webSurface.title,
        inventoryStatus: webSurface.inventoryStatus,
        releaseReadableStatus: webSurface.inventoryStatus,
        requiredLaneNames: [...webSurface.requiredLaneNames],
        optionalLaneNames: [...webSurface.optionalLaneNames],
        existingRequiredLaneNames: ["integration:web-mode"],
        missingRequiredLaneNames: ["secondary-parity-report"],
        presentFixturePaths: [
          "tests/parity/artifacts/secondary-surface-inventory.json",
          "src/tests/integration/web-mode-cli.test.ts",
        ],
        plannedFixturePaths: ["tests/parity/artifacts/secondary-parity-report.json#web-mode"],
        coverageGapIds: webSurface.coverageGaps.map((gap) => gap.id),
        uncoveredAreas: webSurface.coverageGaps.map((gap) => ({ ...gap })),
        reportPath: "tests/parity/artifacts/baseline-report.json#secondaryParity.surfaces.web-mode",
      },
    ],
    uncoveredSurfaces: [],
    driftFindings: inventory.rebrandDrift.filter((finding) => finding.surfaceId === "web-mode"),
    inventory,
    manifest,
  }
}

function makeReport(lanes: BaselineLaneResult[]): BaselineReport {
  return {
    version: 4,
    generatedAt: "2026-03-20T00:00:00.000Z",
    cwd: "/tmp/umb",
    artifactPath: "tests/parity/artifacts/baseline-report.json",
    summary: {
      verdict: lanes.some((lane) => lane.status === "failed") ? "failing" : "partial",
      totalLanes: lanes.length,
      passed: lanes.filter((lane) => lane.status === "passed").length,
      failed: lanes.filter((lane) => lane.status === "failed").length,
      skipped: lanes.filter((lane) => lane.status === "skipped").length,
      timedOut: lanes.filter((lane) => lane.status === "timed_out").length,
      provesCodingLoop: lanes.some((lane) => lane.provesCodingLoop && lane.status === "passed"),
      uncoveredLaneNames: lanes.filter((lane) => lane.status !== "passed").map((lane) => lane.name),
      proofClassCounts: {
        smoke: 0,
        "repo-infra": lanes.filter((lane) => lane.proofClass === "repo-infra").length,
        "installed-binary": lanes.filter((lane) => lane.proofClass === "installed-binary").length,
        "live-spot-check": 0,
        "uncovered-coding-loop": 0,
      },
      uncoveredCapabilityNames: ["verify-browser-behavior"],
    },
    lanes,
    parityManifest: {
      version: 1,
      fixtureId: "parity-web-task",
      title: "Parity web task",
      capabilities: [
        {
          name: "verify-browser-behavior",
          description: "Proves browser-facing behavior for the deterministic task",
          observableCompletionCriteria: ["Browser-facing assertions remain visible in diagnostics"],
          proof: lanes.some((lane) => lane.status === "failed") ? "uncovered" : "covered",
          currentGap: "Inspect the web-mode secondary parity row for remaining release-readable gaps.",
          laneCoverage: Object.fromEntries(lanes.map((lane) => [lane.name, lane.status === "passed" ? "covered" : "partial"])),
        },
      ],
    },
    uncoveredCapabilities: [
      {
        capabilityName: "verify-browser-behavior",
        proof: lanes.some((lane) => lane.status === "failed") ? "uncovered" : "covered",
        uncovered: lanes.some((lane) => lane.status === "failed"),
        currentGap: "Inspect the web-mode secondary parity row for remaining release-readable gaps.",
        observableCompletionCriteria: ["Browser-facing assertions remain visible in diagnostics"],
        coveringLaneNames: lanes.filter((lane) => lane.status === "passed").map((lane) => lane.name),
        partialLaneNames: lanes.filter((lane) => lane.status !== "passed").map((lane) => lane.name),
        uncoveredLaneNames: [],
      },
    ],
    repoInstalledComparison: makeRepoInstalledComparison(),
    secondaryParity: makeSecondaryParityReport(),
    reconciledFoundations: [
      {
        milestoneId: "M113",
        requirementStatusById: {
          R023: "validated",
          R026: "validated",
        },
        summaryLabel: "closed foundation",
        reportAnnotation:
          "M113 cleanup requirements R023 and R026 are already validated closed foundation work, not an open parity gap for M114.",
      },
    ],
  }
}

test("web-mode surface stays release-readable and truthfully partial until its report lane exists", () => {
  const manifest = createSecondaryParityManifest()
  const webSurface = manifest.surfaces.find((surface) => surface.id === "web-mode")
  assert.ok(webSurface, "expected web-mode surface contract to exist")

  assert.equal(webSurface.inventoryStatus, "partial")
  assert.deepEqual(webSurface.requiredLaneNames, ["secondary-parity-report", "integration:web-mode"])
  assert.deepEqual(webSurface.optionalLaneNames, ["repo-recording:web-mode", "installed-recording:web-mode"])

  const presentPaths = webSurface.deterministicFixtures.filter((fixture) => fixture.status === "present").map((fixture) => fixture.path)
  const plannedPaths = webSurface.deterministicFixtures.filter((fixture) => fixture.status === "planned").map((fixture) => fixture.path)

  assert.deepEqual(presentPaths, [
    "tests/parity/artifacts/secondary-surface-inventory.json",
    "src/tests/integration/web-mode-cli.test.ts",
  ])
  assert.deepEqual(plannedPaths, ["tests/parity/artifacts/secondary-parity-report.json#web-mode"])
  assert.deepEqual(
    webSurface.coverageGaps.map((gap) => gap.id),
    ["web-parity-artifact-missing", "web-installed-mode-proof-missing"],
  )
})

test("browser phase evidence preserves expected/actual details for actionable diagnostics", () => {
  const evidence = summarizePhaseEvidence({
    phase: "browser",
    status: "failed",
    summary: "browser assertion failed",
    command: {
      command: "pnpm test:web-mode",
      exitCode: 1,
      stderrSnippet: "expected command surface to show the current project",
    },
    browser: {
      assertion: "project context badge",
      expected: "alpha-app",
      actual: "beta-app",
    },
  })

  assert.equal(evidence.type, "browser")
  assert.match(evidence.headline, /project context badge expected "alpha-app" but saw "beta-app"/)
  assert.ok(evidence.detailLines.includes("assertion: project context badge"))
  assert.ok(evidence.detailLines.includes("expected: alpha-app"))
  assert.ok(evidence.detailLines.includes("actual: beta-app"))
  assert.ok(evidence.detailLines.includes("command: pnpm test:web-mode"))
  assert.ok(evidence.detailLines.includes("exitCode: 1"))
  assert.ok(evidence.detailLines.some((line) => line.includes("expected command surface to show the current project")))
})

test("lane summaries keep web-mode artifact paths and browser-facing failure details", () => {
  const lane = makeLane({
    name: "integration:web-mode",
    status: "failed",
    parityScope: "partial",
    artifactPath: "tests/parity/artifacts/secondary-parity-report.json#web-mode",
    failedPhase: "browser",
    phaseResults: [
      {
        phase: "browser",
        status: "failed",
        summary: "browser verification failed",
        browser: {
          assertion: "active project label",
          expected: "alpha-app",
          actual: "project missing",
        },
      },
    ],
  })

  const summary = summarizeLaneDiagnostic(lane)
  assert.equal(summary.mode, "partial")
  assert.equal(summary.failedPhase, "browser")
  assert.equal(summary.artifactPath, "tests/parity/artifacts/secondary-parity-report.json#web-mode")
  assert.match(summary.headline, /integration:web-mode failed during browser/)
  assert.ok(summary.evidence)
  assert.match(summary.evidence!.headline, /active project label expected "alpha-app" but saw "project missing"/)
})

test("renderParityDiagnostics prints artifact paths and browser evidence for failing web-mode lanes", () => {
  const report = makeReport([
    makeLane({
      name: "integration:web-mode",
      status: "failed",
      parityScope: "partial",
      artifactPath: "tests/parity/artifacts/secondary-parity-report.json#web-mode",
      failedPhase: "browser",
      phaseResults: [
        {
          phase: "browser",
          status: "failed",
          summary: "browser project context diverged",
          command: {
            command: "pnpm parity:web-mode",
            exitCode: 1,
            stderrSnippet: "expected alpha-app project badge",
          },
          browser: {
            assertion: "project context badge",
            expected: "alpha-app",
            actual: "beta-app",
          },
        },
      ],
    }),
  ])

  const rendered = renderParityDiagnostics(report)
  assert.match(rendered, /Parity diagnostics: verdict=failing/)
  assert.match(rendered, /- integration:web-mode \[mode=partial\] status=failed failedPhase=browser/)
  assert.match(rendered, /artifactPath: tests\/parity\/artifacts\/secondary-parity-report.json#web-mode/)
  assert.match(rendered, /evidence: project context badge expected "alpha-app" but saw "beta-app"/)
  assert.match(rendered, /assertion: project context badge/)
  assert.match(rendered, /expected: alpha-app/)
  assert.match(rendered, /actual: beta-app/)
  assert.match(rendered, /command: pnpm parity:web-mode/)
  assert.match(rendered, /snippet: expected alpha-app project badge/)
})

test("collectActionableLaneDiagnostics omits fully passing lanes without phase evidence but keeps passing web-mode evidence when present", () => {
  const diagnostics = collectActionableLaneDiagnostics(
    makeReport([
      makeLane({
        name: "integration:web-mode",
        status: "passed",
        parityScope: "partial",
        artifactPath: "tests/parity/artifacts/secondary-parity-report.json#web-mode",
        phaseResults: [
          {
            phase: "browser",
            status: "passed",
            summary: "browser project selection stayed truthful",
            browser: {
              assertion: "project context badge",
              expected: "alpha-app",
              actual: "alpha-app",
            },
          },
        ],
      }),
      makeLane({
        name: "fixtures-runner",
        status: "passed",
        runner: "node-script",
        proofClass: "uncovered-coding-loop",
        parityScope: "partial",
        command: ["--experimental-strip-types", "tests/fixtures/run.ts"],
        phaseResults: [],
      }),
    ]),
  )

  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0]!.name, "integration:web-mode")
  assert.equal(diagnostics[0]!.status, "passed")
  assert.equal(diagnostics[0]!.artifactPath, "tests/parity/artifacts/secondary-parity-report.json#web-mode")
  assert.match(diagnostics[0]!.headline, /passed with browser evidence available/)
})
