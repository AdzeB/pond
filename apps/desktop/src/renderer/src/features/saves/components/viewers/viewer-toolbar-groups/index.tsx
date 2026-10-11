import { IconArrowLeft, IconArrowRight } from "@pond/icons";
import { Tray } from "@pond/ui";
import type { ReactNode } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";

export interface ViewerNavigation {
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}

interface ViewerToolbarGroupsProps {
  actions?: ReactNode;
  edits?: ReactNode;
  view?: ReactNode;
  navigation?: ReactNode;
}

export function ViewerToolbarGroups({
  actions,
  edits,
  view,
  navigation,
}: ViewerToolbarGroupsProps) {
  return (
    <>
      {actions}
      {edits}
      {view}
      {navigation ? (
        <Tray.Separator role="separator" aria-hidden={false} />
      ) : null}
      {navigation}
    </>
  );
}

export function ViewerNavigationControls({
  navigation,
}: {
  navigation?: ViewerNavigation;
}) {
  if (!navigation || navigation.count <= 1) return null;

  return (
    <>
      <ViewerHud.Tool
        label="Previous Slide"
        shortcut={<ShortcutKeys id="viewer.prev-slide" />}
        disabled={navigation.index <= 0}
        onClick={navigation.onPrevious}
      >
        <IconArrowLeft />
      </ViewerHud.Tool>
      <ViewerHud.Tool
        label="Next Slide"
        shortcut={<ShortcutKeys id="viewer.next-slide" />}
        disabled={navigation.index >= navigation.count - 1}
        onClick={navigation.onNext}
      >
        <IconArrowRight />
      </ViewerHud.Tool>
    </>
  );
}
