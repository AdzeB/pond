// @vitest-environment jsdom
import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { selection } from "@/features/library/state/selection";
import { normalise } from "@/features/saves/lib/reconcile";
import { pool } from "@/features/saves/state/pool";
import { HoverPreview } from "./hover-preview";

it("hydrates and previews the next logical save beyond loaded grid rows", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const first = normalise({
    id: "quick-first",
    source: "web",
    sourceId: "first",
    url: "https://fixture.test/one",
    title: "First reference",
    files: [],
  });
  if (!first) throw new Error("Invalid fixture");
  pool.upsert(first);
  const query = vi.fn(async (name: string) =>
    name === "settings.getPrefs"
      ? PrefsSchema.parse({})
      : [
          {
            id: "quick-next",
            source: "web",
            sourceId: "next",
            url: "https://fixture.test/two",
            title: "Next reference",
            files: [],
          },
        ],
  );
  vi.stubGlobal("pond", { query });
  selection.setAnchor(first.id);
  resultNavigation.setSource({
    ids: [first.id],
    allIds: async () => [first.id, "quick-next"],
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<HoverPreview />));
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          bubbles: true,
        }),
      ),
    );
    expect(document.body.textContent).toContain("First reference");
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          code: "ArrowRight",
          bubbles: true,
        }),
      ),
    );
    expect(selection.getAnchor()).toBe("quick-next");
    expect(query).toHaveBeenCalledWith("saves.getMany", {
      ids: ["quick-next"],
    });
    expect(document.body.textContent).toContain("Next reference");
  } finally {
    await act(async () => root.unmount());
    resultNavigation.setSource({ ids: [] });
    host.remove();
    vi.unstubAllGlobals();
  }
});
