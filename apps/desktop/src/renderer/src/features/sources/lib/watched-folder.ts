export async function pickWatchedFolder(): Promise<void> {
  await window.pond.query("autoImport.pickFolder", {});
}
