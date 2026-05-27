import { useHotkey } from "@tanstack/react-hotkeys";
import { useRouter } from "@tanstack/react-router";

export function HistoryHotkey() {
  const router = useRouter();
  useHotkey("Mod+[", (e) => {
    e.preventDefault();
    router.history.back();
  });
  useHotkey("Mod+]", (e) => {
    e.preventDefault();
    router.history.forward();
  });
  return null;
}
