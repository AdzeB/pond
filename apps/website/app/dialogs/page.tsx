import type { Metadata } from "next";
import { DialogGallery } from "./gallery";

export const metadata: Metadata = {
  title: "Dialogs",
  description: "Pond’s dialog inventory for design and refactoring.",
  robots: { index: false, follow: false },
};

export default function DialogsPage() {
  return <DialogGallery />;
}
