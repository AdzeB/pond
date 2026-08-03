import { createContext, type ReactNode, use } from "react";

/** Kept separate from grid state so toggling multi-select doesn't re-render memoized cards. */
interface LibraryCardCallbacks {
  onClick: (id: string, e: React.MouseEvent) => void;
  onAuxClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}

const CallbacksContext = createContext<LibraryCardCallbacks | null>(null);

export function useLibraryCardCallbacks(): LibraryCardCallbacks {
  const ctx = use(CallbacksContext);
  if (!ctx) {
    throw new Error("SaveCard must be rendered inside <LayoutSwitcher>");
  }
  return ctx;
}

/** Grid-level multi-select flag, consumed by the grid containers only. */
const MultiSelectContext = createContext(false);

export function useMultiSelectActive(): boolean {
  return use(MultiSelectContext);
}

interface ProviderProps {
  callbacks: LibraryCardCallbacks;
  multiSelectActive: boolean;
  children: ReactNode;
}

export function LibraryGridProvider({
  callbacks,
  multiSelectActive,
  children,
}: ProviderProps) {
  return (
    <CallbacksContext value={callbacks}>
      <MultiSelectContext value={multiSelectActive}>
        {children}
      </MultiSelectContext>
    </CallbacksContext>
  );
}
