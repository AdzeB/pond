import {
  IconArrowsExpandY,
  IconCamera,
  IconCrop,
  IconFocus,
  IconImages,
} from "@pond/icons";
import { Button } from "@pond/ui/button";
import { type ReactNode, useState } from "react";
import { type CaptureTool, sendMessage } from "@/utils/messaging";
import styles from "./styles.module.css";

const TOOLS: { tool: CaptureTool; label: string; icon: ReactNode }[] = [
  { tool: "visible", label: "Visible Area", icon: <IconCamera size={16} /> },
  { tool: "region", label: "Region", icon: <IconCrop size={16} /> },
  { tool: "element", label: "Element", icon: <IconFocus size={16} /> },
  { tool: "full", label: "Full Page", icon: <IconArrowsExpandY size={16} /> },
  { tool: "images", label: "Images", icon: <IconImages size={16} /> },
];

interface ToolsProps {
  tabId: number | undefined;
}

export function Tools({ tabId }: ToolsProps) {
  const [error, setError] = useState<string | null>(null);

  const run = async (tool: CaptureTool) => {
    if (tabId === undefined) return;
    setError(null);
    const result = await sendMessage("runTool", { tabId, tool }).catch(() => ({
      ok: false as const,
      message: "Pond couldn't reach this page. Reload it and try again.",
    }));
    if (result.ok) window.close();
    else setError(result.message);
  };

  return (
    <section className={styles.tools} aria-labelledby="pond-tools">
      <h2 id="pond-tools" className={styles.heading}>
        Capture
      </h2>
      <div className={styles.grid}>
        {TOOLS.map(({ tool, label, icon }) => (
          <Button
            key={tool}
            size="sm"
            variant="secondary"
            disabled={tabId === undefined}
            onClick={() => void run(tool)}
          >
            {icon}
            {label}
          </Button>
        ))}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
