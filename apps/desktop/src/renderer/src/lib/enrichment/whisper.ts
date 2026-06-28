import { getPrefsSnapshot } from "@/stores/prefs";
import { inferTranscribe } from "./inference-client";

// Whisper speech-to-text for video/audio saves. Audio is decoded to 16 kHz mono
// here on the main thread (Web Audio API is window-only), then the PCM buffer is
// handed to the inference worker for the actual ASR run (inference-core).

const DEFAULT_MODEL_ID = "Xenova/whisper-tiny";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.whisperModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function whisperModelVersion(): string {
  return `${modelId()}@1`;
}

// Decode an audio/video URL into a 16 kHz mono PCM buffer. The AudioContext
// sample rate forces resampling on decode; channels are averaged to mono.
async function decodeMono16k(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  const bytes = await res.arrayBuffer();
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

// Transcribe one audio/video URL to plain text ("" when there's no speech).
export async function transcribeAudio(url: string): Promise<string> {
  const audio = await decodeMono16k(url);
  return inferTranscribe(audio, modelId());
}
