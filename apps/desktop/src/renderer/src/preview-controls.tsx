import {
  IconAdjustContrastOutline18,
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconExpandOutline18,
  IconFileExportOutline18,
  IconFullScreenOutline18,
  IconMediaPauseOutline18,
  IconMediaPlayOutline18,
  IconMirrorObjXOutline18,
  IconPinTackOutline18,
  IconRotateImageClockwiseOutline18,
  IconSizeLgOutline18,
  IconWindowShareOutline18,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import type { ReactElement } from "react";
import { createCopyTranslator } from "../../shared/localization";
import type { PreviewWindowState } from "../../shared/preview-window-contracts";
import { FramelessWindowChrome } from "./shared/components/frameless-window-chrome";

export interface PreviewControlActions {
  close(): void;
  cycleOpacity(): void;
  next(): void;
  openOriginal(): void;
  previous(): void;
  toggleFullscreen(): void;
  toggleGrayscale(): void;
  toggleMirror(): void;
  togglePin(): void;
  toggleSize(): void;
  toggleSlideshow(): void;
  rotate(): void;
  exportOriginal(): void;
}

interface PreviewToolProps {
  children: ReactElement;
  label: string;
  onClick(): void;
  pressed?: boolean;
  side: "top" | "bottom";
}

function PreviewTool({
  children,
  label,
  onClick,
  pressed,
  side,
}: PreviewToolProps) {
  return (
    <Tooltip label={label} side={side}>
      <Button
        aria-label={label}
        aria-pressed={pressed}
        icon
        onClick={onClick}
        size="sm"
        type="button"
        variant="ghost"
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export function PreviewControls({
  actions,
  slideshow,
  state,
}: {
  actions: PreviewControlActions;
  slideshow: boolean;
  state: PreviewWindowState;
}) {
  const translate = createCopyTranslator(state.locale);
  const tooltipSide = state.mediaType === "video" ? "bottom" : "top";
  const label = (source: string) => translate(source);

  return (
    <Tooltip.Provider>
      <div className="preview-window-chrome">
        <FramelessWindowChrome
          closeLabel={label("Close Preview")}
          onClose={actions.close}
        />
      </div>
      <nav aria-label={label("Preview Controls")} className="preview-controls">
        <div className="preview-control-group">
          <PreviewTool
            label={label("Previous")}
            onClick={actions.previous}
            side={tooltipSide}
          >
            <IconArrowLeftOutline18 />
          </PreviewTool>
          <PreviewTool
            label={label("Next")}
            onClick={actions.next}
            side={tooltipSide}
          >
            <IconArrowRightOutline18 />
          </PreviewTool>
          {state.kind === "presentation" ? (
            <PreviewTool
              label={label(slideshow ? "Pause Slideshow" : "Play Slideshow")}
              onClick={actions.toggleSlideshow}
              pressed={slideshow}
              side={tooltipSide}
            >
              {slideshow ? (
                <IconMediaPauseOutline18 />
              ) : (
                <IconMediaPlayOutline18 />
              )}
            </PreviewTool>
          ) : null}
        </div>

        {state.mediaType === "image" ? (
          <div className="preview-control-group">
            <PreviewTool
              label={label("Rotate")}
              onClick={actions.rotate}
              side={tooltipSide}
            >
              <IconRotateImageClockwiseOutline18 />
            </PreviewTool>
            <PreviewTool
              label={label("Mirror")}
              onClick={actions.toggleMirror}
              pressed={state.mirrored}
              side={tooltipSide}
            >
              <IconMirrorObjXOutline18 />
            </PreviewTool>
            <PreviewTool
              label={label("Grayscale")}
              onClick={actions.toggleGrayscale}
              pressed={state.grayscale}
              side={tooltipSide}
            >
              <IconAdjustContrastOutline18 />
            </PreviewTool>
            <PreviewTool
              label={label(state.zoom === null ? "Actual Size" : "Fit")}
              onClick={actions.toggleSize}
              pressed={state.zoom !== null}
              side={tooltipSide}
            >
              {state.zoom === null ? (
                <IconSizeLgOutline18 />
              ) : (
                <IconExpandOutline18 />
              )}
            </PreviewTool>
          </div>
        ) : (
          <div className="preview-control-group">
            <PreviewTool
              label={label(state.size === "fill" ? "Fit" : "Fill")}
              onClick={actions.toggleSize}
              pressed={state.size === "fill"}
              side={tooltipSide}
            >
              <IconExpandOutline18 />
            </PreviewTool>
          </div>
        )}

        <div className="preview-control-group">
          <PreviewTool
            label={label("Open in Default App")}
            onClick={actions.openOriginal}
            side={tooltipSide}
          >
            <IconWindowShareOutline18 />
          </PreviewTool>
          <PreviewTool
            label={label("Export Original")}
            onClick={actions.exportOriginal}
            side={tooltipSide}
          >
            <IconFileExportOutline18 />
          </PreviewTool>
        </div>

        <div className="preview-control-group">
          <PreviewTool
            label={label("Fullscreen")}
            onClick={actions.toggleFullscreen}
            pressed={state.fullscreen}
            side={tooltipSide}
          >
            <IconFullScreenOutline18 />
          </PreviewTool>
          <Tooltip
            label={`${label("Opacity")}: ${Math.round(state.opacity * 100)}%`}
            side={tooltipSide}
          >
            <Button
              aria-label={`${label("Opacity")}: ${Math.round(state.opacity * 100)}%`}
              className="preview-opacity"
              onClick={actions.cycleOpacity}
              size="sm"
              type="button"
              variant="ghost"
            >
              {Math.round(state.opacity * 100)}%
            </Button>
          </Tooltip>
          <PreviewTool
            label={label("Keep on Top")}
            onClick={actions.togglePin}
            pressed={state.alwaysOnTop}
            side={tooltipSide}
          >
            <IconPinTackOutline18 />
          </PreviewTool>
        </div>
      </nav>
    </Tooltip.Provider>
  );
}
