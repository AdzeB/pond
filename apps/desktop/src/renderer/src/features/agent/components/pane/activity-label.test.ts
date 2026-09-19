import type { AssistantToolStep } from "@shared/assistant";
import { expect, it } from "vitest";
import { currentActivityLabel } from "./activity-label";

it("follows actual tool starts, completion, and the next action", () => {
  const steps: AssistantToolStep[] = [];
  expect(currentActivityLabel("thinking", steps)).toBe("Thinking");
  const searchStep: AssistantToolStep = {
    id: "search",
    label: "Search library",
    detail: "typography",
    status: "running",
  };
  steps.push(searchStep);
  expect(currentActivityLabel("thinking", steps)).toBe(
    "Searching your library: typography",
  );
  searchStep.status = "complete";
  expect(currentActivityLabel("searching", steps)).toBe("Thinking");
  steps.push({ id: "read", label: "Read Save", status: "running" });
  expect(currentActivityLabel("searching", steps)).toBe("Reading a Save");
});

it("keeps reporting a running tool when a concurrent tool finishes", () => {
  expect(
    currentActivityLabel("thinking", [
      { id: "1", label: "Find duplicates", status: "running" },
      { id: "2", label: "Read folders", status: "complete" },
    ]),
  ).toBe("Finding duplicates");
});

it("does not describe failed or cancelled actions as running", () => {
  expect(
    currentActivityLabel("reading", [
      { id: "1", label: "Read Save", status: "error" },
      { id: "2", label: "Search library", status: "stopped" },
    ]),
  ).toBe("Thinking");
  expect(currentActivityLabel("reading", [])).toBe("Reading Saves");
});
