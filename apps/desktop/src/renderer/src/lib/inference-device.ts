import { env } from "@huggingface/transformers";

// Centralized device selection for every on-device transformer model (NSFW,
// embeddings, CLIP, Florence, Whisper). It does two things the per-model loaders
// previously got wrong, which together were a major source of fan/heat:
//
//   1. Pick WebGPU vs WASM *correctly*. `'gpu' in navigator` can be true while
//      `requestAdapter()` resolves to null (no usable hardware adapter). The old
//      check treated property-presence as "GPU available", so a failed adapter
//      silently dropped every model onto the CPU. We probe the real adapter once
//      and cache the verdict. We never request a fallback adapter, because a
//      software adapter would run on the CPU and be hotter than plain WASM.
//
//   2. Cap WASM (CPU) threads. transformers.js/onnxruntime-web default to using
//      all logical cores, which pegs the machine and spins the fans whenever the
//      CPU path is taken. Half the cores keeps the UI responsive and the laptop
//      cool while still making progress; the WebGPU path is unaffected.

export type InferenceDevice = "webgpu" | "wasm";

let wasmConfigured = false;
function capWasmThreads(): void {
  if (wasmConfigured) return;
  wasmConfigured = true;
  const cores =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 4;
  const threads = Math.max(1, Math.floor(cores / 2));
  try {
    const wasm = (env.backends as { onnx?: { wasm?: { numThreads?: number } } })
      ?.onnx?.wasm;
    if (wasm) wasm.numThreads = threads;
  } catch {
    // Backend not initialized yet or the shape changed upstream — safe to skip.
  }
}

let devicePromise: Promise<InferenceDevice> | null = null;

// Resolve the device to load models on. Probed once and cached for the session.
export function pickDevice(): Promise<InferenceDevice> {
  if (!devicePromise) {
    devicePromise = (async (): Promise<InferenceDevice> => {
      capWasmThreads();
      try {
        const gpu = (
          navigator as Navigator & {
            gpu?: { requestAdapter: () => Promise<unknown> };
          }
        ).gpu;
        if (gpu) {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            console.info("[inference] using WebGPU");
            return "webgpu";
          }
        }
      } catch (err) {
        console.warn("[inference] WebGPU probe failed", err);
      }
      console.warn(
        "[inference] no WebGPU adapter — running on CPU (WASM); on-device " +
          "inference will be slower and run the machine warmer",
      );
      return "wasm";
    })();
  }
  return devicePromise;
}
