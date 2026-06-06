import { useNavigate } from "@tanstack/react-router";
import {
  DEV_GROUPS,
  GROUP_LABELS,
  GROUP_ORDER,
  sectionsByGroup,
} from "@/components/settings/registry";
import { Sidebar } from "@/components/shell/sidebar";
import { SidebarTools } from "@/components/shell/sidebar-tools";
import { usePrefs } from "@/pool/prefs";

export function SettingsSidebar() {
  const navigate = useNavigate();
  const [developer] = usePrefs("developer");
  const developerMode = developer.developerMode === true;

  return (
    <Sidebar.Root aria-label="Settings">
      <Sidebar.Scroll>
        <Sidebar.Toolbar>
          <SidebarTools />
        </Sidebar.Toolbar>

        <Sidebar.Back onClick={() => void navigate({ to: "/" })}>
          Back to App
        </Sidebar.Back>

        {GROUP_ORDER.flatMap((group) => {
          if (DEV_GROUPS.includes(group) && !developerMode) return [];
          const items = sectionsByGroup(group);
          if (items.length === 0) return [];
          const label = GROUP_LABELS[group];
          return [
            <Sidebar.Group key={group}>
              {label ? <Sidebar.GroupLabel>{label}</Sidebar.GroupLabel> : null}
              {items.map((section) => (
                <Sidebar.Link key={section.id} to={`/settings/${section.path}`}>
                  <Sidebar.LinkIcon>
                    <section.icon width={14} height={14} />
                  </Sidebar.LinkIcon>
                  <Sidebar.LinkLabel>{section.label}</Sidebar.LinkLabel>
                </Sidebar.Link>
              ))}
            </Sidebar.Group>,
          ];
        })}
      </Sidebar.Scroll>
    </Sidebar.Root>
  );
}
