import { IconPlus } from "@pond/icons";
import { Button, Sidebar } from "@pond/ui";
import { useState } from "react";
import { SidebarSectionMenu } from "@/features/settings";
import { usePrefs } from "@/shared/state/prefs";
import { createFish, sectionItems } from "../../lib/menu";
import {
  fish as fishStore,
  useFish,
  useFishEditingId,
  useFishList,
  useHydrateFish,
} from "../../state/fish";
import { FishEditor, type FishScopeOptions } from "../editor";
import { FishRow } from "../row";

export function FishSection({
  activeId,
  folders,
  tagNames,
}: FishScopeOptions & { activeId: string | null }) {
  useHydrateFish();
  const school = useFishList();
  const editing = useFish(useFishEditingId());
  const [open, setOpen] = useState(true);
  const [sidebar] = usePrefs("sidebar");
  const editor = editing ? (
    <FishEditor
      key={editing.id}
      fish={editing}
      folders={folders}
      tagNames={tagNames}
      onClose={fishStore.finishEditing}
    />
  ) : null;

  if (!sidebar.sections.fish) return editor;

  return (
    <Sidebar.CollapsibleGroup open={open} onOpenChange={setOpen}>
      <SidebarSectionMenu
        section="fish"
        search
        searchLabel="Search Fish operations"
        buildItems={sectionItems}
      >
        <Sidebar.GroupHeader>
          <Sidebar.CollapsibleGroupLabel>Fish</Sidebar.CollapsibleGroupLabel>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="New Fish"
            onClick={() => {
              setOpen(true);
              createFish();
            }}
          >
            <IconPlus />
          </Button>
        </Sidebar.GroupHeader>
      </SidebarSectionMenu>
      <Sidebar.CollapsibleGroupContent
        aria-label="Fish"
        inert={!open}
        aria-hidden={!open}
      >
        {school.map((fish) => (
          <FishRow key={fish.id} fish={fish} active={fish.id === activeId} />
        ))}
      </Sidebar.CollapsibleGroupContent>
      {editor}
    </Sidebar.CollapsibleGroup>
  );
}
