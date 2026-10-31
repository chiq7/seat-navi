import styles from "./SearchContentGuides.module.css";

export default function VenueSeatReadingGuide({ venueId }: { venueId: string }) {
  const extra = {
    "belluna-dome": { title: "ベルーナドームの座席表・チケットの読み方", body: "チケットの1塁側・3塁側、内野・外野などの表記を確認し、同じエリアから列と番号を探します。ライブのアリーナ席と常設スタンドは別の配置です。", note: "入場ゲートだけでステージからの距離や見え方を決めず、チケットと公演主催者の案内を照合してください。" },
    "osaka-jo-hall": { title: "大阪城ホールの座席表・ブロックと列の見方", body: "スタンドのブロック名・列・番号を組み合わせて席を探します。アリーナ席はステージや花道の設営により、公演ごとにブロックと列が変わります。", note: "常設スタンドで同じ席でも、ステージ方向や機材によって見え方が変わります。別公演の写真を今回の見え方と断定しないでください。" },
    "makuhari-messe": { title: "幕張メッセはホール名から確認", body: "チケットに記載された国際展示場のホール番号と、幕張イベントホールを区別して確認してください。展示場の客席・ブロック・ステージは公演ごとの設営で変わります。", note: "会場の位置・設備案内と、その公演の座席表は別です。座席番号や整理番号の使い方は主催者の案内を優先してください。" },
  }[venueId as "belluna-dome" | "osaka-jo-hall" | "makuhari-messe"];
  if (extra) return <div className="zr-container"><section className={styles.section} aria-labelledby="seat-reading-title"><h2 id="seat-reading-title">{extra.title}</h2><p>{extra.body}</p><p>{extra.note}</p><div className={styles.links}><a className={`${styles.action} zr-focus`} href="#venue-seat-guide">座席表・会場ガイドを見る ↓</a><a className={`${styles.link} zr-focus`} href="#upcoming-events-title">公演・アーティストを選ぶ ↓</a></div></section></div>;
  if (venueId !== "k-arena" && venueId !== "toki-messe") return null;
  const kArena = venueId === "k-arena";
  return <div className="zr-container"><section className={styles.section} aria-labelledby="seat-reading-title">
    <h2 id="seat-reading-title">{kArena ? "Kアリーナ横浜の座席表・列番号の見方" : "朱鷺メッセの座席表は公演ごとに変わります"}</h2>
    {kArena ? <><p>チケットに書かれたLEVEL・列・席番号を使って探します。常設スタンドのLEVEL3・5・7と、公演ごとに変わるLEVEL1のアリーナ配置を分けて確認できます。</p>
      <ol className={styles.steps}><li>LEVELは施設の階数です。券面のLEVELに合わせて、座席表の席種を選びます。</li><li>「列」欄に列番号、「番号・区画」欄に席番号を入力して「場所を見る」を押します。</li><li>ブロックがわからなくても、確認済みの列・番号で検索できます。候補が複数出たらチケットの位置情報と照合してください。</li></ol>
      <p>アリーナのブロック・列・ステージ位置は主催者の公演別案内で確認してください。メインエントランスはLEVEL3です。</p>
    </> : <><p>ライブのアリーナ・スタンド・ステージ配置や列番号は、催事ごとの設営で変わります。チケットにある部屋名と、公演主催者が出した座席図を先に確認してください。</p>
      <ol className={styles.steps}><li>展示ホールは1FのA・B、メインホール（スノーホール）は会議場2Fの別室です。</li><li>下の「展示ホール」「メインホール」で部屋を選ぶと、部屋の位置と設備の案内を切り替えられます。</li><li>公演の座席番号は、その公演の図と照合します。サンプル配置の番号を恒久的な客席番号として使わないでください。</li></ol>
      <p>このガイドでは部屋・トイレ・ロッカー・アクセスを探せます。主催者の図は、このページ下の公演情報から開催日を選んで確認してください。</p>
    </>}
    <div className={styles.links}><a className={`${styles.action} zr-focus`} href="#venue-seat-guide">{kArena ? "列・番号で座席を探す ↓" : "部屋と会場の位置を見る ↓"}</a><a className={`${styles.link} zr-focus`} href="#upcoming-events-title">公演を選ぶ ↓</a></div>
  </section></div>;
}
