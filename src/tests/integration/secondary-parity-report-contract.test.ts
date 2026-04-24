import { test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  SECONDARY_PARITY_MANIFEST_PATH,
  WORKTREE_SESSION_MANIFEST_PATH,
  createSecondaryParityReport,
  createSecondaryParityReportFromInputs,
  loadWorktreeSessionManifest,
  type SecondaryParityReport,
} from "../../../tests/parity/secondary-parity-report.ts"
import { loadSecondaryParityManifest } from "../../../tests/parity/secondary-lanes.ts"

const repoRoot = process.cwd()
const artifactPath = join(repoRoot, "tests", "parity", "artifacts", "secondary-parity-report.json")

function normalize(report: SecondaryParityReport) {
  return {
    ...report,
    generatedAt: "<normalized>",
    cwd: "<normalized>",
  }
}

test("secondary parity report generates exactly two promoted covered rows with tracked artifact linkage", () => {
  const report = createSecondaryParityReport({ cwd: repoRoot })

  expect(report.version).toBe(1)
  expect(report.artifactPath).toBe("tests/parity/artifacts/secondary-parity-report.json")
  expect(report.manifestPaths.secondaryParity).toBe("tests/fixtures/secondary-parity-manifest.json")
  expect(report.manifestPaths.worktreeSession).toBe("tests/fixtures/worktree-session-parity-manifest.json")
  expect(report.promotedSurfaceIds).toEqual(["web-mode", "worktree-session-recovery"])
  expect(report.summary).toEqual({
    totalRows: 2,
    coveredRows: 2,
    optionalPlannedLaneCount: 3,
    releaseReadableSurfaceIds: ["web-mode", "worktree-session-recovery"],
  })

  expect(report.rows.map((row) => row.surfaceId)).toEqual(["web-mode", "worktree-session-recovery"])

  const webMode = report.rows.find((row) => row.surfaceId === "web-mode")
  expect(webMode).toBeTruthy()
  expect(webMode!.status).toBe("covered")
  expect(webMode!.reportPath).toBe("tests/parity/artifacts/secondary-parity-report.json#rows.web-mode")
  expect(webMode!.sourceManifestPath).toBe("tests/fixtures/secondary-parity-manifest.json")
  expect(webMode!.requiredLaneNames).toEqual(["secondary-parity-report", "integration:web-mode"])
  expect(webMode!.optionalLaneNames).toEqual(["repo-recording:web-mode", "installed-recording:web-mode"])
  expect(webMode!.presentFixturePaths).toContain("src/tests/integration/web-mode-cli.test.ts")
  expect(webMode!.plannedFixturePaths).toContain("tests/parity/artifacts/secondary-parity-report.json#web-mode")
  expect(webMode!.failureSummary.optionalLaneNamesStillPlanned).toEqual([
    "repo-recording:web-mode",
    "installed-recording:web-mode",
  ])
  expect(webMode!.failureSummary.coverageGapIds).toEqual([
    "web-parity-artifact-missing",
    "web-installed-mode-proof-missing",
  ])
  expect(webMode!.failureSummary.scopedExceptionNote).toMatch(/non-blocking/i)
  expect(webMode!.lanes).toEqual([
    expect.objectContaining({
      name: "secondary-parity-report",
      requirement: "required",
      blocking: true,
      implementationStatus: "existing-proof",
      releaseReadable: true,
    }),
    expect.objectContaining({
      name: "integration:web-mode",
      requirement: "required",
      blocking: true,
      implementationStatus: "existing-proof",
      releaseReadable: false,
    }),
    expect.objectContaining({
      name: "repo-recording:web-mode",
      requirement: "optional",
      blocking: false,
      implementationStatus: "planned-proof",
    }),
    expect.objectContaining({
      name: "installed-recording:web-mode",
      requirement: "optional",
      blocking: false,
      implementationStatus: "planned-proof",
    }),
  ])

  const worktree = report.rows.find((row) => row.surfaceId === "worktree-session-recovery")
  expect(worktree).toBeTruthy()
  expect(worktree!.status).toBe("covered")
  expect(worktree!.reportPath).toBe("tests/parity/artifacts/secondary-parity-report.json#rows.worktree-session-recovery")
  expect(worktree!.sourceManifestPath).toBe("tests/fixtures/worktree-session-parity-manifest.json")
  expect(worktree!.requiredLaneNames).toEqual([
    "secondary-parity-report:worktree-session-recovery",
    "integration:session-recovery",
  ])
  expect(worktree!.optionalLaneNames).toEqual(["installed-recording:worktree-session-recovery"])
  expect(worktree!.presentFixturePaths).toContain("src/tests/integration/web-session-parity-contract.test.ts")
  expect(worktree!.plannedFixturePaths).toContain("tests/fixtures/recordings/secondary-worktree-session-recovery.json")
  expect(worktree!.artifactPaths).toContain("tests/fixtures/worktree-session-parity-manifest.json")
  expect(worktree!.failureSummary.optionalLaneNamesStillPlanned).toEqual([
    "installed-recording:worktree-session-recovery",
  ])
  expect(worktree!.failureSummary.coverageGapIds).toEqual([
    "worktree-parity-artifact-missing",
    "worktree-installed-proof-missing",
  ])
})

