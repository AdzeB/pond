import { IconFolderOpenOutline18 as Folder } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { prettyPath } from "@/lib/util/pretty-path";
import styles from "./styles.module.css";

interface LibraryInfo {
  path: string;
  name: string;
}

type ActionResult = { ok: true } | { ok: false; reason: string };

export function LocationRow() {
  const { data: info } = useQuery({
    queryKey: ["library-info"],
    queryFn: async () =>
      (await window.pond.query("library.info", {})) as LibraryInfo,
  });

  const openExisting = useMutation({
    mutationFn: async () => {
      const picked = (await window.pond.query("library.pickExisting", {})) as
        | { ok: true; path: string }
        | { ok: false; reason: string };
      if (!picked.ok) return;
      /** Switching relaunches, so there's no success state to settle into. */
      const res = (await window.pond.query("library.switchTo", {
        path: picked.path,
      })) as ActionResult;
      if (!res.ok) throw new Error(res.reason);
    },
  });

  const openError = openExisting.isError
    ? openExisting.error instanceof Error
      ? `Couldn't open library: ${openExisting.error.message}`
      : "Couldn't open library."
    : null;

  return (
    <div className={styles.card}>
      <span aria-hidden className={styles.avatar}>
        <Folder size={20} />
      </span>
      <div className={styles.meta}>
        <span className={styles.name}>{info?.name ?? "Library"}</span>
        {info ? (
          <span className={styles.path}>{prettyPath(info.path)}</span>
        ) : null}
        {openError ? (
          <span className={styles.error} role="alert">
            {openError}
          </span>
        ) : null}
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void window.pond.query("library.openInFinder", {})}
      >
        Reveal in Finder
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={openExisting.isPending}
        onClick={() => openExisting.mutate()}
      >
        Open Library
      </Button>
    </div>
  );
}
