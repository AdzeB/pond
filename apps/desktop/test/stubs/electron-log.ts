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
