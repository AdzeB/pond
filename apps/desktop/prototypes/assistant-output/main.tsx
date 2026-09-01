import { createRoot } from "react-dom/client";
import { Prototype } from "./prototype";
import "./styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<Prototype />);
