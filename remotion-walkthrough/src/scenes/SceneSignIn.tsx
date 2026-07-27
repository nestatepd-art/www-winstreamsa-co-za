import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Phone, Tap } from "../components/Phone";
import { Caption } from "../components/Caption";

export const SceneSignIn = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [80, 0]);

  // Typing email
  const email = "sipho@ubuntutrading.co.za";
  const emailLen = Math.min(email.length, Math.max(0, Math.floor((frame - 45) / 2.2)));
  const typedEmail = email.slice(0, emailLen);

  // Password dots
  const pass = "••••••••";
  const passLen = Math.min(pass.length, Math.max(0, Math.floor((frame - 130) / 3)));
  const typedPass = pass.slice(0, passLen);

  // Highlight google button
  const highlightGoogle = frame > 220;
  const glow = highlightGoogle
    ? interpolate(Math.sin((frame - 220) / 5), [-1, 1], [0.4, 1])
    : 0;

  const tapVisible = frame > 260 && frame < 280;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Phone url="www.winstreamsa.co.za/auth">
        <div style={{ height: "100%", background: "#fff", padding: "30px 40px", fontFamily: FONT.family, display: "flex", flexDirection: "column" }}>
          {/* brand header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, padding: 8 }}>
              <Img src={staticFile("brand/logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.5 }}>WinStream</div>
              <div style={{ fontSize: 18, color: COLORS.muted }}>Welcome back</div>
            </div>
          </div>

          <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.ink, letterSpacing: -1, marginBottom: 6 }}>
            Sign in
          </div>
          <div style={{ fontSize: 22, color: COLORS.muted, marginBottom: 30 }}>
            Continue with Google or use your email.
          </div>

          {/* Google button — surfaced first */}
          <div
            style={{
              height: 92,
              borderRadius: 18,
              border: `2px solid ${highlightGoogle ? COLORS.accent : COLORS.border}`,
              boxShadow: highlightGoogle ? `0 0 0 ${6 * glow}px rgba(34,211,238,0.25), 0 12px 40px ${COLORS.tealGlow}` : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.ink,
              background: "#fff",
              marginBottom: 26,
            }}
          >
            <GoogleG />
            Continue with Google
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "6px 0 22px" }}>
            <div style={{ height: 1, flex: 1, background: COLORS.softBorder }} />
            <div style={{ color: COLORS.muted, fontSize: 20, fontWeight: 600 }}>OR</div>
            <div style={{ height: 1, flex: 1, background: COLORS.softBorder }} />
          </div>

          <label style={{ fontSize: 20, fontWeight: 700, color: COLORS.subInk }}>Email</label>
          <div
            style={{
              marginTop: 10,
              height: 78,
              borderRadius: 14,
              border: `2px solid ${COLORS.border}`,
              padding: "0 22px",
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              color: COLORS.ink,
              marginBottom: 20,
            }}
          >
            {typedEmail}
            {emailLen < email.length && frame > 45 && frame < 130 && (
              <span style={{ marginLeft: 2, opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
            )}
          </div>

          <label style={{ fontSize: 20, fontWeight: 700, color: COLORS.subInk }}>Password</label>
          <div
            style={{
              marginTop: 10,
              height: 78,
              borderRadius: 14,
              border: `2px solid ${COLORS.border}`,
              padding: "0 22px",
              display: "flex",
              alignItems: "center",
              fontSize: 32,
              color: COLORS.ink,
              letterSpacing: 4,
              marginBottom: 24,
            }}
          >
            {typedPass}
          </div>

          <div
            style={{
              height: 90,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`,
              color: "#fff",
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 16px 40px ${COLORS.glow}`,
            }}
          >
            Sign in
          </div>

          <Tap x={470} y={310} visible={tapVisible} />
        </div>
      </Phone>
      <Caption step="STEP 1" title="Sign in with Google or email" />
    </AbsoluteFill>
  );
};

const GoogleG: React.FC = () => (
  <svg width="42" height="42" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
