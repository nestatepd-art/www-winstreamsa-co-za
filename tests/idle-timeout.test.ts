import { describe, it, expect } from "vitest";
import { idleState, IDLE_LIMIT_MS } from "../src/lib/idle-timeout";

describe("idle sign-out", () => {
  const start = Date.parse("2026-11-15T10:00:00Z");
  it("limit is 15 minutes", () => {
    expect(IDLE_LIMIT_MS).toBe(15 * 60 * 1000);
  });
  it("stays signed in before 14 minutes idle", () => {
    expect(idleState(start, start + 13 * 60 * 1000)).toBe("active");
  });
  it("warns during the final minute", () => {
    expect(idleState(start, start + 14 * 60 * 1000 + 5000)).toBe("warning");
  });
  it("signs out at 15 minutes idle", () => {
    expect(idleState(start, start + 15 * 60 * 1000)).toBe("expired");
  });
});
