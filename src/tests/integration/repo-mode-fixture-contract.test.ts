import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const fixtureRoot = join(repoRoot, "tests", "fixtures", "parity-web-task")
const expectedFixtureFiles = [
  "TASK.md",
  "index.html",
  "package.json",
  "src/main.ts",
  "src/task.ts",
  "tests/task.spec.ts",
] as const

function createMaterializedFixture(label: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), `umb-parity-web-task-${label}-`))
  const target = join(tempDir, "parity-web-task")
  cpSync(fixtureRoot, target, { recursive: true, errorOnExist: false })
  return target
}

function readFixturePackageJson(cwd: string): { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
}

function assertFixtureLayout(cwd: string): void {
  for (const relativePath of expectedFixtureFiles) {
    const absolutePath = join(cwd, relativePath)
    assert.ok(existsSync(absolutePath), `Missing fixture file: ${relativePath} (materialized at ${cwd})`)
  }
}

function assertFixtureScripts(cwd: string): void {
  const pkg = readFixturePackageJson(cwd)
  assert.equal(typeof pkg.scripts?.test, "string", `Missing fixture script: test (materialized at ${cwd})`)
  assert.equal(typeof pkg.scripts?.dev, "string", `Missing fixture script: dev (materialized at ${cwd})`)

  assert.match(pkg.scripts!.test!, /tests\/task\.spec\.ts/, `Fixture test script must target tests/task.spec.ts (materialized at ${cwd})`)
  assert.match(pkg.scripts!.dev!, /console\.log\('READY http:\/\/' \+ host \+ ':' \+ port\)/, `Fixture dev script must emit a READY URL (materialized at ${cwd})`)

  const declaredDependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  }
  for (const dependencyName of Object.keys(declaredDependencies)) {
    assert.fail(`Fixture should stay dependency-light; unexpected declared dependency ${dependencyName} (materialized at ${cwd})`)
  }
}

function verifyTrackedInputsOnly(cwd: string): void {
  const packageStat = statSync(join(cwd, "package.json"))
  assert.ok(packageStat.isFile(), `Expected package.json to materialize as a file (materialized at ${cwd})`)

  const taskBrief = readFileSync(join(cwd, "TASK.md"), "utf8")
  assert.match(taskBrief, /src\/task\.ts/, `Task brief must point at tracked app source (materialized at ${cwd})`)
  assert.match(taskBrief, /src\/main\.ts/, `Task brief must point at tracked render code (materialized at ${cwd})`)
  assert.match(taskBrief, /tests\/task\.spec\.ts/, `Task brief must point at the tracked test file (materialized at ${cwd})`)
  assert.doesNotMatch(taskBrief, /\.gsd\//, `Task brief must not rely on ignored local-only files (materialized at ${cwd})`)
}

function runFixtureNode(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd,
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout, stderr: "", status: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      status: error.status ?? 1,
    }
  }
}

function runFixtureTest(cwd: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync("npm", ["test"], {
      cwd,
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 1500,
      maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout, stderr: "", status: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      status: error.status ?? 1,
    }
  }
}

function runFixtureDev(cwd: string) {
  const pkg = readFixturePackageJson(cwd)
  const devScript = pkg.scripts?.dev
  assert.equal(typeof devScript, "string", `Missing fixture script: dev (materialized at ${cwd})`)
  return runFixtureNode(["--input-type=module", "-e", `await import(\"node:child_process\").then(({ execFileSync }) => execFileSync(\"npm\", [\"run\", \"dev\"], { cwd: ${JSON.stringify(cwd)}, stdio: \"pipe\", encoding: \"utf8\", timeout: 1500 }))`], cwd)
}

test("parity web-task fixture materializes with the tracked app files and deterministic scripts", () => {
  const cwd = createMaterializedFixture("layout")

  try {
    assertFixtureLayout(cwd)
    assertFixtureScripts(cwd)
    verifyTrackedInputsOnly(cwd)
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})

test("parity web-task fixture starts red so the required application edit is real", () => {
  const cwd = createMaterializedFixture("red-state")

  try {
    const taskSource = readFileSync(join(cwd, "src", "task.ts"), "utf8")
    assert.match(taskSource, /In progress/, `Initial app source should still be in the pre-fix state (materialized at ${cwd})`)
    assert.doesNotMatch(taskSource, /Build status: Complete/, `Initial app source must not already satisfy the task (materialized at ${cwd})`)

    const specSource = readFileSync(join(cwd, "tests", "task.spec.ts"), "utf8")
    assert.match(specSource, /Build status: Complete/, `Fixture test should lock the completed UI copy (materialized at ${cwd})`)
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})

test("parity web-task contract names the missing file when the task brief is absent", () => {
  const cwd = createMaterializedFixture("missing-task-brief")

  try {
    rmSync(join(cwd, "TASK.md"), { force: true })
    assert.throws(() => assertFixtureLayout(cwd), /Missing fixture file: TASK\.md/) 
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})

test("parity web-task contract names the missing script when the test script is absent", () => {
  const cwd = createMaterializedFixture("missing-test-script")

  try {
    const packageJsonPath = join(cwd, "package.json")
    const pkg = readFixturePackageJson(cwd)
    delete pkg.scripts?.test
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8")

    assert.throws(() => assertFixtureScripts(cwd), /Missing fixture script: test/) 
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})

test("parity web-task contract rejects a non-runnable dev script with the materialized path", () => {
  const cwd = createMaterializedFixture("broken-dev-script")

  try {
    const packageJsonPath = join(cwd, "package.json")
    const pkg = readFixturePackageJson(cwd)
    pkg.scripts = {
      ...pkg.scripts,
      dev: "process.exit(",
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8")

    const result = runFixtureDev(cwd)
    assert.notEqual(result.status, 0, `Broken dev script should fail before parity execution (materialized at ${cwd})`)
    assert.match(result.stderr || result.stdout, /Unexpected eof|SyntaxError|missing\) after argument list|syntax error near unexpected token/i, `Broken dev script should surface a runnable parse failure (materialized at ${cwd})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})

test("parity web-task contract surfaces malformed materialization paths directly", () => {
  const malformedCwd = join(tmpdir(), "umb-parity-does-not-exist", "fixture")

  assert.throws(() => assertFixtureLayout(malformedCwd), new RegExp(`Missing fixture file: TASK\\.md \\(materialized at ${malformedCwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`))
})

test("parity web-task contract fails fast when unexpected dependencies are declared", () => {
  const cwd = createMaterializedFixture("unexpected-dependency")

  try {
    const packageJsonPath = join(cwd, "package.json")
    const pkg = readFixturePackageJson(cwd)
    pkg.devDependencies = {
      ...(pkg.devDependencies ?? {}),
      vitest: "^4.1.4",
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8")

    assert.throws(() => assertFixtureScripts(cwd), /unexpected declared dependency vitest/i)
  } finally {
    rmSync(join(cwd, ".."), { recursive: true, force: true })
  }
})
