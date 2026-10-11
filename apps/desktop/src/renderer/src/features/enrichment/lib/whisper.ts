import {
  onDeviceModelVersion,
  TRANSCRIPTION_MODEL,
} from "@shared/on-device-models";
import { inferTranscribe } from "./inference-client";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/** decodeAudioData on a large video has aborted the renderer (Chromium exit 5). */
export const MAX_TRANSCRIPT_BYTES = 16 * 1024 * 1024;

export function whisperModelVersion(): string {
  return onDeviceModelVersion(TRANSCRIPTION_MODEL, 2);
}

export interface DecodeMono16kOptions {
  maxSamples?: number;
}

export async function decodeMono16k(
  url: string,
  options: DecodeMono16kOptions = {},
): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_TRANSCRIPT_BYTES) {
    throw new Error(`audio too large (${bytes.byteLength})`);
  }
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctx) throw new Error("no AudioContext available");
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    const length = Math.min(
      buffer.length,
      options.maxSamples ?? Number.POSITIVE_INFINITY,
    );
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0).slice(0, length);
    }
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
  return inferTranscribe(audio);
}
