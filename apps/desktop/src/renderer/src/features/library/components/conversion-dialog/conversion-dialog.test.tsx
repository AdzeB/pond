// @vitest-environment jsdom
import type { ConversionJob } from "@shared/conversion-contracts";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import {
  closeConversionDialog,
  openConversionDialog,
} from "@/features/library/state/conversion-dialog";
import { ConversionDialogHost } from "./conversion-dialog";

it("shows conversion progress and cancellation while preserving completed output information", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const job: ConversionJob = {
    id: "job",
    status: "running",
    completed: 1,
    total: 2,
    directory: "/export",
    outputs: ["/export/one.webp"],
    error: null,
  };
  const calls: string[] = [];
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      calls.push(name);
      if (name === "conversion.presets") return [];
      if (name === "conversion.start" || name === "conversion.status")
        return job;
      if (name === "conversion.cancel") return { ...job, status: "cancelled" };
      throw new Error(`Unexpected ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  function button(label: string) {
    const element = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === label,
    );
    if (!element) throw new Error(`Missing ${label}`);
    return element;
  }
  try {
    await act(async () => {
      openConversionDialog(["a", "b"]);
      root.render(<ConversionDialogHost />);
    });
    await act(async () => button("Choose Folder and Export").click());
    expect(document.querySelector("progress")?.value).toBe(1);
    expect(document.body.textContent).toContain("Exporting: 1 of 2 files.");
    await act(async () => button("Cancel Export").click());
    expect(document.body.textContent).toContain("Export Cancelled");
    expect(document.body.textContent).toContain("Completed files remain");
    expect(calls).toContain("conversion.cancel");
  } finally {
    await act(() => {
      closeConversionDialog();
      root.unmount();
    });
    host.remove();
    vi.unstubAllGlobals();
  }
});
