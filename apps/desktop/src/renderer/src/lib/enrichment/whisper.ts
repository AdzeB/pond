import { getPrefsSnapshot } from "@/stores/prefs";
import { inferTranscribe } from "./inference-client";

const DEFAULT_MODEL_ID = "Xenova/whisper-tiny";
/** decodeAudioData on a large video has aborted the renderer (Chromium exit 5). */
export const MAX_TRANSCRIPT_BYTES = 16 * 1024 * 1024;

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.whisperModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function whisperModelVersion(): string {
  return `${modelId()}@1`;
}

async function decodeMono16k(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_TRANSCRIPT_BYTES) {
    throw new Error(`audio too large (${bytes.byteLength})`);
  }
  const Ctx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0).slice();
    }
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i += 1) {
        mono[i] = (mono[i] ?? 0) + (data[i] ?? 0);
      }
    }
    for (let i = 0; i < length; i += 1) {
      mono[i] = (mono[i] ?? 0) / channels;
    }
    return mono;
  } finally {
    await ctx.close();
  }
}

export async function transcribeAudio(url: string): Promise<string> {
  const audio = await decodeMono16k(url);
  return inferTranscribe(audio, modelId());
}
