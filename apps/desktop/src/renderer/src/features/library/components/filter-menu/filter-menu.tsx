import { IconBarsFilterOutline18 } from "@pond/icons/outline/18";
import { isPredicate, type Predicate } from "@pond/schema/filters/types";
import { Button, Tooltip } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SmartFolderContext } from "@/features/library/components/smart-folders/smart-folders";
import { useFolders } from "@/features/library/state/folders";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  updateLocalFilters,
  useFilterQuery,
  useSemanticQuery,
  useVisualProbe,
} from "@/features/library/state/view-store";
import { useNlFacets } from "@/features/search/hooks/use-nl-query";
import {
  accountChipLabel,
  accountRefsFromSync,
} from "@/features/search/lib/account-aliases";
import { usePrefs } from "@/features/settings/state/prefs";
import { useTagGroups } from "@/features/tags/state/tag-groups";
import { useTags } from "@/features/tags/state/tags";
import { FilterCategory } from "./category/category";
import { CustomizeFilters } from "./customize/customize";
import styles from "./filter-menu.module.css";
import { choiceOptions, type FilterOption, presetOptions } from "./options";
import { SemanticChip, VisualChip } from "./overlay/overlay";
import {
  filterToolbar,
  type OverlayId,
  useFilterToolbar,
} from "./toolbar-state";

interface FilterChoices {
  tags: FilterOption[];
  folder: FilterOption[];
  source: FilterOption[];
  creator: FilterOption[];
  account: FilterOption[];
}

export function FilterToggle() {
  const { open } = useFilterToolbar();
  const query = useFilterQuery();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const overlayCount = Number(Boolean(semantic)) + Number(Boolean(visual));
  const count =
    new Set(query.rules.filter(isPredicate).map((rule) => rule.field)).size +
    overlayCount;
  return (
    <Tooltip label={open ? "Hide Filters" : "Show Filters"} side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        className={styles.trigger}
        data-active={open || count > 0 || undefined}
        aria-label={count ? `Filter (${count} active)` : "Filter"}
        aria-expanded={open}
        aria-controls="library-filter-toolbar"
        onClick={() => {
          libraryHeader.closePopover();
          filterToolbar.setOpen(!open);
        }}
      >
        <IconBarsFilterOutline18 />
        {count > 0 ? <span className={styles.count}>{count}</span> : null}
      </Button>
    </Tooltip>
  );
}

interface FilterBarData {
  tags: readonly { name: string }[];
  tagGroups: ReturnType<typeof useTagGroups>;
  folders: readonly { id: string; name: string }[];
  facets: ReturnType<typeof useNlFacets>;
  refs: ReturnType<typeof accountRefsFromSync>;
}

export function FilterBar() {
  const tags = useTags();
  const tagGroups = useTagGroups();
  const folders = useFolders();
  const facets = useNlFacets();
  const [sync] = usePrefs("sync");
  return (
    <FilterBarView
      tags={tags}
      tagGroups={tagGroups}
      folders={folders}
      facets={facets}
      refs={accountRefsFromSync(sync)}
    />
  );
}

export function FilterBarView({
  tags,
  tagGroups,
  folders,
  facets,
  refs,
}: FilterBarData) {
  const { open, pinned, overlays } = useFilterToolbar();
  const query = useFilterQuery();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const rows = query.rules.filter(isPredicate);
  const activeFields = rows.map((row) =>
    row.field === "height" ? "width" : row.field,
  );
  const fields = [
    ...new Set(
      [...pinned, ...activeFields].map((field) =>
        field === "height" ? "width" : field,
      ),
    ),
  ];
  const shownOverlays: OverlayId[] = [
    ...(overlays.includes("visual") || visual ? (["visual"] as const) : []),
    ...(overlays.includes("semantic") || semantic
      ? (["semantic"] as const)
      : []),
  ];
  const chips = [
    ...fields.filter((field) => field === "color"),
    ...shownOverlays,
    ...fields.filter((field) => field !== "color"),
  ];
  const choices: FilterChoices = {
    tags: choiceOptions(
      "tags",
      tags.map((tag) => ({ label: tag.name, value: tag.name.toLowerCase() })),
    ),
    folder: choiceOptions(
      "folder",
      folders.map((folder) => ({
        label: folder.name,
        value: folder.id.toLowerCase(),
      })),
    ),
    source: choiceOptions(
      "source",
      facets.sources.map((value) => ({ label: value, value })),
    ),
    creator: choiceOptions(
      "creator",
      facets.creators.map((value) => ({ label: value, value })),
    ),
    account: choiceOptions(
      "account",
      refs.map((ref) => ({
        label: accountChipLabel(ref.id, refs),
        value: ref.id.toLowerCase(),
      })),
    ),
  };

  const apply = (next: Predicate[]) => {
    updateLocalFilters(next);
  };
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : {
        height: { duration: 0.2, ease: [0.165, 0.84, 0.44, 1] },
        y: { duration: 0.2, ease: [0.165, 0.84, 0.44, 1] },
        opacity: { duration: 0.08 },
      };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.fieldset
          key="library-filter-toolbar"
          id="library-filter-toolbar"
          className={styles.shell}
          aria-label="Library Filters"
          initial={{ height: 0, opacity: 0, y: -4 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -4, pointerEvents: "none" }}
          transition={transition}
        >
          <div className={styles.bar}>
            <SmartFolderContext />
            {chips.map((chip) =>
              chip === "semantic" ? (
                <SemanticChip key="semantic" />
              ) : chip === "visual" ? (
                <VisualChip key="visual" />
              ) : (
                <FilterCategory
                  key={chip}
                  field={chip}
                  options={
                    Object.entries(choices).find(
                      ([field]) => field === chip,
                    )?.[1] ?? presetOptions(chip)
                  }
                  tagGroups={chip === "tags" ? tagGroups : undefined}
                  rows={rows}
                  onChange={apply}
                />
              ),
            )}
            <CustomizeFilters
              choices={choices}
              activeFields={activeFields}
              semanticActive={Boolean(semantic)}
              visualActive={Boolean(visual)}
            />
          </div>
        </motion.fieldset>
      ) : null}
    </AnimatePresence>
  );
}
