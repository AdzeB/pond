import { lazy, type ReactNode, Suspense, useCallback, useState } from "react";
import { GeneratedRasterViewer } from "@/features/saves/components/viewers/generated-raster-viewer";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  ChromePortal,
  ViewerChrome,
} from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import { OriginalFileActions } from "@/features/saves/components/viewers/original-file-actions";
import { ViewerFallback } from "@/features/saves/components/viewers/viewer-fallback";
import { ViewerResultCount } from "@/features/saves/components/viewers/viewer-result-count";
import {
  type ViewerNavigation,
  ViewerNavigationControls,
  ViewerToolbarGroups,
} from "@/features/saves/components/viewers/viewer-toolbar-groups";
import {
  type StoredFileViewerKind,
  storedFileViewerKind,
} from "@/features/saves/lib/media/file-viewer";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import type { Save, SaveFile } from "@/features/saves/types";
import { AudioViewer } from "./audio";
import { GenericFileCard } from "./file-card";
import { FontViewer } from "./font";
import { FontActivate } from "./font/activate";
import { PdfViewer } from "./pdf";
import styles from "./styles.module.css";
import type { ViewerProps } from "./types";

const ArchiveFileViewer = lazy(() =>
  import("@/features/saves/components/viewers/archive-file-viewer").then(
    (module) => ({ default: module.ArchiveFileViewer }),
  ),
);

const EpubViewer = lazy(() =>
  import("@/features/saves/components/viewers/epub-viewer").then((module) => ({
    default: module.EpubViewer,
  })),
);

const ModelViewer = lazy(() =>
  import("@/features/saves/components/viewers/model-viewer").then((module) => ({
    default: module.ModelViewer,
  })),
);

const LivePhotoViewer = lazy(() =>
  import("@/features/saves/components/viewers/live-photo-viewer").then(
    (module) => ({ default: module.LivePhotoViewer }),
  ),
);

const SafeWebViewer = lazy(() =>
  import("@/features/saves/components/viewers/safe-web-viewer").then(
    (module) => ({ default: module.SafeWebViewer }),
  ),
);

const TextFileViewer = lazy(() =>
  import("@/features/saves/components/viewers/text-file-viewer").then(
    (module) => ({ default: module.TextFileViewer }),
  ),
);

export function StoredFileViewer({
  save,
  file,
  showControls = true,
}: {
  save: Save;
  file: SaveFile;
  showControls?: boolean;
}) {
  return (
    <ViewerChrome enabled={showControls}>
      <Suspense
        fallback={<div className={styles.previewStatus}>Loading preview</div>}
      >
        <StoredFileContent
          key={`${save.id}:${file.path}:${file.sha256}`}
          save={save}
          file={file}
          fileIndex={save.files.indexOf(file)}
          active
        />
      </Suspense>
    </ViewerChrome>
  );
}

interface StoredFileContentProps {
  save: Save;
  file: SaveFile;
  fileIndex: number;
  url?: string;
  active?: boolean;
  navigation?: ViewerNavigation;
  viewerKind?: StoredFileViewerKind;
}

export function StoredFileContent({
  save,
  file,
  fileIndex,
  url = buildPondUrl(save.id, file),
  active = true,
  navigation,
  viewerKind,
}: StoredFileContentProps) {
  const kind = viewerKind ?? storedFileViewerKind(file);
  const props = { save, file, fileIndex, active, navigation };

  if (kind === "pdf") return <PdfViewer {...props} url={url} />;
  if (kind === "audio") return <AudioViewer {...props} url={url} />;
  if (kind === "font") return <FontViewer {...props} url={url} />;
  if (kind === "text") return <TextFileViewer {...props} url={url} />;
  if (kind === "native-preview")
    return <NativePreviewViewer {...props} url={url} />;
  if (kind === "model") return <ModelFileViewer {...props} url={url} />;
  if (kind === "epub") return <EpubFileViewer {...props} url={url} />;
  if (kind === "live-photo")
    return <LivePhotoFileViewer {...props} url={url} />;
  if (kind === "archive") return <ArchiveViewer {...props} url={url} />;
  if (kind === "safe-web") return <SafeWebFileViewer {...props} url={url} />;
  return <GenericFileViewer {...props} />;
}

function GenericFileViewer({
  message,
  ...props
}: ViewerProps & { message?: string }) {
  return (
    <div className={styles.root}>
      <GenericFileCard {...props} message={message} />
      <FileBar {...props} />
    </div>
  );
}

function NativePreviewViewer(props: ViewerProps & { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <ViewerFallback
        {...props}
        reason="preview"
        active={props.active}
        slideNavigation={props.navigation}
      />
    );
  }

  return (
    <div className={styles.previewRoot}>
      <GeneratedRasterViewer
        save={props.save}
        fileIndex={props.fileIndex}
        url={props.url}
        active={props.active ?? true}
        slideNavigation={props.navigation}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ModelFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <ModelViewer
        url={props.url}
        path={props.file.path}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function EpubFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <EpubViewer
        url={props.url}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileActions {...props} />}
        toolbarNavigation={navigationControls(props.navigation)}
      />
    </div>
  );
}

function ArchiveViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <ArchiveFileViewer
        url={props.url}
        path={props.file.path}
        size={props.file.size}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function LivePhotoFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <LivePhotoViewer
        url={props.url}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function SafeWebFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <SafeWebViewer
        url={props.url}
        path={props.file.path}
        size={props.file.size}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

export function FileBar({
  children,
  label = "File viewer",
  ...props
}: ViewerProps & { children?: ReactNode; label?: string }) {
  return (
    <ChromePortal slot="top">
      <ViewerHud.Bar
        label={label}
        start={<ViewerResultCount saveId={props.save.id} />}
        end={
          <ViewerToolbarGroups
            actions={<FileActions {...props} />}
            view={children}
            navigation={navigationControls(props.navigation)}
          />
        }
      />
    </ChromePortal>
  );
}

function FileToolbarEnd(props: ViewerProps) {
  return (
    <ViewerToolbarGroups
      actions={<FileActions {...props} />}
      navigation={navigationControls(props.navigation)}
    />
  );
}

export function navigationControls(navigation?: ViewerNavigation): ReactNode {
  return navigation && navigation.count > 1 ? (
    <ViewerNavigationControls navigation={navigation} />
  ) : null;
}

export function FileActions(props: ViewerProps) {
  return (
    <>
      {props.save.mediaType === "font" ? (
        <FontActivate save={props.save} />
      ) : null}
      <OriginalFileActions save={props.save} fileIndex={props.fileIndex} />
    </>
  );
}
