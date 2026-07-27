import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Phone, Tap } from "../components/Phone";
import { Caption } from "../components/Caption";

export const SceneInvoice = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [80, 0]);

  // Timeline (450 frames = 15s):
  // 0-40 invoices list
  // 40-60 tap "New Invoice"
  // 60-450 form fills in stages

  const showList = frame < 90;
  const showForm = frame >= 60;

  const client = "Cape Coastal Cafés";
  const clientLen = Math.min(client.length, Math.max(0, Math.floor((frame - 130) / 2)));

  const desc = "Website redesign — Phase 2 (design + build)";
  const descLen = Math.min(desc.length, Math.max(0, Math.floor((frame - 200) / 1.6)));

  const amountReveal = frame > 300 ? Math.min(1, (frame - 300) / 20) : 0;
  const dateReveal = frame > 340 ? Math.min(1, (frame - 340) / 20) : 0;
  const total = 18500;
  const vat = total * 0.15;
  const grand = total + vat;

  const savePulse = frame > 400 ? interpolate(Math.sin((frame - 400) / 5), [-1, 1], [0.9, 1]) : 1;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Phone url="www.winstreamsa.co.za/invoices/new">
        <div style={{ position: "relative", height: "100%", background: "#F8FAFC" }}>
          {showList && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "30px",
                fontFamily: FONT.family,
                transform: `translateX(${interpolate(frame, [60, 80], [0, -900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>Invoices</div>
              <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 6 }}>8 active · R42,300 paid</div>

              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["INV-0031", "Ubuntu Retailers", "R 12,400", "Paid", COLORS.success],
                  ["INV-0030", "Table Bay Hotel", "R 8,900", "Sent", COLORS.primary],
                  ["INV-0029", "Sipho's Plumbing", "R 3,200", "Overdue", COLORS.danger],
                ].map(([id, name, amt, st, c]) => (
                  <div key={id as string} style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${COLORS.softBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.ink }}>{name}</div>
                      <div style={{ fontSize: 18, color: COLORS.muted, marginTop: 4 }}>{id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.ink }}>{amt}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c as string, marginTop: 4 }}>{st}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* New Invoice button */}
              <div
                style={{
                  position: "absolute",
                  bottom: 34,
                  left: 30,
                  right: 30,
                  height: 90,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  boxShadow: `0 16px 50px ${COLORS.glow}`,
                }}
              >
                <span style={{ fontSize: 34 }}>＋</span> New Invoice
              </div>
              <Tap x={470} y={1520} visible={frame > 35 && frame < 60} />
            </div>
          )}

          {showForm && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "26px 30px",
                fontFamily: FONT.family,
                transform: `translateX(${interpolate(frame, [60, 80], [900, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.softBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>←</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>New Invoice</div>
              </div>

              <Field label="Client">
                <div style={{ fontSize: 26, color: COLORS.ink }}>
                  {client.slice(0, clientLen)}
                  {clientLen < client.length && frame > 130 && frame < 200 && (
                    <span style={{ opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
                  )}
                </div>
              </Field>

              <Field label="Description">
                <div style={{ fontSize: 22, color: COLORS.ink, lineHeight: 1.35 }}>
                  {desc.slice(0, descLen)}
                  {descLen < desc.length && frame > 200 && frame < 300 && (
                    <span style={{ opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
                  )}
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Amount (excl.)">
                  <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.ink, opacity: amountReveal }}>
                    R {total.toLocaleString("en-ZA")}
                  </div>
                </Field>
                <Field label="Due date">
                  <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.ink, opacity: dateReveal }}>
                    15 Aug 2026
                  </div>
                </Field>
              </div>

              {/* Totals card */}
              <div style={{ marginTop: 20, background: "#fff", borderRadius: 18, padding: 22, border: `1px solid ${COLORS.softBorder}` }}>
                <Row label="Subtotal" value={`R ${total.toLocaleString("en-ZA")}.00`} opacity={amountReveal} />
                <Row label="VAT (15%)" value={`R ${vat.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} opacity={amountReveal} />
                <div style={{ height: 1, background: COLORS.softBorder, margin: "12px 0" }} />
                <Row label="Total due" value={`R ${grand.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} bold opacity={amountReveal} />
              </div>

              {/* Save button */}
              <div
                style={{
                  position: "absolute",
                  bottom: 30,
                  left: 30,
                  right: 30,
                  height: 92,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 16px 50px ${COLORS.glow}`,
                  transform: `scale(${savePulse})`,
                }}
              >
                Save & Preview PDF
              </div>
              <Tap x={470} y={1520} visible={frame > 420 && frame < 445} />
            </div>
          )}
        </div>
      </Phone>
      <Caption step="STEP 3" title="Create an invoice in seconds" />
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>{label}</div>
    <div style={{ background: "#fff", borderRadius: 14, border: `2px solid ${COLORS.border}`, padding: "18px 20px", minHeight: 62 }}>
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; value: string; bold?: boolean; opacity: number }> = ({ label, value, bold, opacity }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", opacity }}>
    <div style={{ fontSize: bold ? 26 : 20, color: bold ? COLORS.ink : COLORS.muted, fontWeight: bold ? 800 : 600 }}>{label}</div>
    <div style={{ fontSize: bold ? 28 : 22, fontWeight: bold ? 800 : 700, color: COLORS.ink }}>{value}</div>
  </div>
);
