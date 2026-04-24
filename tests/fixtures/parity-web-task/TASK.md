# Parity web-task fixture

Your goal is to make the app show the completed build state.

## Required outcome

- Update the application so the browser-visible status message reads exactly `Build status: Complete`.
- Keep the change in tracked application source; do not satisfy the task by editing the test or this brief.
- Leave the fixture runnable with the existing scripts.

## Files to inspect before editing

- `src/task.ts` — contains the status message logic.
- `src/main.ts` — renders the status message into the page.
- `tests/task.spec.ts` — locks the required user-visible copy.
- `index.html` — contains the visible DOM target.

## Verification

- Run `npm test` and make it pass.
- Start the app with `npm run dev`.
- Open the ready URL printed by the dev server and verify the page shows `Build status: Complete`.
