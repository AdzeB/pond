import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import { Settings as Sidebar } from "@/components/settings-sidebar";

export function Settings() {
  return (
    <Shell.Body style={{ height: "100dvh" }}>
      <Shell.Aside>
        <Sidebar />
      </Shell.Aside>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </Shell.Body>
  );
}
