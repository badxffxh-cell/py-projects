import { AbsoluteFill, CalculateMetadataFunction, Composition } from "remotion";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

// Instagram Reels: 9:16, 1080x1920, 30 fps. 90 frames = 3 seconds.
export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
};
