import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { resetFilters, setQuery } from "@/features/library/state/view-store";
import { descendantFolderIds } from "@/features/saves";
import { getAppRouter } from "@/shared/lib/app-router";

export function enterFolder(folderId: string): void {
  resetFilters();
  libraryChrome.setNav({ kind: "folder", id: folderId });
  getAppRouter()?.history.push("/");
}

export function enterFolders(ids: string[], includeSubfolders: boolean): void {
  if (ids.length === 0) {
    resetFilters();
    libraryChrome.setNav({ kind: "all" });
    getAppRouter()?.history.push("/");
    return;
  }
  if (ids.length === 1 && ids[0]) {
    enterFolder(ids[0]);
    return;
  }
  resetFilters();
  libraryChrome.setNav({ kind: "all" });
  setQuery({
    combinator: "and",
    rules: [
      {
        field: "folder",
        operator: "some",
        value: [
          ...new Set(
            ids.flatMap((id) =>
              includeSubfolders
                ? [...descendantFolderIds(id, folders.snapshot())]
                : [id],
            ),
          ),
        ],
      },
    ],
  });
  getAppRouter()?.history.push("/");
}
