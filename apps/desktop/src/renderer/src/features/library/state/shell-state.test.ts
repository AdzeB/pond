import { describe, expect, it } from "vitest";
import { occupiedPaneWidth, predictGridWidth } from "./shell-state";

describe("grid width prediction", () => {
  it("predicts the final grid width from pane state in the same render", () => {
    const bothOpen = occupiedPaneWidth({
      agentOpen: true,
      agentWidth: 340,
      sidebarOpen: true,
      sidebarWidth: 220,
    });
    const sidebarClosed = occupiedPaneWidth({
      agentOpen: true,
      agentWidth: 340,
      sidebarOpen: false,
      sidebarWidth: 220,
    });
    const agentClosed = occupiedPaneWidth({
      agentOpen: false,
      agentWidth: 340,
      sidebarOpen: true,
      sidebarWidth: 220,
    });

    expect(bothOpen).toBe(576);
    expect(predictGridWidth(600, bothOpen, sidebarClosed)).toBe(820);
    expect(predictGridWidth(600, bothOpen, agentClosed)).toBe(956);
  });
});
