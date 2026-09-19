import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AttachFilesButton } from "./attach-files";

const query = vi.fn();
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("pond", { query });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  query.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("attaches selected local files without importing Saves", async () => {
  const file = {
    id: "file-1",
    name: "reference.pdf",
    mediaType: "application/pdf",
    size: 1024,
  };
  query.mockResolvedValueOnce({ ok: true, files: [file] });
  const attach = vi.fn();
  await act(async () => root.render(<AttachFilesButton onAttach={attach} />));

  const button = host.querySelector('button[aria-label="Attach Files"]');
  if (!(button instanceof HTMLButtonElement))
    throw new Error("Missing Attach Files button");
  await act(async () => button.click());

  expect(query).toHaveBeenCalledExactlyOnceWith("agent.pickAttachments", {});
  expect(attach).toHaveBeenCalledExactlyOnceWith([file]);
});

it("does nothing when the file picker is cancelled", async () => {
  query.mockResolvedValue({ ok: true, files: [] });
  const attach = vi.fn();
  await act(async () => root.render(<AttachFilesButton onAttach={attach} />));

  const button = host.querySelector('button[aria-label="Attach Files"]');
  if (!(button instanceof HTMLButtonElement))
    throw new Error("Missing Attach Files button");
  await act(async () => button.click());

  expect(query).toHaveBeenCalledExactlyOnceWith("agent.pickAttachments", {});
  expect(attach).not.toHaveBeenCalled();
});
