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
  bounds: { width: number; height: number },
): ViewportFraction {
  const zoom = pose.zoom > 0 ? pose.zoom : 1;
  const contentWidth = bounds.width * zoom;
  const contentHeight = bounds.height * zoom;
  const width = contentWidth > 0 ? Math.min(1, stage.width / contentWidth) : 1;
  const height =
    contentHeight > 0 ? Math.min(1, stage.height / contentHeight) : 1;
  const x = contentWidth > 0 ? 0.5 - width / 2 - pose.x / contentWidth : 0;
  const y = contentHeight > 0 ? 0.5 - height / 2 - pose.y / contentHeight : 0;
  return {
    x: Math.min(1 - width, Math.max(0, x)),
    y: Math.min(1 - height, Math.max(0, y)),
    width,
    height,
  };
}

export function viewportOverflows(viewport: ViewportFraction): boolean {
  return viewport.width < 1 || viewport.height < 1;
}

export function poseFromNavigatorPoint(
  nx: number,
  ny: number,
  zoom: number,
  bounds: { width: number; height: number },
): ImagePose {
  return {
    zoom,
    x: (0.5 - nx) * bounds.width * zoom,
    y: (0.5 - ny) * bounds.height * zoom,
  };
}
