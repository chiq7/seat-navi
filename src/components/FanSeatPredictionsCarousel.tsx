import type { FanSeatPrediction } from "@/lib/types";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function imageSrc(path: string): string {
  return path;
}

export function FanSeatPredictionsCarousel({
  predictions,
}: {
  predictions: FanSeatPrediction[];
}) {
  return (
    <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-bold text-gray-700">みんなの座席予想</p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          ファンが投稿した座席予想です。公式情報ではありません
        </p>
      </div>

      {predictions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
          <p className="text-xs font-bold text-gray-600">まだファン予想はありません</p>
          <button
            type="button"
            disabled
            className="mt-3 rounded-full bg-gray-200 px-4 py-2 text-[11px] font-bold text-gray-500"
          >
            あなたの予想を投稿する
          </button>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-3">
            {predictions.map((prediction) => (
              <article
                key={prediction.id}
                className="w-64 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(prediction.image_path)}
                  alt="ファン投稿の座席予想"
                  className="h-36 w-full bg-white object-cover"
                />
                <div className="space-y-2 p-3">
                  {prediction.prediction_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prediction.prediction_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {prediction.comment && (
                    <p className="line-clamp-3 text-[11px] leading-relaxed text-gray-700">
                      {prediction.comment}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400">
                    <span>{prediction.display_name || "匿名"}</span>
                    <span>{formatDate(prediction.created_at)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
