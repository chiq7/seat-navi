import { kyoceraDomeGuide } from "./kyocera-dome";
import { osakaJoHallGuide } from "./osaka-jo-hall";
import { kArenaGuide } from "./k-arena";
import { yokohamaArenaGuide } from "./yokohama-arena";
import { piaArenaMmGuide } from "./pia-arena-mm";
import { tokyoGardenTheaterGuide } from "./tokyo-garden-theater";
import { saitamaSuperArenaGuide } from "./saitama-super-arena";
import { ariakeArenaGuide } from "./ariake-arena";
import { budokanGuide } from "./budokan";
import { yoyogiGuide } from "./yoyogi";
import { gaishiHallGuide } from "./gaishi-hall";
import { marineMesseGuide } from "./marine-messe";
import { vantelinDomeGuide } from "./vantelin-dome";
import { paypayDomeGuide } from "./paypay-dome";
import { sapporoDomeGuide } from "./sapporo-dome";
import { bellunaDomeGuide } from "./belluna-dome";
import { zozoMarineGuide } from "./zozo-marine";
import { koshienGuide } from "./koshien";
import { mufgGuide } from "./mufg-stadium";
import { nissanGuide } from "./nissan-stadium";
import { makuhariGuide } from "./makuhari-messe";
import { edionGuide } from "./edion-arena";
import { miyagiGuide } from "./miyagi-arena";
import { hiroshimaGuide } from "./hiroshima-arena";
import { tokiGuide } from "./toki-messe";
import type { DedicatedVenueGuide } from "./types";

export const dedicatedVenueGuides: Readonly<Record<string, DedicatedVenueGuide>> = {
  "toki-messe": tokiGuide,
  "kyocera-dome": kyoceraDomeGuide,
  "osaka-jo-hall": osakaJoHallGuide,
  "k-arena": kArenaGuide,
  "yokohama-arena": yokohamaArenaGuide,
  "pia-arena-mm": piaArenaMmGuide,
  "tokyo-garden-theater": tokyoGardenTheaterGuide,
  "saitama-super-arena": saitamaSuperArenaGuide,
  "ariake-arena": ariakeArenaGuide,
  "budokan": budokanGuide,
  "yoyogi": yoyogiGuide,
  "gaishi-hall": gaishiHallGuide,
  "marine-messe": marineMesseGuide,
  "vantelin-dome": vantelinDomeGuide,
  "paypay-dome": paypayDomeGuide,
  "sapporo-dome": sapporoDomeGuide,
  "belluna-dome": bellunaDomeGuide,
  "zozo-marine": zozoMarineGuide,
  "koshien": koshienGuide,
  "mufg-stadium": mufgGuide,
  "nissan-stadium": nissanGuide,
  "makuhari-messe": makuhariGuide,
  "edion-arena": edionGuide,
  "miyagi-arena": miyagiGuide,
  "hiroshima-arena": hiroshimaGuide,
};
