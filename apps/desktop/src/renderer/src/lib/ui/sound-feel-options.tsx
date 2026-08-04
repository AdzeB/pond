import {
  IconCloverFill18,
  IconKeyFill18,
  IconLayers2Fill18,
  IconMediaPlayFill18,
  IconMicrophoneFill18,
  IconSparkle3Fill18,
  IconVolumeFill18,
  IconWaveformLinesFill18,
} from "@pond/icons/fill/18";
import {
  IconFaceRobot2Outline18,
  IconOrbitSparkleOutline18,
} from "@pond/icons/outline/18";
import type { SoundFeel } from "@pond/schema/db";
import type { ReactNode } from "react";
import styles from "./sound-feel-options.module.css";

function FeelLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className={styles.option}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      {label}
    </span>
  );
}

export const SOUND_FEEL_OPTIONS: ReadonlyArray<{
  value: SoundFeel;
  label: ReactNode;
}> = [
  {
    value: "soft",
    label: <FeelLabel icon={<IconVolumeFill18 />} label="Soft" />,
  },
  {
    value: "crisp",
    label: <FeelLabel icon={<IconWaveformLinesFill18 />} label="Crisp" />,
  },
  {
    value: "thock",
    label: <FeelLabel icon={<IconLayers2Fill18 />} label="Thock" />,
  },
  {
    value: "glass",
    label: <FeelLabel icon={<IconSparkle3Fill18 />} label="Glass" />,
  },
  {
    value: "metal",
    label: <FeelLabel icon={<IconKeyFill18 />} label="Metal" />,
  },
  {
    value: "lofi",
    label: <FeelLabel icon={<IconMicrophoneFill18 />} label="Lo-fi" />,
  },
  {
    value: "retro",
    label: <FeelLabel icon={<IconFaceRobot2Outline18 />} label="Retro" />,
  },
  {
    value: "organic",
    label: <FeelLabel icon={<IconCloverFill18 />} label="Organic" />,
  },
  {
    value: "airy",
    label: <FeelLabel icon={<IconOrbitSparkleOutline18 />} label="Airy" />,
  },
  {
    value: "punchy",
    label: <FeelLabel icon={<IconMediaPlayFill18 />} label="Punchy" />,
  },
];
