// Friendly path for the library switcher: the bundle's parent directory with the
// user's home collapsed to `~` (the library name is shown separately).
export function prettyPath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  const dir = slash > 0 ? trimmed.slice(0, slash) : trimmed;
  return dir.replace(/^\/Users\/[^/]+/, "~").replace(/^\/home\/[^/]+/, "~");
}
