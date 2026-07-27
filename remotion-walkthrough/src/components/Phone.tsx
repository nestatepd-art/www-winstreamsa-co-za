import React from "react";
import { COLORS, FONT } from "../theme";

/**
 * A realistic phone frame rendered at portrait scale (1080x1920 comp).
 * Inner screen ~ 900x1720. Use this as the "app viewport" for scenes.
 */
export const Phone: React.FC<{
  children: React.ReactNode;
  url?: string;
}> = ({ children, url = "www.winstreamsa.co.za" }) => {
  return (
    <div
      style={{
        width: 940,
        height: 1780,
        borderRadius: 78,
        background: "#0B1220",
        padding: 20,
        boxShadow:
          "0 60px 160px rgba(0,0,0,0.55), 0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 2px #1e293b",
        fontFamily: FONT.family,
        position: "relative",
      }}
    >
      {/* screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 60,
          background: "#fff",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* status bar */}
        <div
          style={{
            height: 54,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.ink,
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span>••••</span>
            <span>􀙇</span>
            <span
              style={{
                width: 44,
                height: 20,
                borderRadius: 5,
                border: `2px solid ${COLORS.ink}`,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 2,
                  background: COLORS.ink,
                  borderRadius: 3,
                }}
              />
            </span>
          </span>
        </div>
        {/* url bar */}
        <div
          style={{
            height: 56,
            background: "#F1F5F9",
            borderBottom: `1px solid ${COLORS.softBorder}`,
            margin: "0 20px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            fontSize: 22,
            color: COLORS.muted,
            gap: 10,
          }}
        >
          <span style={{ color: COLORS.success }}>🔒</span>
          <span>{url}</span>
        </div>
        {/* dynamic island notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 240,
            height: 34,
            borderRadius: 20,
            background: "#000",
          }}
        />
        {/* content */}
        <div
          style={{
            position: "absolute",
            top: 130,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/** Simulated finger tap indicator. Show `at` frame for ~10 frames. */
export const Tap: React.FC<{ x: number; y: number; visible: boolean }> = ({
  x,
  y,
  visible,
}) => {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        borderRadius: 60,
        border: `4px solid ${COLORS.accent}`,
        background: "rgba(34,211,238,0.15)",
        boxShadow: `0 0 40px ${COLORS.tealGlow}`,
        pointerEvents: "none",
      }}
    />
  );
};
