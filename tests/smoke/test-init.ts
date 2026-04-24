import { execFileSync } from "child_process";
import { existsSync } from "fs";

const overrideBinary = process.env.GSD_SMOKE_BINARY?.trim();
const binary = overrideBinary ? overrideBinary : process.execPath;
const args = overrideBinary ? ["--help"] : ["dist/loader.js", "--help"];

const output = execFileSync(binary, args, {
  encoding: "utf8",
  timeout: 30_000,
  env: { ...process.env, GSD_NON_INTERACTIVE: "1" },
});

const lower = output.toLowerCase();

if (!lower.includes("headless [cmd] [args]")) {
  console.error(`Top-level help does not advertise the supported non-interactive headless command: "${output}"`);
  process.exit(1);
}

if (!lower.includes("run commands without tui")) {
  console.error(`Top-level help does not describe the supported non-interactive headless path: "${output}"`);
  process.exit(1);
}

if (!overrideBinary && !existsSync("dist/loader.js")) {
  console.error("dist/loader.js is required for default smoke execution");
  process.exit(1);
}
