# On-device model defaults

**Research date:** September 17, 2026  
**Runtime reviewed:** `@huggingface/transformers` 4.3.0 in Electron, WebGPU with WASM fallback  
**Scope:** Curated defaults for semantic search, captioning and OCR, visual similarity and style labels, and transcription.

## Production selection

- **Text embeddings:** `Xenova/all-mpnet-base-v2`, revision `e086c5e0b3a57b0ce46dd6d9c0662948860b35f3`, using q8.
- **Image captioning and OCR:** `onnx-community/Florence-2-base-ft`, revision `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f`, retaining Pond's existing mixed WebGPU profile and q8 WASM profile.
- **Visual embeddings and style labels:** `onnx-community/siglip2-base-patch16-224-ONNX`, revision `ba1f3b0843f24bc5417d38e19c37b287d719b2f4`, using q8.
- **Audio and video transcription:** `onnx-community/whisper-base`, revision `1846881b6b3a3024392c1eea3ad983695bc23925`, retaining fp16 on WebGPU and q8 on WASM.

MPNet replaces MiniLM without changing Pond's symmetric mean-pooling contract, which also powers suggested tags. The model is Apache-2.0 licensed and produces stronger 768-dimensional English sentence embeddings at a higher recurring cost ([Sentence Transformers, n.d.](../../references.md#sentence-transformers-all-mpnet-base-v2); [Xenova, n.d.-b](../../references.md#xenova-all-mpnet-base-v2)). EmbeddingGemma remains the stronger multilingual retrieval candidate, but its asymmetric prompts do not match suggested-tag comparisons and its Gemma terms require product review.

## Capability recommendation

- **Text embeddings:** `onnx-community/embeddinggemma-300m-ONNX`, revision `5090578d9565bb06545b4552f76e6bc2c93e4a66`, using q8.
- **Image captioning and OCR:** `onnx-community/Florence-2-base-ft`, revision `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f`, retaining Pond's existing mixed WebGPU profile and q8 WASM profile.
- **Visual embeddings and style labels:** `onnx-community/siglip2-base-patch16-224-ONNX`, revision `ba1f3b0843f24bc5417d38e19c37b287d719b2f4`, using q8.
- **Audio and video transcription:** `onnx-community/whisper-base`, revision `1846881b6b3a3024392c1eea3ad983695bc23925`, retaining fp16 on WebGPU and q8 on WASM.

These are quality-balanced defaults for consumer Macs, not the largest compatible checkpoints. EmbeddingGemma is the least conservative choice: its q8 weights are about 295 MiB, compared with about 22 MiB for the current MiniLM q8 artifact. If Pond requires a sub-100 MiB text default, retain MiniLM or adopt the existing `Xenova/bge-small-en-v1.5` catalog entry only after implementing its CLS pooling and query instruction.

## Selection constraints

The candidate had to meet all of these requirements:

1. Its exact Hugging Face repository identifies Transformers.js as the library or states that its ONNX weights target Transformers.js.
2. The repository contains every ONNX component that Transformers.js 4.3.0 requests for the selected dtype.
3. Transformers.js 4.3.0 registers the architecture and task path.
4. The model fits a recurring desktop enrichment task on consumer Mac hardware. A larger model needed a material capability gain, not only a higher benchmark score.
5. The model's documented pooling, prompting, normalization, and task controls can be represented explicitly in Pond's model contract.

Transformers.js 4.3.0 accepts a `revision` option for pipelines, tokenizers, processors, and models. It maps `dtype: "q8"` to `_quantized.onnx` artifacts. Its feature-extraction pipeline supports mean, CLS, and last-token pooling, but it only selects `last_hidden_state`, `logits`, or `token_embeddings`. It does not select a model-specific `sentence_embedding` output. Its SigLIP zero-shot pipeline uses max-length text padding and independent sigmoid scores instead of CLIP's softmax scores ([Hugging Face, 2026](../../references.md#huggingface-transformers-4-3-0)).

## Text embeddings

### Recommended model

`onnx-community/embeddinggemma-300m-ONNX` at `5090578d9565bb06545b4552f76e6bc2c93e4a66`.

