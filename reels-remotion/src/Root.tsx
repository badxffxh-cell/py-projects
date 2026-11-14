import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { Apagao, ApagaoProps, timeline } from "./apagao/Apagao";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="Apagao"
        component={Apagao}
        durationInFrames={timeline.frames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ imgDir: "apagao/img_placeholder", showSafe: false } satisfies ApagaoProps}
      />
    </>
  );
};
