import { execFileSync } from "child_process";

const overrideBinary = process.env.GSD_SMOKE_BINARY?.trim();
const binary = overrideBinary ? overrideBinary : process.execPath;
const args = overrideBinary ? ["--help"] : ["dist/loader.js", "--help"];

const output = execFileSync(binary, args, {
  encoding: "utf8",
  timeout: 30_000,
});

const lower = output.toLowerCase();

if (!lower.includes("umb")) {
  console.error(`Help output does not contain "umb": "${output}"`);
  process.exit(1);
}

if (!lower.includes("usage")) {
  console.error(`Help output does not contain "usage": "${output}"`);
  process.exit(1);
}
