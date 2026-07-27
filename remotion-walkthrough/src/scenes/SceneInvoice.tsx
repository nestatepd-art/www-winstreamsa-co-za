import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Phone, Tap } from "../components/Phone";
import { Caption } from "../components/Caption";

/**
 * Scene 4 — Create an invoice
 * 450 frames = 15s
 *  0- 60   Invoices list + tap "New Invoice"
 * 60-150   Form opens. Tap Client field.
 *150-260   Client dropdown opens (with "+ Add new client" zone highlighted, then existing client picked)
 *260-330   Description auto-fills (AI draft chip)
 *330-390   Amount + due date reveal
 *390-450   Save & preview pulse
 */
export const SceneInvoice = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [80, 0]);

  const showList = frame < 90;
  const showForm = frame >= 60;

  // Dropdown lifecycle
  const dropdownOpen = frame >= 150 && frame < 245;
  const addZoneHighlight = frame >= 160 && frame < 200;
  const clientPicked = frame >= 240;
  const pickedTap = frame > 220 && frame < 240;

  const desc = "Website redesign — Phase 2 (design + build)";
  const descLen = Math.min(desc.length, Math.max(0, Math.floor((frame - 265) / 1.4)));

  const amountReveal = frame > 335 ? Math.min(1, (frame - 335) / 18) : 0;
  const dateReveal = frame > 360 ? Math.min(1, (frame - 360) / 18) : 0;
  const total = 18500;
  const vat = total * 0.15;
  const grand = total + vat;

  const savePulse = frame > 400 ? interpolate(Math.sin((frame - 400) / 5), [-1, 1], [0.92, 1]) : 1;

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

              {/* Client dropdown field */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  Client
                  <span style={{ fontSize: 14, background: COLORS.softBorder, color: COLORS.subInk, padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>
                    Select from list
                  </span>
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: `2px solid ${dropdownOpen ? COLORS.accent : COLORS.border}`,
                    padding: "18px 20px",
                    minHeight: 62,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: dropdownOpen ? `0 0 0 4px rgba(34,211,238,0.15)` : "none",
                  }}
                >
                  <div style={{ fontSize: 26, color: clientPicked ? COLORS.ink : COLORS.muted, fontWeight: clientPicked ? 700 : 500 }}>
                    {clientPicked ? "Cape Coastal Cafés" : "Select a client…"}
                  </div>
                  <div style={{ fontSize: 22, color: COLORS.muted, transform: dropdownOpen ? "rotate(180deg)" : "none" }}>▾</div>
                </div>
                <Tap x={470} y={310} visible={frame > 128 && frame < 150} />
              </div>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    left: 30,
                    right: 30,
                    top: 260,
                    background: "#fff",
                    borderRadius: 18,
                    border: `1px solid ${COLORS.softBorder}`,
                    boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
                    padding: 10,
                    zIndex: 20,
                    transform: `translateY(${interpolate(frame, [150, 168], [-14, 0], { extrapolateRight: "clamp" })}px)`,
                    opacity: interpolate(frame, [150, 168], [0, 1], { extrapolateRight: "clamp" }),
                  }}
                >
                  {/* Add new client zone */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "18px 18px",
                      borderRadius: 14,
                      background: addZoneHighlight ? "rgba(34,211,238,0.14)" : "transparent",
                      border: `2px dashed ${addZoneHighlight ? COLORS.accent : COLORS.border}`,
                      marginBottom: 10,
                      boxShadow: addZoneHighlight ? `0 10px 30px ${COLORS.tealGlow}` : "none",
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, color: "#fff", fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>＋</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.ink }}>Add new client</div>
                      <div style={{ fontSize: 16, color: COLORS.muted, marginTop: 2 }}>Save details once — reuse everywhere</div>
                    </div>
                  </div>

                  {[
                    ["Cape Coastal Cafés", "Camps Bay · 4 invoices"],
                    ["Ubuntu Retailers", "Sandton · 12 invoices"],
                    ["Table Bay Hotel", "V&A Waterfront · 6 invoices"],
                    ["Sipho's Plumbing", "Durban · 2 invoices"],
                  ].map(([n, sub], i) => {
                    const active = i === 0 && pickedTap;
                    return (
                      <div
                        key={n}
                        style={{
                          padding: "16px 18px",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          background: active ? "rgba(30,64,175,0.10)" : "transparent",
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 20, background: COLORS.softBorder, color: COLORS.subInk, fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{n}</div>
                          <div style={{ fontSize: 16, color: COLORS.muted }}>{sub}</div>
                        </div>
                        {active && <span style={{ color: COLORS.success, fontSize: 24, fontWeight: 800 }}>✓</span>}
                      </div>
                    );
                  })}
                  <Tap x={470} y={520} visible={pickedTap} />
                </div>
              )}

              <Field label="Description" chip="AI drafted">
                <div style={{ fontSize: 22, color: COLORS.ink, lineHeight: 1.35 }}>
                  {desc.slice(0, descLen)}
                  {descLen < desc.length && frame > 265 && frame < 330 && (
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

              <div style={{ marginTop: 18, background: "#fff", borderRadius: 18, padding: 22, border: `1px solid ${COLORS.softBorder}` }}>
                <Row label="Subtotal" value={`R ${total.toLocaleString("en-ZA")}.00`} opacity={amountReveal} />
                <Row label="VAT (15%)" value={`R ${vat.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} opacity={amountReveal} />
                <div style={{ height: 1, background: COLORS.softBorder, margin: "12px 0" }} />
                <Row label="Total due" value={`R ${grand.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} bold opacity={amountReveal} />
              </div>

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
      <Caption step="STEP 3" title="Pick a client, AI drafts the invoice" />
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; chip?: string }> = ({ label, children, chip }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
      {label}
      {chip && (
        <span style={{ fontSize: 14, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, color: "#fff", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>
          ✨ {chip}
        </span>
      )}
    </div>
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
