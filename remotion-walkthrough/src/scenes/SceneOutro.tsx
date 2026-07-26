import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

export const SceneOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const checkS = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT.family }}>
      <div style={{ transform: `scale(${scale})`, opacity: op, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            background: `linear-gradient(135deg, ${COLORS.success}, #34D399)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(16,185,129,0.35)",
          }}
        >
          <svg width="70" height="70" viewBox="0 0 70 70">
            <path
              d="M18 36 L30 48 L54 22"
              fill="none"
              stroke="#fff"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="80"
              strokeDashoffset={interpolate(checkS, [0, 1], [80, 0])}
            />
          </svg>
        </div>
        <div style={{ marginTop: 40, color: "#fff", fontSize: 68, fontWeight: 800, letterSpacing: -2 }}>
          Quote ready in seconds
        </div>
        <div style={{ marginTop: 14, color: "#94A3B8", fontSize: 26 }}>
          Sign, send and get paid — with WinStream SA
        </div>
        <div
          style={{
            marginTop: 40,
            padding: "16px 32px",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            color: "#fff",
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 0.5,
            boxShadow: `0 12px 40px ${COLORS.glow}`,
          }}
        >
          www.winstreamsa.co.za
        </div>
      </div>
    </AbsoluteFill>
  );
};
