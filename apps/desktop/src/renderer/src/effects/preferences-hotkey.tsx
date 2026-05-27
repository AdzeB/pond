import { useHotkey } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { navigateTo } from "@/lib/navigate-path";

export function PreferencesHotkey() {
  const navigate = useNavigate();
  useHotkey("Mod+,", (e) => {
    e.preventDefault();
    navigateTo(navigate, "/settings", { viewTransition: true });
  });
  return null;
}
