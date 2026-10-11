import type { Metadata } from "next";
import { OnboardingPreview } from "./preview";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Preview of the Pond onboarding dialog.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingPreview />;
}
