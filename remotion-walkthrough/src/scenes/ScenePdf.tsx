import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Phone, Tap } from "../components/Phone";
import { Caption } from "../components/Caption";

export const ScenePdf = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [80, 0]);

  // 405 frames = 13.5s
  const pageFloat = Math.sin(frame / 22) * 6;
  const dlPulse = frame > 240 ? interpolate(Math.sin((frame - 240) / 4), [-1, 1], [0.92, 1]) : 1;
  const dlTap = frame > 300 && frame < 322;
  const savedCheck = spring({ frame: frame - 322, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Phone url="www.winstreamsa.co.za/invoices/INV-0032">
        <div style={{ position: "relative", height: "100%", background: "#EEF2F7", fontFamily: FONT.family, padding: "26px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>←</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>PDF Preview</div>
            <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: COLORS.success, background: "rgba(16,185,129,0.10)", padding: "8px 14px", borderRadius: 999 }}>
              Ready
            </div>
          </div>

          {/* Rendered "paper" preview */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
              padding: 28,
              transform: `translateY(${pageFloat}px)`,
              border: `1px solid ${COLORS.softBorder}`,
            }}
          >
            {/* Header w/ logo */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ width: 120, height: 60 }}>
                <Img src={staticFile("brand/logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.5 }}>TAX INVOICE</div>
                <div style={{ fontSize: 16, color: COLORS.muted, marginTop: 2 }}>INV-0032 · 27 Jul 2026</div>
              </div>
            </div>

            <div style={{ height: 2, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`, borderRadius: 2, marginBottom: 18 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>From</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink, marginTop: 6 }}>Ubuntu Trading</div>
                <div style={{ fontSize: 16, color: COLORS.subInk }}>Cape Town · VAT 4570123456</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>Bill to</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink, marginTop: 6 }}>Cape Coastal Cafés</div>
                <div style={{ fontSize: 16, color: COLORS.subInk }}>Camps Bay · Due 15 Aug</div>
              </div>
            </div>

            {/* Line item */}
            <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.ink }}>Website redesign — Phase 2</div>
              <div style={{ fontSize: 15, color: COLORS.muted, marginTop: 4 }}>Design + build · handover 08 Aug</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontSize: 18, color: COLORS.subInk }}>1 × service</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink }}>R 18,500.00</span>
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              <TotalRow label="Subtotal" value="R 18,500.00" />
              <TotalRow label="VAT (15%)" value="R 2,775.00" />
              <div style={{ height: 1, background: COLORS.softBorder, margin: "8px 0" }} />
              <TotalRow label="Total due" value="R 21,275.00" bold />
            </div>

            <div style={{ marginTop: 14, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`, color: "#fff", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 700 }}>
              Pay via EFT · Standard Bank · Ref: INV-0032
            </div>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: COLORS.muted }}>
              Generated by WinStream SA · winstreamsa.co.za
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <ActionBtn icon="✉️" label="Send" />
            <ActionBtn icon="⬇️" label="Download PDF" primary pulse={dlPulse} highlight={frame > 220} />
          </div>

          {/* Saved toast */}
          {savedCheck > 0.01 && (
            <div
              style={{
                position: "absolute",
                left: 30,
                right: 30,
                bottom: 30,
                background: COLORS.ink,
                color: "#fff",
                borderRadius: 16,
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: savedCheck,
                transform: `translateY(${interpolate(savedCheck, [0, 1], [30, 0])}px)`,
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 22, background: COLORS.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>✓</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>INV-0032.pdf downloaded</div>
                <div style={{ fontSize: 15, color: "#94A3B8" }}>Ready to email or WhatsApp</div>
              </div>
            </div>
          )}

          <Tap x={720} y={1500} visible={dlTap} />
        </div>
      </Phone>
      <Caption step="STEP 4" title="Preview & download branded PDF" />
    </AbsoluteFill>
  );
};

const ActionBtn: React.FC<{ icon: string; label: string; primary?: boolean; pulse?: number; highlight?: boolean }> = ({ icon, label, primary, pulse = 1, highlight }) => (
  <div
    style={{
      flex: 1,
      height: 82,
      borderRadius: 18,
      background: primary ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})` : "#fff",
      color: primary ? "#fff" : COLORS.ink,
      border: `2px solid ${primary ? "transparent" : COLORS.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      fontSize: 22,
      fontWeight: 800,
      transform: `scale(${primary ? pulse : 1})`,
      boxShadow: primary && highlight ? `0 16px 50px ${COLORS.glow}` : "none",
    }}
  >
    <span style={{ fontSize: 26 }}>{icon}</span> {label}
  </div>
);

const TotalRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <div style={{ fontSize: bold ? 20 : 16, color: bold ? COLORS.ink : COLORS.muted, fontWeight: bold ? 800 : 600 }}>{label}</div>
    <div style={{ fontSize: bold ? 22 : 18, fontWeight: bold ? 800 : 700, color: COLORS.ink }}>{value}</div>
  </div>
);
