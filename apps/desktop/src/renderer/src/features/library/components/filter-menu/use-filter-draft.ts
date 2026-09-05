import { useEffect, useRef } from "react";

export function useFilterDraft() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (commit?: () => void) => {
    clearTimeout(timer.current);
    timer.current = commit ? setTimeout(commit, 250) : undefined;
  };
}
