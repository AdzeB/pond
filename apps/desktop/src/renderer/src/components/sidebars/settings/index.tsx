import {
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
} from "@pond/icons/outline/12";
import { Button, Sidebar, Tooltip } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { DEV_GROUPS, SECTIONS } from "@/components/settings/registry";
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

export function Settings() {
  const [developer] = usePrefs("developer");
  const developerMode = developer.developerMode === true;
  const sections = SECTIONS.filter(
    (section) => !DEV_GROUPS.includes(section.group) || developerMode,
  );
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

        <Sidebar.Group>
          {sections.map((section) => (
            <Sidebar.Anchor
              key={section.id}
              to={`/settings/$section`}
              params={{ section: section.path }}
            >
              <Sidebar.Icon>
                <section.icon width={14} height={14} />
              </Sidebar.Icon>
              {section.label}
            </Sidebar.Anchor>
          ))}
        </Sidebar.Group>
      </Sidebar.Root>
    </Sidebar.Provider>
  );
}
