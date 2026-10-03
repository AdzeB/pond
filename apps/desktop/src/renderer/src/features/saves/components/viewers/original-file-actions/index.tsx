import {
  IconFileExportOutline18,
  IconWindowShareOutline18,
} from "@pond/icons/outline/18";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { exportFile, openDefaultApp } from "@/features/saves/lib/actions";
import type { Save } from "@/features/saves/types";

interface OriginalFileActionsProps {
  save: Save;
  fileIndex: number;
}

export function OriginalFileActions({
  save,
  fileIndex,
}: OriginalFileActionsProps) {
  return (
    <>
      <ViewerHud.Tool
        label="Open in Default App"
        onClick={() => void openDefaultApp(save, fileIndex)}
      >
        <IconWindowShareOutline18 />
      </ViewerHud.Tool>
      <ViewerHud.Tool
        label="Export Original"
        onClick={() => void exportFile(save, fileIndex)}
      >
        <IconFileExportOutline18 />
      </ViewerHud.Tool>
    </>
  );
}
