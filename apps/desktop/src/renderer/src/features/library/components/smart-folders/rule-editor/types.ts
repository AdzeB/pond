export interface RuleChoice {
  value: string;
  label: string;
}

export interface RuleChoices {
  folders: readonly RuleChoice[];
  tags: readonly RuleChoice[];
}
