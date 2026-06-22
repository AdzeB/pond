import { env, pipeline } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";

// Whisper runtime for on-device speech-to-text over video/audio saves. Lazy,
// opt-in, WebGPU-then-WASM. Audio is decoded to 16 kHz mono in the renderer via
// the Web Audio API before being handed to the ASR pipeline.

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

type Transcriber = (
  audio: Float32Array,
  opts?: Record<string, unknown>,
) => Promise<{ text: string } | Array<{ text: string }>>;

let transcriberPromise: Promise<Transcriber> | null = null;

function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      env.allowLocalModels = false;
      const id = modelId();
      const build = async (device: "webgpu" | "wasm") => {
        const pipe = await pipeline("automatic-speech-recognition", id, {
          device,
          dtype: device === "webgpu" ? "fp16" : "q8",
        });
        console.info(`[whisper] ready (${device})`);
        return pipe as unknown as Transcriber;
      };
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
          return await build("webgpu");
        } catch (err) {
          console.warn("[whisper] WebGPU unavailable; using WASM", err);
        }
      }
      return build("wasm");
    })();
    transcriberPromise.catch((err) => {
      console.error("[whisper] failed to load", err);
      transcriberPromise = null;
    });
  }
  return transcriberPromise;
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
  const transcriber = await getTranscriber();
  const out = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
  return (text ?? "").trim();
}
