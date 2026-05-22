import { NumberFieldStepper } from "@/components/number-field-stepper";
import { Cell } from "./cell";

export default function NumberFieldCell() {
  return (
    <Cell label="Number Field">
      <NumberFieldStepper defaultValue={1} />
    </Cell>
  );
}
