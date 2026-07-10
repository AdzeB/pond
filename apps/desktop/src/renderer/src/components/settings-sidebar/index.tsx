import { IconArrowLeftOutline18 as Back } from "@pond/icons/outline/18";
import { Sidebar } from "@pond/ui";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import { loadAppInfo } from "@/lib/app-info";
import {
  type SectionDef,
  sectionForId,
  settingsMasterGroupsForPackaged,
} from "@/lib/settings/registry";
import {
  SETTINGS_SEARCH_INDEX,
  type SettingsSearchEntry,
} from "@/lib/settings/search-index";

interface SectionResult {
  section: SectionDef;
  items: SettingsSearchEntry[];
}

export function SettingsSidebar() {
  const [query, setQuery] = useState("");
  const [isPackaged, setIsPackaged] = useState(false);
  const needle = query.trim();

  useEffect(() => {
    void loadAppInfo().then((info) => setIsPackaged(info.isPackaged));
  }, []);

  const masterGroups = useMemo(
    () => settingsMasterGroupsForPackaged(isPackaged),
    [isPackaged],
  );

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
      if (isPackaged && section.id === "developer") continue;
      let group = bySection.get(item.sectionId);
      if (!group) {
        group = { section, items: [] };
        bySection.set(item.sectionId, group);
      }
      if (item.itemKey) group.items.push(item);
    }
    return [...bySection.values()];
  }, [needle, fuse, isPackaged]);

  return (
    <Sidebar.Root>
      <Sidebar.Header>
        <Sidebar.Group>
          <Sidebar.Anchor to="/">
            <Sidebar.Icon>
              <Back />
            </Sidebar.Icon>
            Back to Library
          </Sidebar.Anchor>
        </Sidebar.Group>
      </Sidebar.Header>

      <Sidebar.Group>
        <Sidebar.Search
          value={query}
          onChange={(value) => setQuery(value.target.value)}
          placeholder="Search…"
        />
      </Sidebar.Group>

      <Sidebar.Scroll>
        {results === null ? (
          masterGroups.map((group) => (
            <Sidebar.Group key={group.group}>
              <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
              {group.sections.map((section) => (
                <Sidebar.Anchor
                  key={section.path}
                  to="/settings/$section"
                  params={{ section: section.path }}
                >
                  <Sidebar.Icon>
                    <section.icon />
                  </Sidebar.Icon>
                  {section.label}
                </Sidebar.Anchor>
              ))}
            </Sidebar.Group>
          ))
        ) : results.length === 0 ? (
          <Sidebar.Group>
            <Sidebar.Empty>No settings match.</Sidebar.Empty>
          </Sidebar.Group>
        ) : (
          results.map(({ section, items }) => (
            <Sidebar.Group key={section.id}>
              <Sidebar.Anchor
                to="/settings/$section"
                params={{ section: section.path }}
              >
                <Sidebar.Icon>
                  <section.icon />
                </Sidebar.Icon>
                {section.label}
              </Sidebar.Anchor>
              {items.map((item) => (
                <Sidebar.Result
                  key={item.id}
                  to="/settings/$section"
                  params={{ section: section.path }}
                  hash={`setting-${item.sectionId}-${item.itemKey}`}
                >
                  {item.title}
                </Sidebar.Result>
              ))}
            </Sidebar.Group>
          ))
        )}
      </Sidebar.Scroll>
    </Sidebar.Root>
  );
}
