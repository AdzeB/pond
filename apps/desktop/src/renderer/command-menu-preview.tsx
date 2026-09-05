import { Logo, Tooltip } from "@pond/ui";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CommandMenuHost } from "./src/features/library/components/command-menu/command-menu";
import { commandMenu } from "./src/features/library/state/command-menu";
import "./src/styles.css";

if (!window.pond) {
  Object.defineProperty(window, "pond", {
    configurable: true,
    value: {
      query: async () => ({ ids: [], scores: {} }),
    },
  });
}

function Preview() {
  useEffect(() => commandMenu.open(), []);
  return (
    <Tooltip.Provider>
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: "100vh",
          background: "var(--ds-gray-1)",
          color: "var(--ds-gray-12)",
        }}
      >
        <aside
          style={{
            padding: 18,
            background: "var(--ds-gray-2)",
            borderRight: "1px solid var(--ds-gray-a3)",
          }}
        >
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <Logo size={18} />
            <strong>Pond</strong>
          </div>
        </aside>
        <section style={{ padding: 24 }}>
          <div
            style={{
              width: "100%",
              height: 48,
              borderBottom: "1px solid var(--ds-gray-a3)",
            }}
          />
        </section>
      </main>
      <CommandMenuHost />
    </Tooltip.Provider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing preview root");
createRoot(root).render(<Preview />);
