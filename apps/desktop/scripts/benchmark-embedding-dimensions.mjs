import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { load as loadSqliteVec } from "sqlite-vec";
import { z } from "zod";
import {
  assessCompactDimension,
  DIMENSION_ACCEPTANCE_RULE,
  EMBEDDING_BENCHMARK_DIMENSIONS,
  evaluateEmbeddingDimension,
  truncateAndNormalizeEmbedding,
} from "../src/main/core/embedding-dimension-benchmark.ts";

const SOURCE_DIMENSIONS = 768;
const MODALITIES = ["text", "image", "audio", "video"];
const MAX_DOCUMENTS = 10_000;
const MAX_QUERIES = 10_000;

function usage() {
  throw new Error(
    "Usage: benchmark-embedding-dimensions.mjs (--corpus <vectors.json> | --smoke)",
  );
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === "--smoke") {
    return { kind: "smoke" };
  }
  if (argv.length === 2 && argv[0] === "--corpus" && argv[1]) {
    return { kind: "corpus", path: resolve(argv[1]) };
  }
  return usage();
}

const ModalitySchema = z.enum(MODALITIES);
const VectorSchema = z.array(z.number()).length(SOURCE_DIMENSIONS);
const CorpusSchema = z.object({
  kind: z.enum(["held-out", "smoke"]),
  representative: z.boolean(),
  importantModalities: z.array(ModalitySchema),
  documents: z
    .array(
      z.object({
        id: z.string().min(1),
        modality: ModalitySchema,
        vector: VectorSchema,
      }),
    )
    .min(1)
    .max(MAX_DOCUMENTS),
  queries: z
    .array(
      z.object({
        id: z.string().min(1),
        modality: ModalitySchema,
        relevantIds: z.array(z.string()).min(1),
        vector: VectorSchema,
      }),
    )
    .min(1)
    .max(MAX_QUERIES),
});

function parseCorpus(value) {
  const parsed = CorpusSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`corpus is invalid\n${z.prettifyError(parsed.error)}`);
  }
  const corpus = parsed.data;
  const documentIds = new Set();
  for (const [index, document] of corpus.documents.entries()) {
    if (documentIds.has(document.id)) {
      throw new Error(`documents[${index}] has a duplicate id`);
    }
    documentIds.add(document.id);
  }
  const queryIds = new Set();
  const queries = corpus.queries.map((query, index) => {
    if (
      queryIds.has(query.id) ||
      query.relevantIds.some((id) => !documentIds.has(id))
    ) {
      throw new Error(`queries[${index}] has invalid relevance metadata`);
    }
    queryIds.add(query.id);
    return { ...query, relevantIds: [...new Set(query.relevantIds)] };
  });

  return {
    ...corpus,
    importantModalities: [...new Set(corpus.importantModalities)],
    queries,
  };
}

function noise(seed, index) {
  const value = Math.sin((seed + 1) * (index + 11) * 12.9898) * 43_758.5453;
  return (value - Math.floor(value) - 0.5) * 0.02;
}

function smokeVector(topic, seed) {
  return Array.from({ length: SOURCE_DIMENSIONS }, (_, index) =>
    index === topic ? 1 : noise(seed, index),
  );
}

function createSyntheticSmokeCorpus() {
  const documents = [];
  const queries = [];
  for (const [modalityIndex, modality] of MODALITIES.entries()) {
    for (let topicIndex = 0; topicIndex < 4; topicIndex += 1) {
      const topic = modalityIndex * 4 + topicIndex;
      const relevantIds = [];
      for (let variant = 0; variant < 4; variant += 1) {
        const id = `${modality}-${topicIndex}-${variant}`;
        relevantIds.push(id);
        documents.push({
          id,
          modality,
          vector: smokeVector(topic, topic * 10 + variant),
        });
      }
      queries.push({
        id: `query-${modality}-${topicIndex}`,
        modality,
        relevantIds,
        vector: smokeVector(topic, 1_000 + topic),
      });
    }
  }
  return {
    kind: "smoke",
    representative: false,
    importantModalities: [...MODALITIES],
    documents,
    queries,
  };
}

