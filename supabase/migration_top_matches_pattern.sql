-- =========================================================
-- MEBI-Connect: 「あなたに最も近い3人」に、その人の星座も表示する
-- 用マイグレーション
--
-- get_top_matches の返り値に answer_pattern を追加する
-- (フロント側でその人の回答パターンから星座を再構築して表示するため)。
-- 引数は変更していない。返り値の列が増えるため、運用ルール通り
-- DROP FUNCTION → CREATE OR REPLACE の順で再定義する。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて実行してください。
-- =========================================================

DROP FUNCTION IF EXISTS get_top_matches(text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_top_matches(
  p_answer_pattern text,
  p_exclude_id uuid,
  p_question_set integer,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  id uuid,
  nickname text,
  twitter_url text,
  instagram_url text,
  comment text,
  match_count integer,
  answer_pattern text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select id, nickname, twitter_url, instagram_url, comment, match_count, answer_pattern
  from (
    select
      p.id,
      p.nickname,
      p.twitter_url,
      p.instagram_url,
      p.comment,
      p.answer_pattern,
      (
        select count(*)::int
        from generate_series(1, length(p_answer_pattern)) as i
        where substr(p.answer_pattern, i, 1) = substr(p_answer_pattern, i, 1)
      ) as match_count
    from participants p
    where p.id <> p_exclude_id
      and p.question_set = p_question_set
      and p.is_full_complete = true
  ) scored
  order by match_count desc
  limit p_limit;
$function$;
