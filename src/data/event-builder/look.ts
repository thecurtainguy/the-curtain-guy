export const EVENT_BUILDER_FULLNESS = [
  { value: 2, id: "standard" },
  { value: 2.5, id: "full" },
  { value: 3, id: "extra" },
] as const;

export type EventBuilderFullnessId =
  (typeof EVENT_BUILDER_FULLNESS)[number]["id"];

export function fullnessIdFromValue(value: number): EventBuilderFullnessId {
  const match = EVENT_BUILDER_FULLNESS.find((option) => option.value === value);
  return match?.id ?? "standard";
}
