import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const manifestPath = join(repoRoot, "tests", "fixtures", "secondary-parity-manifest.json")

async function importSecondaryParityModule() {
  return await import("../../../tests/parity/secondary-lanes.ts")
}

test("secondary parity manifest artifact matches the tracked lane-definition contract", async () => {
  const secondaryParity = await importSecondaryParityModule()
  const artifact = JSON.parse(readFileSync(manifestPath, "utf8"))
  const generated = secondaryParity.createSecondaryParityManifest()

  secondaryParity.validateSecondaryParityManifest(generated, { manifestPath: secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, cwd: repoRoot })
  assert.deepEqual(artifact, generated)
})

test("secondary parity manifest locks the planned surfaces, lane counts, and proof-class taxonomy", async () => {
  const secondaryParity = await importSecondaryParityModule()
  const manifest = secondaryParity.loadSecondaryParityManifest(secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, repoRoot)

  assert.equal(manifest.version, 1)
  assert.equal(manifest.inventoryVersion, 1)
  assert.deepEqual(
    manifest.proofClasses.map((entry: { name: string }) => entry.name),
    ["report-contract", "integration-contract", "unit-contract", "repo-recording", "installed-recording"],
  )
  assert.deepEqual(
    manifest.surfaces.map((surface: { id: string }) => surface.id),
    ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"],
  )
  assert.equal(manifest.summary.totalSurfaces, 4)
  assert.equal(manifest.summary.totalLanes, 13)
  assert.equal(manifest.summary.requiredLanes, 8)
  assert.equal(manifest.summary.optionalLanes, 5)
  assert.equal(manifest.summary.presentFixtures, 8)
  assert.equal(manifest.summary.plannedFixtures, 4)
  assert.equal(manifest.summary.partialSurfaces, 4)
  assert.equal(manifest.summary.uncoveredSurfaces, 0)
  assert.equal(manifest.summary.coveredSurfaces, 0)
})

test("secondary parity manifest ties each surface to required existing proof plus missing release-readable planned proof", async () => {
  const secondaryParity = await importSecondaryParityModule()
  const manifest = secondaryParity.loadSecondaryParityManifest(secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, repoRoot)

  const expectedSurfaceContracts = new Map<string, { required: string[]; optional: string[]; presentFixturePath: string; plannedFixturePath: string }>([
    [
      "web-mode",
      {
        required: ["secondary-parity-report", "integration:web-mode"],
        optional: ["repo-recording:web-mode", "installed-recording:web-mode"],
        presentFixturePath: "src/tests/integration/web-mode-cli.test.ts",
        plannedFixturePath: "tests/parity/artifacts/secondary-parity-report.json#web-mode",
      },
    ],
    [
      "mcp",
      {
        required: ["secondary-parity-report:mcp", "unit:mcp"],
        optional: ["integration:mcp-session"],
        presentFixturePath: "src/tests/mcp-client-schema.test.ts",
        plannedFixturePath: "tests/fixtures/recordings/secondary-mcp-session.json",
      },
    ],
    [
      "workflow-bmad",
      {
        required: ["secondary-parity-report:workflow-bmad", "integration:workflow-contracts"],
        optional: ["repo-recording:workflow-bmad"],
        presentFixturePath: "src/tests/integration/web-workflow-action-execution.test.ts",
        plannedFixturePath: "tests/fixtures/secondary-workflow-bmad-manifest.json",
      },
    ],
    [
      "worktree-session-recovery",
      {
        required: ["secondary-parity-report:worktree-session-recovery", "integration:session-recovery"],
        optional: ["installed-recording:worktree-session-recovery"],
        presentFixturePath: "src/tests/integration/web-session-parity-contract.test.ts",
        plannedFixturePath: "tests/fixtures/recordings/secondary-worktree-session-recovery.json",
      },
    ],
  ])

  for (const surface of manifest.surfaces) {
    const expected = expectedSurfaceContracts.get(surface.id)
    assert.ok(expected, `missing expected contract expectations for ${surface.id}`)
    assert.equal(surface.inventoryStatus, "partial")
    assert.deepEqual(surface.requiredLaneNames, expected.required)
    assert.deepEqual(surface.optionalLaneNames, expected.optional)
    assert.ok(surface.coverageGaps.length > 0)

    const fixturePaths = surface.deterministicFixtures.map((fixture: { path: string }) => fixture.path)
    assert.ok(fixturePaths.includes("tests/parity/artifacts/secondary-surface-inventory.json"))
    assert.ok(fixturePaths.includes(expected.presentFixturePath))
    assert.ok(fixturePaths.includes(expected.plannedFixturePath))

    const requiredLaneDefinitions = surface.requiredLaneNames.map((name: string) =>
      manifest.lanes.find((lane: { name: string }) => lane.name === name),
    )
    assert.ok(requiredLaneDefinitions.every(Boolean), `every required lane should be defined for ${surface.id}`)
    assert.ok(
      requiredLaneDefinitions.some((lane: { implementationStatus: string } | undefined) => lane?.implementationStatus === "existing-proof"),
      `${surface.id} should retain at least one existing required proof lane`,
    )
    assert.ok(
      requiredLaneDefinitions.some((lane: { implementationStatus: string } | undefined) => lane?.implementationStatus === "planned-proof"),
      `${surface.id} should retain at least one planned required proof lane to justify partial status`,
    )
  }
})

