/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from ".";
import type { TableColumn } from "./types";

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const columns: TableColumn<TestRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "300px",
    resizable: true,
    reorderable: true,
    cell: (row) => row.name,
  },
  {
    id: "status",
    header: "Status",
    sortLabel: "Status",
    accessor: (row) => row.status,
    width: "300px",
    reorderable: true,
    cell: (row) => row.status,
  },
];

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

describe("DataTable", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function renderTable(onColumnOrderChange?: (order: string[]) => void) {
    await act(() =>
      root.render(
        <DataTable.Provider
          data={[{ id: "one", name: "First", status: "Waiting" }]}
          columns={columns}
          getRowId={(row) => row.id}
          columnOrder={["name", "status"]}
          onColumnOrderChange={onColumnOrderChange}
          onSelectionChange={() => {}}
        >
          <DataTable.Root aria-label="Test records" />
        </DataTable.Provider>,
      ),
    );
  }

  it("keeps the header and rows on one horizontal scroll", async () => {
    await renderTable();
    const viewport = host.querySelector<HTMLElement>("[data-viewport]");
    const sheet = viewport?.firstElementChild;
    const headerRow = viewport?.querySelector<HTMLElement>(
      '[role="columnheader"]',
    )?.parentElement;
    const dataRow = viewport?.querySelector<HTMLElement>(
      '[role="row"][aria-selected]',
    );
    if (
      !viewport ||
      !(sheet instanceof HTMLElement) ||
      !headerRow ||
      !dataRow
    ) {
      throw new Error("Missing shared table viewport");
    }

    expect(sheet.style.minWidth).toBe("640px");
    expect(headerRow.style.gridTemplateColumns).toBe(
      dataRow.style.gridTemplateColumns,
    );
    expect(headerRow.closest("[data-viewport]")).toBe(viewport);
    expect(dataRow.closest("[data-viewport]")).toBe(viewport);
  });

  it("exposes sorting state and keyboard-accessible column resizing", async () => {
    await renderTable();
    const sort = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Sort by Name"]',
    );
    const nameHeader = sort?.closest<HTMLElement>('[role="columnheader"]');
    expect(nameHeader?.getAttribute("aria-sort")).toBe("none");
    await act(() => sort?.click());
    expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");

    const resize = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Resize Name column"]',
    );
    expect(resize).not.toBeNull();
    await act(() =>
      resize?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      ),
    );
    expect(
      host.querySelector<HTMLElement>('[role="rowgroup"] > [role="row"]')?.style
        .gridTemplateColumns,
    ).toContain("48px 300px");
  });

  it("provides a keyboard alternative to dragging columns", async () => {
    const onColumnOrderChange = vi.fn();
    await renderTable(onColumnOrderChange);
    const sort = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Sort by Name"]',
    );

    await act(() =>
      sort?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          altKey: true,
          bubbles: true,
        }),
      ),
    );

    expect(sort?.getAttribute("aria-keyshortcuts")).toBe(
      "Alt+ArrowLeft Alt+ArrowRight",
    );
    expect(onColumnOrderChange).toHaveBeenCalledWith(["status", "name"]);
  });
});
