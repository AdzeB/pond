import { expect, it } from "vitest";
import { chatTitle } from "./chat-title";

it.each([
  ["Reply with hello. No library search needed.", "Reply with hello"],
  ["Find my film references", "Find my film references"],
  [
    "Organize my saved architecture references",
    "Organize my saved architecture references",
  ],
  ["Find recent photos", "Find recent photos"],
  ["Could you compare these?", "Compare these"],
  ["Hi!", "Hi"],
  ["  ", undefined],
])("names the task concisely: %s", (content, title) => {
  expect(chatTitle(content)).toBe(title);
});

it("bounds long titles without breaking a final word", () => {
  const title = chatTitle(
    "Could you explain the relationship between materials and natural light in architecture from Japan and Scandinavia?",
  );
  expect(title?.length).toBeLessThanOrEqual(48);
  expect(title).toBe("Explain the relationship between materials…");
});
