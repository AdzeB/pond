import { defineCustomSection, group } from "./engine-types";

export const viewerSection = defineCustomSection({
  title: "Viewer",
  description: "Preview controls, image rendering, and playback.",
  groups: [
    group.prefs("viewer", {
      title: "Controls",
      items: [
        {
          control: "select",
          key: "spaceBehavior",
          title: "Spacebar Preview",
          description: "Choose how the preview opens and closes.",
          options: [
            { value: "toggle", label: "Press to Open or Close" },
            { value: "hold", label: "Hold to Preview" },
          ],
        },
        {
          control: "select",
          key: "wheelBehavior",
          title: "Image Scrolling",
          description: "Pinch and Alt-scroll always zoom at the pointer.",
          options: [
            { value: "scroll", label: "Pan Image" },
            { value: "zoom", label: "Zoom Image" },
            { value: "navigate", label: "Previous or Next Save" },
          ],
        },
      ],
    }),
    group.prefs("viewer", {
      title: "Images",
      items: [
        {
          control: "switch",
          key: "rememberImagePosition",
          title: "Remember Image Position",
          description:
            "Restore the last zoom and position when you reopen an image.",
        },
        {
          control: "select",
          key: "imageRendering",
          title: "Image Rendering",
          description: "Show smooth edges or individual pixels when zoomed in.",
          options: [
            { value: "smooth", label: "Smooth" },
            { value: "pixelated", label: "Pixelated" },
          ],
        },
        {
          control: "select",
          key: "transparentBackground",
          title: "Transparent Areas",
          description: "Choose the background behind transparent images.",
          options: [
            { value: "none", label: "Theme" },
            { value: "checkerboard", label: "Checkerboard" },
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
          ],
        },
      ],
    }),
    group.prefs("viewer", {
      title: "Gallery",
      items: [
        {
          control: "select",
          key: "thumbnailBackground",
          title: "Thumbnail Background",
          description:
            "Fill behind gallery thumbnails, including transparent images.",
          options: [
            { value: "none", label: "None" },
            { value: "black", label: "Black" },
            { value: "gray", label: "Gray" },
            { value: "white", label: "White" },
            { value: "grid", label: "Grid" },
          ],
        },
      ],
    }),
    group.prefs("viewer", {
      title: "Video",
      items: [
        {
          control: "switch",
          key: "autoplayVideo",
          title: "Autoplay Videos",
          description: "Play the active video when you open it.",
        },
        {
          control: "switch",
          key: "hoverVideo",
          title: "Hover Preview",
          description: "Play and scrub video thumbnails with the pointer.",
        },
        {
          control: "switch",
          key: "rememberPlayback",
          title: "Remember Playback Position",
          description: "Resume videos where you left off.",
        },
        {
          control: "switch",
          key: "loopShortVideos",
          title: "Loop Short Videos",
          description: "Repeat clips shorter than 30 seconds.",
        },
        {
          control: "switch",
          key: "stretchVideo",
          title: "Stretch Video to Fit",
          description: "Fill the viewer even when the aspect ratio differs.",
        },
      ],
    }),
  ],
});
