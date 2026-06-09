import { Shell } from "@pond/ui";
import { Outlet, useLocation, useSearch } from "@tanstack/react-router";
import React from "react";
import { isSourceDetailRoot } from "@/core/lib/search-schemas";
import { Library as Sidebar } from "@/features/library/sidebar";
import { Toolbar } from "@/features/library/toolbar";
import { NavOrderPublisher } from "./nav-order-publisher";

export function Library() {
  const { pathname } = useLocation();
  const search = useSearch({ strict: false }) as { tab?: string };

  // On the source detail page the source view renders its own header and
  // tab strip, so the grid toolbar (search/filter/layout) only makes sense
  // on the Saves tab.
  const onSourceRoot = isSourceDetailRoot(pathname);
  const tab = search.tab ?? "overview";
  const showToolbar = !(onSourceRoot && tab !== "saves");

  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar />
      </Shell.Aside>
      <Shell.Main>
        {showToolbar ? (
          <Shell.Header>
            <Toolbar />
          </Shell.Header>
        ) : null}
        <Outlet />
      </Shell.Main>
      <NavOrderPublisher />
    </React.Fragment>
  );
}
