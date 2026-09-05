export const scenarios = [
  {
    id: "empty",
    label: "New Chat",
    description: "A starting point for the whole library.",
  },
  {
    id: "context",
    label: "With Context",
    description:
      "A proposed way to ask about specific Saves. Context is simulated.",
  },
  {
    id: "searching",
    label: "Searching",
    description: "Quiet progress while the Assistant finds relevant Saves.",
  },
  {
    id: "reading",
    label: "Reading",
    description:
      "See which Saves the Assistant is reading, with a working Stop control.",
  },
  {
    id: "responding",
    label: "Responding",
    description: "An answer arriving in place. Replay to see the transition.",
  },
  {
    id: "answer",
    label: "Answer",
    description: "Readable responses with references you can inspect.",
  },
  {
    id: "stopped",
    label: "Stopped",
    description:
      "Stop preserves the question, attachments, and any partial answer.",
  },
  {
    id: "preparing",
    label: "Preparing",
    description:
      "Preparing suggested edits. Nothing changes before you apply them.",
  },
  {
    id: "review",
    label: "Review Changes",
    description:
      "Choose which title, tag, and folder edits to apply to sample Saves.",
  },
  {
    id: "applying",
    label: "Applying",
    description: "Each approved change has its own execution status.",
  },
  {
    id: "applied",
    label: "Applied",
    description: "Inspect the updated sample Saves or undo this batch.",
  },
  {
    id: "partial-error",
    label: "Partial Failure",
    description:
      "Two edits succeeded. Retry the failed edit or undo the completed changes.",
  },
  {
    id: "undone",
    label: "Undone",
    description: "The sample Saves are restored to their original values.",
  },
  {
    id: "dismissed",
    label: "Dismissed",
    description: "Suggested changes were dismissed. Nothing was changed.",
  },
  {
    id: "no-results",
    label: "No Results",
    description: "A useful next step when the library has no match.",
  },
  {
    id: "error",
    label: "Error",
    description: "A recoverable error, without losing your question.",
  },
  {
    id: "consent",
    label: "Provider Consent",
    description: "An explicit choice before sending content to a provider.",
  },
] as const;

export type Scenario = (typeof scenarios)[number]["id"];
export type Surface = "page" | "pane";
export type Theme = "dark" | "light";
export type Provider = "Ollama" | "Anthropic" | "OpenAI";
export type Scope = "library" | "design" | "attached";
export const scopeLabels = {
  library: "Library",
  design: "Design Folder",
  attached: "Attached Saves",
} satisfies Record<Scope, string>;

export const saves = [
  {
    title: "Designing for the long term",
    tags: "Design",
    folder: "Design",
    domain: "Read.cv",
    kind: "Article",
    excerpt:
      "Good tools let people build an understanding over time. Familiar structure and considered defaults leave more attention for the work itself.",
  },
  {
    title: "A quieter interface",
    tags: "Design",
    folder: "Design",
    domain: "Notion",
    kind: "Article",
    excerpt:
      "A workspace can hold complex information without showing every control at once. Reveal detail when it becomes useful, and keep the next action close to the content.",
  },
  {
    title: "The details are the product",
    tags: "Interface",
    folder: "Inbox",
    domain: "Linear",
    kind: "Essay",
    excerpt:
      "Consistency in spacing, language, and interaction builds trust. Small decisions compound across the experience, making the whole product feel considered.",
  },
] as const;

export const changes = [
  {
    id: 0,
    field: "title",
    label: "Rename",
    before: saves[0].title,
    after: "Designing tools for the long term",
  },
  {
    id: 1,
    field: "tags",
    label: "Add Tag",
    before: saves[1].tags,
    after: "Design, Calm interfaces",
  },
  {
    id: 2,
    field: "folder",
    label: "Move to Folder",
    before: saves[2].folder,
    after: "Design",
  },
] as const;

export const organizeQuestion =
  "Organize these design saves. Suggest clearer titles, tags, and folders.";
export const changeModes: Scenario[] = [
  "preparing",
  "review",
  "applying",
  "applied",
  "partial-error",
  "undone",
  "dismissed",
];

export const question = "What ideas connect my recent design saves?";
export const answer =
  "Your recent saves share a common idea: good software gives people room to think. They approach it from three directions.";
export const themes = [
  {
    title: "Familiarity over novelty",
    body: "Use patterns people already understand, so they can focus on what they came to do.",
  },
  {
    title: "Detail when it matters",
    body: "Keep the first view quiet. Reveal context and controls as the task becomes more specific.",
  },
  {
    title: "Care in the small things",
    body: "Spacing, language, and feedback matter as much as the larger layout.",
  },
];
