import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ComponentsPage } from "./src/components/dev/components";
import "./src/styles.css";

function selectedComponent() {
  return (
    new URLSearchParams(window.location.search).get("component") ?? "Button"
  );
}

function Gallery() {
  const [component, setComponent] = useState(selectedComponent);

  useEffect(() => {
    const sync = () => setComponent(selectedComponent());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function select(component: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("component", component);
    window.history.replaceState(null, "", url);
    setComponent(component);
  }

  return (
    <MotionConfig reducedMotion="user">
      <ComponentsPage component={component} onSelect={select} />
    </MotionConfig>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Missing component gallery root.");
createRoot(container).render(<Gallery />);
