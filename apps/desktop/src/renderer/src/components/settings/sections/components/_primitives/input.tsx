import { Input } from "@pond/ui";
import { Cell } from "./cell";

export default function InputCell() {
  return (
    <Cell label="Input">
      <Input.Field placeholder="Find..." />
    </Cell>
  );
}
