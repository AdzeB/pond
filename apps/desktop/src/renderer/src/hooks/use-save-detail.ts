import { useEffect, useMemo } from "react";
import { ensureTranscript } from "@/lib/media/transcript";
import { pickAuthorAvatarUrl } from "@/lib/media/url";
import {
  collectEngagement,
  collectIdentityRows,
  composeContentDescription,
  type DetailRow,
  type Metric,
} from "@/lib/save/detail";
import { ensureRawJson } from "@/lib/save/raw-json";
import { getSourceIcon } from "@/lib/save/sources-registry";
import type { Save } from "@/lib/types";
import { useSave } from "./use-saves";

type SourceIcon = ReturnType<typeof getSourceIcon>;

interface SaveDetailView {
  save: Save | undefined;
  engagement: Metric[];
  rows: DetailRow[];
  description: string;
  caption: string;
  ocr: string;
  transcript: string;
  style: string[];
  colors: string[];
  avatarUrl: string | null;
  sourceIcon: SourceIcon;
  hasInsights: boolean;
}

/** Lazily hydrates the heavy fields the list omits (full rawJson + transcript) and derives the memoized view-model the panel renders. */
export function useSaveDetail(id: string): SaveDetailView {
  const save = useSave(id);

  useEffect(() => {
    void ensureRawJson(id);
    void ensureTranscript(id);
  }, [id]);

  return useMemo<SaveDetailView>(() => {
    if (!save) {
      return {
        save: undefined,
        engagement: [],
        rows: [],
        description: "",
        caption: "",
        ocr: "",
        transcript: "",
        style: [],
        colors: [],
        avatarUrl: null,
        sourceIcon: null,
        hasInsights: false,
      };
    }

    const caption = save.caption?.trim() ?? "";
    const ocr = save.ocrText?.trim() ?? "";
    const transcript = save.transcript?.trim() ?? "";
    const style = (save.aesthetic ?? []).filter(Boolean);

    return {
      save,
      engagement: collectEngagement(save),
      rows: collectIdentityRows(save),
      description: composeContentDescription(save),
      caption,
      ocr,
      transcript,
      style,
      colors: save.dominantColors?.slice(0, 8) ?? [],
      avatarUrl: pickAuthorAvatarUrl(save),
      sourceIcon: getSourceIcon(save.source),
      hasInsights: !!caption || !!ocr || !!transcript || style.length > 0,
    };
  }, [save]);
}
