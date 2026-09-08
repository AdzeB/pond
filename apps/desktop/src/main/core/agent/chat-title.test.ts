import { expect, it } from "vitest";
import { chatTitle } from "./chat-title";

it.each([
  [
    "Find three Saves about film or cinematography. Show them as Save results, then give one short sentence about each using only saved information. Only read; do not change anything.",
    "Film or cinematography references",
  ],
  ["Find my film references and compare their lighting", "Compare film"],
  [
    "Summarize my saved references about Suspiria in two sentences.",
    "Suspiria summary",
  ],
  ["Organize my saved architecture references", "Organize architecture"],
  ["Find recent photos", "Recent Saves"],
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
