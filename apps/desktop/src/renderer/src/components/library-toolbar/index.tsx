import { TitleBar } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { extractSource, labelForMode, parseMode } from "@/lib/save/list";
import { listBaseFromPath } from "@/lib/search/schemas";
import { formatNumber } from "@/lib/util/format";
import { useAskResult } from "@/stores/ask-store";
import { useViewFilteredCount } from "@/stores/library-view-context";
import { useFilterQuery, useSearchText } from "@/stores/view-store";

export function Toolbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useViewFilteredCount();
  const search = useSearchText().trim();
  const filterQuery = useFilterQuery();
  const ask = useAskResult();

  const isSources = pathname === "/sources";
  const base = listBaseFromPath(pathname);
  const mode = parseMode(base) ?? "library";
  const sourceFilter = mode === "source" ? extractSource(base) : "";

  const title = ask.active
    ? ask.question.trim() || "Results"
    : isSources
      ? "Sources"
      : labelForMode(mode, sourceFilter);

  const filterCount = filterQuery.rules.length;
  const meta: string[] = [];
  if (!ask.active && !isSources) {
    if (search) meta.push(`matching “${search}”`);
    if (filterCount > 0) {
      meta.push(`${filterCount} filter${filterCount === 1 ? "" : "s"}`);
    }
  }
  if (!isSources) {
    meta.push(formatNumber(count));
  }

  return (
    <TitleBar.Root>
      <TitleBar.Title>
        <TitleBar.Label>{title}</TitleBar.Label>
        {meta.length > 0 ? (
          <TitleBar.Meta>{meta.join(" / ")}</TitleBar.Meta>
        ) : null}
      </TitleBar.Title>
    </TitleBar.Root>
  );
}
