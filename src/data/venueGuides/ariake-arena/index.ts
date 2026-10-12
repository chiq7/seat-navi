import evidence from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
export const ariakeArenaGuide: DedicatedVenueGuide = { venueId:"ariake-arena",name:"有明アリーナ",seatTypes:["2F","3F","4F・5F席"],
  seatNote:"A〜Hの常設席を案内。可動席・1Fアリーナは公演ごとの配置です。",diagramNote:"各階の設備と場外・入場前の荷物を探せます。",
  seats:seats.blocks.map(b=>({id:b.id,label:b.label,type:b.level==="4F"?"4F・5F席":b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:b.zone}))})),sourceIds:b.sourceIds})),
  facilities:evidence.facilities as GuideFacility[],diagrams:evidence.diagrams as GuideDiagram[],routes:[],
  sources:[...evidence.sources,{id:"ariake-riyoannai",title:"公式利用案内・常設席",url:"https://ariake-arena.tokyo/wp-content/themes/ariake-arena/assets/images/page/riyoannai.pdf",checkedAt:"2026-10-06",scope:"PDF9/12/13ページのA〜Hの配置・通路を照合。可動席を分離。",usage:"facts-only"},{id:"ariake-tubc-numbered",title:"東京ユナイテッドBC 座席番号付き公式図",url:"https://tubc.tokyo/files/user/images/lp/ariake_arena_all_seat.pdf",checkedAt:"2026-10-06",scope:"現在の公式チケットページがリンクする2023-24図。常設席の印字列・番号・通路を事実抽出。試合用アリーナ・可動席・車いす代替配置は除外。",usage:"facts-only"}] as GuideSource[],
  unverified:["公演別アリーナ・可動席、車いす/随行者の代替配置、現行公演の使用席・個別椅子の実測位置は対象外。", "主催者図と会場資料のG区画の集計数は一致しないため総座席数・販売可能席数を断定しない。検索は印字済みの参考区間。", "F/Hの4F・5F合併座席図から個別席の設備階を推定せず、現在の設備条件を保持する。独立5F設備階は作らない。", "161設備記号を保持。付帯設備を追加のトイレ室数へ数えず、親室を推定しない。", "国際展示場/東雲・有明ガーデンの個別ロッカー入口、有人預かり候補の現行個別予約条件、連続した段差なし動線、現在の公演の利用可否、公開利用条件、最終目視/実機操作調整は未完。"],
  rights:{url:"https://ariake-arena.tokyo/",checkedAt:"2026-10-05",status:"publish-use-unconfirmed",note:"原画像・ロゴは調査用のみ。独立した部分略図と事実案内をローカルで確認。公開利用条件は未確認。"} };
