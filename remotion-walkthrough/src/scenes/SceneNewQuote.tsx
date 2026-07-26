import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";
import { Browser } from "../components/Browser";
import { Caption } from "../components/Caption";
import { Cursor } from "../components/Cursor";

const SidebarItem: React.FC<{ label: string; active?: boolean; icon: string }> = ({ label, active, icon }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 8,
      background: active ? "rgba(37,99,235,0.12)" : "transparent",
      color: active ? COLORS.primary : "#334155",
      fontWeight: active ? 700 : 500,
      fontSize: 15,
    }}
  >
    <span style={{ fontSize: 16 }}>{icon}</span>
    {label}
  </div>
);

export const SceneNewQuote = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [40, 0]);

  const brief = "install 3 plug points in office";
  const briefLen = Math.min(brief.length, Math.max(0, Math.floor((frame - 50) / 1.5)));
  const typedBrief = brief.slice(0, briefLen);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter, transform: `translateY(${y}px)` }}>
      <Caption step="STEP 2" title="Open New Quote" />
      <Browser url="www.winstreamsa.co.za/quotes/new">
        <div style={{ display: "flex", height: "100%", fontFamily: FONT.family }}>
          {/* Sidebar */}
          <div style={{ width: 220, borderRight: `1px solid ${COLORS.border}`, padding: 20, background: "#F8FAFC" }}>
            <div style={{ fontWeight: 800, color: COLORS.ink, fontSize: 18, marginBottom: 20 }}>WinStream</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <SidebarItem label="Dashboard" icon="◧" />
              <SidebarItem label="Quotes" icon="📄" active />
              <SidebarItem label="Invoices" icon="🧾" />
              <SidebarItem label="Proposals" icon="✉️" />
              <SidebarItem label="Clients" icon="👥" />
              <SidebarItem label="Chat" icon="💬" />
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 40, overflow: "hidden" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.ink }}>New quote</div>
            <div style={{ color: COLORS.muted, fontSize: 15, marginTop: 6 }}>
              Build your quote. WinStream can draft descriptions and notes for you.
            </div>

            {/* Line item row */}
            <div
              style={{
                marginTop: 28,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 20,
                background: "#fff",
                boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
              }}
            >
              <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>
                DESCRIPTION
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <div
                  style={{
                    flex: 1,
                    minHeight: 96,
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 17,
                    color: COLORS.ink,
                  }}
                >
                  {typedBrief}
                  {briefLen < brief.length && frame > 50 && (
                    <span style={{ marginLeft: 2, opacity: (frame % 20) < 10 ? 1 : 0 }}>|</span>
                  )}
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.border}`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: COLORS.primary,
                  }}
                >
                  ✨
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>QTY</div>
                  <div style={{ marginTop: 6, height: 44, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 16, color: COLORS.ink }}>3</div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>UNIT PRICE (R)</div>
                  <div style={{ marginTop: 6, height: 44, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 16, color: COLORS.muted }}>0.00</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>LINE TOTAL</div>
                  <div style={{ marginTop: 6, height: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 18, fontWeight: 600, color: COLORS.ink }}>R 0.00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Cursor
          keyframes={[
            { frame: 0, pos: { x: 200, y: 400 } },
            { frame: 25, pos: { x: 120, y: 200 } },
            { frame: 30, pos: { x: 120, y: 200 }, click: true },
            { frame: 48, pos: { x: 700, y: 470 } },
            { frame: 90, pos: { x: 900, y: 490 } },
            { frame: 149, pos: { x: 900, y: 490 } },
          ]}
        />
      </Browser>
    </AbsoluteFill>
  );
};
