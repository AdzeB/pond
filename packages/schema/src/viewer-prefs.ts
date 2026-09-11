import { z } from "zod";

export const ViewerPrefsSchema = z.object({
  spaceBehavior: z.enum(["toggle", "hold"]).catch("toggle"),
  wheelBehavior: z.enum(["scroll", "zoom", "navigate"]).catch("scroll"),
  rememberImagePosition: z.boolean().catch(true),
  imageRendering: z.enum(["smooth", "pixelated"]).catch("smooth"),
  transparentBackground: z
    .enum(["none", "checkerboard", "white", "black"])
    .catch("none"),
  thumbnailBackground: z
    .enum(["none", "black", "gray", "white", "grid"])
    .catch("none"),
  autoplayVideo: z.boolean().catch(true),
  hoverVideo: z.boolean().catch(true),
  rememberPlayback: z.boolean().catch(true),
  loopShortVideos: z.boolean().catch(true),
  stretchVideo: z.boolean().catch(false),
});
