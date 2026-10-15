import { useEffect, useRef, useState } from "react";
import { cachedThumbnails, downloadThumbnail } from "./thumbnails";

const CONCURRENCY = 6;
const EMPTY: ReadonlyMap<string, string | null> = new Map();

/** Maps Save ids to a cover path, `null` for no cover, or nothing while loading. */
export function useThumbnails(
  ids: readonly string[],
): ReadonlyMap<string, string | null> {
  const [paths, setPaths] = useState<ReadonlyMap<string, string | null> | null>(
    null,
  );
  const requested = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    void cachedThumbnails()
      .catch(() => new Map<string, string>())
      .then((cached) => {
        if (active) setPaths(cached);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!paths) return;
    const queue = ids.filter(
      (id) => !paths.has(id) && !requested.current.has(id),
    );
    for (const id of queue) requested.current.add(id);

    async function work() {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        const saveId = id;
        const path = await downloadThumbnail(saveId).catch(() => null);
        setPaths((current) => new Map(current ?? []).set(saveId, path));
      }
    }
    for (let worker = 0; worker < CONCURRENCY; worker += 1) void work();
  }, [ids, paths]);

  return paths ?? EMPTY;
}
