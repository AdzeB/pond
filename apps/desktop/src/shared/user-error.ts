/** Marks an error whose message is product copy, so the renderer may show it verbatim. */
export const USER_ERROR_NAME = "PondUserError";

/**
 * Electron serializes a rejected invoke as `<name>: <message>`, so the name is the only
 * marker that survives the main-to-renderer boundary.
 */
export function userError(message: string): Error {
  const error = new Error(message);
  error.name = USER_ERROR_NAME;
  return error;
}
