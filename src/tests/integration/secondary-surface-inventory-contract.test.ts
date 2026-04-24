import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const artifactPath = join(repoRoot, "tests", "parity", "artifacts", "secondary-surface-inventory.json")

async function importInventoryModule() {
  return await import("../../../tests/parity/secondary-surface-inventory.ts")
}

test("secondary surface inventory artifact matches the tracked source contract", async () => {
  const inventoryModule = await importInventoryModule()
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"))
  const generated = inventoryModule.createSecondarySurfaceInventory()

  inventoryModule.validateSecondarySurfaceInventory(generated)
  assert.deepEqual(artifact, generated)
})

test("secondary surface inventory stays scoped to the four planned secondary parity surfaces", async () => {
  const inventoryModule = await importInventoryModule()
  const inventory = inventoryModule.createSecondarySurfaceInventory()

  assert.equal(inventory.version, 1)
  assert.equal(inventory.summary.totalSurfaces, 4)
  assert.equal(inventory.summary.partialSurfaces, 4)
  assert.equal(inventory.summary.coveredSurfaces, 0)
  assert.equal(inventory.summary.uncoveredSurfaces, 0)
  assert.deepEqual(
    inventory.surfaces.map((surface: { id: string }) => surface.id),
    ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"],
  )

  for (const surface of inventory.surfaces) {
    assert.equal(surface.status, "partial", `${surface.id} should remain truthful about partial parity closure`)
    assert.ok(surface.scopeBoundary.length > 0)
    assert.ok(surface.alreadyCoveredBy.length > 0)
    assert.ok(surface.uncoveredAreas.length > 0)
    assert.ok(surface.plannedProofLanes.includes("secondary-parity-report"))
  }
})

test("secondary surface inventory cites tracked evidence paths for each surface", async () => {
  const inventoryModule = await importInventoryModule()
  const inventory = inventoryModule.createSecondarySurfaceInventory()

  const expectedEvidenceBySurface = new Map<string, string[]>([
    [
      "web-mode",
      [
        "src/tests/integration/web-mode-cli.test.ts",
        "src/tests/integration/web-mode-onboarding.test.ts",
        "src/tests/integration/web-session-parity-contract.test.ts",
        "src/tests/integration/web-state-surfaces-contract.test.ts",
      ],
    ],
    [
      "mcp",
      [
        "src/mcp-server.ts",
        "src/tests/mcp-server.test.ts",
        "src/tests/mcp-client-schema.test.ts",
        "src/tests/package-mcp-server-elicitation.test.ts",
      ],
    ],
    [
      "workflow-bmad",
      [
        "src/tests/integration/web-workflow-controls-contract.test.ts",
        "src/tests/integration/web-workflow-action-execution.test.ts",
        "src/tests/integration/web-command-parity-contract.test.ts",
        "src/resources/skills/create-skill/workflows/create-new-skill.md",
      ],
    ],
    [
      "worktree-session-recovery",
      [
        "src/help-text.ts",
        "src/headless.ts",
        "src/tests/integration/e2e-headless.test.ts",
        "src/tests/integration/web-recovery-diagnostics-contract.test.ts",
        "src/tests/integration/web-session-parity-contract.test.ts",
      ],
    ],
  ])

  for (const surface of inventory.surfaces) {
    const expectedPaths = expectedEvidenceBySurface.get(surface.id)
    assert.ok(expectedPaths, `missing expected evidence fixture for ${surface.id}`)
    assert.deepEqual(
      surface.alreadyCoveredBy.map((entry: { path: string }) => entry.path),
      expectedPaths,
    )
  }
})

test("secondary surface inventory records the expected rebrand drift bands and severity counts", async () => {
  const inventoryModule = await importInventoryModule()
  const inventory = inventoryModule.createSecondarySurfaceInventory()

  assert.equal(inventory.summary.totalDriftFindings, 12)
  assert.deepEqual(inventory.summary.severityCounts, {
    high: 7,
    medium: 4,
    low: 1,
  })

  const driftIds = inventory.rebrandDrift.map((finding: { id: string }) => finding.id)
  assert.deepEqual(driftIds, [
    "drift-cli-warning-prefix",
    "drift-cli-noninteractive-guidance",
    "drift-cli-web-guidance",
    "drift-worktree-usage-merge",
    "drift-worktree-usage-remove",
    "drift-mcp-startup-prefix",
    "drift-web-startup-prefix",
    "drift-package-docker-image",
    "drift-web-subprocess-comment",
    "drift-live-regression-install-comment",
    "drift-docker-template-test",
    "drift-packaged-web-test-fixtures",
  ])

  const highSeverityRuntime = inventory.rebrandDrift.filter(
    (finding: { severity: string; kind: string }) => finding.severity === "high" && finding.kind === "runtime-diagnostic",
  )
  assert.ok(highSeverityRuntime.length >= 6, "expected the main drift band to stay focused on user-visible runtime diagnostics")

  const paths = inventory.rebrandDrift.map((finding: { path: string }) => finding.path)
  assert.ok(paths.includes("src/cli.ts"))
  assert.ok(paths.includes("src/worktree-cli.ts"))
  assert.ok(paths.includes("src/mcp-server.ts"))
  assert.ok(paths.includes("src/web-mode.ts"))
  assert.ok(paths.includes("package.json"))
})

test("secondary surface inventory validation rejects summary drift and unknown surface references", async () => {
  const inventoryModule = await importInventoryModule()
  const inventory = inventoryModule.createSecondarySurfaceInventory()

  assert.throws(() => {
    inventoryModule.validateSecondarySurfaceInventory({
      ...inventory,
      summary: {
        ...inventory.summary,
        totalDriftFindings: inventory.summary.totalDriftFindings + 1,
      },
    })
  }, /totalDriftFindings does not match/i)

  assert.throws(() => {
    inventoryModule.validateSecondarySurfaceInventory({
      ...inventory,
      rebrandDrift: [
        {
          ...inventory.rebrandDrift[0],
          id: "bad-surface-ref",
          surfaceId: "does-not-exist",
        },
      ],
    })
  }, /unknown surface/i)
})
