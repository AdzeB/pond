import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import type { FieldId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import {
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { applyNavFilter } from "@/features/saves";
import { useSaves } from "@/features/saves/pool";

export function useChoiceCounts(field: FieldId) {
  const saves = useSaves();
  const nav = useLibraryNav();
  const memberships = useFolderMemberships();
  const folders = useFolders();
  return useMemo(() => {
    const counts = new Map<string, number>();
    let empty = 0;
    const scoped = applyNavFilter(
      saves.filter((save) =>
        nav.kind === "trash" ? !!save.deletedAt : !save.deletedAt,
      ),
      nav,
      memberships,
      folders,
    );
    for (const save of scoped) {
      const projected = FIELD_DESCRIPTORS[field].project({
        ...save,
        folderIds: memberships[save.id] ?? [],
      });
      const values = Array.isArray(projected)
        ? projected
        : projected == null || projected === ""
          ? []
          : [projected];
      if (!values.length) empty++;
      for (const value of new Set(
        values.map((value) => String(value).toLowerCase()),
      ))
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return { counts, empty };
  }, [saves, nav, memberships, folders, field]);
}
