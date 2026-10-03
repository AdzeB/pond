import type { ViewerNavigation } from "@/features/saves/components/viewers/viewer-toolbar-groups";
import type { Save, SaveFile } from "@/features/saves/types";

export interface ViewerProps {
  save: Save;
  file: SaveFile;
  fileIndex: number;
  active?: boolean;
  navigation?: ViewerNavigation;
}
