import "./gallery.css";

import { createRoot } from "react-dom/client";
import { Gallery } from "./Gallery";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Gallery />);
}
