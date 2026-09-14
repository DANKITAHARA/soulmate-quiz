-- =========================================================
-- MEBI-Connect: SNS連携・コメント削除機能 用マイグレーション
--
-- 目的: 再訪者が結果画面から、自分が登録した Twitter/Instagram の
-- ユーザー名とひとことコメントだけを削除できるようにする(回答パターン・
-- ニックネーム自体は残す)。プライバシー配慮のための機能で、
-- upsert_participant の編集回数制限(EDIT_LIMIT_REACHED)とは
-- 無関係に、常に実行できるようにする。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて実行してください。
-- =========================================================

DROP FUNCTION IF EXISTS clear_participant_contact_info(uuid);

CREATE OR REPLACE FUNCTION public.clear_participant_contact_info(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  update participants
  set twitter_url = null,
      instagram_url = null,
      comment = null
  where id = p_id;
$function$;
