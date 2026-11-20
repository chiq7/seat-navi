import singleImagePostIds from "@/data/seatViewSingleImagePostIds.json";
import seatViewPhotoData from "@/data/seatViewPhotoAssets.json";
import seatViewPhotoHolds from "@/data/seatViewPhotoHolds.json";

const singleImagePosts = new Set(singleImagePostIds);
const xPhotoAssets: Readonly<Record<string, string>> = seatViewPhotoData.x;
const otherPhotoAssets: Readonly<Record<string, string>> = seatViewPhotoData.other;

export function seatViewXStatusId(post: Pick<PhotoReference, "url">) {
  return post.url.match(/^https:\/\/(?:x|twitter)\.com\/[^?#]+\/status\/(\d+)$/)?.[1];
}

type PhotoReference = { url: string; photo?: number };

function reviewedXPhotoIndex(statusId: string, photo: number | undefined): number | undefined {
  // An unspecified attachment is safe only for a confirmed single-image post.
  if (photo === undefined) return singleImagePosts.has(statusId) ? 1 : undefined;
  return Number.isInteger(photo) && photo >= 1 && photo <= 4 ? photo : undefined;
}

export function seatViewInlinePhotoUrl(post: PhotoReference): string | undefined {
  const statusId = seatViewXStatusId(post);
  if (statusId) {
    const index = reviewedXPhotoIndex(statusId, post.photo);
    if (!index) return undefined;
    const key = `${statusId}/${index}`;
    if (Object.hasOwn(seatViewPhotoHolds, key)) return undefined;
    const asset = xPhotoAssets[key];
    return asset && /^[\w-]+$/.test(asset) ? `https://pbs.twimg.com/media/${asset}?format=jpg&name=large` : undefined;
  }
  return Object.hasOwn(otherPhotoAssets, post.url) ? otherPhotoAssets[post.url] : undefined;
}

export function seatViewPhotoSourceUrl(post: PhotoReference & { source: string }): string | undefined {
  if (!seatViewInlinePhotoUrl(post)) return undefined;
  const statusId = seatViewXStatusId(post);
  if (statusId) return `${post.url}/photo/${reviewedXPhotoIndex(statusId, post.photo)}`;
  return post.url.startsWith("https://note.com/") ? post.url : post.source;
}

// Embedding a whole multi-image post could show seats other than the one selected.
export function seatViewSingleImageEmbedUrl(post: PhotoReference): string | undefined {
  const id = seatViewXStatusId(post);
  if (id && singleImagePosts.has(id) && reviewedXPhotoIndex(id, post.photo) === 1 && seatViewInlinePhotoUrl(post)) {
    return `https://platform.twitter.com/embed/Tweet.html?id=${id}&lang=ja&dnt=true&conversation=none`;
  }
}

// If one image points at conflicting locations within a map, show it at neither.
// Different images of the same seat remain separate gallery items.
export function reviewedSeatPhotos<T extends PhotoReference>(
  records: readonly T[], locationKey: (record: T) => string,
): T[] {
  const photos = new Map<string, { record: T; key: string } | null>();
  for (const record of records) {
    const image = seatViewInlinePhotoUrl(record);
    if (!image) continue;
    const key = locationKey(record);
    const existing = photos.get(image);
    if (existing === undefined) photos.set(image, { record, key });
    else if (existing && existing.key !== key) photos.set(image, null);
  }
  return [...photos.values()].flatMap(entry => entry ? [entry.record] : []);
}
