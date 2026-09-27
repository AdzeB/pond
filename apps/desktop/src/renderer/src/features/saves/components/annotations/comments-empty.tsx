import { Empty } from "@pond/ui";

export function CommentsEmpty() {
  return (
    <Empty.Root>
      <Empty.Title>No comments yet</Empty.Title>
      <Empty.Description>Add one from the preview toolbar.</Empty.Description>
    </Empty.Root>
  );
}
