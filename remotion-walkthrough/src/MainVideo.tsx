import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneSignIn } from "./scenes/SceneSignIn";
import { SceneSettings } from "./scenes/SceneSettings";
import { SceneInvoice } from "./scenes/SceneInvoice";
import { ScenePdf } from "./scenes/ScenePdf";
import { SceneOutro } from "./scenes/SceneOutro";
import { COLORS } from "./theme";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

// 60s @ 30fps = 1800 frames. Overlap 5 x 15f transitions = 75f.
const S1 = 150; // 5s intro
const S2 = 330; // 11s sign in
const S3 = 375; // 12.5s settings / upload logo
const S4 = 450; // 15s create invoice
const S5 = 405; // 13.5s pdf preview + download
const S6 = 165; // 5.5s outro
const T = 15;
export const TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6 - T * 5;

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* backdrop */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1200px 900px at 20% 10%, rgba(30,64,175,0.35), transparent 60%), radial-gradient(1000px 800px at 85% 90%, rgba(34,211,238,0.20), transparent 60%)",
        }}
      />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={S1}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S2}>
          <SceneSignIn />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S3}>
          <SceneSettings />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S4}>
          <SceneInvoice />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S5}>
          <ScenePdf />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S6}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
