import { env } from "@huggingface/transformers";

type InferenceDevice = "webgpu" | "wasm";

let wasmConfigured = false;
/** transformers.js/onnxruntime-web default to all logical cores, which pegs the machine on the CPU path; half the cores keeps the UI responsive while still making progress. */
function capWasmThreads(): void {
  if (wasmConfigured) return;
  wasmConfigured = true;
  const cores =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 4;
  const isolated =
    typeof crossOriginIsolated !== "undefined" ? crossOriginIsolated : false;
  const hasSAB = typeof SharedArrayBuffer !== "undefined";
  /** Multi-threaded WASM needs cross-origin isolation AND SharedArrayBuffer; otherwise onnxruntime silently runs single-threaded. */
  const threads = isolated && hasSAB ? Math.max(1, Math.floor(cores / 2)) : 1;
  try {
    const wasm = (env.backends as { onnx?: { wasm?: { numThreads?: number } } })
      ?.onnx?.wasm;
    if (wasm) wasm.numThreads = threads;
  } catch {}
  console.info(
    `[inference] wasm threads=${threads} (cores=${cores}, crossOriginIsolated=${isolated}, SharedArrayBuffer=${hasSAB})`,
  );
  if (!isolated) {
    console.warn(
      "[inference] page is NOT cross-origin isolated — WASM inference is " +
        "single-threaded. Check COOP/COEP headers on the renderer.",
    );
  }
}

let devicePromise: Promise<InferenceDevice> | null = null;

/**
 * Probed once and cached for the session: `'gpu' in navigator` can be true while requestAdapter() resolves null, so only a real adapter counts as WebGPU.
 * @remarks Never requests a fallback adapter; a software adapter runs on the CPU and is hotter than plain WASM.
 */
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
