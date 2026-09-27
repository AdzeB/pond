// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ViewerToolbarGroups } from ".";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("renders no separator for a single-item viewer", async () => {
  await act(async () => {
    root.render(
      <ViewerToolbarGroups
        actions={<button type="button">Action</button>}
        view={<button type="button">Fit</button>}
      />,
    );
  });

  expect(host.querySelector('[role="separator"]')).toBeNull();
  expect(host.textContent).toBe("ActionFit");
});

it("renders exactly one separator before multi-slide navigation", async () => {
  await act(async () => {
    root.render(
      <ViewerToolbarGroups
        actions={<button type="button">Action</button>}
        edits={<button type="button">Edit</button>}
        view={<button type="button">Fit</button>}
        navigation={<button type="button">Next Slide</button>}
      />,
    );
  });

  expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);
  expect(host.textContent).toBe("ActionEditFitNext Slide");
});
