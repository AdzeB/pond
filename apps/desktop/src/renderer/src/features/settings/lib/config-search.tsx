import { defineSection } from "@/features/settings/lib/engine-types";

export const searchSection = defineSection("ai", {
  title: "Search",
  description: "Choose how Pond understands and ranks search queries.",
  keywords: ["search", "semantic", "embedding", "query", "natural language"],
  groups: [
    {
      title: "Search",
      items: [
        {
          control: "switch",
          key: "nlCompiler",
          title: "Ask in Plain Language",
          description: "Send search questions to your Agent provider.",
          keywords: ["nlp", "query", "ask", "agent", "natural language"],
        },
        {
          control: "switch",
          key: "semanticSearch",
          title: "Semantic Search",
          description: "Ranks Saves by meaning, including unlabeled photos.",
          keywords: ["embeddings", "meaning", "vector", "similarity"],
        },
      ],
    },
  ],
});
