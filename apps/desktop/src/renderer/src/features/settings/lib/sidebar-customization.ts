import type {
  Prefs,
  SidebarBadgeStyle,
  SidebarDestination,
} from "@pond/schema";

export const SIDEBAR_DESTINATION_GROUPS = [
  {
    label: "Library",
    heading: false,
    destinations: [
      "all",
      "uncategorized",
      "assistant",
      "untagged",
      "recentlyAdded",
      "recentlyUsed",
      "tags",
      "random",
      "trash",
    ],
  },
  {
    label: "Harvesting",
    heading: true,
    destinations: ["sources", "downloads"],
  },
] as const satisfies readonly {
  label: string;
  heading: boolean;
  destinations: readonly SidebarDestination[];
}[];

export const SIDEBAR_DESTINATION_LABELS = {
  all: "All",
  uncategorized: "Uncategorized",
  assistant: "Assistant",
  untagged: "Untagged",
  recentlyAdded: "Recently Added",
  recentlyUsed: "Recently Used",
  tags: "Tags",
  random: "Random",
  trash: "Trash",
  downloads: "Downloads",
  sources: "Sources",
} as const satisfies Record<SidebarDestination, string>;

export function moveVisibleSidebarDestination(
  order: readonly SidebarDestination[],
  group: readonly SidebarDestination[],
  visible: readonly SidebarDestination[],
  destination: SidebarDestination,
  over: SidebarDestination,
): SidebarDestination[] {
  const visibleOrder = order.filter(
    (item) => group.includes(item) && visible.includes(item),
  );
  const sourceIndex = visibleOrder.indexOf(destination);
  const targetIndex = visibleOrder.indexOf(over);
  if (sourceIndex < 0 || targetIndex < 0) return [...order];
  visibleOrder.splice(sourceIndex, 1);
  visibleOrder.splice(targetIndex, 0, destination);

  let visibleIndex = 0;
  return order.map((item) =>
    group.includes(item) && visible.includes(item)
      ? (visibleOrder[visibleIndex++] ?? item)
      : item,
  );
}

export function resolveSidebarBadgeStyle(
  sidebar: Prefs["sidebar"],
  destination?: SidebarDestination,
): SidebarBadgeStyle {
  if (destination) {
    const override = sidebar.badgeOverrides[destination];
    if (override) return override;
  }
  return sidebar.badgeStyle;
}
