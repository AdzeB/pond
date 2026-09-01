import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";

export async function pickImportPaths(
  kind: unknown,
): Promise<{ paths: string[] }> {
  if (kind !== "files" && kind !== "folders") {
    throw new Error("Invalid import kind");
  }
  const win = BrowserWindow.getFocusedWindow();
  const options: OpenDialogOptions = {
    title: kind === "folders" ? "Import Folders" : "Import Files",
    buttonLabel: "Import",
    properties: [
      kind === "folders" ? "openDirectory" : "openFile",
      "multiSelections",
    ],
  };
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  return { paths: result.canceled ? [] : result.filePaths };
}
