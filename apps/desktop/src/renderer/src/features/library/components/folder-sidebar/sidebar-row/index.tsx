import type { SidebarBadgeStyle } from "@pond/schema";
import { Sidebar } from "@pond/ui";
import { forwardRef } from "react";
import { formatCount } from "../counts";

interface RowProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof Sidebar.Item>,
    "children"
  > {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  count?: number;
  badgeStyle?: SidebarBadgeStyle;
  depth?: number;
  status?: React.ReactNode;
}

export const Row = forwardRef<HTMLButtonElement, RowProps>(function Row(
  {
    label,
    active,
    icon,
    count,
    badgeStyle = "count",
    depth = 0,
    status,
    ...props
  },
  ref,
) {
  return (
    <Sidebar.Item
      data-status={active ? "active" : undefined}
      data-depth={depth || undefined}
      aria-current={active ? "page" : undefined}
      ref={ref}
      {...props}
    >
      {icon ? <Sidebar.Icon>{icon}</Sidebar.Icon> : null}
      <Sidebar.ItemLabel>{label}</Sidebar.ItemLabel>
      {status != null ? (
        <Sidebar.Count>{status}</Sidebar.Count>
      ) : count != null && badgeStyle !== "none" ? (
        <Sidebar.Count>{formatCount(count)}</Sidebar.Count>
      ) : null}
    </Sidebar.Item>
  );
});
