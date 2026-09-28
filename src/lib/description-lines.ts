export type DescLine = { marker: string | null; text: string };

// Number marker: "1." "1)" "1 -" "(1)" — not decimals like "1.5".
const LIST_RE = /^\s*(?:\(?(\d{1,2})(?:[.)]|\s*[-–:])(?!\d)|([•\-*–]))\s*(.*)$/;

/** Splits an item description into lines, detecting numbered / bulleted items
 *  (also when typed inline, e.g. "Supply: 1. Tiles 2. Grout" or "1.Tiles 2.Grout"). */
export function descriptionLines(raw?: string | null): DescLine[] {
  let text = String(raw ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  // Break inline numbering onto new lines when preceded by space or punctuation.
  text = text.replace(
    /([^\n\d])[ \t]*(?=\(?\d{1,2}(?:[.)]|\s+[-–])(?!\d)\s*[A-Za-z(])/g,
    (m, p1: string) => (/[\s:;,.]/.test(p1) || m.length > 1 ? `${p1}\n` : m),
  );
  text = text.replace(/([^\n])[ \t]+(?=•\s*\S)/g, "$1\n");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(LIST_RE);
      if (!m || !m[3]) return { marker: null, text: l };
      const marker = m[1] ? `${m[1]}.` : "•";
      return { marker, text: m[3] };
    });
}
