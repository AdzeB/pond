import { RawImage } from "@huggingface/transformers";
import { describe, expect, it } from "vitest";
import {
  createAudioEmbeddingRequest,
  createVideoEmbeddingRequest,
  inferEmbedAudio,
  inferEmbedVideoFrames,
  MAX_EMBEDDING_AUDIO_SAMPLES,
  MAX_EMBEDDING_VIDEO_DURATION_SECONDS,
  MAX_EMBEDDING_VIDEO_FRAMES,
} from "./inference-client";

function image(value: number): RawImage {
  return new RawImage(
    new Uint8ClampedArray([value, value, value, 255]),
    1,
    1,
    4,
  );
}

describe("EmbeddingGemma media inference requests", () => {
  it("copies bounded mono 16 kHz audio into a transferable request", () => {
    const audio = new Float32Array([0.25, -0.5]);
    const prepared = createAudioEmbeddingRequest(audio);

    expect(prepared.request).toMatchObject({ op: "embedAudio" });
    expect(prepared.request.audio).toEqual(audio);
    expect(prepared.request.audio).not.toBe(audio);
    expect(prepared.transfer).toEqual([prepared.request.audio.buffer]);
  });

  it("rejects audio longer than thirty seconds before posting", () => {
    const audio = new Float32Array(MAX_EMBEDDING_AUDIO_SAMPLES + 1);

    expect(() => createAudioEmbeddingRequest(audio)).toThrow(
      "audio must contain 1-480000 finite mono 16 kHz samples",
    );
  });

  it("serializes bounded ordered video frames and their timestamps", () => {
    const prepared = createVideoEmbeddingRequest(
      [
        { image: image(10), timestamp: 0 },
        { image: image(20), timestamp: 1 },
      ],
      2,
    );

    expect(prepared.request).toMatchObject({
      op: "embedVideoFrames",
      duration: 2,
      frames: [{ timestamp: 0 }, { timestamp: 1 }],
    });
    expect(prepared.transfer).toEqual(
      prepared.request.frames.map((frame) => frame.image.data),
    );
  });

  it("rejects video outside the bounded frame and duration contract", () => {
    const tooMany = Array.from(
      { length: MAX_EMBEDDING_VIDEO_FRAMES + 1 },
      (_, index) => ({ image: image(index), timestamp: index / 2 }),
    );
    expect(() => createVideoEmbeddingRequest(tooMany, 32)).toThrow(
      "video must contain 1-32 frames",
    );

    expect(() =>
      createVideoEmbeddingRequest(
        [{ image: image(1), timestamp: 0 }],
        MAX_EMBEDDING_VIDEO_DURATION_SECONDS + 1,
      ),
    ).toThrow("video duration must be greater than 0 and at most 32 seconds");
  });

  it("rejects unordered or out-of-range video timestamps", () => {
    expect(() =>
      createVideoEmbeddingRequest(
        [
          { image: image(1), timestamp: 1 },
          { image: image(2), timestamp: 0.5 },
        ],
        2,
      ),
    ).toThrow(
      "video frame timestamps must be finite, ordered, and within duration",
    );
  });

  it("validates public media APIs before selecting worker or fallback", () => {
    expect(() =>
      inferEmbedAudio(new Float32Array(MAX_EMBEDDING_AUDIO_SAMPLES + 1)),
    ).toThrow("audio must contain 1-480000 finite mono 16 kHz samples");
    expect(() =>
      inferEmbedVideoFrames(
        [{ image: image(1), timestamp: 33 }],
        MAX_EMBEDDING_VIDEO_DURATION_SECONDS,
      ),
    ).toThrow(
      "video frame timestamps must be finite, ordered, and within duration",
    );
  });
});
