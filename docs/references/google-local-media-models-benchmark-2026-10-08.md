# Google local models for Pond captions, OCR, and transcription

**Research date:** October 8, 2026  
**Scope:** Open-weight Google/Google DeepMind models that can run locally and could replace Pond's Florence-2 caption/OCR path or Whisper Base transcription path.  
**Source policy:** Capability claims use first-party Google, Google DeepMind, or Google-published model cards. Repository claims link directly to Pond's implementation.

## Answer

Google now has a credible local replacement for Florence-2: **Gemma 4 E2B IT**, with **E4B IT** as the quality tier. Google documents image captioning, multilingual OCR, handwriting recognition, document/PDF parsing, screen and UI understanding, and variable-resolution image input for Gemma 4 ([vision guide](https://ai.google.dev/gemma/docs/capabilities/vision), [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)).

Google also has a local speech-recognition candidate, but it is not a drop-in replacement for Pond's current Whisper path. Gemma 4 E2B, E4B, and 12B Unified can perform multilingual ASR and speech translation, but each audio input is limited to 30 seconds ([audio guide](https://ai.google.dev/gemma/docs/capabilities/audio), [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). Pond currently gives Whisper an entire decoded audio stream and asks the Transformers.js ASR pipeline to process it in 30-second windows with 5-second stride, so Whisper already hides the chunking and boundary handling needed for longer recordings ([Pond inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [Pond audio decoder](../../apps/desktop/src/renderer/src/features/enrichment/lib/whisper.ts)). A Gemma replacement must explicitly reproduce segmentation, overlap reconciliation, and transcript stitching before Whisper can be removed.

**Recommendation:** benchmark Gemma 4 E2B IT against both specialists, then test E4B IT only where E2B misses the quality bar. Remove Florence or Whisper independently; do not make removal an all-or-nothing migration.

## Candidate table

| Google model | Caption/OCR | Speech transcription | Local fit for Pond | Judgment |
| --- | --- | --- | --- | --- |
| **Gemma 4 E2B IT** | Yes: captioning, OCR, handwriting, document parsing, UI/screens; image budgets from 70 to 1,120 tokens ([vision guide](https://ai.google.dev/gemma/docs/capabilities/vision)) | Yes, multilingual ASR/translation; maximum 30 seconds per audio input ([audio guide](https://ai.google.dev/gemma/docs/capabilities/audio)) | 128K context; Google estimates 2.9 GB for general Q4_0 inference or 1.1 GB for its mobile package, before context/runtime overhead ([model overview](https://ai.google.dev/gemma/docs/core)) | **First candidate.** Smallest current core IT model and the only one worth considering as a broad default before measurement. |
| **Gemma 4 E4B IT** | Same task family; its published OmniDocBench 1.5 edit distance is 0.181 versus E2B's 0.290, where lower is better ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)) | Yes; Google's published FLEURS error is 0.08 versus E2B's 0.09, where lower is better ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)) | 128K context; estimated 4.5 GB general Q4_0 or 2.5 GB mobile, before context/runtime overhead ([model overview](https://ai.google.dev/gemma/docs/core)) | **Quality tier.** Test after E2B; do not assume the extra memory is justified without Pond data. |
| **Gemma 4 12B Unified IT** | Yes | Yes, using an encoder-free multimodal architecture ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)) | Google estimates 6.7 GB at Q4_0 before context/runtime overhead ([model overview](https://ai.google.dev/gemma/docs/core)) | **High-end comparison only.** Too large to be Pond's general background-enrichment default. |
| **PaliGemma 2** | Yes: captioning, text reading/OCR, detection, and short-video analysis; fixed 224, 448, or 896 pixel variants ([PaliGemma overview](https://ai.google.dev/gemma/docs/paligemma), [prompt syntax](https://ai.google.dev/gemma/docs/paligemma/prompt-system-instructions)) | No audio input is documented; it is an image-and-text model ([PaliGemma overview](https://ai.google.dev/gemma/docs/paligemma)) | 3B, 10B, and 28B variants; PT checkpoints require task tuning, while mix checkpoints are intended for out-of-box exploration ([PaliGemma overview](https://ai.google.dev/gemma/docs/paligemma)) | **Optional vision baseline, not the default.** It is older and narrower than Gemma 4, though a tuned 3B checkpoint could still win a specialist benchmark. |
| **Gemma 3n E2B/E4B** | Yes, with 256, 512, or 768 pixel inputs ([Gemma 3n model card](https://ai.google.dev/gemma/docs/gemma-3n/model_card)) | Yes, but Google's launch implementation also limits audio clips to 30 seconds ([Gemma 3n developer guide](https://developers.googleblog.com/en/introducing-gemma-3n-developer-guide/)) | Open-weight, device-oriented, 32K-context predecessor to Gemma 4 ([Gemma 3n overview](https://ai.google.dev/gemma/docs/gemma-3n)) | **Compatibility fallback only.** It does not solve long audio and should not lead a new evaluation now that Gemma 4 is the current core family. |
| **EmbeddingGemma 2** | No generated caption or OCR text | No generated transcript | Produces unified 768-dimensional embeddings for text, images, video, and audio ([model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)) | **Not a replacement for either specialist.** It improves search over media; it does not decode media into text. |

Google's own selection guidance says to start with the latest core instruction-tuned model with the fewest parameters, unless a specialized variant directly matches the use case ([Run Gemma](https://ai.google.dev/gemma/docs/run)). That supports E2B IT as the first trial and E4B IT as the escalation path.

## What “long audio” means in Pond

Gemma 4's 128K/256K text context does not make a single audio attachment arbitrarily long. Google's audio preprocessing is a separate constraint: 16 kHz, mono, float32 audio; 25 input tokens per second; and a maximum clip length of 30 seconds ([audio guide](https://ai.google.dev/gemma/docs/capabilities/audio)).

Pond's current pipeline:

1. Rejects files larger than 16 MiB because Chromium audio decoding has previously aborted the renderer on large video files ([audio decoder](../../apps/desktop/src/renderer/src/features/enrichment/lib/whisper.ts)).
2. Decodes the accepted file once to 16 kHz mono float32 audio ([audio decoder](../../apps/desktop/src/renderer/src/features/enrichment/lib/whisper.ts)).
3. Passes the complete waveform to Whisper's ASR pipeline with `chunk_length_s: 30` and `stride_length_s: 5`; the pipeline returns one combined text result ([inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts)).

For a ten-minute recording, Gemma cannot receive that complete waveform in one request. Pond would have to split it into overlapping clips no longer than 30 seconds, invoke Gemma for each clip, remove duplicate overlap text, preserve words cut at boundaries, order the segments, and join them. The current saved-data contract contains transcript text but no timing metadata, so the minimum fair replacement test is accurate stitched text rather than diarization or word timestamps ([transcript enricher](../../apps/desktop/src/renderer/src/features/enrichment/lib/enrichers/transcript.ts)).

## Fair Pond benchmark

The benchmark should compare complete product paths, not isolated model demos. Use the same source assets, decoding, target hardware, cold/warm states, and failure policy for every candidate. Pin the exact model revision, quantization, runtime version, prompts, and generation settings in the report. Google lists Transformers, LiteRT-LM, llama.cpp, LM Studio, Ollama, and MLX as local execution options, but also warns that the chosen model format must be supported by the chosen framework ([Run Gemma](https://ai.google.dev/gemma/docs/run)). LiteRT-LM currently advertises desktop support plus vision and audio inputs, making it a suitable target-runtime candidate after establishing a reference result with Google's documented Transformers pipeline ([LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM)).

### 1. Vision corpus

Build a versioned, consented fixture set of at least 200 Pond-like images:

- 50 ordinary photos, illustrations, and memes for captions.
- 50 screenshots and interface captures containing small text.
- 50 documents, receipts, posters, and book/page images.
- 25 difficult OCR cases: skew, blur, low contrast, compression, dense layouts, and handwriting.
- 25 multilingual cases covering the languages actually present in target Libraries.

Each item should have a human-verified verbatim OCR reference where text exists, a list of must-mention visual facts, a list of forbidden/hallucinated facts, and a flag for intentionally text-free images. Keep a private holdout split so prompt changes cannot overfit every example.

Run the current Florence-2 path, Gemma 4 E2B IT, and Gemma 4 E4B IT. Use thinking disabled. Test captioning with a lower visual-token budget and OCR with 1,120 tokens, following Google's guidance that lower budgets suit captioning while higher budgets preserve small text for OCR/document parsing ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). Fix one production prompt per task before scoring, and run the documented sampling configuration three times to quantify output variance rather than selecting the best sample ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)).

Measure:

- OCR character error rate and word error rate, overall and by slice.
- Exact match for dates, prices, usernames, URLs, and other high-value fields.
- Empty-output, malformed-output, refusal, and hallucinated-text rates.
- Blind caption preference for correctness, useful coverage, concision, and unsupported claims.
- Downstream retrieval: whether the generated caption/OCR makes the same held-out queries find the correct Save.
- Cold load, warm p50/p95 latency, images per minute, peak process memory, accelerator memory, downloaded bytes, and crash/cancellation behavior.

Suggested removal gate: Gemma must not worsen aggregate OCR CER/WER by more than 2 absolute percentage points, must not regress any important slice by more than 5 points, and must tie or beat Florence on at least 80% of blind caption comparisons without a higher unsupported-claim rate. Resource limits should be set per supported hardware tier before the run, not after results are known.

### 2. Audio corpus

Build at least three hours of human-transcribed audio/video with balanced slices:

- Durations under 15 seconds, 20–30 seconds, 1–3 minutes, 10 minutes, and the longest files Pond currently accepts under the 16 MiB guard.
- Clean speech, room noise, street noise, music underneath speech, and quiet/low-quality recordings.
- Different accents, speaking rates, numbers, names, URLs, and code-switching.
- Single and overlapping speakers; keep speaker labels out of the required result because Pond does not currently persist them.
- Deliberately place names and sentences across proposed 30-second chunk boundaries.

Decode every file once with Pond's existing 16 kHz mono path. Feed that identical waveform to Whisper and to the Gemma segmenter. Start the Gemma trial with the same 30-second window and 5-second stride values Pond currently gives Whisper, then use one deterministic overlap reconciliation algorithm for every Gemma model. Do not manually repair candidate transcripts.

Measure:

- Word error rate overall and by slice; character error rate for languages where word segmentation is unsuitable.
- Exact accuracy for names, numbers, dates, URLs, and mixed-language spans.
- Boundary omission rate and boundary duplication rate.
- Empty/refusal/malformed segment rate and whole-file completion rate.
- Real-time factor, cold load, warm throughput, peak memory, downloaded bytes, and time spent in stitching.
- Stability across three runs with the same input and settings.

Suggested removal gate: Gemma's aggregate WER must be within 2 absolute percentage points of Whisper, no important slice may regress by more than 4 points, boundary omissions plus duplications must affect under 1% of reference words, and whole-file completion must be no worse than Whisper. Pond should also keep the existing file-size guard until decoding is moved out of the renderer and separately proven safe.

### 3. Product and hardware matrix

Run both suites on at least:

- Apple Silicon with 16 GB unified memory.
- A supported Windows machine with a discrete GPU.
- A supported CPU-only or integrated-GPU fallback machine.

For each platform, test a cold application launch, repeated warm inference, cancellation, concurrent enrichment, suspend/resume, accelerator failure with fallback, and model unload. Gemma 4 E2B's published general Q4_0 estimate is 2.9 GB and E4B's is 4.5 GB, excluding runtime and context memory, so a successful one-off answer is insufficient evidence for an always-on background enrichment worker ([model overview](https://ai.google.dev/gemma/docs/core)).

## Removal decision

### Current Pond decision (October 8, 2026)

**Status: not evaluated for retirement. Keep Florence-2 and Whisper Base.** Pond now has deterministic, content-minimized benchmark infrastructure for the vision and audio comparisons, including fixed quality gates, important-slice checks, required hardware coverage, and production-runtime parity evidence for the Gemma audio candidate. No decision-eligible private corpus run has been completed, no Gemma audio production-runtime parity fixture has been recorded, and no complete results exist for all three required hardware classes. Consequently there are no qualifying aggregate measurements yet, and neither specialist is authorized for removal.

### Local integration smoke (October 8, 2026)

A non-qualifying local smoke run exercised Pond's production Florence-2 and Whisper Base worker and two Ollama 0.40.0 packages: `gemma4:e2b` (5.2B parameters, NVFP4, 7.5 GB) and `gemma4:26b` (25.2B parameters, Q4_K_M, 18 GB). The host was an Apple M4 Max with 48 GB unified memory. The vision stability sample used all 24 repository demo images. Only one screenshot had a human-verified OCR reference. Audio used one 2.75-second synthesized sentence and one 32.7-second, 67-word synthesized fixture crossing a 30-second segment boundary. These measurements validate integration and identify failure modes; they do not estimate corpus-level quality.

| Smoke result | Florence-2 / Whisper Base | Gemma 4 E2B | Gemma 4 26B | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Completed vision items, bounded warm run | 24/24 | 24/24 | 24/24 | Every bounded pass completed without a crash. |
| Caption latency, warm p50 / p95 | 203 / 230 ms | 162 / 458 ms | 740 / 981 ms | E2B was competitive at p50; 26B was much slower. |
| OCR latency, warm p50 / p95 | 169 / 1,135 ms | 128 / 2,049 ms | 809 / 2,494 ms | E2B had a faster p50 but a slower text-heavy tail. |
| Labeled screenshot OCR, normalized WER | 39.2% | 9.8% | 2.0% | Both Gemma tiers were substantially more accurate on this one screenshot. |
| Labeled screenshot exact fields | 2/3 | 3/3 | 3/3 | Both Gemma tiers preserved the tested price, URL, and date fields. |
| Text-free photo OCR | Returned `1` | Returned `j` and `m` | Echoed the OCR instruction as JSON | Every model produced false-positive text; output validation remains necessary. |
| One seven-word speech sample, normalized WER | 14.3% | 14.3% | Unsupported | Whisper substituted “Hand” for “Pond”; E2B substituted “Pand” for “Pond.” |
| One speech sample latency | 8,269 ms | 3,969 ms | Unsupported | E2B was faster on this single clip, not a representative distribution. |
| One 32.7-second speech sample, normalized WER | 1.5% | 1.5% | Unsupported | Each path made one first-word substitution in 67 words. |
| 32.7-second inference latency | 1,934 ms | 1,188 ms across two segments | Unsupported | E2B latency excludes local segmentation/encoding overhead. |

Cold first-caption observations from a separate three-image process were 21.9 seconds for Florence and 8.6 seconds for Gemma 26B. They are not directly comparable model-load measurements: the runtimes and cache lifecycles differ, and the Ollama server is a persistent external process. The first E2B 24-image attempt timed out after waiting five minutes for response headers while Ollama switched runners. Once E2B was loaded and generation was explicitly bounded, the complete 24-image rerun succeeded. The timeout remains an operational failure to test and handle.

The E2B Ollama package advertised and successfully exercised audio through Ollama's OpenAI-compatible endpoint. For the 32.7-second sample, two clips with a five-second overlap were passed through Pond's deterministic stitcher: it aligned 11 overlap words and reported zero unresolved boundaries. This proves the basic local ASR and overlap-reconciliation path, but it does not establish representative quality, repeated-boundary behavior, whole-file completion, cancellation, or renderer/runtime lifecycle. The results justify the full E2B/E4B corpus benchmark; they do not yet justify removing either specialist.

The encoded gates are:

- Vision: aggregate OCR CER and WER no more than 2 absolute percentage points worse than Florence, every important slice no more than 5 points worse, at least 80% of blinded captions tying or beating Florence, and no increase in unsupported-claim rate.
- Audio: aggregate normalized WER no more than 2 absolute percentage points worse than Whisper, every important slice no more than 4 points worse, combined boundary omissions and duplications under 1% of reference words, and whole-file completion no worse than Whisper.
- Shared: complete cold-load, warm p50/p95, throughput, memory, download, cancellation, and crash measurements on Apple Silicon with 16 GB, a supported Windows discrete GPU, and the CPU/integrated fallback tier.

The benchmark manifest, runners, scorers, segmenter, stitcher, and fail-closed report generator live in [`apps/desktop/scripts/ai-benchmark/`](../../apps/desktop/scripts/ai-benchmark/). The report generator returns `not-evaluated` and keeps the corresponding specialist whenever corpus eligibility, model identity, measurements, an important slice, runtime parity, or hardware coverage is missing or invalid. A smoke run can validate integration, but it cannot authorize retirement.

Remove **Florence-2** if E2B or E4B clears the vision quality gates on all supported hardware and the total product cost is acceptable. Gemma 4 clearly owns the necessary capabilities; the unresolved question is whether a multi-gigabyte autoregressive model is better than Pond's smaller task-specific caption/OCR model for unattended enrichment.

Remove **Whisper Base** only after the long-audio harness proves the segmenter and stitcher. Gemma 4's ASR is real, but the 30-second clip limit means “replace Whisper” is a pipeline project, not a model-ID change ([audio guide](https://ai.google.dev/gemma/docs/capabilities/audio)).

The strongest consolidation case is when the same installed Gemma 4 model is also Pond's valued local Agent and can be shared across user-invoked vision/audio work. If Pond would install Gemma solely to eliminate Florence and Whisper, the current specialist pair is likely to remain smaller and operationally simpler; the benchmark should record total disk, memory, latency, and failure behavior so that tradeoff is explicit.