test("secondary parity manifest preserves explicit uncovered-surface semantics for partial versus covered claims", async () => {
  const secondaryParity = await importSecondaryParityModule()
  const manifest = secondaryParity.loadSecondaryParityManifest(secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, repoRoot)

  assert.match(manifest.uncoveredSurfaceSemantics.partial, /missing at least one required planned-proof lane or planned deterministic fixture/i)
  assert.match(manifest.uncoveredSurfaceSemantics.uncovered, /no currently implemented required proof lane/i)
  assert.match(manifest.uncoveredSurfaceSemantics.covered, /every required lane is already implemented/i)

  assert.throws(() => {
    const mutatedLanes = manifest.lanes.map((lane: any) =>
      lane.name === "secondary-parity-report"
        ? { ...lane, implementationStatus: "existing-proof" }
        : lane,
    )
    const mutatedManifest = {
      ...manifest,
      lanes: mutatedLanes,
      surfaces: manifest.surfaces.map((surface: any) =>
        surface.id === "web-mode"
          ? {
              ...surface,
              deterministicFixtures: surface.deterministicFixtures.filter((fixture: any) => fixture.status !== "planned"),
            }
          : surface,
      ),
    }

    secondaryParity.validateSecondaryParityManifest(
      {
        ...mutatedManifest,
        summary: {
          ...mutatedManifest.summary,
          plannedFixtures: mutatedManifest.surfaces
            .flatMap((surface: any) => surface.deterministicFixtures)
            .filter((fixture: any) => fixture.status === "planned").length,
        },
      },
      { manifestPath: secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, cwd: repoRoot },
    )
  }, /partial surfaces must still be missing a required planned-proof lane or planned deterministic fixture/i)

  assert.throws(() => {
    secondaryParity.validateSecondaryParityManifest(
      {
        ...manifest,
        summary: {
          ...manifest.summary,
          totalLanes: manifest.summary.totalLanes + 1,
        },
      },
      { manifestPath: secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, cwd: repoRoot },
    )
  }, /summary\.totalLanes must equal/i)
})

test("secondary parity manifest rejects missing present fixture paths and unknown lane references", async () => {
  const secondaryParity = await importSecondaryParityModule()
  const manifest = secondaryParity.loadSecondaryParityManifest(secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, repoRoot)

  assert.throws(() => {
    secondaryParity.validateSecondaryParityManifest(
      {
        ...manifest,
        surfaces: manifest.surfaces.map((surface: any) =>
          surface.id === "mcp"
            ? {
                ...surface,
                deterministicFixtures: surface.deterministicFixtures.map((fixture: any) =>
                  fixture.id === "mcp-schema-contract"
                    ? { ...fixture, path: "src/tests/does-not-exist.test.ts" }
                    : fixture,
                ),
              }
            : surface,
        ),
      },
      { manifestPath: secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, cwd: repoRoot },
    )
  }, /present fixture path does not exist/i)

  assert.throws(() => {
    secondaryParity.validateSecondaryParityManifest(
      {
        ...manifest,
        surfaces: manifest.surfaces.map((surface: any) =>
          surface.id === "workflow-bmad"
            ? {
                ...surface,
                requiredLaneNames: [...surface.requiredLaneNames, "unknown-lane"],
              }
            : surface,
        ),
      },
      { manifestPath: secondaryParity.SECONDARY_PARITY_MANIFEST_PATH, cwd: repoRoot },
    )
  }, /requiredLaneNames must reference known lanes/i)
})
