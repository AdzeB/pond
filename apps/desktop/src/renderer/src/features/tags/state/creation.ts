import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { TagEntity } from "@/features/tags/operations/tag-operations";

interface TagCreationRequest {
  token: number;
  kind: TagEntity;
}

const store = new Store<TagCreationRequest>({ token: 0, kind: "tag" });

export const tagCreation = {
  request(kind: TagEntity): void {
    store.setState((state) => ({ token: state.token + 1, kind }));
  },
};

export function useTagCreationRequest(): TagCreationRequest {
  return useSelector(store, (state) => state);
}
