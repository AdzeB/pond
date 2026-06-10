import { createContext, use } from "react";

export interface VideoState {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  pipSupported: boolean;
  pipActive: boolean;
  fullscreen: boolean;
  fullscreenSupported: boolean;
  controlsVisible: boolean;
}

export interface VideoActions {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRate: (rate: number) => void;
  requestPip: () => void;
  toggleFullscreen: () => void;
  stepFrame: (delta: number) => void;
  showControls: () => void;
}

export interface VideoMeta {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  registerVideo: (el: HTMLVideoElement | null) => void;
}

export interface VideoContextValue {
  state: VideoState;
  actions: VideoActions;
  meta: VideoMeta;
}

export const VideoContext = createContext<VideoContextValue | null>(null);

export function useVideo(): VideoContextValue {
  const context = use(VideoContext);
  if (!context) {
    throw new Error("Video.* parts must be rendered inside <Video.Root>");
  }
  return context;
}
