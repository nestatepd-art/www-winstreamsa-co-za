import { describe, expect, it } from "bun:test";
import { verdictFromDns } from "../src/lib/email-deliverability.server";

describe("recipient domain deliverability", () => {
  it("blocks a domain that does not exist (e.g. zinoconsulting.co.za)", () => {
    const v = verdictFromDns("zinoconsulting.co.za", { Status: 3 }, null, null);
    expect(v.ok).toBe(false);
  });
  it("blocks a null-MX domain that refuses all mail", () => {
    const v = verdictFromDns("x.co.za", { Status: 0, Answer: [{ type: 15, data: "0 ." }] }, null, null);
    expect(v.ok).toBe(false);
  });
  it("allows a domain with a real mail server", () => {
    const v = verdictFromDns("gmail.com", { Status: 0, Answer: [{ type: 15, data: "10 alt1.gmail-smtp-in.l.google.com." }] }, null, null);
    expect(v.ok).toBe(true);
  });
  it("never blocks when the DNS lookup itself fails", () => {
    expect(verdictFromDns("any.co.za", null, null, null).ok).toBe(true);
  });
  it("blocks an existing domain with no mail server and no address", () => {
    const v = verdictFromDns("x.co.za", { Status: 0, Answer: [] }, { Status: 0, Answer: [] }, { Status: 0, Answer: [] });
    expect(v.ok).toBe(false);
  });
});
