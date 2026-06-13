// Minimal electron-log stub for Vitest (no-op logger).
const noop = () => {};
const logger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  verbose: noop,
  log: noop,
};
export default logger;
