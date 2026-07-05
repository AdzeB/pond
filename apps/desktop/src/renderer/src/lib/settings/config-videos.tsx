import { useVideoDownloadBinding } from "@/components/settings-section-downloads";
import { defineCustomSection, group } from "@/lib/settings/engine-types";

type Values = Record<string, unknown>;

const subtitlesEnabled = (v: Values) => v.subtitles !== "off";

export const videosSection = defineCustomSection({
  title: "Videos",
  description: "Quality, codecs, and extras for saved videos.",
  groups: [
    group.with(useVideoDownloadBinding, {
      title: "Quality",
      items: [
        {
          control: "select",
          key: "maxHeight",
          title: "Maximum Resolution",
          description:
            "Higher resolutions mean bigger files. 1080p suits most clips.",
          options: [
            { value: 4320, label: "4320p (8K)" },
            { value: 2160, label: "2160p (4K)" },
            { value: 1440, label: "1440p" },
            { value: 1080, label: "1080p" },
            { value: 720, label: "720p" },
            { value: 480, label: "480p" },
            { value: 360, label: "360p" },
            { value: 240, label: "240p" },
            { value: 144, label: "144p" },
            { value: null, label: "Original" },
          ],
        },
        {
          control: "select",
          key: "maxFps",
          title: "Maximum Frame Rate",
          description: "Cap the frame rate to keep files smaller.",
          options: [
            { value: null, label: "Unlimited" },
            { value: 60, label: "60\u00A0fps" },
            { value: 30, label: "30\u00A0fps" },
            { value: 24, label: "24\u00A0fps" },
          ],
        },
        {
          control: "select",
          key: "maxFileSizeMb",
          title: "Maximum File Size",
          description: "Skip downloads bigger than the cap.",
          options: [
            { value: 2, label: "2\u00A0MB" },
            { value: 5, label: "5\u00A0MB" },
            { value: 10, label: "10\u00A0MB" },
            { value: 25, label: "25\u00A0MB" },
            { value: 50, label: "50\u00A0MB" },
            { value: null, label: "Unlimited" },
          ],
        },
      ],
    }),
    group.with(useVideoDownloadBinding, {
      title: "Codecs",
      items: [
        {
          control: "select",
          key: "videoCodec",
          title: "Preferred Video Codec",
          description:
            "H.264 is most compatible; AV1 and VP9 are smaller but newer.",
          options: [
            { value: "h264", label: "H.264 (AVC)" },
            { value: "hevc", label: "H.265 (HEVC)" },
            { value: "av1", label: "AV1" },
            { value: "vp9", label: "VP9" },
            { value: "any", label: "Any / best" },
          ],
        },
        {
          control: "select",
          key: "audioCodec",
          title: "Preferred Audio Codec",
          description: "Falls back to the next best when unavailable.",
          options: [
            { value: "aac", label: "AAC" },
            { value: "opus", label: "Opus" },
            { value: "any", label: "Any / best" },
          ],
        },
        {
          control: "select",
          key: "container",
          title: "Container",
          description: "Auto picks the best wrapper for the chosen codecs.",
          options: [
            { value: "auto", label: "Auto" },
            { value: "mp4", label: "MP4" },
            { value: "mkv", label: "MKV" },
            { value: "webm", label: "WebM" },
            { value: "mov", label: "MOV" },
          ],
        },
      ],
    }),
    group.with(useVideoDownloadBinding, {
      title: "Subtitles",
      items: [
        {
          control: "select",
          key: "subtitles",
          title: "Subtitles",
          description:
            "Download saves a sidecar file; Embed muxes them into the video.",
          options: [
            { value: "off", label: "Off" },
            { value: "download", label: "Download sidecar" },
            { value: "embed", label: "Embed in video" },
          ],
        },
        {
          control: "select",
          key: "subtitleLang",
          title: "Subtitle Language",
          description: "Preferred language to fetch when available.",
          visible: subtitlesEnabled,
          options: [
            { value: "en", label: "English" },
            { value: "es", label: "Spanish" },
            { value: "fr", label: "French" },
            { value: "de", label: "German" },
            { value: "it", label: "Italian" },
            { value: "pt", label: "Portuguese" },
            { value: "ja", label: "Japanese" },
            { value: "ko", label: "Korean" },
            { value: "zh", label: "Chinese" },
            { value: "ru", label: "Russian" },
            { value: "ar", label: "Arabic" },
            { value: "hi", label: "Hindi" },
          ],
        },
      ],
    }),
    group.with(useVideoDownloadBinding, {
      title: "Embedding",
      items: [
        {
          control: "switch",
          key: "embedMetadata",
          title: "Embed Details",
          description: "Write title, uploader, and date into the file.",
        },
        {
          control: "switch",
          key: "embedThumbnail",
          title: "Embed Thumbnail",
          description: "Attach the poster image as cover art.",
        },
        {
          control: "switch",
          key: "embedChapters",
          title: "Embed Chapters",
          description: "Include chapter markers when the source has them.",
        },
      ],
    }),
    group.with(useVideoDownloadBinding, {
      title: "Sponsor Block",
      items: [
        {
          control: "switch",
          key: "sponsorblockRemove",
          title: "Remove Sponsors",
          description:
            "Use SponsorBlock to cut sponsor segments (YouTube only).",
        },
      ],
    }),
  ],
});
