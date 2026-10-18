import { describe, expect, test } from "bun:test";
import { approvalState } from "../src/lib/nudge-approval";
describe("reminder approval eligibility", () => {
  const now = Date.parse("2026-10-18T10:27:00Z");
  test("missing approval cannot send", () => expect(approvalState(null, now)).toBe("missing"));
  test("pending unexpired approval can be confirmed", () => expect(approvalState({ status: "pending", expires_at: "2026-10-19T10:27:00Z" }, now)).toBe("pending"));
  test("no reply by expiry prevents sending", () => expect(approvalState({ status: "pending", expires_at: "2026-10-18T10:27:00Z" }, now)).toBe("expired"));
  test("already confirmed approval cannot send twice", () => expect(approvalState({ status: "confirmed", expires_at: "2026-10-19T10:27:00Z" }, now)).toBe("handled"));
});