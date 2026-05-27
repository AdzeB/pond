import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { adaptNavigate } from "@/lib/navigate-path";

export function DeepLinkBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const nav = adaptNavigate(navigate);
    const off = window.pond.onNavigate((path) =>
      nav(path, { viewTransition: true }),
    );
    return off;
  }, [navigate]);

  return null;
}
