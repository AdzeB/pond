import type { SavesImportQueryInputs } from "@shared/saves-import-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { EagleImport } from "./";

const previewResult = {
  ok: true,
  imported: 3,
  skipped: 1,
  failed: 0,
  deletedSkipped: 0,
  lockedFolders: [],
  droppedFields: [],
  shortcuts: {
    status: "available" as const,
    importable: 2,
    imported: 0,
  },
};

it("offers shortcuts after preview and reuses the path when opted in", async () => {
  const query = vi.fn(
    async (
      name: string,
      input: SavesImportQueryInputs["saves.importEagleLibrary"],
    ) => {
      if (name === "saves.pickEagleLibrary")
        return { ok: true, path: "/tmp/design.library" };
      if (name === "saves.importEagleLibrary") {
        return input.importShortcuts
          ? {
              ...previewResult,
              shortcuts: { ...previewResult.shortcuts, imported: 2 },
            }
          : previewResult;
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  );
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <EagleImport />
        </QueryClientProvider>,
      ),
    );
    const buttons = [...host.querySelectorAll("button")];
    const preview = buttons.find((button) => button.textContent === "Preview");
    if (!preview) throw new Error("Missing Preview button");
    await act(async () => preview.click());
    await vi.waitFor(() =>
      expect(host.textContent).toContain("2 compatible hotkeys"),
    );
    const shortcutSwitch = host.querySelector<HTMLButtonElement>(
      '[aria-labelledby="import-eagle-shortcuts-label"]',
    );
    expect(shortcutSwitch?.getAttribute("aria-checked")).toBe("false");
    await act(async () => shortcutSwitch?.click());
    const importButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Import",
    );
    if (!importButton) throw new Error("Missing Import button");
    await act(async () => importButton.click());
    await vi.waitFor(() =>
      expect(query).toHaveBeenCalledWith("saves.importEagleLibrary", {
        path: "/tmp/design.library",
        dryRun: false,
        importShortcuts: true,
      }),
    );
    expect(query).toHaveBeenCalledWith("saves.pickEagleLibrary", {});
    expect(
      query.mock.calls.filter(([name]) => name === "saves.pickEagleLibrary"),
    ).toHaveLength(1);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
