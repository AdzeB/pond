import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type OnboardingStatus = "unknown" | "pending" | "done";

interface OnboardingState {
  readonly status: OnboardingStatus;
}

export const onboardingStore = new Store<OnboardingState>({
  status: "unknown",
});

let loaded = false;

export function loadOnboarding(): void {
  if (loaded) return;
  loaded = true;
  void window.pond
    .query("settings.getOnboarded", {})
    .then((res) => {
      const done = Boolean((res as { onboarded?: boolean })?.onboarded);
      onboardingStore.setState(() => ({ status: done ? "done" : "pending" }));
    })
    .catch(() => {
      /** Fail open: a broken read must never trap the user behind onboarding. */
      onboardingStore.setState(() => ({ status: "done" }));
    });
}

export function completeOnboarding(): void {
  if (onboardingStore.state.status === "done") return;
  onboardingStore.setState(() => ({ status: "done" }));
  void window.pond.query("settings.setOnboarded", {}).catch(() => {});
}

export function useOnboardingStatus(): OnboardingStatus {
  return useSelector(onboardingStore, (s) => s.status);
}
