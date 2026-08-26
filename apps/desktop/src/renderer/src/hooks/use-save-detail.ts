import { useEffect, useMemo } from "react";
import { pickAuthorAvatarUrl, pickSourceIconUrl } from "@/lib/media/url";
import {
  collectIdentityRows,
  composeContentDescription,
  type DetailRow,
} from "@/lib/save/detail";
import { ensureRawJson } from "@/lib/save/raw-json";
import { getSourceIcon, getSourceLogo } from "@/lib/save/sources-registry";
import { accountRefsFromSync } from "@/lib/search/account-aliases";
import type { Save } from "@/lib/types";
import { usePrefs } from "@/stores/prefs";
import { useSave } from "./use-saves";

type SourceIcon = ReturnType<typeof getSourceIcon>;

interface SaveDetailView {
  save: Save | undefined;
  rows: DetailRow[];
  description: string;
  colors: string[];
  avatarUrl: string | null;
  sourceLogo: string | null;
  sourceIcon: SourceIcon;
}

export function useSaveDetail(id: string): SaveDetailView {
  const save = useSave(id);
  const [sync] = usePrefs("sync");

  useEffect(() => {
    void ensureRawJson(id);
  }, [id]);

  return useMemo<SaveDetailView>(() => {
    if (!save) {
      return {
        save: undefined,
        rows: [],
        description: "",
        colors: [],
        avatarUrl: null,
        sourceLogo: null,
        sourceIcon: null,
      };
    }

    return {
      save,
      rows: collectIdentityRows(save, accountRefsFromSync(sync)),
      description: composeContentDescription(save),
      colors: save.dominantColors?.slice(0, 8) ?? [],
      avatarUrl: pickAuthorAvatarUrl(save),
      sourceLogo:
        getSourceLogo(save.source) ??
        (save.source === "web" ? pickSourceIconUrl(save) : null),
      sourceIcon: getSourceIcon(save.source),
    };
  }, [save, sync]);
}
