import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./app/boot-shell";
import { bootPool } from "./features/saves/state/bootstrap";
import "./styles.css";

void bootPool();

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
