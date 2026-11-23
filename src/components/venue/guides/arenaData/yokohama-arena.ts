import { yokohamaArenaGuide } from "@/data/venueGuides/yokohama-arena";
import { yokohamaAreas, yokohamaFacilityConfig, yokohamaLevels, yokohamaStandSeats } from "@/data/venueGuides/yokohama-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: yokohamaArenaGuide, seats: yokohamaStandSeats, levels: yokohamaLevels, areas: yokohamaAreas, facilities: yokohamaFacilityConfig,
    seatNote: "センター席は公演ごとの配置です。使用するブロック・ステージは公演案内をご確認ください。",
    access: [["新横浜駅", "JR横浜線／北口", "徒歩5分"], ["新横浜駅", "東海道新幹線／東口", "徒歩5分"], ["新横浜駅", "地下鉄・相鉄・東急／出口7・8", "徒歩4分"]],
    luggage: "館内ロッカーのほか、新横浜駅の大型ロッカーやStudio MUGICの預かりも探せます。",
    preparationTitle: "飲食・休憩", preparation: "客席での食事はできません。食事はロビーで。ペットボトルなどの水分補給は客席でもできます。",
    parking: { text: "会場に来場者用の駐車場・駐輪場はなく、公式は電車など公共交通機関での来場を案内しています。路上駐車はやめましょう。送迎などで近くの時間貸駐車場を使う場合は、台数と料金を一覧で確かめられます。", meetup: "開場前や終演後に友達と集まるなら、会場から歩いてすぐのファミレス・カフェ・カラオケを一覧で探せます。屋外ならトイレのある新横浜駅前公園も（設備の「案内」に掲載）。公演日はどこも混み合うので、早めに。" },
    accessUrl: "https://www.yokohama-arena.co.jp/access/", eventsUrl: "https://www.yokohama-arena.co.jp/event/",
    faq: [["アリーナ席とセンター席は違いますか？", "アリーナ席はA〜Fの階段状の席です。センター席は中央の平らなフロアで、公演によって配置が変わります。"], ["A12と書かれた場所は何ですか？", "Aブロックの12列を示します。列欄にA12などの区画と列、番号欄に席番号を入力します。確認済みの列は検索できます。A・Dの12列、B・C・E・Fの11列は検索準備中なので、区画名や地図からお探しください。"], ["車いすで来場する場合は？", "車いす席とエレベーターの利用は主催者係員にご確認ください。多目的トイレは1F・2Fにあります。会場で車いすの貸し出しは行っていません。"], ["車で行けますか？駐車場はありますか？", "横浜アリーナに来場者用の駐車場・駐輪場はありません。公式は公共交通機関での来場を案内し、車での来場を控え、路上駐車をしないよう求めています。近くにはナビパーク新横浜第1（41台）、三井のリパーク新横浜3丁目第3（48台）、タイムズ新横浜第38（28台）、新横浜プリンスペペ駐車場（761台・2027年3月末で営業終了）などの時間貸駐車場がありますが、公演日は満車や特別料金になることがあります。"], ["公演の前後に友達と集まれる場所は？", "会場の近くには、サイゼリヤ 新横浜アリーナ通り店、ラ・オハナ 新横浜店、マクドナルド 新横浜駅前店、スターバックス 新横浜3丁目店、遅くまで開いているすき家 横浜アリーナ前店があります。駅ビルのキュービックプラザ新横浜には9F・10Fのレストラン街とロイヤルホストがあります。大人数ならビッグエコー 新横浜アリーナ通り店（最大30人）やコート・ダジュール 新横浜駅前店（最大24人・持ち込み可）が使えます。屋外なら、トイレのある新横浜駅前公園も使えます。公演日は混み合い、カラオケはイベント日の特別料金になることがあります。"], ["ベビーカーやスーツケースを預けられますか？", "会場によるベビーカー・スーツケースの預かりサービスはありません。公演主催者の対応は公演案内をご確認ください。荷物は館内・駅のロッカーや店舗預かりを探せます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"yokohama-arena",data,};
export default definition;