async function loadCorpus(arguments_) {
  if (arguments_.kind === "smoke") return createSyntheticSmokeCorpus();
  return parseCorpus(JSON.parse(await readFile(arguments_.path, "utf8")));
}

function vecBlob(vector) {
  return Buffer.from(Float32Array.from(vector).buffer);
}

async function measureSqliteVecDatabases(corpus, results) {
  const { default: Database } = await import("better-sqlite3");
  const directory = await mkdtemp(join(tmpdir(), "pond-embedding-dimensions-"));
  try {
    for (const result of results) {
      const path = join(directory, `${result.dimensions}.sqlite`);
      const db = new Database(path);
      try {
        loadSqliteVec(db);
        db.exec(
          `CREATE VIRTUAL TABLE vectors USING vec0(save_id TEXT PRIMARY KEY, embedding FLOAT[${result.dimensions}])`,
        );
        const insert = db.prepare(
          "INSERT INTO vectors(save_id, embedding) VALUES (?, ?)",
        );
        const insertAll = db.transaction(() => {
          for (const document of corpus.documents) {
            insert.run(
              document.id,
              vecBlob(
                truncateAndNormalizeEmbedding(
                  document.vector,
                  result.dimensions,
                ),
              ),
            );
          }
        });
        insertAll();
      } finally {
        db.close();
      }
      result.sqliteVecDatabaseBytes = (await stat(path)).size;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function report(corpusLabel, corpus, results, decision) {
  console.log(`Corpus: ${corpusLabel}`);
  console.log(
    `Evidence: ${corpus.kind}; representative=${corpus.representative}; documents=${corpus.documents.length}; queries=${corpus.queries.length}`,
  );
  console.table(
    results.map((result) => ({
      dimensions: result.dimensions,
      "Recall@10": percent(result.recallAt10),
      MRR: result.meanReciprocalRank.toFixed(4),
      "raw vector bytes": result.rawVectorBytes,
      "sqlite-vec DB bytes": result.sqliteVecDatabaseBytes,
      slices: Object.entries(result.slices)
        .map(([modality, slice]) => `${modality}:${percent(slice.recallAt10)}`)
        .join(", "),
    })),
  );
  console.log(
    decision.accepted
      ? "Decision: 256 dimensions meets the predeclared metric rule. A migration still requires review of corpus provenance and representativeness."
      : `Decision: keep 768 dimensions. ${decision.reasons.join("; ")}`,
  );
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  console.log(
    `Acceptance rule (declared before results): adopt 256 only if held-out overall Recall@10 loses <=${DIMENSION_ACCEPTANCE_RULE.maxOverallRecallLossPoints} point and each important modality loses <=${DIMENSION_ACCEPTANCE_RULE.maxModalityRecallLossPoints} points; never adopt 128 for multimodal retrieval.`,
  );
  const corpus = await loadCorpus(arguments_);
  const results = EMBEDDING_BENCHMARK_DIMENSIONS.map((dimensions) =>
    evaluateEmbeddingDimension(corpus, dimensions),
  );
  await measureSqliteVecDatabases(corpus, results);
  const baseline = results.find(
    ({ dimensions }) =>
      dimensions === DIMENSION_ACCEPTANCE_RULE.baselineDimensions,
  );
  const candidate = results.find(
    ({ dimensions }) =>
      dimensions === DIMENSION_ACCEPTANCE_RULE.candidateDimensions,
  );
  if (!baseline || !candidate) {
    throw new Error("benchmark dimensions are missing the acceptance pair");
  }
  const decision = assessCompactDimension(corpus, baseline, candidate);
  report(
    arguments_.kind === "smoke"
      ? "synthetic dry smoke (not model quality evidence)"
      : basename(arguments_.path),
    corpus,
    results,
    decision,
  );
}

await main();
