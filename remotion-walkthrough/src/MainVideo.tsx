import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneNewQuote } from "./scenes/SceneNewQuote";
import { SceneAIDraft } from "./scenes/SceneAIDraft";
import { SceneOutro } from "./scenes/SceneOutro";
import { COLORS } from "./theme";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

// 40s @ 30fps = 1200 frames; account for 4 x 18f transition overlaps (72 frames).
// Sum of sequences = 1272, net = 1200.
const S1 = 150;  // intro 5s
const S2 = 240;  // login 8s
const S3 = 300;  // new quote 10s
const S4 = 360;  // AI draft 12s
const S5 = 222;  // outro ~7.4s
const T = 18;
export const TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 - T * 4;

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* soft radial gradient backdrop */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1200px 800px at 20% 10%, rgba(37,99,235,0.25), transparent 60%), radial-gradient(1000px 700px at 85% 90%, rgba(34,211,238,0.18), transparent 60%)",
        }}
      />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={S1}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S2}>
          <SceneLogin />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S3}>
          <SceneNewQuote />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S4}>
          <SceneAIDraft />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S5}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
