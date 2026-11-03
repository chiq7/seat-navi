import fs from "node:fs/promises";
import {prepareCampaignRegistration} from "../src/lib/seat-campaign/registration.ts";
const [candidateFile,eventFile,outputFile]=process.argv.slice(2);
if(!candidateFile || !eventFile || !outputFile)throw new Error("Usage: prepareSeatCampaign.mts candidate.json verified-event.json output.json (offline, disabled only)");
const row=prepareCampaignRegistration(JSON.parse(await fs.readFile(candidateFile,"utf8")),JSON.parse(await fs.readFile(eventFile,"utf8")));
await fs.writeFile(outputFile,JSON.stringify({state:"prepared_not_registered",officialSourceReviewRequired:true,row},null,2)+"\n",{flag:"wx"});
console.log("募集停止状態の登録候補を保存しました。DBへの登録や募集開始はしていません。");
