import { Sidebar } from "@pond/ui";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import {
  SETTINGS_MASTER_GROUPS,
  type SectionDef,
  sectionForId,
  sectionForPath,
} from "@/lib/settings/registry";
import {
  SETTINGS_SEARCH_INDEX,
  type SettingsSearchEntry,
} from "@/lib/settings/search-index";
import { settingsModal, useSettingsModal } from "@/stores/settings-modal";
import styles from "./styles.module.css";

interface SectionResult {
  section: SectionDef;
  items: SettingsSearchEntry[];
}

export function SettingsSidebar() {
  const activeSection = useSettingsModal().section;
  const [query, setQuery] = useState("");
  const needle = query.trim();

  const fuse = useMemo(
    () =>
      new Fuse(SETTINGS_SEARCH_INDEX, {
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.3,
        keys: [
          { name: "title", weight: 3 },
          { name: "keywords", weight: 2 },
          { name: "sectionLabel", weight: 2 },
          { name: "description", weight: 1 },
          { name: "groupTitle", weight: 1 },
        ],
      }),
    [],
  );

  const results = useMemo<SectionResult[] | null>(() => {
    if (!needle) return null;
    const bySection = new Map<string, SectionResult>();
    for (const { item } of fuse.search(needle)) {
      const section = sectionForId(item.sectionId);
      if (!section) continue;
      let group = bySection.get(item.sectionId);
      if (!group) {
        group = { section, items: [] };
        bySection.set(item.sectionId, group);
      }
      if (item.itemKey) group.items.push(item);
    }
    return [...bySection.values()];
  }, [needle, fuse]);

  /** Hidden nested pages highlight their parent's row instead of nothing. */
  const highlightPath = activeSection
    ? (sectionForPath(activeSection)?.parent ?? activeSection)
    : null;

  const sectionItem = (section: SectionDef) => {
    const active = section.path === highlightPath;
    return (
      <Sidebar.Item
        key={section.path}
        onClick={() => settingsModal.open(section.path)}
        data-status={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        <Sidebar.Icon>
          <section.icon />
        </Sidebar.Icon>
        {section.label}
      </Sidebar.Item>
    );
  };

  return (
    <div className={styles.container}>
      <Sidebar.Root className={styles.sidebar}>
        <Sidebar.Search
          value={query}
          onChange={(value) => setQuery(value.target.value)}
          placeholder="Search…"
        />

        <Sidebar.Scroll>
          {results === null ? (
            SETTINGS_MASTER_GROUPS.map((group) => (
              <Sidebar.Group key={group.group}>
                <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
                {group.sections.map(sectionItem)}
              </Sidebar.Group>
            ))
          ) : results.length === 0 ? (
            <Sidebar.Group>
              <Sidebar.Empty>No settings match.</Sidebar.Empty>
            </Sidebar.Group>
          ) : (
            results.map(({ section, items }) => (
              <Sidebar.Group key={section.id}>
                {sectionItem(section)}
                {items.map((item) => (
                  <Sidebar.ResultButton
                    key={item.id}
                    onClick={() =>
                      settingsModal.open(
                        section.path,
                        `setting-${item.sectionId}-${item.itemKey}`,
                      )
                    }
                  >
                    {item.title}
                  </Sidebar.ResultButton>
                ))}
              </Sidebar.Group>
            ))
          )}
        </Sidebar.Scroll>
      </Sidebar.Root>
    </div>
  );
}
