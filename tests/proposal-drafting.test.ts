import { describe, expect, it } from "vitest";
import { proposalDraftInput, proposalUserPrompt, proposalOutputRequirements } from "../src/lib/ai/proposal-drafting";

describe("proposal source preservation", () => {
  it("recognises the requested four-paragraph WhatsApp message without imposing proposal sections", () => {
    const brief = "DRAFT A 4 paragraph whatsapp msg to Brotherhood e-hailing association members advising of the investment arm of the association";
    expect(proposalOutputRequirements(brief)).toEqual({ communication: true, paragraphCount: 4, requiredHeadings: [] });
  });
  it("keeps proposal section requirements for an actual investment proposal", () => {
    expect(proposalOutputRequirements("Draft an investment proposal for an automated touchless carwash. Briefing via WhatsApp call.").requiredHeadings).toEqual(["## Overview", "## Scope of work"]);
  });
  it("recognises a written-out paragraph count on a saved-document revision", () => {
    expect(proposalOutputRequirements("Rewrite as a four paragraph WhatsApp message").paragraphCount).toBe(4);
  });
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