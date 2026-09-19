import { expect, it } from "vitest";
import { chatHistoryGroups, chatTimeLabel } from "./chat-history";

it("groups across local midnight and sorts recent chats without mutating history", () => {
  const now = new Date(2026, 8, 14, 0, 10);
  const chats = [
    { id: "undated" },
    { id: "last-night", updatedAt: new Date(2026, 8, 13, 23, 55) },
    { id: "week", updatedAt: new Date(2026, 8, 8, 12) },
    { id: "older", updatedAt: new Date(2026, 8, 6, 12) },
    { id: "today", updatedAt: new Date(2026, 8, 14, 0, 1) },
    { id: "latest", updatedAt: new Date(2026, 8, 14, 0, 9) },
  ];
  expect(
    chatHistoryGroups(chats, now).map((group) => ({
      label: group.label,
      ids: group.items.map((chat) => chat.id),
    })),
  ).toEqual([
    { label: "Today", ids: ["latest", "today"] },
    { label: "Yesterday", ids: ["last-night"] },
    { label: "Last 7 days", ids: ["week"] },
    { label: "Older", ids: ["older"] },
    { label: "Undated", ids: ["undated"] },
  ]);
  expect(chats[0]?.id).toBe("undated");
  expect(chatTimeLabel(new Date(2026, 8, 13, 23, 55), now)).toBe("15min");
});

it("omits empty groups and keeps future timestamps from showing negative ages", () => {
  const now = new Date(2026, 8, 14, 12);
  expect(chatHistoryGroups([], now)).toEqual([]);
  expect(chatTimeLabel(new Date(2026, 8, 14, 12, 1), now)).toBe("now");
  expect(chatTimeLabel(new Date(2026, 8, 7, 12), now)).toBe("1w");
});
