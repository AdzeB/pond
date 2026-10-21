import { IconPlus } from "@pond/icons";
import { Button, Sidebar } from "@pond/ui";
import { useState } from "react";
import { SpecContextMenu } from "@/shared/components/spec-context-menu";
import { createCanvas, sectionItems } from "../../lib/menu";
import {
  useCanvasEditingId,
  useCanvases,
  useHydrateCanvases,
} from "../../state/canvases";
import { CanvasRow } from "../row";

export function CanvasesSection({ activeId }: { activeId: string | null }) {
  useHydrateCanvases();
  const list = useCanvases();
  const editingId = useCanvasEditingId();
  const [open, setOpen] = useState(true);

  return (
    <Sidebar.CollapsibleGroup open={open} onOpenChange={setOpen}>
      <SpecContextMenu
        search
        searchLabel="Search Canvas operations"
        buildItems={sectionItems}
      >
        <Sidebar.GroupHeader>
          <Sidebar.CollapsibleGroupLabel>
            Canvases
          </Sidebar.CollapsibleGroupLabel>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="New Canvas"
            onClick={() => {
              setOpen(true);
              createCanvas();
            }}
          >
            <IconPlus />
          </Button>
        </Sidebar.GroupHeader>
      </SpecContextMenu>
      <Sidebar.CollapsibleGroupContent
        aria-label="Canvases"
        inert={!open}
        aria-hidden={!open}
      >
        {list.map((canvas) => (
          <CanvasRow
            key={canvas.id}
            canvas={canvas}
            active={canvas.id === activeId}
            renaming={canvas.id === editingId}
          />
        ))}
      </Sidebar.CollapsibleGroupContent>
    </Sidebar.CollapsibleGroup>
  );
}
