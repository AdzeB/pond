# Gemma as a replacement for Pond AI components

**Research date:** October 8, 2026  
**Scope:** The current Gemma family—primarily Gemma 4 and EmbeddingGemma 2—evaluated against Pond's Agent and on-device enrichment boundaries.  
**Source policy:** Product claims use first-party Google or Google DeepMind sources. Repository claims link directly to Pond's implementation.  
**Status:** EmbeddingGemma 2 has shipped as Pond's only embedding model. MPNet and SigLIP 2 are gone. Sections that describe them as current reflect the codebase on the research date. See [Implementation status](#implementation-status) and [On-device model defaults](on-device-model-defaults.md) for the current setup.

## Decision

Yes. The current Gemma family can replace or consolidate several meaningful parts of Pond, but it should not become one model that performs every AI task.

The practical target is:

1. **Gemma 4 as an optional local Agent.** Pond can trial it now through its existing Ollama and LM Studio adapters. Gemma 4's native system role and function-calling format align with Pond's Agent loop ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [Gemma 4 prompt format](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)).
2. **Gemma 4 as an optional local vision Agent.** The model supports image understanding, OCR, document/PDF parsing, charts, and screen/UI understanding, but Pond must first let a verified local model advertise and receive image input ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)).
3. **EmbeddingGemma 2 as a candidate replacement for both MPNet text embeddings and SigLIP 2 visual embeddings.** It puts text, code, images, video, audio, and mixed inputs into one 768-dimensional vector space, which is the family's largest realistic consolidation opportunity ([EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)).
4. **Keep Whisper, the sensitive-content classifier, and deterministic auto-title path.** Gemma 4 can transcribe audio segments up to 30 seconds, but these current components have narrower, predictable contracts that a generative model does not replace for free ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)).
5. **Use user-managed runtimes before bundling one.** Ollama and LM Studio are the lowest-friction evaluation route. A Pond-managed runtime should be an optional post-install model download only after quality, memory, and packaging tests.

Gemma 4 and EmbeddingGemma 2 are both published under Apache 2.0 ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)).

## What Pond has today

Pond has two separate AI systems, and the replacement plan should preserve that separation:

