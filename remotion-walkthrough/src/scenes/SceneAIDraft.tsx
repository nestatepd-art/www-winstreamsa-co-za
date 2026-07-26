import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Browser } from "../components/Browser";
import { Caption } from "../components/Caption";
import { Cursor } from "../components/Cursor";

const FULL = "Supply and install three double 16A wall-mounted plug points in office space, including certified wiring and testing.";

export const SceneAIDraft = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [40, 0]);

  // Spinner during 15..55, then text streams from 60..150
  const spinning = frame >= 15 && frame < 60;
  const spinAngle = interpolate(frame, [15, 60], [0, 720]);

  const streamStart = 60;
  const streamEnd = 150;
  const chars = Math.max(
    0,
    Math.min(FULL.length, Math.floor(interpolate(frame, [streamStart, streamEnd], [0, FULL.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))),
  );
  const shown = FULL.slice(0, chars);

  // Totals animate near the end
  const priceUnit = Math.round(interpolate(frame, [140, 165], [0, 1250], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const total = priceUnit * 3;
  const vat = +(total * 0.15).toFixed(0);
  const grand = total + vat;

  const bannerOp = interpolate(frame, [150, 165], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Caption step="STEP 3" title="Draft with AI" />
      <Browser url="www.winstreamsa.co.za/quotes/new">
        <div style={{ padding: 50, fontFamily: FONT.family, height: "100%" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.ink }}>New quote</div>

          {/* AI Banner */}
          <div
            style={{
              marginTop: 20,
              opacity: bannerOp,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid rgba(37,99,235,0.35)`,
              background: "rgba(37,99,235,0.05)",
              color: COLORS.ink,
              fontSize: 14,
            }}
          >
            <span style={{ color: COLORS.primary, fontWeight: 700 }}>✨ AI drafted — please review.</span>
            <span style={{ color: COLORS.muted }}>Check the wording, numbers and dates before you send.</span>
          </div>

          <div
            style={{
              marginTop: 20,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 22,
              background: "#fff",
              boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>DESCRIPTION</div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div
                style={{
                  flex: 1,
                  minHeight: 130,
                  border: `1.5px solid ${frame > streamStart ? COLORS.primary : COLORS.border}`,
                  boxShadow: frame > streamStart ? `0 0 0 4px rgba(37,99,235,0.12)` : "none",
                  borderRadius: 10,
                  padding: 16,
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: COLORS.ink,
                }}
              >
                {shown}
                {frame > streamStart && chars < FULL.length && (
                  <span style={{ marginLeft: 2, opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
                )}
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: spinning ? "rgba(37,99,235,0.1)" : COLORS.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  color: spinning ? COLORS.primary : "#fff",
                  transition: "background 0.2s",
                  boxShadow: `0 8px 20px ${COLORS.glow}`,
                }}
              >
                {spinning ? (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      border: `3px solid rgba(37,99,235,0.25)`,
                      borderTopColor: COLORS.primary,
                      borderRadius: "50%",
                      transform: `rotate(${spinAngle}deg)`,
                    }}
                  />
                ) : (
                  "✨"
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>QTY</div>
                <div style={{ marginTop: 6, height: 44, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 16 }}>3</div>
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>UNIT PRICE (R)</div>
                <div style={{ marginTop: 6, height: 44, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 16 }}>{priceUnit.toLocaleString()}.00</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>LINE TOTAL</div>
                <div style={{ marginTop: 6, height: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 18, fontWeight: 600, color: COLORS.ink }}>R {total.toLocaleString()}.00</div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 20, paddingTop: 14, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: 40, color: COLORS.muted, fontSize: 14 }}>
                <span>VAT (15%)</span><span style={{ color: COLORS.ink, fontWeight: 600 }}>R {vat.toLocaleString()}.00</span>
              </div>
              <div style={{ display: "flex", gap: 40, fontSize: 20, fontWeight: 700, color: COLORS.ink }}>
                <span>Total</span><span>R {grand.toLocaleString()}.00</span>
              </div>
            </div>
          </div>
        </div>
        <Cursor
          keyframes={[
            { frame: 0, pos: { x: 800, y: 400 } },
            { frame: 10, pos: { x: 1180, y: 340 } },
            { frame: 14, pos: { x: 1180, y: 340 }, click: true },
            { frame: 60, pos: { x: 1180, y: 340 } },
            { frame: 179, pos: { x: 900, y: 600 } },
          ]}
        />
      </Browser>
    </AbsoluteFill>
  );
};
