import { test } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const guidePath = join(repoRoot, "tests", "parity", "human-uat.md")
const roadmapPath = join(repoRoot, ".gsd", "milestones", "M116", "M116-ROADMAP.md")
const releaseFacingSummaryArtifactPath = "tests/parity/artifacts/release-facing-summary.json"
const releaseFacingSummarySourcePath = "tests/parity/release-facing-summary.ts"
const taskBriefPath = "tests/fixtures/parity-web-task/TASK.md"
const manifestPath = "tests/fixtures/parity-web-task-manifest.json"
const repoRecordingPath = "tests/fixtures/recordings/repo-mode-parity-web-task.json"
const installedRecordingPath = "tests/fixtures/recordings/installed-mode-parity-web-task.json"
const baselineReportPath = "tests/parity/artifacts/baseline-report.json"
const parityRunnerCommand = "node --experimental-strip-types tests/parity/run.ts --format json"
const diagnosticsCommand = "node --experimental-strip-types tests/parity/diagnostics.ts --report tests/parity/artifacts/baseline-report.json"

function readGuide(): string {
  return readFileSync(guidePath, "utf8")
}

function readRoadmap(): string {
  return readFileSync(roadmapPath, "utf8")
}

test("human-readable parity UAT guide stays anchored to tracked files, both modes, diagnostics flow, and unified milestone-summary source", () => {
  const guide = readGuide()

  assert.match(guide, /^# Human-readable parity fixture UAT/m)
  assert.match(guide, /repo mode/i)
  assert.match(guide, /installed mode/i)

  for (const trackedPath of [
    taskBriefPath,
    manifestPath,
    repoRecordingPath,
    installedRecordingPath,
    baselineReportPath,
    releaseFacingSummaryArtifactPath,
    releaseFacingSummarySourcePath,
    ".gsd/milestones/M116/M116-ROADMAP.md",
    ".gsd/milestones/M116/slices/S02/S02-SUMMARY.md",
    ".gsd/milestones/M116/slices/S03/S03-SUMMARY.md",
    ".gsd/milestones/M116/slices/S04/S04-SUMMARY.md",
    "tests/parity/diagnostics.ts",
    "tests/parity/run.ts",
  ]) {
    assert.match(
      guide,
      new RegExp(trackedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `guide should reference tracked path ${trackedPath}`,
    )
  }

  assert.match(guide, /tests\/parity\/release-gate\.ts/)
  assert.match(guide, /npm run test:parity:release-gate/)
  assert.match(guide, /npm run test:parity:release-gate:live/)
  assert.match(guide, /--include-live/)
  assert.match(guide, /optionalLive\.includeLiveRequested/)
  assert.match(guide, /optionalLive\.skipReason/)
  assert.match(guide, /not-enabled/)
  assert.match(guide, /no-provider-configured/)
  assert.match(guide, /OPENAI_API_KEY/)
  assert.match(guide, /ANTHROPIC_API_KEY/)

  assert.match(guide, /repo-mode-coding-loop/)
  assert.match(guide, /pack-install/)
  assert.match(guide, /repoInstalledComparison/)
  assert.match(guide, /artifactPath/)
  assert.match(guide, /failedPhase/)
  assert.match(guide, /phaseResults/)
  assert.match(guide, /Build status: Complete/)
  assert.match(guide, /npm test/)
  assert.match(guide, /npm run dev/)
  assert.match(guide, /#status-message/)
  assert.match(guide, /inspect/)
  assert.match(guide, /edit/)
  assert.match(guide, /test/)
  assert.match(guide, /dev-server/)
  assert.match(guide, /browser/)
  assert.match(guide, /milestoneSummaryInput\.authoritativeSource/)
  assert.match(guide, /milestoneSummaryInput\.whatUmbProvesNow/)
  assert.match(guide, /milestoneSummaryInput\.whatRemainsOptional/)
  assert.match(guide, /milestoneSummaryInput\.whatRemainsOutOfScope/)
  assert.match(guide, /baselineExplanation/)
  assert.match(guide, /whyPartialIsTruthful/)
  assert.match(guide, /final milestone completion summary quoting the same unified fields/i)
  assert.match(guide, /Which mode failed\?/) 
  assert.match(guide, /Which phase failed\?/) 
  assert.match(guide, /Where is the artifact that recorded the failure\?/) 
  assert.match(guide, /Which command snippet or browser assertion explains the divergence\?/) 

  assert.match(guide, new RegExp(parityRunnerCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(guide, new RegExp(diagnosticsCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("roadmap milestone-complete section names the unified release-facing summary as the source for milestone wording", () => {
  const roadmap = readRoadmap()

  assert.match(roadmap, /### S05 → milestone-complete/)
  assert.match(roadmap, /tests\/parity\/artifacts\/release-facing-summary\.json/)
  assert.match(roadmap, /milestoneSummaryInput\.whatUmbProvesNow/)
  assert.match(roadmap, /whatRemainsOptional/)
  assert.match(roadmap, /whatRemainsOutOfScope/)
  assert.match(roadmap, /instead of ad hoc narrative reassembly/)
})

test("human-readable parity UAT guide does not drift into placeholder language or untracked operator instructions", () => {
  const guide = readGuide()

  assert.doesNotMatch(guide, /TODO|TBD|placeholder|coming soon|fill this in later/i)
  assert.doesNotMatch(guide, /<insert|<todo|lorem ipsum/i)
  assert.doesNotMatch(guide, /ask .* engineer|contact support|check internal dashboard/i)
  assert.doesNotMatch(guide, /copy .* into .* notes app/i)
})
