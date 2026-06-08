import {
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
} from "@pond/icons/outline/12";
import {
  SETTINGS_GROUP_LABELS,
  SETTINGS_GROUP_ORDER,
  type SettingsGroup,
} from "@pond/schema";
import { Button, Sidebar, Tooltip } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import {
  DEV_GROUPS,
  SECTIONS,
  type SectionDef,
} from "@/components/settings/registry";
import { usePrefs } from "@/pool/prefs";

function Backwards() {
  const router = useRouter();

  return (
    <Tooltip label="Back" side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Back"
        onClick={() => router.history.back()}
      >
        <ChevronLeft />
      </Button>
    </Tooltip>
  );
}

function Forwards() {
  const router = useRouter();

  return (
    <Tooltip label="Forward" side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Forward"
        onClick={() => router.history.forward()}
      >
        <ChevronRight />
      </Button>
    </Tooltip>
  );
}

function SectionLink({ section }: { section: SectionDef }) {
  return (
    <Sidebar.Anchor to="/settings/$section" params={{ section: section.path }}>
      <Sidebar.Icon>
        <section.icon width={14} height={14} />
      </Sidebar.Icon>
      {section.label}
    </Sidebar.Anchor>
  );
}

function SectionGroup({
  label,
  sections,
  collapsible = false,
}: {
  label?: string;
  sections: SectionDef[];
  collapsible?: boolean;
}) {
  if (sections.length === 0) return null;

  if (collapsible && label) {
    return (
      <Sidebar.CollapsibleGroup defaultOpen>
        <Sidebar.CollapsibleGroupLabel>{label}</Sidebar.CollapsibleGroupLabel>
        <Sidebar.CollapsibleGroupContent>
          {sections.map((section) => (
            <SectionLink key={section.id} section={section} />
          ))}
        </Sidebar.CollapsibleGroupContent>
      </Sidebar.CollapsibleGroup>
    );
  }

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
        <Sidebar.Toolbar>
          <Backwards />
          <Forwards />
        </Sidebar.Toolbar>
        <Sidebar.Header>
          <Sidebar.Anchor to="/">
            <Sidebar.Icon>
              <ChevronLeft />
            </Sidebar.Icon>
            Back to Library
          </Sidebar.Anchor>
        </Sidebar.Header>

        {SETTINGS_GROUP_ORDER.map((group) => (
          <SectionGroup
            key={group}
            label={SETTINGS_GROUP_LABELS[group]}
            sections={sectionsByGroup[group] ?? []}
            collapsible={group === "saving"}
          />
        ))}
      </Sidebar.Root>
    </Sidebar.Provider>
  );
}
