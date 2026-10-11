globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
/** Pond ships only on macOS; jsdom's user agent otherwise reads as Linux and remaps `Mod` to Ctrl. */
Object.defineProperty(navigator, "platform", {
  value: "MacIntel",
  configurable: true,
});
