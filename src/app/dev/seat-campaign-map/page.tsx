import { notFound } from "next/navigation";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import type { ArenaMapReport } from "@/lib/arena-map/arenaMapTypes";
export const metadata={title:"座席情報のみの色・未公開テスト",robots:{index:false,follow:false}};
export default function Page(){
  if(process.env.NODE_ENV!=="development")notFound();
  const points:ArenaMapReport[]=[{block:"A1",row_num:1,seat_num:1,lottery_type:null,fc_history:null,payment_method:null,sourceKind:"seat_only"},
    {block:"A1",row_num:20,seat_num:11,lottery_type:null,fc_history:null,payment_method:null,sourceKind:"seat_only"}];
  return <main className="mx-auto max-w-4xl p-4"><h1 className="text-xl font-bold">未公開の表示テスト・架空の報告2点</h1>
    <p>実公演の座席・配置を示すものではありません。抽選順・FC歴・支払い・アプグレに切り替えても、この2点は「座席情報のみ」の青緑です。</p>
    <ArenaReportMap eventId="synthetic-campaign-colors" reports={[]} seatOnlyReports={points} hideShareSection explorePreview seatDetailPreview initialSeatPreview={{block:"A1",row:1,seat:1}} />
  </main>;
}
