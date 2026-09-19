export interface ChatHistoryGroup<Chat> {
  label: string;
  items: Chat[];
}

export function chatHistoryGroups<Chat extends { updatedAt?: Date }>(
  chats: Chat[],
  now: Date,
): ChatHistoryGroup<Chat>[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  const groups = ["Today", "Yesterday", "Last 7 days", "Older", "Undated"].map(
    (label): ChatHistoryGroup<Chat> => ({ label, items: [] }),
  );
  const sorted = [...chats].sort(
    (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  );
  for (const chat of sorted) {
    const date = chat.updatedAt;
    const index = !date
      ? 4
      : date >= today
        ? 0
        : date >= yesterday
          ? 1
          : date >= week
            ? 2
            : 3;
    groups[index]?.items.push(chat);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function chatTimeLabel(date: Date, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
