import {
  IconBadgeCheckOutline18,
  IconEye2Outline18,
  IconHistoryOutline18,
  IconSidebarEditOutline18,
} from "@pond/icons/outline/18";
import type { SidebarBadgeStyle, SidebarDestination } from "@pond/schema";
import type { MenuItemSpec } from "@pond/ui";
import { type ReactElement, useState } from "react";
import { clearRecents, useRecents } from "@/features/saves/state/recents";
import { SidebarCustomizationDialog } from "@/features/settings/components/sidebar-customization-dialog";
import { usePrefs } from "@/features/settings/state/prefs";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";

const BADGE_STYLES: readonly [SidebarBadgeStyle, string][] = [
  ["count", "Count"],
  ["dot", "Dot"],
  ["none", "None"],
];

export function BuiltInVisibilityMenu({
  children,
  destination,
  additionalItems,
}: {
  children: ReactElement;
  destination?: SidebarDestination;
  additionalItems?: () => MenuItemSpec[];
}) {
  const [sidebar, patch] = usePrefs("sidebar");
  const recents = useRecents();
  const [customizing, setCustomizing] = useState(false);

  const setBadgeStyle = (style: SidebarBadgeStyle | "default") => {
    if (!destination) return;
    const badgeOverrides = { ...sidebar.badgeOverrides };
    if (style === "default") delete badgeOverrides[destination];
    else badgeOverrides[destination] = style;
    void patch({ badgeOverrides });
  };

  const buildItems = (): MenuItemSpec[] => {
    const visibilityItems: MenuItemSpec[] = destination
      ? [
          {
            type: "submenu",
            label: "Visibility",
            icon: <IconEye2Outline18 />,
            items: [
              {
                type: "checkbox",
                indicator: "check",
                label: "Always Show",
                checked: sidebar.destinations[destination],
                onCheckedChange: () =>
                  void patch({
                    destinations: {
                      ...sidebar.destinations,
                      [destination]: true,
                    },
                  }),
              },
              {
                type: "checkbox",
                indicator: "check",
                label: "Hide",
                checked: !sidebar.destinations[destination],
                onCheckedChange: () =>
                  void patch({
                    destinations: {
                      ...sidebar.destinations,
                      [destination]: false,
                    },
                  }),
              },
            ],
          },
          {
            type: "submenu",
            label: "Badge",
            icon: <IconBadgeCheckOutline18 />,
            items: [
              {
                type: "checkbox",
                indicator: "check",
                label: "Use Default",
                checked: sidebar.badgeOverrides[destination] === undefined,
                onCheckedChange: () => setBadgeStyle("default"),
              },
              ...BADGE_STYLES.map(([style, label]) => ({
                type: "checkbox" as const,
                indicator: "check" as const,
                label,
                checked: sidebar.badgeOverrides[destination] === style,
                onCheckedChange: () => setBadgeStyle(style),
              })),
            ],
          },
        ]
      : [];

    return [
      ...visibilityItems,
      ...(visibilityItems.length > 0 ? [{ type: "separator" as const }] : []),
      {
        label: "Customize Sidebar",
        icon: <IconSidebarEditOutline18 />,
        onClick: () => setCustomizing(true),
      },
      ...(destination === "recentlyUsed"
        ? [
            { type: "separator" as const },
            {
              label: "Clear History",
              icon: <IconHistoryOutline18 />,
              disabled: recents.length === 0,
              onClick: clearRecents,
            },
          ]
        : []),
      ...(additionalItems
        ? [{ type: "separator" as const }, ...additionalItems()]
        : []),
    ];
  };

  return (
    <>
      <SpecContextMenu buildItems={buildItems}>{children}</SpecContextMenu>
      <SidebarCustomizationDialog
        open={customizing}
        onOpenChange={setCustomizing}
      />
    </>
  );
}
