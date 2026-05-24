import { cn } from "@pond/ui";
import type React from "react";
import type { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardCheatsheet } from "@/components/keyboard-cheatsheet";
import { BulkActionBar } from "@/components/library/bulk-action-bar";
import { QuickCapture } from "@/components/library/quick-capture";
import { LibrarySidebar } from "@/components/library/sidebar";
import { Sidebar } from "@/components/shell/sidebar";
import { SidebarTools } from "@/components/shell/sidebar-tools";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";
import { HistoryHotkey } from "@/effects/history-hotkey";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";
import { OnboardedGuard } from "@/effects/onboarded-guard";
import { PreferencesHotkey } from "@/effects/preferences-hotkey";
import { usePlatform } from "@/lib/platform";
import { useSidebar } from "@/lib/use-sidebar";
import {
  DEV_GROUPS,
  GROUP_LABELS,
  GROUP_ORDER,
  sectionsByGroup,
} from "@/pages/settings/registry";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

type Platform = "mac" | "other";

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {
  platform?: Platform;
}

function Root({
  platform = "other",
  className,
  children,
  ...props
}: RootProps) {
  return (
    <div
      data-platform={platform}
      className={cn(styles.layout, className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface ContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function Content({ className, ...props }: ContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}

interface SplitProps extends React.ComponentPropsWithoutRef<"div"> {}

function Split({ className, ...props }: SplitProps) {
  return <div className={cn(styles.split, className)} {...props} />;
}

interface MainProps extends React.ComponentProps<"main"> {}

function Main({ className, ...props }: MainProps) {
  return <main className={cn(styles.main, className)} {...props} />;
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cn(styles.header, className)} {...props} />;
}

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {
  children?: ReactNode;
}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

export const Shell = { Root, Content, Split, Main, Toolbar, Empty };

export function AppRoot() {
  return (
    <div className={styles.root}>
      <DeepLinkBridge />
      <OnboardedGuard />
      <PreferencesHotkey />
      <HistoryHotkey />
      <Outlet />
      <BulkActionBar.Root />
      <QuickCapture.Root />
      <CommandPalette.Root />
      <KeyboardCheatsheet />
    </div>
  );
}

export function LibraryLayout() {
  const platform = usePlatform();
  const { open: sidebarOpen } = useSidebar();

  return (
    <Shell.Root platform={platform}>
      <LayoutMenuBridge />
      <div
        className={styles["sidebar-wrap"]}
        data-open={sidebarOpen ? "true" : "false"}
        aria-hidden={!sidebarOpen || undefined}
      >
        <LibrarySidebar.Root />
      </div>
      <Shell.Content>
        <div aria-hidden className={styles["drag-strip"]} />
        <Shell.Split>
          <Outlet />
        </Shell.Split>
      </Shell.Content>
    </Shell.Root>
  );
}

export function SettingsLayout() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const [developer] = usePrefs("developer");
  const developerMode = developer.developerMode === true;

  return (
    <Shell.Root platform={platform}>
      <Sidebar.Root aria-label="Settings">
        <Sidebar.Scroll>
          <Sidebar.Toolbar>
            <SidebarTools />
          </Sidebar.Toolbar>

          <Sidebar.Back onClick={() => navigate("/", { viewTransition: true })}>
            Back to App
          </Sidebar.Back>

          {GROUP_ORDER.flatMap((group) => {
            if (DEV_GROUPS.includes(group) && !developerMode) return [];
            const items = sectionsByGroup(group);
            if (items.length === 0) return [];
            const label = GROUP_LABELS[group];
            return [
              <Sidebar.Group key={group}>
                {label ? (
                  <Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
                ) : null}
                {items.map((section) => (
                  <Sidebar.Link
                    key={section.id}
                    to={`/settings/${section.path}`}
                  >
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
      <Shell.Content>
        <div aria-hidden className={styles["drag-strip"]} />
        <Shell.Main>
          <div className={styles.body}>
            <Outlet />
          </div>
        </Shell.Main>
      </Shell.Content>
    </Shell.Root>
  );
}

export function StandaloneLayout() {
  const platform = usePlatform();

  return (
    <Shell.Root platform={platform}>
      <Shell.Content>
        <div aria-hidden className={styles["drag-strip"]} />
        <Shell.Main>
          <Outlet />
        </Shell.Main>
      </Shell.Content>
    </Shell.Root>
  );
}
