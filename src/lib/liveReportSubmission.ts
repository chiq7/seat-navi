type WriteError = { message: string; code?: string; statusCode?: number | string; status?: number };
type WriteResult = { error: WriteError | null };

export function liveReportAreaCode(area: string, floor: string): string | null {
  if (area === "アリーナ") return "arena";
  if (area === "1階席") return "stand_1f";
  if (area === "スタンド") {
    if (floor === "1階") return "stand_1f";
    if (floor === "2階") return "stand_2f";
    if (floor === "3階以上") return "stand_3f_or_higher";
  }
  // The stored enum has no generic stand, balcony or standing category.
  // Preserve the user's label separately in seat_description.
  return null;
}

export type LivePhoto = { file: File; path: string; uploaded: boolean };
export type LiveReportRow = { id: string; event_id: string; user_id: string | null; [key: string]: unknown };
export type LiveReportAttempt = { row: LiveReportRow; photos: LivePhoto[]; writingRow: boolean };

type Writers = {
  upload: (photo: LivePhoto) => PromiseLike<WriteResult>;
  insert: (row: LiveReportRow) => PromiseLike<WriteResult>;
  matchesExisting: (row: LiveReportRow) => PromiseLike<boolean>;
};

export async function submitLiveReport(attempt: LiveReportAttempt, writers: Writers): Promise<void> {
  for (const photo of attempt.photos) {
    if (photo.uploaded) continue;
    const { error } = await writers.upload(photo);
    if (error) {
      // Each selected file owns a random path. A lost acknowledgement may cause
      // this exact file to be retried at its original path.
      const duplicate = ["Duplicate", "ResourceAlreadyExists", "KeyAlreadyExists"].includes(error.code ?? "")
        || ([400, 409].includes(Number(error.statusCode ?? error.status)) && /already exists/i.test(error.message));
      if (!duplicate) throw new Error("写真を保存できませんでした。写真を変更するか、もう一度送信してください。");
    }
    photo.uploaded = true;
  }
  attempt.writingRow = true;
  const { error } = await writers.insert(attempt.row);
  if (error) {
    if (error.code === "23505" && await writers.matchesExisting(attempt.row)) return;
    // Explicit Postgres rejections did not create the report. A network loss
    // is ambiguous: retry the same immutable row and ID.
    if (/^\d{5}$/.test(error.code ?? "") && error.code !== "23505") attempt.writingRow = false;
    throw new Error("現地レポの保存を確認できませんでした。もう一度送信してください。");
  }
}
