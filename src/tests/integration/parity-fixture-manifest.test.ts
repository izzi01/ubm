import { test, expect } from "vitest"

const repoRoot = process.cwd()

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

test("tracked fixture manifest defines the core coding-loop contract with explicit uncovered capabilities", async () => {
  const parity = await importParityModule()
  const manifest = parity.loadParityManifest(parity.PARITY_MANIFEST_PATH, repoRoot)

  expect(manifest.fixtureId).toBe("parity-web-task")
  expect(manifest.title).toMatch(/web-task/i)
  expect(manifest.capabilities.map((capability: { name: string }) => capability.name)).toEqual([
    "inspect-repository-context",
    "edit-application-code",
    "run-targeted-tests",
    "manage-dev-server-lifecycle",
    "verify-browser-behavior",
  ])

  for (const capability of manifest.capabilities) {
    expect(capability.proof).toBe("uncovered")
    expect(capability.observableCompletionCriteria.length).toBeGreaterThan(0)
    expect(Object.keys(capability.laneCoverage).length).toBe(parity.BASELINE_LANES.length)
    expect(capability.laneCoverage[parity.REPO_MODE_LANE_NAME]).toBe("covered")
    expect(capability.laneCoverage["pack-install"]).toBe("covered")
  }
})

test("baseline report surfaces uncovered coding-loop capability rows instead of over-claiming parity", { timeout: 60000 }, async () => {
  const parity = await importParityModule()
  const report = await parity.createBaselineReport({
    cwd: repoRoot,
    env: {
      ...process.env,
      GSD_LIVE_TESTS: "0",
    },
  })

  expect(report.parityManifest.fixtureId).toBe("parity-web-task")
  expect(report.uncoveredCapabilities.length).toBe(5)
  expect(report.summary.uncoveredCapabilityNames).toEqual([
    "inspect-repository-context",
    "edit-application-code",
    "run-targeted-tests",
    "manage-dev-server-lifecycle",
    "verify-browser-behavior",
  ])
  expect(report.summary.provesCodingLoop).toBe(true)
  expect(report.summary.verdict).toBe("partial")

  const browserVerification = report.uncoveredCapabilities.find(
    (capability: { capabilityName: string }) => capability.capabilityName === "verify-browser-behavior",
  )
  expect(browserVerification).toBeTruthy()
  expect(browserVerification?.uncovered).toBe(true)
  expect(browserVerification?.coveringLaneNames).toContain(parity.REPO_MODE_LANE_NAME)
  expect(browserVerification?.coveringLaneNames).toContain("pack-install")
  expect(browserVerification?.uncoveredLaneNames).toContain("fixtures-runner")
  expect(browserVerification?.uncoveredLaneNames).toContain("live-regression-runner")
  expect(browserVerification?.currentGap ?? "").toMatch(/remaining parity gaps stay in|remaining gaps|broader parity gaps remain in/i)
})

test("manifest validation fails fast for missing required capability mappings", async () => {
  const parity = await importParityModule()

  expect(() =>
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
  ).toThrow(/missing required mapping for fixtures-runner/i)
})

test("manifest validation rejects unknown proof labels and unknown lane coverage statuses", async () => {
  const parity = await importParityModule()

  expect(() =>
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
  ).toThrow(/proof must be one of covered, uncovered/i)

  expect(() =>
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
  ).toThrow(/laneCoverage\.smoke-runner must be one of covered, partial, not-covered/i)
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

  expect(() => parity.buildUncoveredCapabilityRows(manifest)).toThrow(/marked covered but still has uncovered lanes/i)
})
