import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const SceneIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const scale = interpolate(s, [0, 1], [0.6, 1]);
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const sub = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const subY = interpolate(sub, [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT.family }}>
      <div style={{ transform: `scale(${scale})`, opacity: op, display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 72,
            boxShadow: `0 30px 90px ${COLORS.glow}`,
          }}
        >
          W
        </div>
        <div style={{ color: "#fff" }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>WinStream</div>
          <div style={{ fontSize: 30, color: "#94A3B8", fontWeight: 500, marginTop: 8 }}>Work that runs itself</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 60,
          transform: `translateY(${subY}px)`,
          opacity: sub,
          color: "#CBD5E1",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: 0.5,
        }}
      >
        Create a professional quote — with AI — in under a minute
      </div>
    </AbsoluteFill>
  );
};
