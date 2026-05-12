-- events テーブルに lottery_types カラムを追加
-- 公演単位で使用する抽選枠を管理する（デフォルト: 全種別）
alter table events
  add column if not exists lottery_types text[]
    not null
    default array['fc1','fc2','general','upgrade','revival','production'];