EmbeddingGemma is a 300M-parameter, on-device-focused text embedding model trained for more than 100 spoken languages. It accepts up to 2,048 tokens and emits a 768-dimensional embedding that can be truncated to 512, 256, or 128 dimensions and renormalized. The official card reports MTEB v2 task means of 61.15 multilingual and 69.67 English at 768 dimensions. Its q8 checkpoint reports 60.93 multilingual and 69.49 English, so quantization retains nearly all reported quality ([Google DeepMind, 2025](../../references.md#google-embeddinggemma-300m)).

The exact Transformers.js repository is ungated and declares `gemma3_text`, `feature-extraction`, and Transformers.js metadata. It exposes `onnx/model_quantized.onnx` plus `onnx/model_quantized.onnx_data`, totaling about 295 MiB. It also exposes a q4 pair totaling about 188 MiB. Transformers.js 4.3.0 registers `gemma3_text`, so no library upgrade is required ([ONNX Community, n.d.-a](../../references.md#onnx-community-embeddinggemma-300m-onnx)).

### Required preprocessing

Use asymmetric retrieval prompts:

- Query: `task: search result | query: {content}`
- Indexed save: `title: {title or "none"} | text: {content}`

Use the ONNX graph's `sentence_embedding` output. Do not run the generic feature-extraction pipeline with Pond's current mean pooling. Normalize after any Matryoshka truncation. Apply the same dimension to indexed saves and queries.

Pond concatenates title, description, notes, author, and tags, slices the result to 2,000 characters, then mean-pools every model. The query path also mean-pools without a query prompt. That behavior is correct for the previous `Xenova/all-MiniLM-L6-v2` model and the selected MPNet replacement, but it bypasses EmbeddingGemma's exported sentence head and retrieval prompts ([Xenova, n.d.-a](../../references.md#xenova-all-minilm-l6-v2); [Sentence Transformers, n.d.](../../references.md#sentence-transformers-all-mpnet-base-v2)).

### Tradeoffs

- The gain is multilingual coverage, longer context, stronger reported retrieval quality, and optional Matryoshka dimensions.
- The q8 artifact is roughly thirteen times the current MiniLM q8 artifact. It will increase first-run download, cold start, memory, and full-library reindex time.
- The model uses the Gemma license. The official Google repository is gated for license acknowledgement even though the ONNX Community repository is currently ungated. Product and legal review must confirm that Pond's download flow and notices satisfy the Gemma terms.
- `Xenova/bge-small-en-v1.5` remains the best low-footprint English alternative in the current catalog. Its q8 file is about 32 MiB, its official MTEB average is 62.17, and its documented pooling is the first token, not mean pooling. Short-query retrieval also calls for a query instruction while passages remain unprefixed ([BAAI, 2023](../../references.md#baai-bge-small-en-v1-5)).

### Required runtime changes

1. Replace the generic feature-extraction pipeline for this model with `AutoTokenizer` plus `AutoModel`, and read `sentence_embedding`.
2. Distinguish query encoding from document encoding. Pass the save title separately so it is not duplicated in the document body.
3. Add revision, dtype, output dimension, prompt schema, and preprocessing version to the persisted embedding identity.
4. Pass the revision to both renderer indexing and main-process query loading. A model ID alone does not pin Hub files.
5. Rebuild the text vector index when any of those identity fields changes.
6. Benchmark q8 at 768 dimensions against q4 at 512 or 256 dimensions before rollout. The card's reported q4 quality loss is small enough to make q4 a plausible storage-first profile.

## Image captioning and OCR

### Recommended model

Retain `onnx-community/Florence-2-base-ft` and pin revision `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f`.

Florence-2-base-ft has 0.23B parameters and directly supports `<CAPTION>`, `<DETAILED_CAPTION>`, `<MORE_DETAILED_CAPTION>`, `<OCR>`, and `<OCR_WITH_REGION>`. Microsoft's reported fine-tuned results include 140.0 COCO caption CIDEr, 143.9 TextCaps CIDEr, and 63.6 TextVQA accuracy. The large fine-tuned model improves those results to 143.3, 151.1, and 73.5, but grows to 0.77B parameters. Base is the better recurring desktop default ([Microsoft, 2024](../../references.md#microsoft-florence-2-base-ft); [Xiao et al., 2023](../../references.md#xiao-2023-florence-2)).

The selected repository declares Transformers.js and contains q8, q4, fp16, and full-precision variants for the token embedding, vision encoder, encoder, and merged decoder. The q8 components loaded by the WASM profile total about 262 MiB. Pond's current WebGPU mix of fp16 token, vision, and encoder components plus a q4 merged decoder totals about 395 MiB. The catalog's approximate 270 MB size describes the q8 profile, not the current WebGPU download ([ONNX Community, n.d.-b](../../references.md#onnx-community-florence-2-base-ft)).

### Tradeoffs

- One model and processor cover both captions and OCR, reducing integration complexity.
- Base misses some text-heavy quality that the large model provides, especially on TextVQA, but large is more than three times the parameter count and substantially heavier for repeated enrichment.
- Plain `<OCR>` returns text without geometry. `<OCR_WITH_REGION>` is only justified if Pond plans to store text locations.
- `<CAPTION>` is faster and shorter than the detailed tasks. Pond should evaluate `<DETAILED_CAPTION>` against search recall before changing the task prompt.

### Required runtime changes

No architecture change is required. Pond already uses `Florence2ForConditionalGeneration`, `Florence2Processor.construct_prompts`, and `post_process_generation` correctly. Add the revision to every model, processor, and tokenizer load. Include revision, dtype profile, task prompt, beam count, and preprocessing version in the persisted caption and OCR model identities.

## Visual embeddings, similarity, and style labels

### Recommended model

`onnx-community/siglip2-base-patch16-224-ONNX` at `ba1f3b0843f24bc5417d38e19c37b287d719b2f4`.

SigLIP 2 improves over its SigLIP counterparts at all reported model scales for zero-shot classification, image-text retrieval, and transferred visual representations. It also adds multilingual understanding, online data curation, and debiasing work. The ViT-B scale is the smallest released scale in the paper and is a better desktop tradeoff than the L, So400m, or 1B vision towers ([Google, 2025](../../references.md#google-siglip2-base-patch16-224); [Tschannen et al., 2025](../../references.md#tschannen-2025-siglip-2)).

The exact ONNX repository declares Transformers.js and `model_type: "siglip"`. It provides a q8 full model of about 360 MiB, a q8 vision model of about 90 MiB, and a q8 text model of about 270 MiB. Transformers.js 4.3.0 includes `SiglipModel`, `SiglipVisionModel`, and `SiglipTextModel`, and its zero-shot image pipeline has SigLIP-specific padding and sigmoid handling ([ONNX Community, n.d.-c](../../references.md#onnx-community-siglip2-base-patch16-224-onnx); [Hugging Face, 2026](../../references.md#huggingface-transformers-4-3-0)).

The current `Xenova/clip-vit-base-patch32` full q8 artifact is about 147 MiB and produces 512-dimensional vectors. It remains faster and smaller, but its official card limits intended language use to English and documents known weaknesses in fine-grained classification and counting. SigLIP 2 is a material capability upgrade for a mixed-language visual library, not only a larger checkpoint ([OpenAI, 2021](../../references.md#openai-clip-vit-base-patch32)).

### Required preprocessing

- Use `SiglipVisionModel` and normalize its `pooler_output` for indexed images.
- Use `SiglipTextModel`, max-length padding, and normalized `pooler_output` for visual text queries.
- Use the full `SiglipModel` through the 4.3.0 zero-shot image pipeline for style labels.
- Keep the pipeline's documented hypothesis template as the baseline, then validate alternative style-specific templates on Pond fixtures.

### Tradeoffs

- Visual vectors grow from 512 to 768 dimensions. Existing vectors are incompatible and require a full visual reindex.
- The full q8 style classifier is about 2.5 times the current full CLIP q8 artifact.
- Loading split vision and text models plus the full model duplicates weights. Pond should avoid keeping both the full renderer model and split renderer models alive when memory pressure matters.
- SigLIP scores are independent sigmoid probabilities. CLIP scores are softmax values across the supplied labels. Pond's current `0.2` threshold is not portable between them, and changing the label set can still change practical calibration.

### Required runtime changes

1. Replace the CLIP-specific vision class with architecture-aware loading. `SiglipVisionModel` returns `pooler_output`, not `image_embeds`.
2. Replace the main-process `CLIPTextModelWithProjection` path with `SiglipTextModel`; use max-length padding and `pooler_output`.
3. Pass the pinned revision to the full, vision, text, tokenizer, and processor loads.
4. Version vectors with model ID, revision, dtype, dimensions, normalization, and preprocessing.
5. Recalibrate each style label and the global threshold on a fixed Pond image set. Do not reuse the CLIP softmax threshold.
6. Measure whether one full q8 model can serve renderer image embeddings and style labels with less total memory than separate renderer sessions. The main process still needs its own text tower unless query encoding moves across the process boundary.

## Audio and video transcription

### Recommended model

`onnx-community/whisper-base` at `1846881b6b3a3024392c1eea3ad983695bc23925`.

Whisper Base is a 74M-parameter multilingual checkpoint. Its official model card reports 5.01 WER on LibriSpeech test-clean and 12.85 on test-other. The current 39M Whisper Tiny card reports 7.54 and 17.15 respectively. Small improves English results further, but rises to 244M parameters. Base is the better default for long-running audio and video work where Tiny's error rate is visible and Small's recurring cost is harder to justify ([OpenAI, 2022a](../../references.md#openai-whisper-base); [OpenAI, 2022b](../../references.md#openai-whisper-tiny)).

The exact ONNX repository declares the Transformers.js ASR pipeline and includes q8 merged-decoder and encoder artifacts totaling about 73 MiB. It also includes fp16 components for WebGPU. Transformers.js 4.3.0 supports Whisper, 30-second chunking, overlap stride, language control, and explicit transcription versus translation. It does not implement Whisper language detection: an omitted language warns and defaults to English ([ONNX Community, n.d.-d](../../references.md#onnx-community-whisper-base); [Hugging Face, 2026](../../references.md#huggingface-transformers-4-3-0)).

### Tradeoffs

- Base roughly doubles Tiny's parameters and q8 download, but remains much smaller than Small.
- Whisper is multilingual, but accuracy varies with training-data availability, language, accent, noise, and domain. It can hallucinate text during silence or difficult audio.
- Pond needs a language source outside Transformers.js 4.3.0 to realize multilingual transcription. Otherwise the runtime uses English.
- The model does not provide diarization.
- Pond's 16 MiB encoded-input guard and whole-file `decodeAudioData` path can exclude long media before Whisper chunking starts. That is an audio ingestion constraint, not a reason to choose Tiny.

### Required runtime changes

1. Change the default repository to the ONNX Community Base conversion and pass its revision.
2. Set `task: "transcribe"` explicitly. Pass known save-language metadata or add a separate language-detection step; otherwise make the English fallback explicit.
3. Keep the current 30-second chunks and 5-second stride as the baseline.
4. Include revision, dtype profile, chunk length, stride, language mode, task, and decoding version in the transcript model identity.
5. Evaluate silence handling, repeated text, punctuation, non-English audio, and WebGPU-to-WASM fallback on fixed fixtures before enabling the new default.

## Rollout implications

The removed catalog mixed model metadata with runtime behavior that was global. Pond now owns one pinned specification for each task instead of exposing combinations the inference path cannot honor.

Changing any recommended default requires a derived-data migration:

- Text and visual vectors need complete reindexing because dimensions and embedding spaces change.
- Captions, OCR, and transcripts need new persisted version identities so existing derived fields can be refreshed deliberately.
- Cache keys must include revision and dtype. Model ID alone can silently mix files after an upstream `main` update.
- Product copy should report actual download profiles when WebGPU and WASM load different artifacts.

Before production rollout, benchmark cold download, first inference, steady-state latency, peak renderer and main-process memory, WASM fallback, and retrieval quality on the same Apple Silicon and Intel Mac fixtures. No upstream benchmark substitutes for Pond's mixed save content, style vocabulary, or audio distribution.
