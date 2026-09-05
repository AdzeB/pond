import { createRoot } from "react-dom/client";
import App from "./app";

const container = document.getElementById("root");
if (!container) throw new Error("Missing comparison page root.");
createRoot(container).render(<App />);
