import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // WXT defaults to the first free port in 3000..3010 and silently falls back,
  // which collides with @pond/website's Next dev server and leaves the IPv4/IPv6
  // listeners split across the two apps. Pin to 3001 and fail loud instead.
  dev: {
    server: {
      port: 3001,
      strictPort: true,
      origin: "http://localhost:3001",
    },
  },
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "Pond",
    version: "0.1.0",
    description:
      "Capture saves from Twitter/X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, and web articles into one place.",
    icons: {
      16: "icons/16.png",
      32: "icons/32.png",
      48: "icons/48.png",
      128: "icons/128.png",
    },
    action: {
      default_title: "Pond",
      default_popup: "popup.html",
      default_icon: {
        16: "icons/16.png",
        32: "icons/32.png",
        48: "icons/48.png",
        128: "icons/128.png",
      },
    },
    permissions: [
      "storage",
      "activeTab",
      "tabs",
      // Required by the "Push session to Pond" flow: reads httpOnly cookies the renderer can't see.
      "cookies",
    ],
    host_permissions: [
      "https://x.com/*",
      "https://twitter.com/*",
      "https://www.instagram.com/*",
      "https://www.pinterest.com/*",
      "https://*.pinterest.com/*",
      "https://www.are.na/*",
      "https://are.na/*",
      "https://www.cosmos.so/*",
      "https://cosmos.so/*",
      "https://www.tiktok.com/*",
      "https://www.youtube.com/*",
      "https://m.youtube.com/*",
      "http://127.0.0.1/*",
      "http://localhost/*",
      "<all_urls>",
    ],
  },
});