- The **Agent** is a tool-using language-model loop built on the Vercel AI SDK. It can take up to 16 tool steps, injects a substantial instruction prompt and JSON tool schemas, and can send attached images to a separately selected vision provider ([Agent completion](../../apps/desktop/src/main/core/agent/complete.ts), [Agent chat](../../apps/desktop/src/main/core/agent/chat.ts), [vision bridge](../../apps/desktop/src/main/core/agent/vision.ts)).
- The **on-device enrichment pipeline** performs repeated, task-specific work in a renderer worker with WebGPU and WASM fallback ([inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [device selection](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-device.ts), [worker](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-worker.ts)).
- Pond already exposes user-managed Ollama and LM Studio connections through OpenAI-compatible endpoints. Their catalog entries enable tools and custom model names but currently declare `vision: false` and `structuredOutput: false` ([adapter](../../apps/desktop/src/main/core/agent/adapter.ts), [provider catalog](../../apps/desktop/src/shared/assistant.ts)).

The current task-to-model mapping is:

| Pond task | Current implementation | Current Gemma judgment |
| --- | --- | --- |
| Agent chat and Pond tool use | Cloud providers or user-managed Ollama/LM Studio through `LanguageModel` adapters ([adapter](../../apps/desktop/src/main/core/agent/adapter.ts), [provider catalog](../../apps/desktop/src/shared/assistant.ts)) | **Yes, optional.** Gemma 4 through an existing local runtime is the first evaluation to run. |
| Agent image understanding | Cloud vision-capable provider; local provider entries currently declare no vision support ([provider catalog](../../apps/desktop/src/shared/assistant.ts), [vision bridge](../../apps/desktop/src/main/core/agent/vision.ts)) | **Yes, after capability plumbing.** Every Gemma 4 size accepts images ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)). |
| Text embeddings and semantic search | MPNet, 768-dimensional mean-pooled vectors ([model defaults](../../apps/desktop/src/shared/on-device-models.ts), [renderer embeddings](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [query embeddings](../../apps/desktop/src/main/core/query-embeddings.ts)) | **Strong candidate.** EmbeddingGemma 2 natively emits 768-dimensional vectors but requires task prefixes and a full reindex ([model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)). |
| Captioning and OCR | Florence-2 base ([inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts)) | **Capable, not an automatic default.** Gemma 4 supports captioning, OCR, and document parsing, but its generative runtime is much larger than a task-specific model ([model card](https://ai.google.dev/gemma/docs/core/model_card_4), [memory guide](https://ai.google.dev/gemma/docs/core)). |
| Visual embeddings and style labels | SigLIP 2 ([model defaults](../../apps/desktop/src/shared/on-device-models.ts), [inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts)) | **Strong consolidation candidate.** EmbeddingGemma 2 places image and text embeddings in one shared space ([model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)). Style-label quality still needs a Pond-specific evaluation. |
| Audio/video transcription | Whisper Base with 30-second chunks and overlap ([inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [transcript enricher](../../apps/desktop/src/renderer/src/features/enrichment/lib/enrichers/transcript.ts)) | **Not a drop-in replacement.** Gemma 4 E2B, E4B, and 12B support ASR, but each audio input is limited to 30 seconds ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)). |
| Sensitive-content score | Dedicated ONNX image classifier ([sensitive model](../../apps/desktop/src/renderer/src/features/enrichment/lib/sensitive-model.ts)) | **Keep specialized.** Gemma 4 produces text rather than the current classifier's exact score contract ([model card](https://ai.google.dev/gemma/docs/core/model_card_4)). |
| Automatic title | Deterministic first-sentence extraction from existing fields ([auto-title enricher](../../apps/desktop/src/renderer/src/features/enrichment/lib/enrichers/auto-title.ts)) | **Keep deterministic.** A generative model adds latency and variability without removing a meaningful bottleneck. |
| Suggested tags | Similarity between Save and tag embeddings ([suggested-tags enricher](../../apps/desktop/src/renderer/src/features/enrichment/lib/enrichers/suggested-tags.ts)) | **Replace indirectly.** It benefits from EmbeddingGemma 2 only if the Save and tag vectors migrate together. |

## Gemma 4 fit for the Agent

Gemma 4 has E2B, E4B, 12B Unified, 26B A4B mixture-of-experts, and 31B variants. All accept text and images and emit text. E2B, E4B, and 12B also accept audio; video understanding is performed from frames. E2B and E4B have 128K-token contexts, while 12B, 26B A4B, and 31B have 256K-token contexts ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). Pond's default Agent context is 64K tokens, so context capacity is not the first integration constraint ([Agent completion](../../apps/desktop/src/main/core/agent/complete.ts)).

Gemma 4 adds native `system`, `user`, and `model` roles plus native function-calling control tokens. Google's documented flow still requires the application or runtime to provide tool declarations, execute the chosen tool, and feed its response back to the model ([Gemma 4 prompt format](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)). That division matches Pond's `ToolLoopAgent`; the required evaluation is whether each Ollama/LM Studio model package preserves Gemma's exact chat template, tool schemas, tool-result history, and thinking-token behavior through the OpenAI-compatible adapter.

For vision, Gemma 4 explicitly supports OCR, document/PDF parsing, screen and UI understanding, chart comprehension, handwriting recognition, and variable image token budgets of 70, 140, 280, 560, or 1,120 tokens ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). This makes it a plausible replacement for user-invoked cloud image understanding and, later, an alternative caption/OCR engine. Pond should not mark every custom Ollama or LM Studio model as vision-capable: the capability must belong to the selected model and a runner whose multimodal request format has been verified end to end.

Audio is narrower. E2B, E4B, and 12B support speech recognition and speech translation, but the model card limits audio to 30 seconds and video to 60 seconds at one frame per second ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). Pond's existing Whisper pipeline already handles longer media through chunking, so Gemma 4 audio should begin as an Agent feature or an evaluation candidate, not as a wholesale transcription migration.

## EmbeddingGemma 2 fit for search and enrichment

