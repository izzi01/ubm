# M103: Fork gsd-2 and rebrand to umb

## Vision
Clone the gsd-2 monorepo, strip the gsd extension, rebrand the entire CLI from 'gsd' to 'umb' (binary name, config dir ~/.umb, env vars, process title, help text), and get it building and running locally as a standalone TUI app.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | git clone succeeds, npm install completes, npm run build produces dist/ |
| S02 | S02 | medium | — | ✅ | node dist/loader.js --version prints umb version, process.title is 'umb' |
| S03 | S03 | high | — | ✅ | umb launches TUI without the gsd extension, /gsd commands are gone, core extensions (browser-tools, subagent, etc.) still load |
