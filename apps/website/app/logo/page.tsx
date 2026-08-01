import type { Metadata } from "next";
import { LogoLab } from "./logo-lab";

export const metadata: Metadata = {
  title: "Glass orb",
  robots: { index: false, follow: false },
};

export default function LogoPage() {
  return <LogoLab />;
}
