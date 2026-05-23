import React from "react";
import { createRoot } from "react-dom/client";
import { SuggestionToast } from "./components/_primitives/suggestion-toast";
import "./suggestion.css";

const root = document.getElementById("suggestion-root");
if (!root) throw new Error("#suggestion-root element missing");

createRoot(root).render(
  <React.StrictMode>
    <SuggestionToast />
  </React.StrictMode>,
);
