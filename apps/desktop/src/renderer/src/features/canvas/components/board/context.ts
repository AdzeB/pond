import { createContext, useContext } from "react";
import type { ConnectorStyle } from "../../lib/document";

export interface BoardActions {
  editingId: string | null;
  savesReady: boolean;
  connectorBarId: string | null;
  barsHidden: boolean;
  record(): void;
  setText(id: string, text: string): void;
  startEditing(id: string): void;
  finishEditing(): void;
  restyle(patch: Partial<ConnectorStyle>): void;
  deleteConnectors(): void;
}

export const BoardContext = createContext<BoardActions | null>(null);

export function useBoard(): BoardActions {
  const board = useContext(BoardContext);
  if (!board) throw new Error("Canvas items render inside a board.");
  return board;
}
