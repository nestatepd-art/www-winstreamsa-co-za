export const UNITS = ["EA", "HR", "DAY", "M", "M2", "M3", "KG", "L", "SET", "LOT", "LS"] as const;

export function unitLabel(u?: string | null) {
  const v = (u || "EA").toUpperCase();
  if (v === "M2") return "m²";
  if (v === "M3") return "m³";
  if (v === "M") return "m";
  return v;
}

export function UnitSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Unit of measure"
      value={value || "EA"}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {UNITS.map((u) => (
        <option key={u} value={u}>{unitLabel(u)}</option>
      ))}
    </select>
  );
}
