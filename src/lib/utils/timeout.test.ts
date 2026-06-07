import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withTimeout } from "./timeout";

describe("withTimeout", () => {
  it("returns the promise value when it resolves before the timeout", async () => {
    assert.equal(await withTimeout(Promise.resolve("ok"), 50, "fallback", "fast task"), "ok");
  });

  it("returns the fallback when the promise exceeds the timeout", async () => {
    const originalWarn = console.warn;
    const warnings: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    try {
      assert.equal(
        await withTimeout(new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50)), 1, "fallback", "slow task"),
        "fallback"
      );
      assert.deepEqual(warnings, [["slow task timed out after 1ms; using fallback."]]);
    } finally {
      console.warn = originalWarn;
    }
  });
});
