import { Settings, Switch } from "@pond/ui";
import { ModelPicker } from "@/components/model-picker";
import {
  CAPTION_CATALOG,
  CLIP_CATALOG,
  WHISPER_CATALOG,
} from "@/lib/enrichment/model-catalogs";
import { usePrefs } from "@/stores/prefs";

export function EnrichmentSection() {
  const [prefs, patch] = usePrefs("ai");

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Enrichment</Settings.Title>
        <Settings.Description>
          On-device models that caption, transcribe, and label your library.
          Everything runs locally in the background.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Features</Settings.SectionTitle>
        <Settings.List>
          <EnrichToggle
            title="Image captions"
            description="Caption images with Florence-2. Large first download."
            checked={prefs.enableCaption === true}
            onChange={(v) => patch({ enableCaption: v })}
          />
          <EnrichToggle
            title="Text in images (OCR)"
            description="Read text in images with Florence-2."
            checked={prefs.enableOcr === true}
            onChange={(v) => patch({ enableOcr: v })}
          />
          <EnrichToggle
            title="Transcribe audio & video"
            description="Transcribe video and audio with Whisper. Runs in the background."
            checked={prefs.enableTranscript === true}
            onChange={(v) => patch({ enableTranscript: v })}
          />
          <EnrichToggle
            title="Visual similarity (CLIP)"
            description="Embed images with CLIP for visual search and duplicate detection."
            checked={prefs.enableClip === true}
            onChange={(v) => patch({ enableClip: v })}
          />
          <EnrichToggle
            title="Aesthetic & style labels"
            description="Label image styles like minimalist or vintage with CLIP."
            checked={prefs.enableAesthetic === true}
            onChange={(v) => patch({ enableAesthetic: v })}
          />
          <EnrichToggle
            title="Auto-title"
            description="Fill empty titles from captions or text. Never overwrites edits."
            checked={prefs.enableAutoTitle === true}
            onChange={(v) => patch({ enableAutoTitle: v })}
          />
          <EnrichToggle
            title="Suggested tags"
            description="Suggest existing tags by meaning. Needs semantic search. Apply them in bulk from Tasks."
            checked={prefs.enableSuggestedTags === true}
            onChange={(v) => patch({ enableSuggestedTags: v })}
          />
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Models</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Caption / OCR model</Settings.ItemTitle>
              <Settings.ItemDescription>
                Florence-2 model for captions and OCR.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <ModelPicker
                catalog={CAPTION_CATALOG}
                value={prefs.captionModelId ?? ""}
                onChange={(id) => patch({ captionModelId: id })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>CLIP model</Settings.ItemTitle>
              <Settings.ItemDescription>
                Model for image embeddings and style labels.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <ModelPicker
                catalog={CLIP_CATALOG}
                value={prefs.clipModelId ?? ""}
                onChange={(id) => patch({ clipModelId: id })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Transcription model</Settings.ItemTitle>
              <Settings.ItemDescription>
                Whisper model for speech-to-text.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <ModelPicker
                catalog={WHISPER_CATALOG}
                value={prefs.whisperModelId ?? ""}
                onChange={(id) => patch({ whisperModelId: id })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}

function EnrichToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Settings.Item>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{title}</Settings.ItemTitle>
        <Settings.ItemDescription>{description}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root checked={checked} onCheckedChange={onChange} />
      </Settings.ItemControl>
    </Settings.Item>
  );
}
