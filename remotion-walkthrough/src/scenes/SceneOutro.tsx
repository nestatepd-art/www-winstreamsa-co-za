import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const SceneOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 14 } });
  const text1 = spring({ frame: frame - 15, fps, config: { damping: 18 } });
  const text2 = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const urlIn = spring({ frame: frame - 70, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill>
        <Img src={staticFile("brand/og.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(frame, [0, 165], [1.1, 1.2])})` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,15,0.5) 0%, rgba(5,7,15,0.9) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT.family, color: "#fff", padding: 80, textAlign: "center" }}>
        <div
          style={{
            width: 200,
            height: 200,
            padding: 24,
            marginBottom: 30,
            borderRadius: 50,
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.15)",
            opacity: logoIn,
            transform: `scale(${interpolate(logoIn, [0, 1], [0.7, 1])})`,
          }}
        >
          <Img src={staticFile("brand/logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, opacity: text1, transform: `translateY(${interpolate(text1, [0, 1], [30, 0])}px)`, lineHeight: 1.05 }}>
          Quotes & invoices,<br />drafted by AI,<br />
          <span style={{ color: COLORS.accent }}>approved by you.</span>
        </div>
        <div style={{ fontSize: 30, color: COLORS.accent, marginTop: 24, opacity: text2, fontWeight: 600 }}>
          Free to start · No credit card
        </div>
        <div
          style={{
            marginTop: 60,
            padding: "22px 36px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`,
            fontSize: 34,
            fontWeight: 800,
            opacity: urlIn,
            transform: `scale(${interpolate(urlIn, [0, 1], [0.85, 1])})`,
            boxShadow: `0 20px 60px ${COLORS.glow}`,
          }}
        >
          www.winstreamsa.co.za
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
