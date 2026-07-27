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
          {/* Dashboard + left sidebar drawer */}
          {showDashboard && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#F8FAFC",
                transform: `translateX(${interpolate(frame, [60, 80], [0, -900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                fontFamily: FONT.family,
              }}
            >
              {/* Top bar with hamburger */}
              <div style={{ height: 70, padding: "0 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${COLORS.softBorder}`, background: "#fff" }}>
                <div style={{ fontSize: 34, color: COLORS.ink, fontWeight: 800 }}>≡</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.5 }}>WinStream</div>
                <div style={{ marginLeft: "auto", fontSize: 14, color: COLORS.muted }}>Work that runs itself</div>
              </div>

              {/* Left sidebar drawer (slides in) */}
              <div
                style={{
                  position: "absolute",
                  top: 70,
                  bottom: 0,
                  left: 0,
                  width: 620,
                  background: "#0B1220",
                  color: "#fff",
                  padding: "26px 22px",
                  transform: `translateX(${interpolate(frame, [0, 22], [-620, 0], { extrapolateRight: "clamp" })}px)`,
                  boxShadow: "20px 0 60px rgba(0,0,0,0.35)",
                  zIndex: 5,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 14 }}>Workspace</div>
                {[
                  ["▦", "Dashboard"],
                  ["◉", "Clients"],
                  ["✎", "Proposals"],
                  ["§", "Quotes"],
                  ["🧾", "Invoices"],
                  ["🔔", "Reminders"],
                  ["💳", "Billing"],
                  ["💬", "Assist"],
                  ["★", "Leave a Review"],
                  ["⚙", "Settings", true],
                ].map(([ic, lb, hi]) => (
                  <div
                    key={lb as string}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 18px",
                      borderRadius: 12,
                      background: hi ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})` : "transparent",
                      marginBottom: 4,
                      fontSize: 24,
                      fontWeight: hi ? 800 : 600,
                      color: hi ? "#fff" : "#CBD5E1",
                      boxShadow: hi ? `0 12px 30px ${COLORS.glow}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 26, width: 34, textAlign: "center" }}>{ic}</span>
                    <span>{lb}</span>
                  </div>
                ))}
                <div style={{ position: "absolute", bottom: 24, left: 22, right: 22, padding: "14px 16px", background: "rgba(34,211,238,0.10)", border: `1px solid ${COLORS.accent}`, borderRadius: 12, fontSize: 18 }}>
                  <div style={{ color: COLORS.accent, fontWeight: 800 }}>Credits</div>
                  <div style={{ color: "#CBD5E1", marginTop: 4 }}>14 / 20 this month</div>
                </div>
              </div>

              {/* Dashboard content peeking behind drawer */}
              <div style={{ padding: "24px 30px", opacity: 0.35 }}>
                <div style={{ fontSize: 38, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>Dashboard</div>
                <div style={{ fontSize: 20, color: COLORS.muted, marginTop: 6 }}>Ubuntu Trading (Pty) Ltd</div>
              </div>

              <Tap x={180} y={860} visible={frame > 40 && frame < 62} />
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
      <Caption step="STEP 2" title="Open the side menu → upload your logo" />
    </AbsoluteFill>
  );
};
