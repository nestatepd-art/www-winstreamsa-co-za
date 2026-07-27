import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const Caption: React.FC<{ step: string; title: string }> = ({ step, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 140 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 60,
        transform: `translateY(${y}px)`,
        opacity: op,
        fontFamily: FONT.family,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        padding: "0 60px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          padding: "10px 22px",
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          borderRadius: 999,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 1.2,
          boxShadow: `0 12px 40px ${COLORS.glow}`,
        }}
      >
        {step}
      </div>
      <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>{title}</div>
    </div>
  );
};
