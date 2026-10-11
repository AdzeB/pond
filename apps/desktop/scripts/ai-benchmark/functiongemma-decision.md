# FunctionGemma tool-routing decision

Status on 2026-10-08: **not evaluated; not adopted**.

Pond now has a deterministic, synthetic 120-case tool-routing corpus and an
explicit live benchmark for Gemma 4 versus FunctionGemma. No qualifying live
run has been recorded in this repository, so there is no evidence for adding a
runtime router. Gemma 4 remains the only local Agent model path.

The predeclared adoption gate accepts FunctionGemma only when a complete live
run over every frozen case satisfies all of these conditions:

- exact, schema-valid, argument-correct tool calls improve by at least five
  absolute percentage points, or warm p95 latency drops by at least 30%;
- forbidden tool or action attempts do not increase;
- candidate peak memory stays within the explicitly supplied budget.

Fixture and dry-run results can verify the harness but cannot satisfy the gate.
Missing memory measurements, incomplete case coverage, or a non-live result
also leave the decision unevaluated and not adopted.

Run the offline structure check with:

```bash
node apps/desktop/scripts/ai-benchmark/run-tool-routing-benchmark.mjs --dry-run
```

Run a live comparison only after both models are installed in the selected
runtime. The runtime, endpoint, exact model IDs, memory budget, and run ID are
all required; the command never installs or downloads a model:

```bash
node apps/desktop/scripts/ai-benchmark/run-tool-routing-benchmark.mjs --live \
  --provider ollama \
  --base-url http://127.0.0.1:11434 \
  --baseline-model <installed-gemma-model-id> \
  --candidate-model <installed-functiongemma-model-id> \
  --memory-budget-mib <budget> \
  --run-id <lowercase-run-id>
```

Results are content-minimized JSONL at
`.tmp/benchmarks/<run-id>/tools.jsonl`. They contain case IDs, tool names,
scores, latency, runtime-reported or explicitly supplied memory, summaries, and
the gate decision. They exclude prompts, raw arguments, user content, model
prose, paths, and credentials.
