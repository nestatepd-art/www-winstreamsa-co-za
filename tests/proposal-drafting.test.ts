import { describe, expect, it } from "vitest";
import { proposalDraftInput, proposalUserPrompt } from "../src/lib/ai/proposal-drafting";

describe("proposal source preservation", () => {
  it("accepts a detailed brief beyond the previous short-brief limit without truncation", () => {
    const brief = "Detailed investment context. ".repeat(200);
    const parsed = proposalDraftInput.parse({ brief });
    expect(parsed.brief).toBe(brief.trim());
    expect(proposalUserPrompt(parsed)).toContain(brief.trim());
  });
  it("keeps the supplied investment figures, dates and conditions intact", () => {
    const brief = "Brotherhood e-Hailing Association (NPC), meeting 24 May 2026. Plant R350,000 excluding shipping and installation. R50 × 100 vehicles per day; 6 days × 4 weeks. Return target 25%–50%; withdrawal after 12 months.";
    expect(proposalUserPrompt(proposalDraftInput.parse({ brief }))).toContain(brief);
  });
  it("retains the full saved proposal when requesting a revision", () => {
    const existingContent = "# Investment\n" + "Approved factual detail. ".repeat(500);
    const parsed = proposalDraftInput.parse({ brief: "Expand risks and governance", existingContent });
    expect(proposalUserPrompt(parsed)).toContain(existingContent);
  });
});