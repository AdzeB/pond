import { Button } from "@pond/ui";
import { X } from "lucide-react";
import { Cell } from "./cell";

export default function ButtonCell() {
  return (
    <Cell label="Button">
      <Button variant="primary">Submit</Button>
      <Button variant="secondary">Submit</Button>
      <Button variant="tertiary">Submit</Button>
      <Button variant="danger">Submit</Button>
      <Button variant="accent">Submit</Button>
      <Button icon variant="primary">
        <X />
      </Button>
    </Cell>
  );
}
