import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootPool } from "./stores/bootstrap";
import { loadOnboarding } from "./stores/onboarding";
import "./styles.css";

void bootPool();
loadOnboarding();

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
