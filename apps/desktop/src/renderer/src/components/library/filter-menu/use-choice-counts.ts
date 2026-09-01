import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import type { FieldId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { useSavePaging, useSaves } from "@/hooks/use-saves";
import { applyNavFilter } from "@/lib/save/nav-filter";
import { useFolderMemberships, useFolders } from "@/stores/folders";
import { useLibraryNav } from "@/stores/library-chrome";

export function useChoiceCounts(field: FieldId) {
  const saves = useSaves();
  const nav = useLibraryNav();
  const memberships = useFolderMemberships();
  const folders = useFolders();
  const { hasMore } = useSavePaging();
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
    return { counts, empty, partial: hasMore };
  }, [saves, nav, memberships, folders, field, hasMore]);
}
