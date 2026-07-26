import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const Caption: React.FC<{ step: string; title: string }> = ({ step, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 140 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 70,
        transform: `translateY(${y}px)`,
        opacity: op,
        fontFamily: FONT.family,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          padding: "8px 16px",
          background: COLORS.primary,
          borderRadius: 999,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 0.5,
          boxShadow: `0 8px 30px ${COLORS.glow}`,
        }}
      >
        {step}
      </div>
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>{title}</div>
    </div>
  );
};

export const BrandMark: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT.family }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.5,
        boxShadow: `0 6px 24px ${COLORS.glow}`,
      }}
    >
      W
    </div>
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <div style={{ color: COLORS.ink, fontWeight: 800, fontSize: size * 0.5 }}>WinStream</div>
      <div style={{ color: COLORS.muted, fontWeight: 500, fontSize: size * 0.28, marginTop: 2 }}>
        Work that runs itself
      </div>
    </div>
  </div>
);
