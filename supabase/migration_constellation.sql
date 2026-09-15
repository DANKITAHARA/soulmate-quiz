-- =========================================================
-- MEBI-Connect: 星座生成・発見演出・命名フロー 用マイグレーション
--
-- 前提: migration_5and20.sql が適用済みであること
-- (is_full_complete カラムに依存する)。
--
-- 星座名はニックネーム入力欄を廃止して既存の nickname カラムに
-- そのまま保存するため、新しいカラムの追加は不要。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて実行してください。
-- =========================================================

DROP FUNCTION IF EXISTS get_exact_match_nicknames(text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_exact_match_nicknames(
  p_answer_pattern text,
  p_exclude_id uuid,
  p_question_set integer,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(nickname text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select nickname
  from participants
  where question_set = p_question_set
    and id <> p_exclude_id
    and answer_pattern = p_answer_pattern
    and is_full_complete = true
  limit p_limit;
$function$;
