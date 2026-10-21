import { describe, expect, it } from "vitest";
import { DRAFTING_MODEL, draftingSchema } from "../src/lib/ai/drafting";
import { proposalFilename, generateProposalPdf } from "../src/lib/proposal-pdf";

describe("modern document drafting", () => {
  it("uses a current OpenAI model across drafting outputs", () => {
    expect(DRAFTING_MODEL).toBe("openai/gpt-6-astra");
  });
  it("requires all structured notes fields", () => {
    expect(draftingSchema("quote_notes")?.required).toEqual(["intro", "terms"]);
    expect(draftingSchema("quote_notes")?.additionalProperties).toBe(false);
  });
  it("creates a PDF rather than a text attachment", async () => {
    const blob = generateProposalPdf({ title: "Roof repair", content: "## Scope of work\n- Repair roof", showBranding: true });
    expect(blob.type).toBe("application/pdf");
    expect((await blob.text()).startsWith("%PDF-")).toBe(true);
    expect(proposalFilename("Roof / repair")).toBe("Proposal-Roof-repair.pdf");
  });
});