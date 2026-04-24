import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join, normalize } from "node:path"

const repoRoot = process.cwd()
const fixtureRoot = join(repoRoot, "tests", "fixtures", "web-mode-parity-fixture")
const manifestPath = join(repoRoot, "tests", "fixtures", "web-mode-parity-manifest.json")

const expectedFixtureFiles = [
  "TASK.md",
  "package.json",
  "dev-root/alpha-app/package.json",
  "dev-root/alpha-app/.gsd/milestones/M101/M101-ROADMAP.md",
  "dev-root/alpha-app/.gsd/milestones/M101/slices/S01/S01-PLAN.md",
  "dev-root/alpha-app/.gsd/milestones/M101/slices/S01/tasks/T01-PLAN.md",
  "dev-root/beta-app/package.json",
  "dev-root/beta-app/.gsd/milestones/M202/M202-ROADMAP.md",
  "dev-root/beta-app/.gsd/milestones/M202/slices/S03/S03-PLAN.md",
  "dev-root/beta-app/.gsd/milestones/M202/slices/S03/tasks/T02-PLAN.md",
] as const

type BrowserObservable = {
  selector: string
  purpose: string
  expectedAtStartup: string
  expectedAfterSwitch: string
}

type ProjectDiscoveryExpectation = {
  name: string
  kind: string
  signals: string[]
}

type WebModeFixtureManifest = {
  version: number
  fixtureId: string
  title: string
  devRoot: string
  startupProject: {
    id: string
    path: string
    expectedScope: string
  }
  switchProject: {
    id: string
    path: string
    expectedScope: string
  }
  browserObservables: BrowserObservable[]
  expectedProjectDiscovery: ProjectDiscoveryExpectation[]
  expectedStartupDiagnostics: string[]
  notes: string[]
}

function loadManifest(): WebModeFixtureManifest {
  return JSON.parse(readFileSync(manifestPath, "utf8")) as WebModeFixtureManifest
}

function assertTrackedFixtureLayout(): void {
  for (const relativePath of expectedFixtureFiles) {
    const absolutePath = join(fixtureRoot, relativePath)
    assert.ok(existsSync(absolutePath), `Missing web-mode fixture file: ${relativePath}`)
    assert.ok(statSync(absolutePath).isFile(), `Expected web-mode fixture path to be a file: ${relativePath}`)
  }
}

function normalizeRelativePath(value: string): string {
  return normalize(value).replace(/\\/g, "/")
}

test("web-mode parity fixture manifest locks the deterministic operator-path contract", () => {
  const manifest = loadManifest()

  assert.equal(manifest.version, 1)
  assert.equal(manifest.fixtureId, "web-mode-parity-fixture")
  assert.match(manifest.title, /web-mode/i)
  assert.equal(manifest.devRoot, "tests/fixtures/web-mode-parity-fixture/dev-root")

  assert.deepEqual(manifest.startupProject, {
    id: "alpha-app",
    path: "tests/fixtures/web-mode-parity-fixture/dev-root/alpha-app",
    expectedScope: "M101/S01/T01",
  })
  assert.deepEqual(manifest.switchProject, {
    id: "beta-app",
    path: "tests/fixtures/web-mode-parity-fixture/dev-root/beta-app",
    expectedScope: "M202/S03/T02",
  })

  assert.equal(manifest.browserObservables.length, 4)
  assert.deepEqual(
    manifest.browserObservables.map((entry) => entry.selector),
    [
      '[data-testid="workspace-project-cwd"]',
      '[data-testid="sidebar-current-scope"]',
      '[data-testid="status-bar-unit"]',
      '[data-testid="projects-panel"]',
    ],
  )
  assert.deepEqual(
    manifest.expectedProjectDiscovery.map((entry) => entry.name),
    ["alpha-app", "beta-app"],
  )
  assert.ok(manifest.expectedStartupDiagnostics.some((line) => line.includes("status=started")))
  assert.ok(manifest.expectedStartupDiagnostics.some((line) => line.includes("Ready → http://")))
  assert.ok(manifest.notes.length >= 2)
})

