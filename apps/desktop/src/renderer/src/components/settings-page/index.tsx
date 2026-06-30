import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";

export function Settings() {
  return (
    <Shell.Body style={{ height: "100dvh" }}>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </Shell.Body>
  );
}
