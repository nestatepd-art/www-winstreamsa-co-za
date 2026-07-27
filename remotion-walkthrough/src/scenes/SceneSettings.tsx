import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Phone, Tap } from "../components/Phone";
import { Caption } from "../components/Caption";

export const SceneSettings = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [80, 0]);

  // Timeline:
  // 0-40 dashboard visible
  // 40-70 tap "Settings"
  // 70-160 settings page visible
  // 160-190 tap upload area
  // 190-260 progress bar fills
  // 260-360 logo appears in preview card

  const showDashboard = frame < 80;
  const showSettings = frame >= 60;

  const upTap = frame > 160 && frame < 185;
  const uploadProgress = interpolate(frame, [190, 260], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoReveal = spring({ frame: frame - 260, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Phone url="www.winstreamsa.co.za/settings">
        <div style={{ position: "relative", height: "100%", background: "#F8FAFC" }}>
          {/* Dashboard layer sliding out */}
          {showDashboard && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#F8FAFC",
                transform: `translateX(${interpolate(frame, [60, 80], [0, -900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                padding: "30px 30px",
                fontFamily: FONT.family,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>Dashboard</div>
              <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 6 }}>Ubuntu Trading (Pty) Ltd</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 30 }}>
                {[
                  { l: "Quotes", v: "12" },
                  { l: "Invoices", v: "8" },
                  { l: "Paid", v: "R42,300" },
                  { l: "Overdue", v: "R6,800" },
                ].map((k) => (
                  <div key={k.l} style={{ background: "#fff", borderRadius: 18, padding: 22, border: `1px solid ${COLORS.softBorder}` }}>
                    <div style={{ fontSize: 18, color: COLORS.muted, fontWeight: 600 }}>{k.l}</div>
                    <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, marginTop: 6 }}>{k.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 30, fontSize: 24, fontWeight: 700, color: COLORS.ink }}>Menu</div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["📄", "Quotes"],
                  ["🧾", "Invoices"],
                  ["👥", "Clients"],
                  ["⚙️", "Settings", true],
                ].map(([ic, lb, hi]) => (
                  <div
                    key={lb as string}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "22px 22px",
                      background: hi ? "rgba(34,211,238,0.15)" : "#fff",
                      border: `2px solid ${hi ? COLORS.accent : COLORS.softBorder}`,
                      borderRadius: 16,
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.ink,
                      boxShadow: hi ? `0 12px 40px ${COLORS.tealGlow}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 30 }}>{ic}</span>
                    <span>{lb}</span>
                  </div>
                ))}
              </div>
              <Tap x={470} y={790} visible={frame > 40 && frame < 62} />
            </div>
          )}

          {/* Settings layer sliding in */}
          {showSettings && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(${interpolate(frame, [60, 80], [900, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                padding: "30px 30px",
                fontFamily: FONT.family,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>Settings</div>
              <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 6 }}>Brand your quotes & invoices</div>

              <div style={{ marginTop: 32, background: "#fff", borderRadius: 20, padding: 24, border: `1px solid ${COLORS.softBorder}` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink }}>Business logo</div>
                <div style={{ fontSize: 18, color: COLORS.muted, marginTop: 4 }}>PNG or JPG. Shows on every PDF.</div>

                {/* Upload dropzone */}
                <div
                  style={{
                    marginTop: 20,
                    height: 260,
                    borderRadius: 16,
                    border: `3px dashed ${upTap || frame > 185 ? COLORS.accent : COLORS.border}`,
                    background: upTap ? "rgba(34,211,238,0.08)" : "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 12,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {frame < 260 ? (
                    <>
                      <div style={{ fontSize: 60 }}>⬆️</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.ink }}>Tap to upload logo</div>
                      <div style={{ fontSize: 18, color: COLORS.muted }}>Max 2MB · PNG, JPG</div>
                      {frame >= 190 && (
                        <div style={{ position: "absolute", bottom: 24, left: 30, right: 30, height: 14, background: COLORS.softBorder, borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ width: `${uploadProgress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})` }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        width: 200,
                        height: 200,
                        opacity: logoReveal,
                        transform: `scale(${interpolate(logoReveal, [0, 1], [0.7, 1])})`,
                      }}
                    >
                      <Img src={staticFile("brand/logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  )}
                </div>

                {frame > 285 && (
                  <div
                    style={{
                      marginTop: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "rgba(16,185,129,0.10)",
                      border: `2px solid ${COLORS.success}`,
                      borderRadius: 14,
                      padding: "14px 18px",
                      color: COLORS.success,
                      fontWeight: 700,
                      fontSize: 22,
                      opacity: interpolate(frame, [285, 305], [0, 1], { extrapolateRight: "clamp" }),
                    }}
                  >
                    ✓ Logo saved — applied to all future documents
                  </div>
                )}
              </div>

              <Tap x={470} y={780} visible={upTap} />
            </div>
          )}
        </div>
      </Phone>
      <Caption step="STEP 2" title="Upload your business logo" />
    </AbsoluteFill>
  );
};
