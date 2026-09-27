import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { RatingStars } from "./";

it("exposes exact, empty and mixed ratings and removes the current rating", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const change = vi.fn();
  try {
    await act(async () =>
      root.render(<RatingStars value={3} onChange={change} />),
    );
    const selected = host.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    );
    expect(selected?.getAttribute("aria-label")).toBe("3 Stars");
    expect(host.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(host.querySelectorAll("button[data-active] svg")).toHaveLength(3);
    expect(host.querySelectorAll("button:not([data-active]) svg")).toHaveLength(
      2,
    );
    await act(async () => selected?.click());
    expect(change).toHaveBeenCalledExactlyOnceWith(0);
    await act(async () =>
      root.render(<RatingStars value={0} onChange={change} />),
    );
    expect(host.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(
      host.querySelector("fieldset")?.getAttribute("aria-label"),
    ).toContain("Unrated");
    await act(async () =>
      root.render(<RatingStars value={null} onChange={change} />),
    );
    expect(host.querySelector("fieldset")?.getAttribute("aria-label")).toBe(
      "Multiple ratings",
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
