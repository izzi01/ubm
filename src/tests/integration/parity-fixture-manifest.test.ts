import test from "node:test"
import assert from "node:assert/strict"

const repoRoot = process.cwd()

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

test("tracked fixture manifest defines the core coding-loop contract with explicit uncovered capabilities", async () => {
  const parity = await importParityModule()
  const manifest = parity.loadParityManifest(parity.PARITY_MANIFEST_PATH, repoRoot)

  assert.equal(manifest.fixtureId, "parity-web-task")
  assert.match(manifest.title, /small web-task/i)
  assert.deepEqual(
    manifest.capabilities.map((capability: { name: string }) => capability.name),
    [
      "inspect-repository-context",
      "edit-application-code",
      "run-targeted-tests",
      "manage-dev-server-lifecycle",
      "verify-browser-behavior",
    ],
  )

  for (const capability of manifest.capabilities) {
    assert.equal(capability.proof, "uncovered")
    assert.ok(capability.observableCompletionCriteria.length > 0)
    assert.equal(Object.keys(capability.laneCoverage).length, parity.BASELINE_LANES.length)
  }
})

test("baseline report surfaces uncovered coding-loop capability rows instead of over-claiming parity", async () => {
  const parity = await importParityModule()
  const report = await parity.createBaselineReport({
    cwd: repoRoot,
    env: {
      ...process.env,
      GSD_LIVE_TESTS: "0",
    },
  })

  assert.equal(report.parityManifest.fixtureId, "parity-web-task")
  assert.equal(report.uncoveredCapabilities.length, 5)
  assert.deepEqual(report.summary.uncoveredCapabilityNames, [
    "inspect-repository-context",
    "edit-application-code",
    "run-targeted-tests",
    "manage-dev-server-lifecycle",
    "verify-browser-behavior",
  ])
  assert.equal(report.summary.provesCodingLoop, true)
  assert.equal(report.summary.verdict, "failing")

  const browserVerification = report.uncoveredCapabilities.find(
    (capability: { capabilityName: string }) => capability.capabilityName === "verify-browser-behavior",
  )
  assert.ok(browserVerification)
  assert.equal(browserVerification.uncovered, true)
  assert.ok(browserVerification.coveringLaneNames.includes("pack-install"))
  assert.ok(browserVerification.uncoveredLaneNames.includes("fixtures-runner"))
  assert.ok(browserVerification.uncoveredLaneNames.includes("live-regression-runner"))
  assert.match(browserVerification.currentGap, /remaining parity gaps stay in/i)
})

test("manifest validation fails fast for missing required capability mappings", async () => {
  const parity = await importParityModule()

  assert.throws(
    () =>
      parity.validateParityManifest(
        {
          version: 1,
          fixtureId: "parity-web-task",
          title: "Broken manifest",
          capabilities: [
            {
              name: "inspect-repository-context",
              description: "broken",
              observableCompletionCriteria: ["criterion"],
              proof: "uncovered",
              currentGap: "broken",
              laneCoverage: {
                "smoke-runner": "not-covered",
              },
            },
          ],
        },
        { manifestPath: "tests/fixtures/broken.json", lanes: parity.BASELINE_LANES },
      ),
    /missing required mapping for fixtures-runner/i,
  )
})

test("manifest validation rejects unknown proof labels and unknown lane coverage statuses", async () => {
  const parity = await importParityModule()

  assert.throws(
    () =>
      parity.validateParityManifest(
        {
          version: 1,
          fixtureId: "parity-web-task",
          title: "Broken manifest",
          capabilities: [
            {
              name: "inspect-repository-context",
              description: "broken",
              observableCompletionCriteria: ["criterion"],
              proof: "future",
              currentGap: "broken",
              laneCoverage: Object.fromEntries(parity.BASELINE_LANES.map((lane: { name: string }) => [lane.name, "not-covered"])),
            },
          ],
        },
        { manifestPath: "tests/fixtures/broken.json", lanes: parity.BASELINE_LANES },
      ),
    /proof must be one of covered, uncovered/i,
  )

  assert.throws(
    () =>
      parity.validateParityManifest(
        {
          version: 1,
          fixtureId: "parity-web-task",
          title: "Broken manifest",
          capabilities: [
            {
              name: "inspect-repository-context",
              description: "broken",
              observableCompletionCriteria: ["criterion"],
              proof: "uncovered",
              currentGap: "broken",
              laneCoverage: Object.fromEntries(
                parity.BASELINE_LANES.map((lane: { name: string }) => [lane.name, lane.name === "smoke-runner" ? "unknown" : "not-covered"]),
              ),
            },
          ],
        },
        { manifestPath: "tests/fixtures/broken.json", lanes: parity.BASELINE_LANES },
      ),
    /laneCoverage\.smoke-runner must be one of covered, partial, not-covered/i,
  )
})

test("report generation rejects a manifest that claims covered while still marking lanes as not-covered", async () => {
  const parity = await importParityModule()
  const validCoverage = Object.fromEntries(parity.BASELINE_LANES.map((lane: { name: string }) => [lane.name, "not-covered"]))

  const manifest = parity.validateParityManifest(
    {
      version: 1,
      fixtureId: "parity-web-task",
      title: "Broken manifest",
      capabilities: [
        {
          name: "inspect-repository-context",
          description: "broken",
          observableCompletionCriteria: ["criterion"],
          proof: "covered",
          currentGap: "broken",
          laneCoverage: validCoverage,
        },
      ],
    },
    { manifestPath: "tests/fixtures/broken.json", lanes: parity.BASELINE_LANES },
  )

  assert.throws(
    () => parity.buildUncoveredCapabilityRows(manifest),
    /marked covered but still has not-covered lanes/i,
  )
})
)
})
