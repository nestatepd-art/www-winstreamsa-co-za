import { interpolate, useCurrentFrame } from "remotion";

type Point = { x: number; y: number };
type Kf = { frame: number; pos: Point; click?: boolean };

export const Cursor: React.FC<{ keyframes: Kf[] }> = ({ keyframes }) => {
  const frame = useCurrentFrame();
  const frames = keyframes.map((k) => k.frame);
  const xs = keyframes.map((k) => k.pos.x);
  const ys = keyframes.map((k) => k.pos.y);
  const x = interpolate(frame, frames, xs, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, frames, ys, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // click ripple
  const click = keyframes.find((k) => k.click && Math.abs(k.frame - frame) < 20);
  const ringScale = click ? interpolate(frame - click.frame, [0, 20], [0.4, 1.8], { extrapolateRight: "clamp" }) : 0;
  const ringOp = click ? interpolate(frame - click.frame, [0, 20], [0.6, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 50 }}>
      {click && (
        <div
          style={{
            position: "absolute",
            left: -40,
            top: -40,
            width: 80,
            height: 80,
            borderRadius: 40,
            border: "3px solid #2563EB",
            transform: `scale(${ringScale})`,
            opacity: ringOp,
          }}
        />
      )}
      <svg width="28" height="34" viewBox="0 0 28 34" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
        <path d="M2 2 L2 26 L9 20 L13 30 L17 28 L13 18 L22 18 Z" fill="#fff" stroke="#0F172A" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