EmbeddingGemma 2 is a 740M-parameter multimodal embedding model: 270M parameters for text, 170M for vision, and 300M for audio. The encoders are selectively loadable, yielding documented text-only, text-and-image, text-and-audio, and full-multimodal configurations of 270M, 440M, 570M, and 740M parameters. It maps text, code, images, video, audio, and interleaved combinations into a shared 768-dimensional space with an 8,192-token context and supports more than 100 languages ([EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)).

This could replace two current model families rather than one:

- Replace MPNet for Save, query, and tag text embeddings while retaining Pond's current 768-dimensional storage shape.
- Replace SigLIP 2 for image embeddings, allowing text queries and images to be compared in the same model-defined space.
- Later add audio/video similarity without introducing another vector family.

The migration is not a model-name change. EmbeddingGemma 2 uses asymmetric query/document prefixes for retrieval and symmetric prefixes for similarity and classification. Pond's search query, indexed Save, and suggested-tag paths therefore need distinct documented preprocessing contracts ([EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2), [current inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [query path](../../apps/desktop/src/main/core/query-embeddings.ts), [suggested tags](../../apps/desktop/src/renderer/src/features/enrichment/lib/enrichers/suggested-tags.ts)). Every affected vector must be versioned and rebuilt; vectors from the current and replacement models are not interchangeable.

The model also supports Matryoshka truncation to 512, 256, or 128 dimensions, with re-normalization required after truncation. Google reports quality close to lossless down to 256 dimensions and warns that 128 dimensions degrades multimodal quality substantially ([EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)). Pond should evaluate 768 and 256 dimensions rather than assume the smallest representation is acceptable.

Runtime compatibility still needs a Pond-specific proof. Google says EmbeddingGemma 2 can run in browsers with Transformers.js or WebGPU and lists Transformers, SentenceTransformers, MLX, vLLM, llama.cpp, SGLang, Ollama, and LM Studio integrations ([EmbeddingGemma 2 launch](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/)). Pond currently runs ONNX models through Transformers.js in an Electron renderer worker, so the general route is compatible but the exact artifact, selective encoder loading, WebGPU/WASM behavior, cold start, and memory must be verified in Pond's pipeline ([inference core](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts)). The model must run in `bfloat16` or `float32`; Google explicitly warns against `float16` because it can return NaNs or silently degraded vectors ([EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)). Because EmbeddingGemma 2 was released only two days before this research note, Pond should retain the current embedding stack as a tested fallback during evaluation ([EmbeddingGemma 2 launch](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/)).

Google reports approximately 191 MB of active RAM for quantized text-only weights and 567 MB for the full quantized multimodal model on a Pixel 11 Pro ([EmbeddingGemma 2 launch](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/)). Those are mobile reference measurements rather than desktop guarantees, but they make an optional on-device proof of concept credible.

### The exact Electron artifact is now available

This is no longer only a theoretical runtime match. ONNX Community publishes a Transformers.js-compatible [EmbeddingGemma 2 ONNX export](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/blob/main/README.md) whose encoders can be loaded selectively. Its documented download sizes are:

| Export | Full multimodal download | Pond interpretation |
| --- | ---: | --- |
| FP32 | 2,929 MB | Too large for the default enrichment path. |
| FP16 | 1,465 MB | Smaller, but Google's full-precision model guidance warns that plain FP16 can degrade embeddings. |
| Q8 | 850 MB | A quality-biased evaluation tier. |
| Q4 | 473 MB | The leading Pond prototype target. |
| Q4F16 | 426 MB | Smallest listed full export, but requires careful numerical validation. |

The Q4 export divides into approximately 175 MB of text weights, 109 MB of vision weights, and 189 MB of audio weights. The artifact authors report a worst-case cosine similarity of 0.975 across the quantized model and 0.988 for text when compared with the unquantized reference. These are export-fidelity measurements, not Pond retrieval-quality measurements; Pond still needs its own relevance benchmark. The same documentation recommends Q4 for WebGPU and a higher-precision audio encoder when audio quality matters.

This distinction resolves an apparent conflict in the source material: Google's model card describes the reference model's BF16/FP32 numerical requirements, while the ONNX export supplies separately tested quantized graphs. Pond should pin and validate the quantized ONNX artifact rather than reinterpret an FP16 reference checkpoint as safe.

### Current versus proposed model-weight budget

