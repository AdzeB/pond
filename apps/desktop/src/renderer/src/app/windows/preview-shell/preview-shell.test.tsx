// @vitest-environment jsdom
import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PreviewShell } from "./preview-shell";

it("navigates detached previews through sender-owned query results and reports boundaries", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const row = (id: string) => ({
    id,
    source: "web",
    sourceId: id,
    url: `https://fixture.test/${id}`,
    title: id,
    files: [],
  });
  const query = vi.fn(
    async (
      name: string,
      input: { id?: string; ids?: string[]; delta?: number },
    ) => {
      if (name === "settings.getPrefs") return PrefsSchema.parse({});
      if (name === "preview.configure")
        return { ok: true, pinned: true, opacity: 1 };
      if (name === "preview.neighbor")
        return {
          id:
            input.id === "detached-first" && input.delta === 1
              ? "detached-next"
              : null,
        };
      if (name === "saves.getMany") return (input.ids ?? []).map(row);
      if (name === "saves.get") return row(input.id ?? "");
      return { ok: true };
    },
  );
  vi.stubGlobal("pond", { query, onSyncAction: () => () => {} });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const button = (label: string) =>
    [...host.querySelectorAll("button")].find(
      (button) => button.textContent === label,
    );
  try {
    await act(async () => root.render(<PreviewShell id="detached-first" />));
    expect(host.textContent).toContain("detached-first");
    await act(async () => button("Next")?.click());
    expect(query).toHaveBeenCalledWith("preview.neighbor", {
      id: "detached-first",
      delta: 1,
    });
    expect(query).toHaveBeenCalledWith("saves.getMany", {
      ids: ["detached-next"],
    });
    expect(host.textContent).toContain("detached-next");
    await act(async () => button("Next")?.click());
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      "No next save in this view.",
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
