import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HarvesterWindow } from "./app/harvester-window";
import "./app/boot-shell";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");
createRoot(root).render(
  <StrictMode>
    <HarvesterWindow />
  </StrictMode>,
);
