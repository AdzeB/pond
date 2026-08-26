import {
  NATIVE_HOST_NAME,
  type NativeRequest,
  type NativeResponse,
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
      if (!response || typeof response !== "object") {
        resolve({ ok: false, error: "offline" });
        return;
      }
      const row = response as NativeResponse;
      if (row.ok === true || row.ok === false) {
        resolve(row);
        return;
      }
      resolve({ ok: false, error: "offline" });
    });
  });
}
