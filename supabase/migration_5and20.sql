-- =========================================================
-- MEBI-Connect: 5問版/20問版 対応マイグレーション
-- 前提: answer_pattern は現在 A/B の2値、20文字固定
-- 変更方針: 未回答部分を 'C' で埋める。カラムの型・長さは変更不要。
--
-- 適用方法: Supabase の SQL Editor に貼り付けて上から順に実行してください。
-- 現行の get_top_matches / count_exact_matches / upsert_participant は
-- 「p_question_set を取る方」のオーバーロードのみが app/page.tsx から
-- 使われています(引数なしの古いオーバーロードは触っていません)。
-- =========================================================

-- -----------------------------------------------------
-- 1. answer_pattern に C を許可する
--    既存のCHECK制約名が participants_answer_pattern_check と異なる場合は
--    先に \d participants (psql) か Table Editor > participants > Constraints
--    で正しい制約名を確認し、DROP CONSTRAINT の行を書き換えてください。
-- -----------------------------------------------------
ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_answer_pattern_check;

ALTER TABLE participants
  ADD CONSTRAINT participants_answer_pattern_check
  CHECK (answer_pattern ~ '^[ABC]{20}$');


-- -----------------------------------------------------
-- 2. 「20問フル回答済みか」を示すカラムを追加
--    既存レコードは全てA/Bのみ(フル回答)なので、デフォルトtrueで問題なし。
-- -----------------------------------------------------
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS is_full_complete boolean NOT NULL DEFAULT true;


-- -----------------------------------------------------
-- 3. 先頭5文字だけを比較する新規関数
--    (フロント側 app/page.tsx の count_first_five_matches 呼び出しと対応)
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS count_first_five_matches(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.count_first_five_matches(
  p_pattern5 text,
  p_exclude_id uuid,
  p_question_set integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select count(*)::int
  from participants
  where question_set = p_question_set
    and id <> p_exclude_id
    and left(answer_pattern, 5) = p_pattern5;
$function$;


-- -----------------------------------------------------
-- 4. count_exact_matches / get_top_matches:
--    5問止まり(is_full_complete = false)の人を、
--    20問フル回答どうしのマッチングから除外する。
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS count_exact_matches(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.count_exact_matches(
  p_answer_pattern text,
  p_exclude_id uuid,
  p_question_set integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select count(*)::int
  from participants
  where answer_pattern = p_answer_pattern
    and id <> p_exclude_id
    and question_set = p_question_set
    and is_full_complete = true;
$function$;


DROP FUNCTION IF EXISTS get_top_matches(text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_top_matches(
  p_answer_pattern text,
  p_exclude_id uuid,
  p_question_set integer,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(id uuid, nickname text, twitter_url text, instagram_url text, comment text, match_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select id, nickname, twitter_url, instagram_url, comment, match_count
  from (
    select
      p.id,
      p.nickname,
      p.twitter_url,
      p.instagram_url,
      p.comment,
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


-- -----------------------------------------------------
-- 5. upsert_participant:
--    a) is_full_complete を answer_pattern から自動判定して保存する
--    b) 「5問止まりのレコード → フル回答への継続」だけは
--       EDIT_LIMIT_REACHED の対象から外す
--
--    現行の実装は update_count カラムこそ持っているものの、実際の
--    回数制限チェックは「既存レコードがあれば管理者以外は問答無用で拒否」
--    という単純なものでした(5回まで、ではなく実質1回のみ)。
--    そのため何も対応しないと、5問版で作ったレコードに20問継続で
--    上書きしようとした瞬間に EDIT_LIMIT_REACHED で弾かれてしまいます。
--    ここでは「5問止まり→フル回答」というパターンのときだけ、
--    その1回の上書きを例外的に許可します(回数制限ロジック自体の
--    仕様変更は行っていません)。
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS upsert_participant(uuid, text, text, text, text, integer, text, boolean);

CREATE OR REPLACE FUNCTION public.upsert_participant(
  p_id uuid,
  p_nickname text,
  p_twitter_url text,
  p_instagram_url text,
  p_answer_pattern text,
  p_question_set integer,
  p_comment text DEFAULT NULL::text,
  p_is_admin boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  existing_pattern text;
  already_exists boolean;
  is_five_to_twenty_upgrade boolean;
  v_is_full_complete boolean;
begin
  select answer_pattern into existing_pattern
  from participants
  where id = p_id;

  already_exists := existing_pattern is not null;

  -- 既存が5問止まり(Cを含む)で、今回の提出がフル回答(Cなし)の場合だけ、
  -- 通常の編集ロックを素通りさせる
  is_five_to_twenty_upgrade :=
    already_exists
    and existing_pattern ~ 'C'
    and p_answer_pattern !~ 'C';

  if already_exists and not p_is_admin and not is_five_to_twenty_upgrade then
    raise exception 'EDIT_LIMIT_REACHED';
  end if;

  v_is_full_complete := (p_answer_pattern !~ 'C');

  insert into participants (
    id, nickname, twitter_url, instagram_url, answer_pattern,
    question_set, comment, update_count, is_full_complete
  )
  values (
    p_id, p_nickname, p_twitter_url, p_instagram_url, p_answer_pattern,
    p_question_set, p_comment, 1, v_is_full_complete
  )
  on conflict (id) do update
    set nickname = excluded.nickname,
        twitter_url = excluded.twitter_url,
        instagram_url = excluded.instagram_url,
        answer_pattern = excluded.answer_pattern,
        question_set = excluded.question_set,
        comment = excluded.comment,
        update_count = participants.update_count + 1,
        is_full_complete = excluded.is_full_complete;
end;
$function$;


-- -----------------------------------------------------
-- 6. count_total_participants は変更不要
--    5問止まりのレコードも含めて全件カウントする、という要件は
--    既存の実装(全件COUNT)のままで満たせるはずです。
--    is_full_completeの条件が入っていないことだけ確認してください。
-- -----------------------------------------------------