The repositories used by Pond publish enough metadata to estimate the weights loaded by the current implementation. The following is an **all-enabled upper-bound estimate**, not a measurement of process resident memory. Runtime buffers, WebGPU allocations, ORT overhead, cache eviction, and the exact set of simultaneously live sessions can move actual memory materially.

| Current path | Approximate weights implied by Pond's selected artifacts |
| --- | ---: |
| Renderer MPNet Q8 | 110 MB |
| Main-process MPNet Q8 | 110 MB |
| Renderer SigLIP 2 vision Q8 | 95 MB |
| Renderer SigLIP 2 full Q8 for style labels | 378 MB |
| Main-process SigLIP 2 text Q8 | 283 MB |
| **Current retrieval and visual-classification subtotal** | **976 MB** |
| Florence-2 mixed WebGPU components | 414 MB |
| Whisper Base FP16 WebGPU components | 146 MB |
| Sensitive-content classifier | 23 MB |
| **Approximate all-enabled current total** | **1.56 GB** |

The source files are the current [model defaults](../../apps/desktop/src/shared/on-device-models.ts), [renderer model construction](../../apps/desktop/src/renderer/src/features/enrichment/lib/inference-core.ts), [main-process query models](../../apps/desktop/src/main/core/query-embeddings.ts), and [sensitive-content model](../../apps/desktop/src/renderer/src/features/enrichment/lib/sensitive-model.ts); the byte counts come from their published Hugging Face artifacts. Pond's WASM variants are somewhat smaller than the displayed WebGPU mix.

Replacing the MPNet and SigLIP 2 families with the full EmbeddingGemma 2 Q4 export would change that 976 MB model-weight subtotal to approximately 473 MB—a reduction of about 500 MB—while making audio and video retrieval possible. Selectively loading only the needed encoders could lower the active footprint further. This is the strongest evidence-backed consolidation in the proposal.

The comparison does **not** prove that one EmbeddingGemma session will use exactly half the RAM. It shows that the downloaded/loaded weight budget is favorable enough to justify a prototype and measured memory profile.

### Retrieval design constraints

One shared embedding space does not imply one vector per Save is automatically the right data model.

- Preserve separate text and visual vector fields in the first migration, even if both come from EmbeddingGemma 2. That isolates ranking changes and avoids losing evidence about which modality matched.
- Use the model's retrieval-query prefix for user queries, retrieval-document prefix for indexed content, and symmetric similarity/classification prefixes for tags or label prototypes.
- Version vectors by exact model revision, quantization, dimension, and preprocessing contract. Pond's current query code matches stored vectors by model identity, so an in-place model-name switch would make old vectors unavailable to dense search.
- Run a staged background reindex or dual-read transition. Do not delete the old vector family until the new corpus is complete and its quality has passed evaluation.
- Compare 768 and 256 dimensions. Matryoshka truncation can reduce index and comparison cost, but it changes every vector and requires re-normalization.
- Evaluate per-media embeddings before pooling multiple images or long audio into one Save vector. A single fused embedding can improve whole-item recall while making it harder to explain which attachment matched.

## Hardware and desktop distribution

