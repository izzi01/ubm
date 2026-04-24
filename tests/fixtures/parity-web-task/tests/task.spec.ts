import test from "node:test";
import assert from "node:assert/strict";

import { getStatusMessage } from "../src/task.ts";

test("getStatusMessage returns the completed UI copy required by TASK.md", () => {
  assert.equal(getStatusMessage(), "Build status: Complete");
});
