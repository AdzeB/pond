import type { ImagePose } from "@/features/saves/lib/viewer-memory";

export interface ViewportFraction {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function viewportFraction(
  pose: ImagePose,
  stage: { width: number; height: number },
): ViewportFraction {
  const width = Math.min(1, 1 / pose.zoom);
  const height = Math.min(1, 1 / pose.zoom);
  const x = 0.5 - width / 2 - pose.x / (stage.width * pose.zoom);
  const y = 0.5 - height / 2 - pose.y / (stage.height * pose.zoom);
  return {
    x: Math.min(1 - width, Math.max(0, x)),
    y: Math.min(1 - height, Math.max(0, y)),
    width,
    height,
  };
}

export function poseFromNavigatorPoint(
  nx: number,
  ny: number,
  zoom: number,
  stage: { width: number; height: number },
): ImagePose {
  return {
    zoom,
    x: (0.5 - nx) * stage.width * zoom,
    y: (0.5 - ny) * stage.height * zoom,
  };
}
