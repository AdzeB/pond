import {
  NATIVE_HOST_NAME,
  type NativeRequest,
  type NativeResponse,
  nativeResponseSchema,
  SAFARI_HOST_NAME,
} from "@pond/schema/native";

/**
 * Safari routes `sendNativeMessage` to the `SafariWebExtensionHandler` in Pond's app
 * extension, and the host is declared per app, so it carries its own name. Chrome,
 * Edge, Brave, and Firefox all launch `pond-native-host` under one name.
 *
 * `import.meta.env.BROWSER` is the browser passed to `wxt -b`, so this resolves to a
 * constant at build time.
 */
const HOST_NAME =
  import.meta.env.BROWSER === "safari" ? SAFARI_HOST_NAME : NATIVE_HOST_NAME;

export async function nativeCall(
  request: NativeRequest,
): Promise<NativeResponse> {
  try {
    const response = await browser.runtime.sendNativeMessage(
      HOST_NAME,
      request,
    );
    const parsed = nativeResponseSchema.safeParse(response);
    return parsed.success ? parsed.data : { ok: false, error: "offline" };
  } catch {
    return { ok: false, error: "offline" };
  }
}
