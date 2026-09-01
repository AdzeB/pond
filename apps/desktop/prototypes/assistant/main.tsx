import { createRoot } from "react-dom/client";
import { Prototype } from "./prototype";
import "../../src/renderer/src/styles.css";
import "./styles.css";
import "./library-preview.css";
import "./add-menu.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<Prototype />);
