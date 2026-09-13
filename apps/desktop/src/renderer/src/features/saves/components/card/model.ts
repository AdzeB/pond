import type { IconComponent } from "@pond/icons/types";
import { useMemo } from "react";
import {
  type DisplayPrefs,
  useDisplayPrefs,
} from "@/features/library/state/display-prefs";
import { useMediaPickOptions } from "@/features/saves/hooks/use-media-pick-options";
import {
  buildMediaUnits,
  deriveTypeKind,
  deriveTypeLabel,
  type MediaPickOptions,
  type MediaUnit,
  pickCardUnit,
  pickPrimaryFile,
} from "@/features/saves/lib/media/units";
import { pickSourceIconUrl } from "@/features/saves/lib/media/url";
import { getSourceLabel } from "@/features/saves/lib/source-labels";
import { displayTitleForSave } from "@/features/saves/lib/text";
import {
  aspectDimsFor,
  aspectFor,
  useAspectVersion,
} from "@/features/saves/state/aspect";
import type { Save, SaveFile } from "@/features/saves/types";
import { getSourceIcon, getSourceLogo } from "@/features/sources/lib/registry";
import { formatAbsolute } from "@/shared/lib/format";

type SourceIcon = IconComponent;
type TypeKind = ReturnType<typeof deriveTypeKind>;
const PAPER_ASPECT = 8.5 / 11;

export interface SaveCardOverlayModel {
  type: { label: string; kind: TypeKind } | null;
  source: {
    label: string;
    logo: string | null;
    icon: SourceIcon | null;
  } | null;
  fileCount: number | null;
  hasNote: boolean;
}

export interface SaveCardModel {
  save: Save;
  unit: MediaUnit | null;
  primary: SaveFile | null;
  mediaUnits: MediaUnit[];
  pickOptions: MediaPickOptions;
  aspect: number;
  title: string | null;
  time: string | null;
  overlay: SaveCardOverlayModel;
}

export function buildSaveCardModel(
  save: Save,
  pickOptions: MediaPickOptions,
  display: DisplayPrefs,
  aspect: number,
): SaveCardModel {
  const unit = pickCardUnit(save, pickOptions);
  const primary = pickPrimaryFile(save, pickOptions);
  const mediaUnits = buildMediaUnits(save, pickOptions);
  const typeKind = deriveTypeKind(primary, save);
  const dimensions = aspectDimsFor(save, pickOptions, unit);
  const previewAspect =
    dimensions.w && dimensions.h ? dimensions.w / dimensions.h : aspect;
  const typeLabel = display.type ? deriveTypeLabel(primary, save) : null;
  const showSource = display.source && save.source !== "local";
  const sourceLabel = showSource ? getSourceLabel(save.source) : null;
  const fileCount = display.fileCount ? mediaUnits.length : 0;

  return {
    save,
    unit,
    primary,
    mediaUnits,
    pickOptions,
    aspect:
      previewAspect === 1 && typeKind === "doc" ? PAPER_ASPECT : previewAspect,
    title: display.name ? displayTitleForSave(save) : null,
    time: display.date ? formatAbsolute(save.savedAt) : null,
    overlay: {
      type: typeLabel ? { label: typeLabel, kind: typeKind } : null,
      source: sourceLabel
        ? {
            label: sourceLabel,
            logo:
              getSourceLogo(save.source) ??
              (save.source === "web" ? pickSourceIconUrl(save) : null),
            icon: getSourceIcon(save.source),
          }
        : null,
      fileCount: fileCount > 1 ? fileCount : null,
      hasNote: Boolean(save.notes?.trim()),
    },
  };
}

export function useSaveCardModel(
  save: Save,
  observeAspect: boolean,
): SaveCardModel {
  const pickOptions = useMediaPickOptions();
  const display = useDisplayPrefs();
  const aspectVersion = useAspectVersion(observeAspect);

  return useMemo(() => {
    void aspectVersion;
    return buildSaveCardModel(
      save,
      pickOptions,
      display,
      aspectFor(save, pickOptions),
    );
  }, [aspectVersion, display, pickOptions, save]);
}
