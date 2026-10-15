import { cn, cssVars, Window } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AGENT_WIDTH_DEFAULT,
  AGENT_WIDTH_MAX,
  AGENT_WIDTH_MIN,
  libraryChrome,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  useAgentWidth,
  useRightPane,
  useSidebarOpen,
  useSidebarWidth,
} from "@/features/library/state/library-chrome";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import styles from "./styles.module.css";

interface RootProps {
  header: ReactNode;
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

function Root({ header, children, left, right, className }: RootProps) {
  const sidebarWidth = useSidebarWidth();
  const agentWidth = useAgentWidth();
  const sidebarOpen = useSidebarOpen();
  const rightPane = useRightPane();
  const leftOpen = sidebarOpen && Boolean(left);
  const ownsRightPane = useRouterState({
    select: (s) => s.location.pathname === "/assistant",
  });
  const rightOpen = !ownsRightPane && rightPane !== null && Boolean(right);

  return (
    <Window.Root
      className={cn(styles.shell, className)}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      style={cssVars({
        "--window-left-track": `${sidebarWidth}px`,
        "--window-right-track": `${agentWidth}px`,
      })}
    >
      <Window.Left
        open={leftOpen}
        minWidth={SIDEBAR_WIDTH_MIN}
        maxWidth={SIDEBAR_WIDTH_MAX}
        defaultWidth={SIDEBAR_WIDTH_DEFAULT}
        width={sidebarWidth}
        collapseShortcut={<ShortcutKeys id="view.sidebar" />}
        onResize={libraryChrome.setSidebarWidth}
        onCollapse={libraryChrome.toggleSidebar}
      >
        {left}
      </Window.Left>
      <Window.Top>{header}</Window.Top>
      <Window.Center>{children}</Window.Center>
      <Window.Right
        className={styles["right-pane"]}
        open={rightOpen}
        minWidth={AGENT_WIDTH_MIN}
        maxWidth={AGENT_WIDTH_MAX}
        defaultWidth={AGENT_WIDTH_DEFAULT}
        width={agentWidth}
        resizeLabel={
          rightPane === "agent" ? "Resize Assistant" : "Resize Details"
        }
        collapseShortcut={
          <ShortcutKeys
            id={rightPane === "agent" ? "view.agent" : "view.inspector"}
          />
        }
        onResize={libraryChrome.setAgentWidth}
        onCollapse={libraryChrome.closeRightPane}
      >
        {right}
      </Window.Right>
    </Window.Root>
  );
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cn(styles.toolbar, className)} {...props} />;
}

interface ContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function Content({ className, ...props }: ContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export const AppShell = { Root, Toolbar, Content };