test("web-mode parity fixture exists entirely in tracked files and names the startup/switch projects explicitly", () => {
  assertTrackedFixtureLayout()
  const manifest = loadManifest()

  const startupAbsolute = join(repoRoot, manifest.startupProject.path)
  const switchAbsolute = join(repoRoot, manifest.switchProject.path)

  assert.ok(existsSync(startupAbsolute), `Startup project path should exist: ${manifest.startupProject.path}`)
  assert.ok(existsSync(switchAbsolute), `Switch project path should exist: ${manifest.switchProject.path}`)
  assert.notEqual(normalizeRelativePath(manifest.startupProject.path), normalizeRelativePath(manifest.switchProject.path))

  const taskBrief = readFileSync(join(fixtureRoot, "TASK.md"), "utf8")
  assert.match(taskBrief, /alpha-app/)
  assert.match(taskBrief, /beta-app/)
  assert.doesNotMatch(taskBrief, /\.gsd\//, "Task brief must not instruct consumers to read ignored repo-local planning state outside the tracked fixture")
})

test("web-mode parity fixture browser observables align with shipped selector surfaces", () => {
  const manifest = loadManifest()
  const appShellSource = readFileSync(join(repoRoot, "web", "components", "gsd", "app-shell.tsx"), "utf8")
  const sidebarSource = readFileSync(join(repoRoot, "web", "components", "gsd", "sidebar.tsx"), "utf8")
  const statusBarSource = readFileSync(join(repoRoot, "web", "components", "gsd", "status-bar.tsx"), "utf8")
  const projectsViewSource = readFileSync(join(repoRoot, "web", "components", "gsd", "projects-view.tsx"), "utf8")

  const expectedSelectorSources = new Map<string, string>([
    ['[data-testid="workspace-project-cwd"]', appShellSource],
    ['[data-testid="sidebar-current-scope"]', sidebarSource],
    ['[data-testid="status-bar-unit"]', statusBarSource],
    ['[data-testid="projects-panel"]', projectsViewSource],
  ])

  for (const observable of manifest.browserObservables) {
    const source = expectedSelectorSources.get(observable.selector)
    assert.ok(source, `No source registered for selector ${observable.selector}`)
    const dataTestId = observable.selector.match(/data-testid=\"([^\"]+)\"/)?.[1]
    assert.ok(dataTestId, `Could not extract data-testid from ${observable.selector}`)
    assert.match(source, new RegExp(`data-testid=\\"${dataTestId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\"`))
  }
})

test("web-mode parity fixture discovery contract stays deterministic and service-free", () => {
  const manifest = loadManifest()
  const fixturePackage = JSON.parse(readFileSync(join(fixtureRoot, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }

  assert.deepEqual(fixturePackage.dependencies ?? {}, {})
  assert.deepEqual(fixturePackage.devDependencies ?? {}, {})

  for (const project of manifest.expectedProjectDiscovery) {
    assert.equal(project.kind, "brownfield")
    assert.ok(project.signals.includes("hasPackageJson"))
    assert.ok(project.signals.includes("hasGsdFolder"))
  }
})

test("web-mode parity fixture task brief records startup, discovery, switch, and browser-visible success conditions", () => {
  const taskBrief = readFileSync(join(fixtureRoot, "TASK.md"), "utf8")

  assert.match(taskBrief, /Start web mode scoped to `dev-root\/alpha-app`/)
  assert.match(taskBrief, /Discover `alpha-app` and `beta-app`/)
  assert.match(taskBrief, /switching or equivalent project retargeting/i)
  assert.match(taskBrief, /data-testid="workspace-project-cwd"/)
  assert.match(taskBrief, /data-testid="sidebar-current-scope"/)
  assert.match(taskBrief, /data-testid="status-bar-unit"/)
})