test("checked-in secondary parity artifact matches the generated report except for runtime metadata", () => {
  const generated = createSecondaryParityReport({ cwd: repoRoot })
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as SecondaryParityReport

  expect(artifact.generatedAt).toMatch(/T.*Z$/)
  expect(normalize(artifact)).toEqual(normalize(generated))
})

test("secondary parity report negative contracts fail with path-bearing diagnostics", () => {
  const manifest = loadSecondaryParityManifest(SECONDARY_PARITY_MANIFEST_PATH, repoRoot)
  const worktreeManifest = loadWorktreeSessionManifest(WORKTREE_SESSION_MANIFEST_PATH, repoRoot)

  expect(() =>
    createSecondaryParityReport({ cwd: repoRoot, worktreeManifestPath: "tests/fixtures/does-not-exist.json" }),
  ).toThrow(/Missing tracked JSON artifact at tests\/fixtures\/does-not-exist.json/)

  expect(() =>
    createSecondaryParityReportFromInputs({
      cwd: repoRoot,
      artifactPath: "tests/parity/artifacts/secondary-parity-report.json",
      manifestPath: SECONDARY_PARITY_MANIFEST_PATH,
      worktreeManifestPath: WORKTREE_SESSION_MANIFEST_PATH,
      manifest: {
        ...manifest,
        surfaces: manifest.surfaces.filter((surface) => surface.id !== "worktree-session-recovery"),
      },
      worktreeManifest,
    }),
  ).toThrow(/Invalid secondary parity manifest at tests\/fixtures\/secondary-parity-manifest.json: missing surface worktree-session-recovery/)

  expect(() =>
    createSecondaryParityReportFromInputs({
      cwd: repoRoot,
      artifactPath: "tests/parity/artifacts/secondary-parity-report.json",
      manifestPath: SECONDARY_PARITY_MANIFEST_PATH,
      worktreeManifestPath: WORKTREE_SESSION_MANIFEST_PATH,
      manifest: {
        ...manifest,
        surfaces: manifest.surfaces.map((surface) =>
          surface.id === "web-mode" ? { ...surface, requiredLaneNames: [] } : surface,
        ),
      },
      worktreeManifest,
    }),
  ).toThrow(/surface web-mode requiredLaneNames must not be empty/)

  expect(() =>
    createSecondaryParityReportFromInputs({
      cwd: repoRoot,
      artifactPath: "tests/parity/artifacts/secondary-parity-report.json",
      manifestPath: SECONDARY_PARITY_MANIFEST_PATH,
      worktreeManifestPath: WORKTREE_SESSION_MANIFEST_PATH,
      manifest: {
        ...manifest,
        surfaces: manifest.surfaces.map((surface) =>
          surface.id === "web-mode"
            ? {
                ...surface,
                deterministicFixtures: surface.deterministicFixtures.map((fixture) =>
                  fixture.id === "web-mode-command-contract"
                    ? { ...fixture, path: "src/tests/integration/does-not-exist.test.ts" }
                    : fixture,
                ),
              }
            : surface,
        ),
      },
      worktreeManifest,
    }),
  ).toThrow(/present fixture path does not exist: src\/tests\/integration\/does-not-exist.test.ts/)

  expect(() =>
    createSecondaryParityReportFromInputs({
      cwd: repoRoot,
      artifactPath: "tests/parity/artifacts/secondary-parity-report.json",
      manifestPath: SECONDARY_PARITY_MANIFEST_PATH,
      worktreeManifestPath: WORKTREE_SESSION_MANIFEST_PATH,
      manifest,
      worktreeManifest: {
        ...worktreeManifest,
        surfaceId: "web-mode",
      },
    }),
  ).toThrow(/Invalid worktree\/session parity manifest at tests\/fixtures\/worktree-session-parity-manifest.json: surfaceId must equal worktree-session-recovery/)
})
