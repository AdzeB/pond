import { Button, Dialog, Input, Select, Slider, Switch } from "@pond/ui";
import type {
  DesktopScreenshotCrop,
  DesktopScreenshotSource,
  SavesImportQueryInputs,
} from "@shared/saves-import-contracts";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { captureScreenshot } from "../actions";
import styles from "./styles.module.css";

interface ScreenshotDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture?: (
    sourceId: string,
    options: Omit<
      SavesImportQueryInputs["saves.captureDesktopScreenshot"],
      "sourceId" | "folderId"
    >,
  ) => Promise<void>;
}

const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const;

export function ScreenshotDialog({
  open,
  onClose,
  onCapture = captureScreenshot,
}: ScreenshotDialogProps) {
  const [sources, setSources] = useState<DesktopScreenshotSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(90);
  const [copyToClipboard, setCopyToClipboard] = useState(false);
  const [crop, setCrop] = useState<DesktopScreenshotCrop | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const selectedSource = sources.find((source) => source.id === selectedId);

  function cropPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  useEffect(() => {
    let active = true;
    void window.pond
      .query("saves.desktopScreenshotSources", {})
      .then((result) => {
        if (active) setSources(result.sources);
      })
      .catch(() => {
        if (active) {
          setError(
            "Pond couldn't list screens and windows. Check Screen Recording access and try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(): Promise<void> {
    if (!selectedId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCapture(selectedId, {
        title: title.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        format,
        quality,
        crop,
        copyToClipboard,
      });
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pond couldn't save the screenshot. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open, details) => {
        if (busy) details.cancel();
        else if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Capture Screenshot</Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <Dialog.Content>
              <Dialog.Description>
                Choose a screen or window to save as an image.
              </Dialog.Description>
              {loading ? (
                <p className={styles.status} role="status">
                  Loading screens and windows
                </p>
              ) : sources.length > 0 ? (
                <div className={styles.sources} {...scrollFade}>
                  {sources.map((source) => (
                    <Button
                      key={source.id}
                      type="button"
                      size="sm"
                      width="full"
                      variant={selectedId === source.id ? "tertiary" : "ghost"}
                      className={styles.source}
                      aria-pressed={selectedId === source.id}
                      disabled={busy}
                      onClick={() => setSelectedId(source.id)}
                    >
                      <img
                        className={styles.thumbnail}
                        src={source.thumbnailDataUrl}
                        alt=""
                      />
                      <span className={styles.details}>
                        <span className={styles.name}>{source.name}</span>
                        <span className={styles.kind}>
                          {source.kind === "screen" ? "Screen" : "Window"}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className={styles.status}>
                  No screens or windows are available. Check Screen Recording
                  access and try again.
                </p>
              )}
              {selectedSource ? (
                <div
                  className={styles.crop}
                  onPointerDown={(event) => {
                    const point = cropPoint(event);
                    cropStart.current = point;
                    setCrop({ ...point, width: 0.001, height: 0.001 });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!cropStart.current) return;
                    const point = cropPoint(event);
                    const start = cropStart.current;
                    setCrop({
                      x: Math.min(start.x, point.x),
                      y: Math.min(start.y, point.y),
                      width: Math.max(0.001, Math.abs(point.x - start.x)),
                      height: Math.max(0.001, Math.abs(point.y - start.y)),
                    });
                  }}
                  onPointerUp={(event) => {
                    cropStart.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                >
                  <img src={selectedSource.thumbnailDataUrl} alt="" />
                  {crop ? (
                    <span
                      className={styles.selection}
                      style={{
                        left: `${crop.x * 100}%`,
                        top: `${crop.y * 100}%`,
                        width: `${crop.width * 100}%`,
                        height: `${crop.height * 100}%`,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <div className={styles.options}>
                <Input.Root>
                  <Input.Field
                    aria-label="Screenshot Title"
                    placeholder="Screenshot title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Input.Root>
                <Input.Root>
                  <Input.Field
                    aria-label="Screenshot Tags"
                    placeholder="Tags separated by commas"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                </Input.Root>
                <div className={styles.option}>
                  <span>Format</span>
                  <Select.Root
                    items={[...FORMATS]}
                    value={format}
                    onValueChange={(value) => {
                      if (value !== null) setFormat(value);
                    }}
                  >
                    <Select.Trigger aria-label="Screenshot Format">
                      <Select.Value>
                        {(value: string) =>
                          FORMATS.find((option) => option.value === value)
                            ?.label ?? "PNG"
                        }
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={6}>
                        <Select.Popup>
                          <Select.Items items={[...FORMATS]} />
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </div>
                {format !== "png" ? (
                  <div className={styles.option}>
                    <span>Quality</span>
                    <Slider.Root
                      aria-label="Screenshot Quality"
                      min={1}
                      max={100}
                      value={quality}
                      onValueChange={(value) =>
                        setQuality(
                          Array.isArray(value) ? (value[0] ?? 90) : value,
                        )
                      }
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Indicator />
                          <Slider.Thumb />
                        </Slider.Track>
                      </Slider.Control>
                    </Slider.Root>
                  </div>
                ) : null}
                <div className={styles.option}>
                  <span>Copy to Clipboard</span>
                  <Switch.Root
                    aria-label="Copy Screenshot to Clipboard"
                    checked={copyToClipboard}
                    onCheckedChange={setCopyToClipboard}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!selectedId}
                  onClick={() => setCrop(null)}
                >
                  Use Full Source
                </Button>
              </div>
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Cancel type="button" disabled={busy} onClick={onClose} />
              <Dialog.Confirm
                type="submit"
                loading={busy}
                disabled={!selectedId || loading}
              >
                {busy ? "Capturing" : "Capture"}
              </Dialog.Confirm>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
