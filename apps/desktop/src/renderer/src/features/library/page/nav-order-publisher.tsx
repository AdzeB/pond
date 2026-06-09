import { useEffect, useRef } from "react";
import { useSaveList } from "@/features/library/hooks/use-save-list";

// Pushes the current ordered list (reflecting the active filter/sort/search and
// route) to the main process so popped-out save windows can navigate the exact
// same list the grid is showing. Mounted only in the main library window.
export function NavOrderPublisher() {
  const { ids } = useSaveList({ activeId: null });
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const key = ids.join(",");
    if (key === lastRef.current) return;
    lastRef.current = key;
    void window.pond.publishNavOrder(ids);
  }, [ids]);

  return null;
}
