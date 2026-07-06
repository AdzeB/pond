import { useCallback, useState } from "react";
import { addTagToSelection, trashSelection } from "@/lib/save/selection";
import { showContextMenu } from "@/lib/ui/native-menu";
import { formatNumber } from "@/lib/util/format";
import { type AskTurn, askSnapshot } from "@/stores/ask-store";
import { selection } from "@/stores/selection";
import { useTags } from "@/stores/tags";
import { pushToast } from "@/stores/toasts";

// Conversational actions on the latest turn's result ids, plus the "save as
// view" prompt state seeded from that turn's question.
export function useTurnActions(turns: ReadonlyArray<AskTurn>) {
  const tags = useTags();
  const [viewOpen, setViewOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const currentIds = turns[turns.length - 1]?.ids ?? null;

  const selectInGrid = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    selection.set([...currentIds]);
    pushToast(`Selected ${formatNumber(currentIds.length)} in grid.`);
  }, [currentIds]);

  const openTagMenu = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    const scope = [...currentIds];
    const items =
      tags.length === 0
        ? [{ label: "No tags yet", enabled: false }]
        : tags.map((tag) => ({
            label: tag.name,
            onSelect: () => void addTagToSelection(scope, tag.name),
          }));
    void showContextMenu([
      { label: `Tag ${formatNumber(scope.length)} results`, enabled: false },
      { type: "separator" },
      ...items,
    ]);
  }, [currentIds, tags]);

  const trashCurrent = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    void trashSelection([...currentIds]);
  }, [currentIds]);

  const openSaveView = useCallback(() => {
    setViewName(askSnapshot().question);
    setViewOpen(true);
  }, []);

  const confirmSaveView = useCallback(() => {
    const name = viewName.trim();
    if (!name) return;
    const snap = askSnapshot();
    void window.pond
      .query("savedViews.create", {
        name,
        question: snap.question,
        query: snap.query,
      })
      .then(() => pushToast(`Saved view “${name}”.`, "success"))
      .catch(() => pushToast("Couldn't save view.", "error"));
    setViewOpen(false);
  }, [viewName]);

  return {
    currentIds,
    viewOpen,
    setViewOpen,
    viewName,
    setViewName,
    selectInGrid,
    openTagMenu,
    trashCurrent,
    openSaveView,
    confirmSaveView,
  };
}
