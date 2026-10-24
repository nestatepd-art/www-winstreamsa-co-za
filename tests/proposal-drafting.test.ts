import { describe, expect, it } from "vitest";
import { proposalDraftInput, proposalUserPrompt, proposalOutputRequirements, missingProposalHeadings } from "../src/lib/ai/proposal-drafting";

describe("proposal source preservation", () => {
  it("keeps a saved member notice in communication format for a tone-only revision", () => {
    const existingContent = "BROTHERHOOD E-HAILING ASSOCIATION\nNOTICE TO ALL MEMBERS: PROPOSED INVESTMENT ARM\n\nGood day, members. The briefing is on 25 Oct 2026 via WhatsApp call at 18H00.";
    expect(proposalOutputRequirements("give this draft an exciting tone", existingContent).requiredHeadings).toEqual([]);
    expect(proposalOutputRequirements("give this draft an exciting tone", existingContent).communication).toBe(true);
  });
  it("recognises a communication request separated by punctuation and line breaks", () => {
    expect(proposalOutputRequirements("Draft:\na 4 paragraph WhatsApp msg to members").requiredHeadings).toEqual([]);
  });
  it("keeps proposal requirements for tone-only edits of a saved proposal", () => {
    expect(proposalOutputRequirements("give this draft an exciting tone", "# Carwash investment\n## 1. Overview\nInvestment context\n## 2. Scope of work\nProcurement").requiredHeadings).toEqual(["## Overview", "## Scope of work"]);
  });
  it("allows an explicit conversion from a notice into a proposal", () => {
    expect(proposalOutputRequirements("Rewrite as an investment proposal", "Good day, members. Join our briefing.").communication).toBe(false);
  });
  it("accepts numbered proposal section headings without treating valid output as incomplete", () => {
    expect(missingProposalHeadings("## 1. Overview\nContext\n## 2. Scope of Work\nDeliverables", ["## Overview", "## Scope of work"])).toEqual([]);
    expect(missingProposalHeadings("## Overview\nScope of work mentioned only in prose", ["## Overview", "## Scope of work"])).toEqual(["## Scope of work"]);
  });
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