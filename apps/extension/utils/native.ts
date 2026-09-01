import {
  NATIVE_HOST_NAME,
  type NativeRequest,
  type NativeResponse,
  nativeResponseSchema,
} from "@pond/schema/native";

export async function nativeCall(
  request: NativeRequest,
): Promise<NativeResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, request, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: "offline" });
        return;
      }
      const parsed = nativeResponseSchema.safeParse(response);
      resolve(parsed.success ? parsed.data : { ok: false, error: "offline" });
    });
  });
}
