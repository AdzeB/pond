import {
  IconChatBubble,
  IconMediaPlay,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@pond/icons";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import { DEFAULT_FISH_ID, type Fish } from "@shared/fish-contracts";
import { errorCopy } from "@/shared/lib/error-copy";
import { notify } from "@/shared/lib/toast";
import { fish } from "../state/fish";

async function runFishAction(
  action: () => Promise<void>,
  title = "Couldn't update this fish",
): Promise<void> {
  try {
    await action();
  } catch (error) {
    notify({
      id: "fish-action",
      title,
      description: errorCopy(error, "Try again."),
    });
  }
}

export function createFish(): void {
  void runFishAction(async () => {
    const created = await fish.create();
    fish.open(created.id);
    fish.startEditing(created.id);
  });
}

function runRoutine(target: Fish): void {
  void runFishAction(async () => {
    await fish.run(target.id);
    notify({
      id: "fish-run",
      title: `${target.name} is on it`,
      description: "Changes it proposes wait for your review.",
    });
  }, "Couldn't start the routine");
}

function confirmDeleteFish(target: Fish): void {
  Dialog.confirm({
    title: `Delete "${target.name}"`,
    description: `Its chats move to your first fish. Your Saves stay in your Library.`,
    confirmLabel: "Delete",
    confirmVariant: "destructive",
    onConfirm: () => runFishAction(() => fish.remove(target.id)),
  });
}

export function sectionItems(): MenuItemSpec[] {
  return [{ label: "New Fish", icon: <IconPlus />, onClick: createFish }];
}

export function fishItems(target: Fish): MenuItemSpec[] {
  const items: MenuItemSpec[] = [
    {
      label: "Open Chat",
      icon: <IconChatBubble />,
      onClick: () => fish.open(target.id),
    },
    {
      label: "Edit Fish",
      icon: <IconPencil />,
      onClick: () => fish.startEditing(target.id),
    },
    {
      label: "Run Routine",
      icon: <IconMediaPlay />,
      disabled: target.routine.kind === "off",
      onClick: () => runRoutine(target),
    },
    { type: "separator" },
    { label: "New Fish", icon: <IconPlus />, onClick: createFish },
  ];
  if (target.id !== DEFAULT_FISH_ID)
    items.push(
      { type: "separator" },
      {
        label: "Delete",
        icon: <IconTrash />,
        variant: "destructive",
        onClick: () => confirmDeleteFish(target),
      },
    );
  return items;
}
