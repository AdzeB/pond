import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewActions, type NewActionServices } from "./actions";

const prompt = vi.fn<NewActionServices["prompt"]>();
const notify = vi.fn<NewActionServices["notify"]>();
const openSave = vi.fn<NewActionServices["openSave"]>();
const folders = { refresh: vi.fn(async () => {}) };
const openSource = vi.fn<NewActionServices["openSource"]>();
const {
  createNote,
  importClipboard,
  importEagle,
  importLinks,
  importPaths,
  importPondPackage,
  newFolder,
  newSource,
  newTag,
  parseImportLinks,
  runNewAction,
} = createNewActions({
  prompt,
  notify,
  openSave,
  refreshFolders: folders.refresh,
  openSource,
});

const query = vi.fn();

describe("new menu actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockReset();
    vi.stubGlobal("window", { pond: { query } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not import or notify when a picker is cancelled", async () => {
    query.mockResolvedValue({ paths: [] });
    await importPaths("folders");
    expect(query).toHaveBeenCalledExactlyOnceWith("saves.pickImportPaths", {
      kind: "folders",
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it("imports selected paths through the existing importer", async () => {
    query
      .mockResolvedValueOnce({ paths: ["/tmp/images"] })
      .mockResolvedValueOnce({ ok: true, ids: ["one", "two"] });
    await importPaths("folders");
    expect(query).toHaveBeenLastCalledWith("saves.importFiles", {
      paths: ["/tmp/images"],
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved 2 items to Pond" }),
    );
  });

  it("reports unsupported file selections without claiming success", async () => {
    query
      .mockResolvedValueOnce({ paths: ["/tmp/unsupported"] })
      .mockResolvedValueOnce({ ok: false });
    await expect(importPaths("files")).rejects.toThrow(
      "No files were imported",
    );
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports an empty clipboard", async () => {
    query.mockResolvedValue({ ok: false, ids: [] });
    await expect(importClipboard()).rejects.toThrow(
      "Copy an image or files first",
    );
  });

  it("normalizes and deduplicates links", () => {
    expect(
      parseImportLinks("example.com\nhttps://example.com\nhttps://pond.app"),
    ).toEqual(["https://example.com", "https://pond.app"]);
  });

  it.each([
    "",
    "hello",
    "https://",
    "file:///tmp/file",
    "https://pond.app invalid",
  ])("rejects invalid links before importing: %s", async (input) => {
    await expect(importLinks(input)).rejects.toThrow(
      "Enter valid website links",
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps only failed links for retry, including rejected queries", async () => {
    query
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error("offline"));
    expect(
      await importLinks("https://one.test https://two.test https://three.test"),
    ).toEqual(["https://two.test", "https://three.test"]);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved to Pond" }),
    );
  });

  it("creates and opens a note using the existing save operation", async () => {
    query.mockResolvedValue({ ok: true, id: "note-id" });
    await createNote(" Title ", " Body\nSecond line ");
    expect(query).toHaveBeenCalledWith("saves.createManual", {
      title: "Title",
      note: "Body\nSecond line",
    });
    expect(openSave).toHaveBeenCalledWith("note-id");
  });

  it("does not submit an empty note or open a failed save", async () => {
    await expect(createNote(" ", " ")).rejects.toThrow("Add a title or note");
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValue({ ok: false });
    await expect(createNote("Title", "")).rejects.toThrow("Couldn't save");
    expect(openSave).not.toHaveBeenCalled();
  });

  it("preserves parent folders and refreshes the sidebar", async () => {
    newFolder("parent");
    await vi.mocked(prompt).mock.calls[0]?.[0].onConfirm(" Child ");
    expect(query).toHaveBeenCalledWith("folders.create", {
      name: "Child",
      parentId: "parent",
    });
    expect(folders.refresh).toHaveBeenCalledOnce();
  });

  it("ignores blank folder names", async () => {
    newFolder();
    await vi.mocked(prompt).mock.calls[0]?.[0].onConfirm(" ");
    expect(query).not.toHaveBeenCalled();
  });

  it("creates tag groups through their own query", async () => {
    query.mockResolvedValue({ ok: true });
    newTag("tag-group");
    await vi.mocked(prompt).mock.calls[0]?.[0].onConfirm(" Design ");
    expect(query).toHaveBeenCalledWith("tagGroups.create", { name: "Design" });
  });

  it("opens the correct source setup flow", () => {
    newSource("connect");
    expect(openSource).toHaveBeenLastCalledWith("connect");
    newSource("watch");
    expect(openSource).toHaveBeenLastCalledWith("watch");
  });

  it("refreshes folders after importing Eagle and reports partial results", async () => {
    query
      .mockResolvedValueOnce({ ok: true, path: "/tmp/design.library" })
      .mockResolvedValueOnce({ ok: true, imported: 2, skipped: 3, failed: 1 });
    await importEagle();
    expect(folders.refresh).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Imported 2 items",
        description: "3 skipped, 1 failed",
      }),
    );
  });

  it("replaces import progress with an error if Eagle import fails", async () => {
    query
      .mockResolvedValueOnce({ ok: true, path: "/tmp/wrong" })
      .mockResolvedValueOnce({
        ok: false,
        imported: 0,
        skipped: 0,
        error: "not_eagle_library",
      });
    await runNewAction(importEagle);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "new-import",
        title: "Couldn't complete action",
        description: "That folder doesn't look like an Eagle library.",
        timeout: 5000,
      }),
    );
  });

  it("does not import or notify when a Pond package picker is cancelled", async () => {
    query.mockResolvedValue({ ok: false, error: "canceled" });
    await importPondPackage();
    expect(query).toHaveBeenCalledExactlyOnceWith("saves.importPackage", {});
    expect(notify).not.toHaveBeenCalled();
    expect(folders.refresh).not.toHaveBeenCalled();
  });

  it("refreshes folders after importing a Pond package", async () => {
    query.mockResolvedValue({ ok: true, imported: 4, skipped: 2 });
    await importPondPackage();
    expect(folders.refresh).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Imported 4 Saves",
        description: "2 skipped",
      }),
    );
  });
});
