/// <reference lib="dom" />

import { webFrame } from "electron";

const TWITTER_HOOK = `
  (() => {
    if (globalThis.__pondBookmarksHookInstalled) return;
    globalThis.__pondBookmarksHookInstalled = true;
    globalThis.__pondBookmarksCaptures = [];
    // The first real Bookmarks request the page makes, captured verbatim so
    // we can replay it with our own pagination cursor. X validates auth via
    // the bearer + x-csrf-token + a per-request x-client-transaction-id, so
    // cloning the page's own headers is far more robust than reconstructing
    // them by hand (and lets us walk every page without scrolling the UI).
    globalThis.__pondBookmarksRequest = null;

    const isBookmarksUrl = (u) => {
      try {
        return (
          typeof u === "string" &&
          /\\/i\\/api\\/graphql\\/[^\\/]+\\/Bookmarks/.test(u)
        );
      } catch (e) {
        return false;
      }
    };

    const captureRequest = (url, method, headers) => {
      try {
        if (globalThis.__pondBookmarksRequest) return;
        globalThis.__pondBookmarksRequest = {
          url: url,
          method: method || "GET",
          headers: headers || {},
        };
      } catch (e) {
        /* never block the request */
      }
    };

    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (isBookmarksUrl(url)) {
          this.__pondIsBookmarks = true;
          this.__pondMethod = method;
          this.__pondUrl = url;
          this.__pondHeaders = {};
          this.addEventListener("load", () => {
            try {
              captureRequest(url, method, this.__pondHeaders);
              globalThis.__pondBookmarksCaptures.push({
                url: url,
                body: this.responseText,
                status: this.status,
              });
            } catch (e) {
              /* response body not readable; skip */
            }
          });
        }
      } catch (e) {
        /* URL match threw; never block the request */
      }
      return xhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      try {
        if (this.__pondIsBookmarks && this.__pondHeaders) {
          this.__pondHeaders[String(name).toLowerCase()] = String(value);
        }
      } catch (e) {
        /* ignore */
      }
      return xhrSetHeader.apply(this, arguments);
    };

    const readHeaders = (input, init) => {
      const out = {};
      try {
        if (input && typeof input !== "string" && input.headers) {
          input.headers.forEach((v, k) => {
            out[String(k).toLowerCase()] = String(v);
          });
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (init && init.headers) {
          new Headers(init.headers).forEach((v, k) => {
            out[String(k).toLowerCase()] = String(v);
          });
        }
      } catch (e) {
        /* ignore */
      }
      return out;
    };

    const origFetch = globalThis.fetch;
    if (typeof origFetch === "function") {
      globalThis.fetch = function (input, init) {
        let url = "";
        try {
          url =
            typeof input === "string"
              ? input
              : input && typeof input.url === "string"
                ? input.url
                : "";
        } catch (e) {
          /* ignore */
        }
        const promise = origFetch.apply(this, arguments);
        if (isBookmarksUrl(url)) {
          try {
            const method =
              (init && init.method) ||
              (input && typeof input !== "string" && input.method) ||
              "GET";
            captureRequest(url, method, readHeaders(input, init));
          } catch (e) {
            /* ignore */
          }
          promise
            .then((res) => {
              try {
                const clone = res.clone();
                clone
                  .text()
                  .then((body) => {
                    try {
                      globalThis.__pondBookmarksCaptures.push({
                        url: url,
                        body: body,
                        status: res.status,
                      });
                    } catch (e) {
                      /* ignore */
                    }
                  })
                  .catch(() => {});
              } catch (e) {
                /* clone failed; skip */
              }
              return res;
            })
            .catch(() => {
              /* don't disturb the caller's error path */
            });
        }
        return promise;
      };
    }
  })();
`;

const COSMOS_HOOK = `
  (() => {
    if (globalThis.__pondCosmosHookInstalled) return;
    globalThis.__pondCosmosHookInstalled = true;
    globalThis.__pondCosmosCaptures = [];

    const isCosmosGraphqlUrl = (u) => {
      try {
        if (typeof u !== "string") return false;
        return /(^|\\.)api\\.cosmos\\.so\\/graphql/.test(u);
      } catch (e) {
        return false;
      }
    };

    const xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (isCosmosGraphqlUrl(url)) {
          this.addEventListener("load", () => {
            try {
              globalThis.__pondCosmosCaptures.push({
                url: url,
                body: this.responseText,
                status: this.status,
              });
            } catch (e) {
              /* response body not readable; skip */
            }
          });
        }
      } catch (e) {
        /* URL match threw; never block the request */
      }
      return xhrOpen.apply(this, arguments);
    };

    const origFetch = globalThis.fetch;
    if (typeof origFetch === "function") {
      globalThis.fetch = function (input, init) {
        let url = "";
        try {
          url = typeof input === "string"
            ? input
            : (input && typeof input.url === "string" ? input.url : "");
        } catch (e) { /* ignore */ }
        const promise = origFetch.apply(this, arguments);
        if (isCosmosGraphqlUrl(url)) {
          promise.then((res) => {
            try {
              const clone = res.clone();
              clone.text().then((body) => {
                try {
                  globalThis.__pondCosmosCaptures.push({
                    url: url,
                    body: body,
                    status: res.status,
                  });
                } catch (e) { /* ignore */ }
              }).catch(() => { /* ignore */ });
            } catch (e) { /* clone failed; skip */ }
            return res;
          }).catch(() => { /* don't disturb the caller's error path */ });
        }
        return promise;
      };
    }
  })();
`;

const host =
  typeof location !== "undefined" ? location.hostname.toLowerCase() : "";
const isTwitter =
  host === "x.com" ||
  host === "twitter.com" ||
  host.endsWith(".x.com") ||
  host.endsWith(".twitter.com");
const isCosmos = host === "cosmos.so" || host.endsWith(".cosmos.so");

if (isTwitter) {
  webFrame.executeJavaScript(TWITTER_HOOK).catch(() => {
    /* hook install failures are non-fatal; the harvester falls back to
       DOM-only walking with no GraphQL enrichment. */
  });
}

if (isCosmos) {
  webFrame.executeJavaScript(COSMOS_HOOK).catch(() => {
    /* see note above */
  });
}
