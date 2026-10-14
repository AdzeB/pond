# On-device model defaults

**Last reviewed:** October 14, 2026  
**Runtime:** `@huggingface/transformers` 4.3.1. The renderer enrichment worker uses WebGPU with WASM fallback. The main process runs query embeddings on CPU.  
**Source of truth:** [`on-device-models.ts`](../../apps/desktop/src/shared/on-device-models.ts) and [`sensitive-content-contract.ts`](../../apps/desktop/src/renderer/src/features/enrichment/lib/sensitive-content-contract.ts). Update this page when either file changes.

## Current defaults

| Task | Model | Revision | Precision |
| --- | --- | --- | --- |
| Semantic search, visual similarity, style labels, suggested tags | `onnx-community/embeddinggemma-2-ONNX` | `daa72c51243991dfcaf9f9137d2c573d8f7790c0` | q4 |
| Captions and text in images | `onnx-community/Florence-2-base-ft` | `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f` | WebGPU: fp16 encoders, q4 merged decoder. WASM: q8 |
| Transcription | `onnx-community/whisper-base` | `1846881b6b3a3024392c1eea3ad983695bc23925` | WebGPU: fp16. WASM: q8 |
| Sensitive content | `Marqo/nsfw-image-detection-384` | `b2d8f0c3abe6e05062288460ecf58e42ea690e84` | ONNX file verified by SHA-256 |

EmbeddingGemma 2 replaced both MPNet text embeddings and SigLIP 2 visual embeddings. The evaluation behind that decision is in [Gemma as a replacement for Pond AI components](gemma-pond-replacement-research-2026-10-08.md).

Image Understanding can also route captions and text recognition to a model you run in Ollama or LM Studio (default ID `gemma4:e2b`), with Florence-2 as an optional fallback. Pond does not bundle that model. See the [local media benchmark](google-local-media-models-benchmark-2026-10-08.md).

## Embeddings

EmbeddingGemma 2 maps text, images, audio, and video into one 768-dimensional space. Pond stores two vectors per Save:

- `embedding`: the text vector, built from the title and body.
- `clipEmbedding`: the media vector for image, audio, or video Saves.

The `clip` names in prefs (`enableClip`), the `clip_embedding` column, the `clip` vec table, and `clipEmbeddingVersion()` are legacy identifiers. They hold EmbeddingGemma 2 media vectors, not CLIP vectors.

### Loading

The model's encoders load selectively through the config:

- **Renderer, `text-image` profile:** audio encoder off. Used for text, images, and video frames.
- **Renderer, `text-audio` profile:** vision encoder off. Used for audio and video soundtracks.
- **Main process:** text only, on CPU. Used for search queries and classification labels.

The renderer keeps one profile alive at a time and disposes it before loading the other ([`embedding-profile.ts`](../../apps/desktop/src/renderer/src/features/enrichment/lib/embedding-profile.ts)). Every path reads the graph's `sentence_embedding` output and L2-normalizes it ([`embeddings.ts`](../../apps/desktop/src/shared/embeddings.ts)).

### Prompts

EmbeddingGemma 2 expects task prefixes. Pond defines them in [`embeddings.ts`](../../apps/desktop/src/shared/embeddings.ts):

| Use | Format |
| --- | --- |
| Search query | `task: search result \| query: {text}` |
| Indexed Save | `title: {title or "none"} \| text: {body}` |
| Suggested tags | `task: sentence similarity \| query: {text}` |
| Style labels | `task: classification \| query: {label}` |
| Retrieval with `task: "code"` | `task: code retrieval \| query: {text}` |
| Retrieval with `task: "fact-check"` | `task: fact checking \| query: {text}` |

The Save body joins description, notes, author, and tags, then truncates to 2,000 characters. The title is passed separately so it is not duplicated.

### Media preprocessing

- **Images:** the representative image for the Save.
- **Audio:** decoded to mono 16 kHz, capped at 30 seconds.
- **Video:** sampled at 1 frame per second, up to 32 frames and 32 seconds. When the soundtrack decodes, the frame vector and audio vector are averaged and renormalized. Otherwise the frame vector is used alone.

Style labels compare the image vector with classification-prompted label vectors by cosine similarity. Pond keeps up to three labels at or above 0.2.

### Dimensions

Pond stores the full 768 dimensions. EmbeddingGemma 2 supports Matryoshka truncation to 512, 256, or 128, but `pnpm --filter @pond/desktop perf:embedding-dimensions` has only run on a synthetic corpus. Keep 768 until a representative held-out corpus passes the adoption rule in the [Gemma research note](gemma-pond-replacement-research-2026-10-08.md#implementation-status).

### Versioning

Text vectors are stamped `{model id}@{revision}:document:768:{preprocessing version}`. Media vectors use `media` instead of `document` and append the preprocessing descriptor `image-v1+audio-mono16k-30s+video-1fps-32f-32s+normalized-mean-v1`. Enrichers compare the stored stamp with the current one, so changing the model, revision, dimensions, or preprocessing version rebuilds vectors in the background.

## Captions and text in images

Florence-2 base fine-tuned runs `<CAPTION>` for captions and `<OCR>` for text in images through `Florence2ForConditionalGeneration`, `Florence2Processor.construct_prompts`, and `post_process_generation`. Generation uses greedy decoding with one beam and up to 256 new tokens. Results are stamped `{model id}@{revision}:2`.

The WebGPU profile loads about 395 MiB. The q8 WASM profile loads about 262 MiB.

## Transcription

Whisper Base runs through the Transformers.js speech recognition pipeline with 30-second chunks, a 5-second stride, and `task: "transcribe"`. Pond does not pass a language, and Transformers.js 4.3 does not detect one, so transcription assumes English. Results are stamped `{model id}@{revision}:2`.

## Sensitive content

The sensitive-content classifier downloads one pinned ONNX file, checks its SHA-256 before use, and caches it. Run `pnpm --filter @pond/desktop smoke:sensitive-content` to exercise the download, checksum, and one inference outside Electron.

## Changing a default

1. Pin the exact Hugging Face revision. A model ID alone does not pin files.
2. Pass the revision to every model, processor, and tokenizer load in the renderer and main process.
3. Bump the preprocessing or model version so stored stamps no longer match. That triggers the background rebuild.
4. Benchmark cold download, first inference, steady-state latency, peak renderer and main-process memory, WASM fallback, and quality on Pond fixtures before shipping.
5. Update this page and the precision column above.
