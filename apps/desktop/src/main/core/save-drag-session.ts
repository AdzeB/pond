interface DraggedFile {
  id: string;
  path: string;
}

let dragged: readonly DraggedFile[] = [];

export function rememberSaveDrag(files: readonly DraggedFile[]): void {
  dragged = [...files];
}

/** Native drags carry only file paths, so a drop resolves to Saves only when it matches the last drag Pond started. */
export function resolveSaveDrop(paths: readonly string[]): string[] {
  const byPath = new Map(dragged.map((file) => [file.path, file.id]));
  const ids = paths.flatMap((path) => {
    const id = byPath.get(path);
    return id ? [id] : [];
  });
  return [...new Set(ids)];
}
