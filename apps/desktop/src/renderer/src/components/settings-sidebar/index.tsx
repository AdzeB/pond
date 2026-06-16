import {
  SETTINGS_GROUP_LABELS,
  SETTINGS_GROUP_ORDER,
  type SettingsGroup,
} from "@pond/schema";
import { Sidebar } from "@pond/ui";
import { DEV_GROUPS, SECTIONS, type SectionDef } from "@/lib/settings-registry";
import { usePrefs } from "@/stores/prefs";
import { settings, useSettingsSection } from "@/stores/settings-dialog";

function SectionLink({ section }: { section: SectionDef }) {
  const active = useSettingsSection() === section.path;
  return (
    <Sidebar.Item
      data-status={active ? "active" : undefined}
      onClick={() => settings.setSection(section.path)}
    >
      <Sidebar.Icon>
        <section.icon width={14} height={14} />
      </Sidebar.Icon>
      {section.label}
    </Sidebar.Item>
  );
}

function SectionGroup({
  label,
  sections,
}: {
  label?: string;
  sections: SectionDef[];
}) {
  if (sections.length === 0) return null;

  return (
    <Sidebar.Group>
      {label ? <Sidebar.GroupLabel>{label}</Sidebar.GroupLabel> : null}

      {sections.map((section) => (
        <SectionLink key={section.id} section={section} />
      ))}
    </Sidebar.Group>
  );
}

export function Settings() {
  const [developer] = usePrefs("developer");
  const developerMode = developer.developerMode === true;
  const sections = SECTIONS.filter(
    (section) => !DEV_GROUPS.includes(section.group) || developerMode,
  );

  const sectionsByGroup = SETTINGS_GROUP_ORDER.reduce<
    Partial<Record<SettingsGroup, SectionDef[]>>
  >((groups, group) => {
    const items = sections.filter((section) => section.group === group);
    if (items.length > 0) groups[group] = items;
    return groups;
  }, {});

  return (
    <Sidebar.Provider>
      <Sidebar.Root>
        {SETTINGS_GROUP_ORDER.map((group) => (
          <SectionGroup
            key={group}
            label={SETTINGS_GROUP_LABELS[group]}
            sections={sectionsByGroup[group] ?? []}
          />
        ))}
      </Sidebar.Root>
    </Sidebar.Provider>
  );
}
