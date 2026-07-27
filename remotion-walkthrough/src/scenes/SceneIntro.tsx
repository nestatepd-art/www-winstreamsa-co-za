import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const SceneIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 14 } });
  const textIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const cta = spring({ frame: frame - 70, fps, config: { damping: 20 } });

  const bgZoom = interpolate(frame, [0, 150], [1.05, 1.18]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* branded OG image as hero backdrop */}
      <AbsoluteFill style={{ transform: `scale(${bgZoom})` }}>
        <Img src={staticFile("brand/og.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,7,15,0.55) 0%, rgba(5,7,15,0.35) 40%, rgba(5,7,15,0.85) 100%)",
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT.family, color: "#fff", padding: 80 }}>
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 60,
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.15)",
            padding: 30,
            marginBottom: 40,
            opacity: logoIn,
            transform: `scale(${interpolate(logoIn, [0, 1], [0.6, 1])})`,
            boxShadow: `0 30px 100px ${COLORS.tealGlow}`,
          }}
        >
          <Img src={staticFile("brand/logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: -3,
            opacity: textIn,
            transform: `translateY(${interpolate(textIn, [0, 1], [30, 0])}px)`,
          }}
        >
          WinStream
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: COLORS.accent,
            marginTop: 14,
            opacity: textIn,
            letterSpacing: 0.5,
          }}
        >
          AI workflow automation for SA SMEs
        </div>
        <div
          style={{
            marginTop: 80,
            fontSize: 30,
            fontWeight: 600,
            padding: "16px 32px",
            borderRadius: 999,
            background: "rgba(34,211,238,0.15)",
            border: `2px solid ${COLORS.accent}`,
            opacity: cta,
          }}
        >
          A 60-second walkthrough
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
