-- 027: events.artist_slug を先行追加（全アーティスト公演データ投入前の下準備）
-- nullable のまま。NOT NULL化・FK制約は今回追加しない。
-- 未登録アーティスト（TOP4等）は NULL のまま残す。TOP4の重複整理はこの migration では行わない。

-- -------------------------------------------------------
-- 1. カラム追加 + インデックス
-- -------------------------------------------------------
ALTER TABLE events ADD COLUMN IF NOT EXISTS artist_slug text;
CREATE INDEX IF NOT EXISTS idx_events_artist_slug ON events (artist_slug);

-- -------------------------------------------------------
-- 2. 既存9組のバックフィル（artist_slug IS NULL のものだけ更新）
--    ARTISTS (src/lib/artists.ts) の keywords と対応させたタイトル部分一致。
-- -------------------------------------------------------

-- nogizaka46
UPDATE events SET artist_slug = 'nogizaka46'
WHERE artist_slug IS NULL AND (
  title ILIKE '%乃木坂46%' OR title ILIKE '%乃木坂%' OR title ILIKE '%Nogizaka46%' OR title ILIKE '%Nogizaka%'
);

-- sakurazaka46
UPDATE events SET artist_slug = 'sakurazaka46'
WHERE artist_slug IS NULL AND (
  title ILIKE '%櫻坂46%' OR title ILIKE '%櫻坂%' OR title ILIKE '%Sakurazaka46%' OR title ILIKE '%Sakurazaka%'
);

-- niziu
UPDATE events SET artist_slug = 'niziu'
WHERE artist_slug IS NULL AND (
  title ILIKE '%NiziU%' OR title ILIKE '%ニジュー%'
);

-- hinatazaka46
UPDATE events SET artist_slug = 'hinatazaka46'
WHERE artist_slug IS NULL AND (
  title ILIKE '%日向坂46%' OR title ILIKE '%日向坂%' OR title ILIKE '%Hinatazaka46%' OR title ILIKE '%Hinatazaka%'
);

-- snow-man
UPDATE events SET artist_slug = 'snow-man'
WHERE artist_slug IS NULL AND (
  title ILIKE '%Snow Man%' OR title ILIKE '%SnowMan%' OR title ILIKE '%スノーマン%'
);

-- stray-kids
UPDATE events SET artist_slug = 'stray-kids'
WHERE artist_slug IS NULL AND (
  title ILIKE '%Stray Kids%' OR title ILIKE '%StrayKids%' OR title ILIKE '%スキズ%'
);

-- seventeen
UPDATE events SET artist_slug = 'seventeen'
WHERE artist_slug IS NULL AND (
  title ILIKE '%SEVENTEEN%' OR title ILIKE '%セブチ%'
);

-- sixtones
UPDATE events SET artist_slug = 'sixtones'
WHERE artist_slug IS NULL AND (
  title ILIKE '%SixTONES%' OR title ILIKE '%ストーンズ%'
);

-- equal-love
UPDATE events SET artist_slug = 'equal-love'
WHERE artist_slug IS NULL AND (
  title ILIKE '%＝LOVE%' OR title ILIKE '%=LOVE%' OR title ILIKE '%イコールラブ%' OR title ILIKE '%イコラブ%'
);

-- fruits-zipper
UPDATE events SET artist_slug = 'fruits-zipper'
WHERE artist_slug IS NULL AND (
  title ILIKE '%FRUITS ZIPPER%' OR title ILIKE '%ふるっぱー%' OR title ILIKE '%フルーツジッパー%'
);
