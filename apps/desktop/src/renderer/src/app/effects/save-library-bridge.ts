import {
  lastUsedFolderId,
  rememberFolderDestinations,
} from "@/features/library/lib/recent-folders";
import { openConversionDialog } from "@/features/library/state/conversion-dialog";
import { openDuplicateReview } from "@/features/library/state/duplicate-review";
import { openFolderPicker } from "@/features/library/state/folder-picker";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { openRenameDialog } from "@/features/library/state/rename-dialog";
import {
  resetFilters,
  setQuery,
  setVisualProbe,
} from "@/features/library/state/view-store";
import { registerSaveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { closeSave } from "@/features/saves/lib/save-nav";

registerSaveLibraryBridge({
  getNav: () => libraryChrome.getState().nav,
  inspectSave: (id) => libraryChrome.inspectSave(id),
  openSaveDetails: (id) => libraryChrome.openSaveDetails(id),
  setInspectorSaveId: (id) => libraryChrome.setInspectorSaveId(id),
  setInspectorTab: (tab) => libraryChrome.setInspectorTab(tab),
  setNav: (nav) => libraryChrome.setNav(nav),
  setAgentOpen: (open) => libraryChrome.setAgentOpen(open),
  closeRightPane: () => libraryChrome.closeRightPane(),
  resetFilters,
  openFolderPicker,
  openRename: openRenameDialog,
  openConversion: (ids, fileIndex, mode) =>
    openConversionDialog(ids, fileIndex, mode),
  openDuplicateReview: (saveId) => openDuplicateReview({ saveId }),
  findSimilarColor: (color) => {
    setQuery({
      combinator: "and",
      rules: [{ field: "color", operator: "near", value: color }],
    });
    closeSave();
  },
  setVisualProbe: ({ id, label }) =>
    setVisualProbe({ kind: "saveId", id, label }),
  foldersForSave: (id) => folders.forSave(id),
  foldersSnapshot: () => folders.snapshot(),
  lastUsedFolderId,
  rememberFolderDestinations,
  refreshFolders: () => folders.refresh(),
  startEditingFolder: (id) => folders.startEditing(id),
  saveFolderPresentation,
});
