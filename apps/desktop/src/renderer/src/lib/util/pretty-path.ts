/** Collapse the home directory to `~` so library paths stay short in settings. */
export function prettyPath(path: string): string {
  return path
    .replace(/\/+$/, "")
    .replace(/^\/Users\/[^/]+/, "~")
    .replace(/^\/home\/[^/]+/, "~");
}
