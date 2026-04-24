import { execFileSync } from "child_process";

const overrideBinary = process.env.GSD_SMOKE_BINARY?.trim();
const binary = overrideBinary ? overrideBinary : process.execPath;
const args = overrideBinary ? ["--version"] : ["dist/loader.js", "--version"];

const output = execFileSync(binary, args, {
  encoding: "utf8",
  timeout: 30_000,
}).trim();

if (!/^\d+\.\d+\.\d+/.test(output)) {
  console.error(`Version output does not match expected pattern: "${output}"`);
  process.exit(1);
}