Google publishes these approximate Gemma 4 inference memory figures, including 20% load overhead but excluding supporting software and context/KV-cache memory ([Gemma 4 model overview](https://ai.google.dev/gemma/docs/core)):

| Variant | BF16 | SFP8 | Q4_0 | LiteRT-LM mobile | Mobile text-only | Pond interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| E2B | 11.4 GB | 5.7 GB | 2.9 GB | 1.1 GB | 0.84 GB | Plausible optional default for broad desktop coverage; must pass Pond's Agent quality bar. |
| E4B | 17.9 GB | 8.9 GB | 4.5 GB | 2.5 GB | 2.2 GB | Plausible quality tier for modern laptops and desktops. |
| 12B | 26.7 GB | 13.4 GB | 6.7 GB | — | — | Opt-in tier for better-equipped machines. |
| 26B A4B | 57.7 GB | 28.8 GB | 14.4 GB | — | — | Not a general desktop default; all 26B parameters must remain loaded. |
| 31B | 69.9 GB | 34.9 GB | 17.5 GB | — | — | Workstation/server tier. |

Google provides official Q4 GGUF checkpoints for llama.cpp and LM Studio and recommends both LM Studio and Ollama for local use; it also lists LiteRT-LM, llama.cpp, and MLX for efficient edge execution ([Gemma 4 model overview](https://ai.google.dev/gemma/docs/core), [Run Gemma](https://ai.google.dev/gemma/docs/run)). Pond already supports the first two through OpenAI-compatible endpoints, so the shortest route is to publish a tested model/runtime matrix rather than build a runtime first.

A managed runtime is practical, but it is a separate product and packaging project. Google's LiteRT-LM supports desktop platforms, hardware acceleration, multimodality, and tool use. Its Python, Kotlin, and C++ APIs are marked stable, while Swift and web JavaScript are early preview ([LiteRT-LM repository](https://github.com/google-ai-edge/LiteRT-LM)). Inference: an Electron integration should initially use a main-owned native process or sidecar rather than place a multi-gigabyte generative model in Pond's renderer enrichment worker. It would also need architecture-specific packaging, downloads and removal, revision/checksum pinning, cancellation, crash recovery, and memory-pressure handling.

Even E2B's general Q4_0 footprint is approximately 2.9 GB before context and supporting software, while the specialized LiteRT-LM mobile package is approximately 1.1 GB or 0.84 GB text-only ([Gemma 4 model overview](https://ai.google.dev/gemma/docs/core)). That makes an optional post-install download practical; bundling it into every Electron installer is not proportionate.

### Concrete Gemma 4 artifacts and runtime tradeoffs

The model label alone understates installation size. Google's E2B Q4 GGUF is approximately 3.35 GB for the language model plus a 0.99 GB multimodal projector, or about 4.34 GB for the full multimodal pair ([official E2B Q4 GGUF files](https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-gguf/tree/main)). The generic E2B LiteRT-LM package is approximately 2.59 GB ([official LiteRT-LM package](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/tree/main)). The Transformers.js-compatible [E2B ONNX export](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/tree/main) is approximately 3.9 GB in its Q4 multimodal form, based on the published audio, vision, token-embedding, and decoder components.

| Runtime | Best use in Pond | Advantages | Material constraints |
| --- | --- | --- | --- |
| Existing Ollama / LM Studio adapter | First product evaluation | No bundled runtime work; already behind Pond's `LanguageModel` boundary; users manage model storage | Model capabilities and chat templates vary by exact runner/package; local vision is currently disabled in Pond's provider catalog |
| Transformers.js / ONNX | EmbeddingGemma 2; experimental direct Gemma 4 | Reuses Pond's current WebGPU/WASM stack; Pond already depends on Transformers.js 4.3.0, whose release line supports Gemma 4 | Multi-gigabyte Gemma 4 download; no documented first-class MTP speculative decoding; renderer lifetime and memory-pressure risks |
| LiteRT-LM sidecar | Candidate bundled Gemma 4 runtime | Official desktop/edge path, compact packages, multimodality, tool-use primitives, strong published hardware acceleration | Native packaging; rapidly moving runtime; cancellation, memory lifecycle, and platform behavior need pinned-version soak tests |
| llama.cpp sidecar / server | Mature user-managed or bundled text/image serving | Broad GGUF ecosystem and OpenAI-compatible serving patterns | Gemma 4 multimodal support is evolving; audio parity should not be assumed; quantization and chat-template choices affect tool reliability |
| MLX | Optional Apple Silicon experiment | Excellent fit for Apple unified memory | macOS-only and therefore unsuitable as Pond's cross-platform default |

Transformers.js added Gemma 4 support in its 4.1 release line, tool support to text generation in 4.2, and Gemma 4 multimodal/KV-cache fixes in 4.3 ([Transformers.js releases](https://github.com/huggingface/transformers.js/releases)). Pond currently declares version 4.3.0 ([desktop package](../../apps/desktop/package.json)). Direct in-process inference is therefore technically possible, but it does not remove the operational work needed for a production Agent runtime.

LiteRT-LM's published E2B benchmark is promising: on an M4 Max, the model card reports 41.6 output tokens/s on CPU and 160.2 tokens/s on GPU; on an Intel Lunar Lake Windows machine it reports 29.8 and 48.4 tokens/s respectively ([LiteRT-LM E2B model card](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm)). These are vendor/runtime measurements rather than Pond benchmarks. Open LiteRT-LM issue reports also describe cancellation, retained conversation memory, CPU decode, and macOS GPU performance problems. The safe interpretation is “high-potential runtime to isolate and pin,” not “drop-in dependency for Electron's main process.”

For a Pond-managed runtime, generation should live in a killable, main-owned sidecar behind the existing `LanguageModel` interface. That gives Pond a process boundary for cancellation failures, GPU crashes, memory reclamation, updates, and architecture-specific binaries. EmbeddingGemma 2 can remain in the existing finite enrichment-worker architecture because it performs bounded forward passes rather than an open-ended autoregressive loop.

### Why Gemma 4 should not replace every specialist

Gemma 4 E2B can technically cover Agent chat, vision questions, captioning, OCR, short audio transcription, and title generation. It is nevertheless a poor default replacement for every current component:

- Florence-2, Whisper Base, and the deterministic title path together require far less model weight than a complete Gemma 4 E2B installation.
- Batch enrichment needs predictable bounded latency and output schemas; autoregressive generation adds per-token latency, decoding variability, and cancellation complexity.
- Gemma 4 audio accepts at most 30 seconds per input. Pond would own chunking, overlap, stitching, timestamps, and long-form evaluation before it could replace Whisper.
- The sensitive-content classifier is approximately 23 MB and returns the score contract Pond already uses. Replacing it with a general generator would increase cost and reduce determinism.
- A generative replacement becomes economically attractive only when the same already-loaded Gemma 4 model is delivering a valued local Agent and its on-demand vision/audio abilities are reused.

The practical two-model architecture is therefore EmbeddingGemma 2 for retrieval and Gemma 4 for user-invoked intelligence, with small specialists retained where they outperform on cost or contract fidelity.

## Privacy and licensing

Gemma 4 and EmbeddingGemma 2 are both Apache 2.0 models ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [EmbeddingGemma 2 model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2)). This reduces redistribution friction, but it does not make packaging obligation-free: Pond must preserve the Apache license and notices, review the exact packaged artifact, and account for the model card's separate requirement that EmbeddingGemma 2 deployments adhere to the [Gemma Prohibited Use Policy](https://ai.google.dev/gemma/prohibited_use_policy). Product and legal review remains appropriate before Pond distributes a checkpoint.

Local inference can keep Save text, images, audio, prompts, and model context on the device, but privacy is a property of the complete deployment rather than the checkpoint. Google documents Ollama and LM Studio as local runtimes and LiteRT-LM as an edge runtime ([Run Gemma](https://ai.google.dev/gemma/docs/run)). A remote base URL, hosted model runner, external Agent tool, telemetry path, or model download still uses the network; Pond should describe the actual route instead of labeling every Gemma configuration “private.”

## Recommended rollout

### Phase 1: evaluate Gemma 4 through existing adapters

- Test one pinned E2B and one E4B instruction-tuned build through both Ollama and LM Studio.
- Cover tool selection, argument validity, nested JSON schemas, multi-step search/read/cite flows, review-only mutations, cancellation, long conversations, tool-result history, and prompt-injection resistance.
- Record actual model package, quantization, runner version, memory, time-to-first-token, generation rate, and tool-call success rate on Apple Silicon, Windows GPU, and CPU-only fallback hardware.
- Keep the feature user-managed and text-only until the selected model/runner combination passes the evaluation.

### Phase 2: add model-scoped local vision

- Make vision capability belong to the selected local model rather than to every Ollama or LM Studio connection.
- Verify images pass through the complete OpenAI-compatible request path using Gemma 4's chat template.
- Evaluate screenshot/UI understanding, OCR, document extraction, and ordinary image questions against an existing cloud vision baseline.

### Phase 3: prototype EmbeddingGemma 2

- First prove the runtime path outside production: exact model revision, preprocessing, output selection, dtype, encoder selection, and platform support.
- Compare text-only 270M against MPNet and text-plus-image 440M against the combined MPNet/SigLIP 2 experience.
- Implement separate retrieval-query, retrieval-document, and symmetric-similarity encoders.
- Reindex a representative Library and compare multilingual retrieval, image-to-text retrieval, suggested-tag quality, cold start, throughput, memory, and index size at 768 and 256 dimensions.

### Phase 4: consider a Pond-managed runtime only after demand is proven

- Offer models as optional, removable, checksum-verified downloads; do not inflate the base Electron installer.
- Keep generation in a main-owned process or sidecar behind the existing typed `LanguageModel` boundary.
- Retain the specialized enrichment models unless a task-level benchmark shows that consolidation improves the complete user experience, not merely model count.

## Implementation status

Pond now pins `onnx-community/embeddinggemma-2-ONNX` at revision `daa72c51243991dfcaf9f9137d2c573d8f7790c0` and uses Transformers.js 4.3.1, the first published package in this workspace that registers the `embedding_gemma2` architecture. The renderer enrichment worker switches between a text-and-vision profile and a text-and-audio profile, keeping one alive at a time. The main process loads a separate text-only configuration for query generation and classification labels. All of them use Q4 graphs.

Live Node CPU smoke tests loaded the pinned Q4 graphs and produced 768-dimensional, unit-normalized embeddings for a prefixed text query, a synthetic image, one second of 16 kHz mono audio, and a two-frame generated video. The audio and video checks are opt-in because the audio encoder adds a model download and neither modality belongs in the offline unit-test suite. The renderer's WebGPU/WASM path still requires an application-level smoke test on the supported desktop platforms; the passing Node tests establish the model and processor contracts, not browser-backend performance.

Pond now has an opt-in [embedding dimension benchmark](../../apps/desktop/scripts/benchmark-embedding-dimensions.mjs) that evaluates the same labeled vectors at 768, 512, 256, and 128 dimensions after truncation and L2 re-normalization. Before any result, it declares the adoption rule: 256 dimensions must lose no more than one absolute Recall@10 point overall and no more than two points in every important modality slice; 128 dimensions are excluded from multimodal adoption. It reports Recall@10, mean reciprocal rank, raw float-vector bytes, and measured sqlite-vec database bytes. The repository does not yet contain a representative held-out text/image/audio/video relevance corpus, so the available synthetic dry smoke only validates the measurement path. In that dry run, all dimensions scored 100% Recall@10 and 1.0 MRR by construction; sqlite-vec files measured 3,190,784 bytes at 768 dimensions, 2,142,208 at 512, 1,093,632 at 256, and 569,344 at 128. Those figures are not quality evidence. The adoption decision therefore remains **keep 768 dimensions** until a representative held-out corpus passes the predeclared rule.

The persisted database contract remains unchanged: document vectors continue to use `embedding`, and media vectors for images, audio, and video use the legacy-named `clipEmbedding`. Distinct version stamps encode the document and media preprocessing contracts, so the existing enrichment sweep identifies old MPNet and SigLIP rows and rebuilds them in the background. Search queries are task-prefixed once, embedded once, and projected into whichever text and visual retrieval channels are enabled.

This implementation intentionally retains Florence-2, Whisper Base, and the sensitive-content classifier. Removing the first two remains gated on Pond-specific caption, OCR, long-audio, throughput, and memory benchmarks rather than model-family capability alone.

## Bottom line

- **Replace or supplement cloud Agent use:** yes—Gemma 4 E2B/E4B through Pond's existing Ollama/LM Studio path is the best first move.
- **Replace cloud image understanding:** likely—Gemma 4 is capable, but Pond needs model-scoped local vision plumbing and runner verification.
- **Replace MPNet and SigLIP 2:** plausibly with one EmbeddingGemma 2 stack—the highest-value consolidation, and also the integration with the most runtime uncertainty.
- **Replace Florence-2:** optional after evaluation, not by default; Gemma 4 can do the work but costs much more to keep resident.
- **Replace Whisper:** not wholesale; the 30-second input limit and generative runtime make it a poorer default for background transcription.
- **Replace the sensitive classifier or deterministic title logic:** no current benefit.
- **Distribute on desktop:** practical as an optional download. Start with the local runtimes Pond already supports, then consider LiteRT-LM or another native sidecar only if adoption justifies the packaging work.
