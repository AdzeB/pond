import "../app/page.css";

import { createRoot } from "react-dom/client";
import { App } from "../app/App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
