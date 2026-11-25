import { buildMeta, hasSeatPhotos, seatPhotoTitle, showsPhotoCount } from "./metadata";
import { getPublicVenueAlternateNames } from "./publicAlternateNames";
import { getPublicVenueName } from "./publicVenueGuides";
import { getEventVenuePhotoPreview } from "./serverSeatPhotoVenues";
import { SAPPORO_OFFICIAL_NAME, venuePageDisplayNames } from "./venuePageDisplayNames";
import { venueSearchIntents } from "./venueSearchIntents";
import { venueShareImage } from "./seatShare";

const preferredNames: Readonly<Partial<Record<string, string>>> = venuePageDisplayNames;

export function getVenuePageContent(id: string, name: string) {
  const publicName = getPublicVenueName(id, name);
  const officialName = id === "sapporo-dome" ? SAPPORO_OFFICIAL_NAME : publicName.split("（")[0];
  const displayName = preferredNames[id] ?? publicName;
  return {
    displayName, officialName, alternateNames: getPublicVenueAlternateNames(id, officialName),
    photos: getEventVenuePhotoPreview(id),
  };
}

export function buildPublicVenueMetadata(id: string, name: string) {
  const { displayName, officialName, alternateNames, photos } = getVenuePageContent(id, name);
  const count = photos?.count ?? 0;
  const aliases = alternateNames.slice(0, id === "k-arena" || id === "osaka-jo-hall" ? 1 : 3);
  const intro = preferredNames[id] ?? (aliases.length ? `${officialName}（${aliases.join("・")}）` : displayName);
  const manyPhotos = hasSeatPhotos(count);
  const title = seatPhotoTitle(`${displayName}の座席表・見え方${manyPhotos ? "" : "まとめ"}`, count);
  const venueDetail = ["edion-arena", "toki-messe", "saitama-super-arena"].includes(id)
    ? venueSearchIntents[id].description
    : "アリーナ・スタンドのブロック構成や列・座席番号の見方、アクセス・ロッカー情報などをチェックできます。";
  const description = manyPhotos
    ? `${intro}のライブ座席表と、各席からのリアルな見え方写真を${showsPhotoCount(count) ? `${count}枚` : ""}掲載！${venueDetail}`
    : `${intro}のライブ座席表やアリーナ・スタンドからの見え方・座席情報をまとめたページです。各席からのリアルな見え方写真・レビューも随時募集中！`;
  // The venue's own share picture (its seat map) when one has been drawn; otherwise the site picture.
  const image = venueShareImage(id);
  return buildMeta({ path: `/venues/${id}`, title, description, ...(image ? { image, imageAlt: `${displayName}の座席表` } : {}) });
}
