export function prettyPath(path: string): string {
  return path
    .replace(/\/+$/, "")
    .replace(/^\/Users\/[^/]+/, "~")
    .replace(/^\/home\/[^/]+/, "~");
}
