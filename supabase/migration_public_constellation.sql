-- =========================================================
-- MEBI-Connect: 共有カード(/share/[id])用マイグレーション
--
-- 共有リンクを踏んだ人・SNSのリンクカードを生成するボットが、
-- 認証なしで「その人の星座」を再構築できるよう、
-- 最低限の情報(nickname・answer_pattern)だけを公開で取得できる
-- RPCを用意する。twitter_url・instagram_url・commentは含めない。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて実行してください。
-- =========================================================

DROP FUNCTION IF EXISTS get_public_constellation(uuid);

CREATE OR REPLACE FUNCTION public.get_public_constellation(p_id uuid)
RETURNS TABLE(nickname text, answer_pattern text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select nickname, answer_pattern
  from participants
  where id = p_id
    and is_full_complete = true;
$function$;
