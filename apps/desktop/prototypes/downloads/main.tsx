import { createRoot } from "react-dom/client";
import { DownloadsPrototype } from "./prototype";
import "../../../../packages/theme/src/theme.css";
import "./styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<DownloadsPrototype />);
