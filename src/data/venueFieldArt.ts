/**
 * 設備マップの真ん中に置く「グラウンド（ステージ・アリーナ）」の絵と、その大きさ・配置。
 *
 * ■ 単位
 *   すべて各階の設備図（公式フロア図をなぞった座標）の単位。画面のピクセルではない。
 *
 * ■ 絵だけを差し替えるとき（同じ縦横比）
 *   1. 新しい画像を public/images/venues/ に別の名前で置く（透明背景・余白を切り詰めた WebP 推奨）。
 *      同じ名前で上書きすると、スマホに古い絵が残ることがある。
 *   2. image.href を新しい名前に、image.width / image.height を画像のピクセルサイズに合わせる。
 *   縦横比が同じなら placement はそのままでよい。
 *
 * ■ 縦横比が変わるとき・図が変わったとき
 *   placement の幅を見直す。中心は客席の内側（グラウンド）の位置なので、図が同じなら変えなくてよい。
 *   大きさや位置を変えたら、スマホ幅とPC幅で各階を見て、絵が客席の線より外へ大きくはみ出していないか確かめる。
 *
 * ■ 各値
 *   placement:  絵の中心 x, 中心 y, 幅。客席の外形に当てはめた円（グラウンド）の中心と、その直径。
 *               絵は図の線の下に敷くので、はみ出した部分は客席の形の下に隠れる。
 *   drawScale:  placement の幅に対して実際に描く割合。
 *   cameraArea: 省略可。地図の表示範囲に必ず含める四角 [x, y, 幅, 高さ]（図の外に絵を置くときだけ使う）。
 */
export type FieldArtImage = { href: string; width: number; height: number };
export type FieldArtSpot = {
  cameraArea?: readonly [x: number, y: number, width: number, height: number];
  placement: readonly [centerX: number, centerY: number, width: number];
};
export type VenueFieldArt = {
  image: FieldArtImage;
  drawScale: number;
  /** Key: `${floorId}:${layer}` — layer "floors" is the facility plan, "shops" the food-stand plan. */
  spots: Readonly<Record<string, FieldArtSpot>>;
};

/**
 * 東京ドーム。絵はユーザーがGeminiで作成（メインステージのみ、センステなし。センステは公演ごとに違うため）。
 * 720×589、透明背景。ステージはどの階の図でも上（外野・バックスクリーン側）。
 */
export const TOKYO_DOME_FIELD_ART: VenueFieldArt = {
  image: { href: "/images/venues/tokyo-dome-field-stage.webp", width: 720, height: 589 },
  drawScale: 1,
  spots: {
    "1f-infield:floors": { placement: [292.3, 503.7, 156.4] },
    "1f-outfield:floors": { placement: [294.1, 426.5, 284.2] },
    "2f-infield:floors": { placement: [292, 358.8, 171.8] },
    "3f-infield:floors": { placement: [297.6, 157.3, 219] },
    "4f-infield:floors": { placement: [297.6, 473.6, 263.4] },
    "1f-infield:shops": { placement: [302.1, 66.1, 199.8] },
    "1f-outfield:shops": { placement: [317.8, 1364.5, 184.8] },
    "2f-infield:shops": { placement: [312.9, 528.6, 224] },
    "4f-infield:shops": { placement: [308.3, 763.1, 266.4] },
  },
};

/** The illustration's drawn box and the area the camera must include, or null when the plan has no spot. */
export function fieldArtLayout(art: VenueFieldArt, key: string) {
  const spot = art.spots[key];
  if (!spot) return null;
  const [cx, cy, spotWidth] = spot.placement;
  const width = spotWidth * art.drawScale, height = width * art.image.height / art.image.width;
  const area = spot.cameraArea ? { x: spot.cameraArea[0], y: spot.cameraArea[1], width: spot.cameraArea[2], height: spot.cameraArea[3] } : null;
  return { x: cx - width / 2, y: cy - height / 2, width, height, cameraArea: area };
}
