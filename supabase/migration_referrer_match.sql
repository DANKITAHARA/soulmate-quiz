-- =========================================================
-- MEBI-Connect: 紹介リンク経由の一致度表示 用マイグレーション
--
-- 背景: 結果画面のシェアボタンで作ったリンク(?ref=紹介者のID)経由で
-- サイトに来て診断を終えた人に、「リンクをくれた人」とだけの一致数を
-- 見せられるようにする。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて実行してください。
-- =========================================================

DROP FUNCTION IF EXISTS get_referrer_match(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.get_referrer_match(
  p_answer_pattern text,
  p_referrer_id uuid,
  p_question_set integer
)
RETURNS TABLE(nickname text, match_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select
    p.nickname,
    (
      select count(*)::int
      from generate_series(1, length(p_answer_pattern)) as i
      where substr(p.answer_pattern, i, 1) = substr(p_answer_pattern, i, 1)
    ) as match_count
  from participants p
  where p.id = p_referrer_id
    and p.question_set = p_question_set
    and p.is_full_complete = true;
$function$;
