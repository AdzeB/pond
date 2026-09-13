import { app, session } from "electron";
import log from "electron-log/main.js";

export function configureSessionDefaults(): void {
  const denyAll: Parameters<
    Electron.Session["setPermissionRequestHandler"]
  >[0] = (_wc, _permission, callback) => callback(false);
  session.defaultSession.setPermissionRequestHandler(denyAll);
  session.defaultSession.setPermissionCheckHandler(() => false);
  try {
    session
      .fromPartition("persist:pond-scrapers")
      .setPermissionRequestHandler(denyAll);
  } catch (err) {
    log.warn("[pond] scrapers session permission handler failed", err);
  }

  if (app.isPackaged) {
    const PROD_CSP = [
      "default-src 'self' pond:",
      "img-src 'self' data: blob: pond: https:",
      "media-src 'self' data: blob: pond: https:",
      "style-src 'self' 'unsafe-inline'",
      /** onnxruntime-web needs wasm-unsafe-eval and blob: for its wasm module/worker. */
      "script-src 'self' 'wasm-unsafe-eval' blob:",
      "worker-src 'self' blob:",
      "connect-src 'self' blob: http://127.0.0.1:* pond: https:",
      "font-src 'self' data: pond:",
      "frame-src pond: https://www.youtube-nocookie.com",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; ");
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      /** pond:// serves the archive viewer and wabac's service worker; injecting the app CSP/COEP there breaks replay. The app document itself loads from file://, so its CSP is unaffected. */
      if (details.url.startsWith("pond://")) {
        cb({ responseHeaders: details.responseHeaders });
        return;
      }
      const headers = { ...details.responseHeaders };
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-security-policy") {
          delete headers[key];
        }
      }
      headers["Content-Security-Policy"] = [PROD_CSP];
      /** Cross-origin isolation lets onnxruntime-web use multi-threaded WASM; `credentialless` keeps remote media loading without requiring CORP on the third party. */
      headers["Cross-Origin-Opener-Policy"] = ["same-origin"];
      headers["Cross-Origin-Embedder-Policy"] = ["credentialless"];
      cb({ responseHeaders: headers });
    });
  }
}
