/**
 * 同日同会場でも昼夜・複数部は別公演として扱うため、タイトルから回次を拾う。
 * 時刻や回次がどちらか片方にしか無い場合も、自動統合は安全側に倒して行わない。
 */
export function getPerformanceSessionMarker(title: string): string | null {
  const normalized = title.normalize("NFKC").toLowerCase();

  const part = normalized.match(/(?:第\s*)?(\d{1,2})\s*部/);
  if (part) return `part:${part[1]}`;

  if (/(?:昼公演|昼の部|matinee)/.test(normalized)) return "session:day";
  if (/(?:夜公演|夜の部|evening)/.test(normalized)) return "session:night";

  const show = normalized.match(/(?:show|公演)\s*#?\s*(\d{1,2})\b/);
  if (show) return `show:${show[1]}`;

  const time = normalized.match(/(?:開演|start)\s*[:：]?\s*(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (time) return `time:${time[1].padStart(2, "0")}:${time[2]}`;

  return null;
}

export function hasDistinctPerformanceSession(leftTitle: string, rightTitle: string): boolean {
  const left = getPerformanceSessionMarker(leftTitle);
  const right = getPerformanceSessionMarker(rightTitle);
  return (left !== null || right !== null) && left !== right;
}
