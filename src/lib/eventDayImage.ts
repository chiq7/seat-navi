/** Keep the whole poster within conservative mobile Canvas limits, without cropping. */
export function eventDayImageScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("保存画像のサイズを確認できません");
  }
  // iOS has stricter Canvas bounds than desktop. This affects event-day exports only.
  // Leave a small area margin for the exporter's rounded integer dimensions.
  return Math.min(2, 4000 / width, 4000 / height, Math.sqrt(3_990_000 / (width * height)));
}
