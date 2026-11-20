export const MISSING_PERFORMANCE_MESSAGE = "指定された公演が見つかりません。公演を選び直してください";

/** A blank or ambiguous event query is an invalid explicit selection. */
export function requestedPerformanceId(value: string | string[] | undefined) {
  if (!Array.isArray(value)) return value;
  if (!value.length) return undefined;
  return value.every(id => id === value[0]) ? value[0] : "";
}
