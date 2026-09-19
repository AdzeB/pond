import {
  IconImageSparkleOutline18,
  IconPlusOutline18,
  IconTextToImageOutline18,
} from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { Menu, Tooltip } from "@pond/ui";
import { useState } from "react";
import { libraryHeader } from "@/features/library/state/library-header";
import { fieldIcon } from "@/features/search/lib/fields";
import { FilterPopup } from "../chip";
import {
  FILTER_SECTIONS,
  type FilterOption,
  fieldMatchesQuery,
  presetOptions,
} from "../options";
import { filterToolbar, useFilterToolbar } from "../toolbar-state";
import styles from "./styles.module.css";

export function CustomizeFilters({
  choices,
  activeFields,
  semanticActive,
  visualActive,
}: {
  choices: Partial<Record<FieldId, FilterOption[]>>;
  activeFields: FieldId[];
  semanticActive: boolean;
  visualActive: boolean;
}) {
  const { pinned, overlays } = useFilterToolbar();
  const [search, setSearch] = useState("");
  const overlayQuery = search.trim().toLowerCase();
  const showSemantic = !overlayQuery || "semantic".includes(overlayQuery);
  const showVisual =
    !overlayQuery ||
    "visual match".includes(overlayQuery) ||
    "visual".includes(overlayQuery);
  const sections = FILTER_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) =>
      fieldMatchesQuery(field, search, choices[field] ?? presetOptions(field)),
    ),
  })).filter((section) => section.fields.length > 0);
  const fields = sections.flatMap((section) => section.fields);
  const searching = overlayQuery.length > 0;

  const renderOverlay = (overlay: "visual" | "semantic") => {
    const label = overlay === "visual" ? "Visual Match" : "Semantic";
    const active = overlay === "visual" ? visualActive : semanticActive;
    const Icon =
      overlay === "visual"
        ? IconImageSparkleOutline18
        : IconTextToImageOutline18;
    return (
      <Menu.CheckboxItem
        key={overlay}
        checked={overlays.includes(overlay)}
        closeOnClick={false}
        onCheckedChange={(checked) =>
          filterToolbar.setOverlayPinned(overlay, checked)
        }
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemIcon>
          <Icon />
        </Menu.ItemIcon>
        <Menu.ItemLabel>{label}</Menu.ItemLabel>
        {active ? <Menu.SecondaryLabel>Active</Menu.SecondaryLabel> : null}
      </Menu.CheckboxItem>
    );
  };

  const renderField = (field: FieldId) => {
    const Icon = fieldIcon(field);
    return (
      <Menu.CheckboxItem
        key={field}
        checked={pinned.includes(field)}
        closeOnClick={false}
        onCheckedChange={(checked) => filterToolbar.setPinned(field, checked)}
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemIcon>
          <Icon />
        </Menu.ItemIcon>
        <Menu.ItemLabel>{FIELD_META[field].label}</Menu.ItemLabel>
        {activeFields.includes(field) ? (
          <Menu.SecondaryLabel>Active</Menu.SecondaryLabel>
        ) : null}
      </Menu.CheckboxItem>
    );
  };

  const renderSubmenu = (
    label: string,
    items: ReturnType<typeof renderField>[],
  ) => (
    <Menu.SubmenuRoot key={label}>
      <Menu.SubmenuTrigger>
        <Menu.ItemLabel>{label}</Menu.ItemLabel>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          side="inline-end"
          align="start"
          sideOffset={-2}
          alignOffset={-4}
        >
          <FilterPopup>{items}</FilterPopup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) libraryHeader.closePopover();
        else setSearch("");
      }}
    >
      <Tooltip label="Customize Filters" side="bottom">
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="Customize Filters"
        >
          <IconPlusOutline18 />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <FilterPopup className={styles.popup}>
            <Menu.Input
              aria-label="Find Filter"
              placeholder="Find Filter…"
              value={search}
              onValueChange={setSearch}
            />
            <Menu.List>
              {searching ? (
                <>
                  {showVisual ? renderOverlay("visual") : null}
                  {showSemantic ? renderOverlay("semantic") : null}
                  {fields.map(renderField)}
                </>
              ) : (
                <>
                  {renderSubmenu("Discovery", [
                    renderOverlay("visual"),
                    renderOverlay("semantic"),
                  ])}
                  {sections.map((section) =>
                    renderSubmenu(
                      section.label,
                      section.fields.map(renderField),
                    ),
                  )}
                </>
              )}
              {searching &&
              fields.length === 0 &&
              !showSemantic &&
              !showVisual ? (
                <Menu.Item disabled>
                  <Menu.ItemLabel>No matches</Menu.ItemLabel>
                </Menu.Item>
              ) : null}
            </Menu.List>
            <Menu.Separator />
            <Menu.Item onClick={() => filterToolbar.restoreDefaults()}>
              <Menu.ItemLabel>Reset Filters</Menu.ItemLabel>
            </Menu.Item>
          </FilterPopup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
