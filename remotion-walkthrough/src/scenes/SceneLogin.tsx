import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Browser } from "../components/Browser";
import { Caption } from "../components/Caption";
import { Cursor } from "../components/Cursor";

export const SceneLogin = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [40, 0]);

  // Email typing
  const email = "you@business.co.za";
  const typedLen = Math.min(email.length, Math.max(0, Math.floor((frame - 30) / 1.6)));
  const typedEmail = email.slice(0, typedLen);

  // Password
  const pass = "••••••••••";
  const passLen = Math.min(pass.length, Math.max(0, Math.floor((frame - 55) / 1.4)));
  const typedPass = pass.slice(0, passLen);

  const btnPress = spring({ frame: frame - 85, fps, config: { damping: 8, stiffness: 220 } });
  const btnScale = frame < 85 ? 1 : interpolate(btnPress, [0, 0.5, 1], [1, 0.94, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Caption step="STEP 1" title="Sign in to WinStream SA" />
      <Browser url="www.winstreamsa.co.za/auth">
        <div style={{ display: "flex", height: "100%", fontFamily: FONT.family }}>
          <div
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${COLORS.primary}, #0EA5E9)`,
              padding: 60,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
              Welcome back
            </div>
            <div style={{ fontSize: 24, marginTop: 20, opacity: 0.9, maxWidth: 460 }}>
              Quotes, invoices and follow-ups — drafted by AI, approved by you.
            </div>
          </div>
          <div style={{ flex: 1, padding: 70, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.ink, marginBottom: 32 }}>Sign in</div>

            <label style={{ fontSize: 14, color: COLORS.muted, fontWeight: 600 }}>Email</label>
            <div
              style={{
                marginTop: 8,
                height: 52,
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                fontSize: 18,
                color: COLORS.ink,
              }}
            >
              {typedEmail}
              {typedLen < email.length && frame > 30 && frame < 55 && (
                <span style={{ marginLeft: 2, opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
              )}
            </div>

            <label style={{ fontSize: 14, color: COLORS.muted, fontWeight: 600, marginTop: 20 }}>Password</label>
            <div
              style={{
                marginTop: 8,
                height: 52,
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                fontSize: 22,
                color: COLORS.ink,
                letterSpacing: 2,
              }}
            >
              {typedPass}
            </div>

            <div
              style={{
                marginTop: 32,
                height: 56,
                borderRadius: 12,
                background: COLORS.primary,
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 12px 30px ${COLORS.glow}`,
                transform: `scale(${btnScale})`,
              }}
            >
              Sign in
            </div>
          </div>
        </div>
        <Cursor
          keyframes={[
            { frame: 0, pos: { x: 900, y: 250 } },
            { frame: 28, pos: { x: 900, y: 300 } },
            { frame: 52, pos: { x: 900, y: 430 } },
            { frame: 82, pos: { x: 950, y: 590 } },
            { frame: 88, pos: { x: 950, y: 590 }, click: true },
            { frame: 119, pos: { x: 950, y: 590 } },
          ]}
        />
      </Browser>
    </AbsoluteFill>
  );
};
