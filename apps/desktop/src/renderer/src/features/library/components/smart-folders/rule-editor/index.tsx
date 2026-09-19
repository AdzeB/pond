import type { RuleChoice as InternalRuleChoice } from "./types";

export { RuleEditor } from "./editor";
export {
  compileRuleQuery,
  editableQuery,
  newRule,
  ruleQueryReady,
} from "./query";

export type RuleChoice = InternalRuleChoice;

export interface RuleChoices {
  folders: readonly RuleChoice[];
  tags: readonly RuleChoice[];
}
