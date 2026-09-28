export type DescLine = { marker: string | null; text: string };

const LIST_RE = /^\s*((?:\d{1,2}[.)])|[•\-*–])\s+(.*)$/;

/** Splits an item description into lines, detecting numbered / bulleted items
 *  (also when they were typed inline, e.g. "Supply: 1. Tiles 2. Grout"). */
export function descriptionLines(raw?: string | null): DescLine[] {
  let text = String(raw ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  // Break inline numbering "... 2. Next" / "... • Next" onto new lines.
  text = text.replace(/([^\n])\s+(?=(?:\d{1,2}[.)]|•)\s+\S)/g, "$1\n");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(LIST_RE);
      if (!m) return { marker: null, text: l };
      const marker = /^[\-*–]$/.test(m[1]) ? "•" : m[1];
      return { marker, text: m[2] };
    });
}
