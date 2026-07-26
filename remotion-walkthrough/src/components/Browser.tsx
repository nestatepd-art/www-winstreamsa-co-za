import { COLORS, FONT } from "../theme";

export const Browser: React.FC<{ url: string; children: React.ReactNode; width?: number; height?: number }> = ({
  url,
  children,
  width = 1400,
  height = 820,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 20,
        background: COLORS.card,
        boxShadow: "0 40px 100px rgba(0,0,0,0.45), 0 8px 30px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT.family,
      }}
    >
      <div
        style={{
          height: 46,
          background: "#F1F5F9",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FF5F57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FEBC2E" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28C840" }} />
        <div
          style={{
            marginLeft: 24,
            flex: 1,
            height: 28,
            background: "#fff",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontSize: 14,
            color: COLORS.muted,
          }}
        >
          🔒 {url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", background: "#fff", position: "relative" }}>{children}</div>
    </div>
  );
};
