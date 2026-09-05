import { useRef, useState } from "react";
import { tagOperations } from "@/features/tags/operations/tag-client";
import type { TagEntity } from "@/features/tags/operations/tag-operations";

interface TagCreationOperations {
  create: (kind: TagEntity, raw: string) => Promise<void>;
}

export function useTagCreation(
  operations: TagCreationOperations = tagOperations,
) {
  const [creating, setCreating] = useState<TagEntity | null>(null);
  const [draft, setDraft] = useState("");
  const committed = useRef(false);

  function cancelCreate() {
    committed.current = true;
    setDraft("");
    setCreating(null);
  }

  function startCreate(kind: TagEntity) {
    committed.current = false;
    setDraft("");
    setCreating(kind);
  }

  async function commitCreate() {
    if (!creating || committed.current) return;
    const kind = creating;
    const name = draft;
    cancelCreate();
    await operations.create(kind, name);
  }

  return { creating, draft, setDraft, startCreate, cancelCreate, commitCreate };
}
