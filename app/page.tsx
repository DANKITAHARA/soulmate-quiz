"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Camera, MessageCircle, RotateCcw, Trash2, User } from "lucide-react";
import { QUESTIONS, QUESTION_SET_NUMBER, QUESTION_SET_EFFECTIVE_DATE } from "./questions";
import { supabase } from "./lib/supabaseClient";
import { SUBJECTS } from "./subjects";

type Star = {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
};

type MatchResult = {
  id: string;
  nickname: string;
  twitter_url: string | null;
  instagram_url: string | null;
  comment: string | null;
  matchCount: number;
};

// ---- デザイントークン ----------------------------------------------------
const colors = {
  bgBase: "#0D0F26",
  bgBaseSoft: "#10132E",
  card: "#171B3F",
  cardBorder: "rgba(236,234,246,0.10)",
  gold: "#E7B750",
  goldSoft: "rgba(231,183,80,0.16)",
  rose: "#D8697A",
  textPrimary: "#ECEAF6",
  textMuted: "#9C9FC4",
  silver: "#B9BEDC",
  bronze: "#C98A5A",
};

// ---- 「夜更け」演出用のヘルパー ---------------------------------------
// 質問が進むにつれて、昼→夕焼け→真夜中と背景色が変化していく
const DAY_BG = "#F3E6C8"; // 昼:クリーム色
const SUNSET_BG = "#D8794A"; // 夕焼け:燃えるようなオレンジ
const NIGHT_BG = "#04050F"; // 真夜中:ほぼ黒に近い紺

const DAY_BG_SOFT = "#FBF3DE"; // 昼の中心ハイライト(やや白寄りのクリーム)
const SUNSET_BG_SOFT = "#F0A06C"; // 夕焼けの中心ハイライト
// 真夜中の中心ハイライトは、既存の colors.bgBaseSoft をそのまま使う

const DAY_INK = "#2B1E12"; // 昼の間、背景の上に直接乗る文字の色(濃い茶色)
const DAY_INK_MUTED = "#6B5640"; // 昼の間の、控えめな文字色

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpColor(fromHex: string, toHex: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// 前半で fromHex→midHex、後半で midHex→toHex と2区間に分けて補間する
// (昼→夕焼け→真夜中、のような3色のグラデーションに使う)
function lerpTriColor(fromHex: string, midHex: string, toHex: string, t: number): string {
  if (t <= 0.5) return lerpColor(fromHex, midHex, t * 2);
  return lerpColor(midHex, toHex, (t - 0.5) * 2);
}

// 序盤はほぼ変化を感じさせず、終盤にかけて加速度的に暗くするカーブ
function easeInNight(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * clamped;
}

// 序盤はすばやく、終盤にかけて変化が緩やかになる(減速する)カーブ
function easeOutNight(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes miracleGlow {
  0%, 100% {
    text-shadow: 0 0 16px rgba(231,183,80,0.5), 0 0 32px rgba(231,183,80,0.25);
  }
  50% {
    text-shadow: 0 0 28px rgba(231,183,80,0.9), 0 0 56px rgba(231,183,80,0.5);
  }
}

@keyframes miracleBadgeIn {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  60% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes miracleRingPulse {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@keyframes miracleSparkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes bigStarPop {
  0% {
    transform: scale(0) rotate(-15deg);
    opacity: 0;
  }
  55% {
    transform: scale(1.25) rotate(18deg);
    opacity: 1;
  }
  75% {
    transform: scale(0.92) rotate(8deg);
  }
  100% {
    transform: scale(1.05) rotate(12deg);
    opacity: 0.95;
  }
}

@keyframes flareShineAndVanish {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  12% {
    transform: scale(1.3);
    opacity: 1;
  }
  30% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

@keyframes flareRotateOnly {
  from {
    transform: rotate(-20deg);
  }
  to {
    transform: rotate(280deg);
  }
}

@keyframes raysSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;

// ---- 参加者データはSupabaseから取得します(ダミーデータは廃止) ----

const RANK_STYLE = [
  { label: "1位", ring: colors.gold, glow: "0 0 0 3px rgba(231,183,80,0.35)" },
  { label: "2位", ring: colors.silver, glow: "0 0 0 3px rgba(185,190,220,0.25)" },
  { label: "3位", ring: colors.bronze, glow: "0 0 0 3px rgba(201,138,90,0.25)" },
];

// ---- 星の背景(質問が進むほど星が増えていく) -----------------------------
const STARFIELD_MAX = 65;
const STARFIELD_BASE = 40;

function Starfield({
  targetCount = STARFIELD_BASE,
  dimOpacity = 1,
}: {
  targetCount?: number;
  dimOpacity?: number;
}) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // 表示数が変わっても位置がガタつかないよう、最大数のプールを最初に一度だけ作る
    setStars(
      Array.from({ length: STARFIELD_MAX }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        opacity: Math.random() * 0.5 + 0.15,
      }))
    );
  }, []);

  const visibleStars = stars.slice(0, Math.round(targetCount));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: dimOpacity,
        transition: "opacity 0.6s ease",
      }}
    >
      {visibleStars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: colors.textPrimary,
            opacity: s.opacity,
            transition: "opacity 1.2s ease",
          }}
        />
      ))}
    </div>
  );
}

// ---- 進捗を星座の線で見せるインジケーター ---------------------------------
function ConstellationProgress({
  total,
  current,
  tone = colors.textPrimary,
}: {
  total: number;
  current: number;
  tone?: string;
}) {
  const [tr, tg, tb] = hexToRgb(tone);
  const inactiveDot = `rgba(${tr},${tg},${tb},0.28)`;
  const inactiveLine = `rgba(${tr},${tg},${tb},0.22)`;
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < total - 1 ? "1 1 auto" : "0 0 auto",
            }}
          >
            <div
              style={{
                width: active ? 10 : 7,
                height: active ? 10 : 7,
                borderRadius: "50%",
                background: done || active ? colors.gold : inactiveDot,
                boxShadow: active ? `0 0 8px ${colors.gold}` : "none",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }}
            />
            {i < total - 1 && (
              <div
                style={{
                  flex: 1,
                  minWidth: 4,
                  height: 1,
                  margin: "0 2px",
                  background: done ? colors.gold : inactiveLine,
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- カウントアップする希少性の数字 ---------------------------------------
// ---- 日付を「2026年9月12日」のような表記に整形 ---------------------------
function formatJapaneseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${year}年${month}月${day}日`;
}

function RarityNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString("ja-JP")}</span>
  );
}

const STORAGE_KEY = "soulmate_2to20th_participant";
const ADMIN_STORAGE_KEY = "soulmate_2to20th_admin";
// あなた専用の合言葉です。他の人に教えないでください。変更したい場合はこの文字列を書き換えてください。
const ADMIN_SECRET = "3bqjhwpw6xibwcsg";

type SavedParticipant = {
  id: string;
  nickname: string;
  answerPattern: string;
  questionSet: number;
};

// ---- メインコンポーネント --------------------------------------------------
export default function ConstellationMatchPrototype() {
  const [stage, setStage] = useState<
    "intro" | "quiz" | "register" | "register-five" | "referrer-result" | "result" | "result-five"
  >("intro");
  const [quizMode, setQuizMode] = useState<"five" | "twenty">("twenty");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [exactMatchCount, setExactMatchCount] = useState(0);
  const [firstFiveMatchCount, setFirstFiveMatchCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const [nickname, setNickname] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [topMatches, setTopMatches] = useState<MatchResult[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedParticipant | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot対策:人間には見えない入力欄
  const registerEnteredAt = useRef<number | null>(null); // Bot対策:登録画面に入った時刻
  const [isAdmin, setIsAdmin] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // 背景の昼夜判定(saved)が確定するまでは、切り替わりをアニメーションさせない
  const [bgTransitionReady, setBgTransitionReady] = useState(false);
  // SNS連携・コメントの削除(プライバシー対応)
  const [contactClearStatus, setContactClearStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  // 結果画面からのシェア(Instagramはクリップボードにコピーする方式)
  const [instagramCopyStatus, setInstagramCopyStatus] = useState<"idle" | "done" | "error">("idle");
  // 紹介リンク(?ref=紹介者のID)経由で来た場合、その人との一致度を結果画面に表示する
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerMatch, setReferrerMatch] = useState<{ nickname: string; matchCount: number } | null>(null);

  const pickRandomSubject = () => {
    setSubject(SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]);
  };

  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
    } catch {
      // 取得できなくても通常表示のまま進める
    }
  }, []);

  useEffect(() => {
    pickRandomSubject();

    // 以前回答済みかどうかをブラウザの記録から確認する
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed?.id &&
          parsed?.nickname &&
          parsed?.answerPattern &&
          parsed?.questionSet === QUESTION_SET_NUMBER
        ) {
          setSaved(parsed);
        } else {
          // 質問セットが更新されている場合、古い記録は破棄する
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // 読み込みに失敗しても致命的ではないので無視する
    }

    // 管理者判定:URLに ?admin=合言葉 が付いていれば記録する。以後は記録だけで判定する。
    try {
      const params = new URLSearchParams(window.location.search);
      const key = params.get("admin");
      if (key === ADMIN_SECRET) {
        localStorage.setItem(ADMIN_STORAGE_KEY, "1");
      }
      setIsAdmin(localStorage.getItem(ADMIN_STORAGE_KEY) === "1");
    } catch {
      // 失敗しても通常利用には影響しない
    }

    // 紹介リンク判定:URLに ?ref=紹介者のID が付いていれば記録する
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferrerId(ref);
      }
    } catch {
      // 失敗しても通常利用には影響しない
    }

    // 再訪判定(saved)の初回反映を1フレーム後ろにずらし、
    // 「昼→夜」のアニメーションを挟まず即座に正しい配色で最初の1枚を描画する
    const id = requestAnimationFrame(() => setBgTransitionReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 保存済みの回答をもとに、結果画面を直接表示する
  const viewSavedResult = async () => {
    if (!saved) return;
    setLoadingSaved(true);

    // 5問止まりの記録(6〜20問目がCで埋まっている)かどうかで表示を分岐する
    if (saved.answerPattern.includes("C")) {
      const pattern5 = saved.answerPattern.slice(0, 5);

      const { data: firstFiveCount } = await supabase.rpc("count_first_five_matches", {
        p_pattern5: pattern5,
        p_exclude_id: saved.id,
        p_question_set: saved.questionSet,
      });

      const { data: totalCount } = await supabase.rpc("count_total_participants", {
        p_question_set: saved.questionSet,
      });

      setNickname(saved.nickname);
      setFirstFiveMatchCount(typeof firstFiveCount === "number" ? firstFiveCount : 0);
      setTotalParticipants(typeof totalCount === "number" ? totalCount : 0);
      setLoadingSaved(false);
      setStage("result-five");
      return;
    }

    const { data: matches } = await supabase.rpc("get_top_matches", {
      p_answer_pattern: saved.answerPattern,
      p_exclude_id: saved.id,
      p_question_set: saved.questionSet,
      p_limit: 3,
    });

    const { data: exactCount } = await supabase.rpc("count_exact_matches", {
      p_answer_pattern: saved.answerPattern,
      p_exclude_id: saved.id,
      p_question_set: saved.questionSet,
    });

    const { data: totalCount } = await supabase.rpc("count_total_participants", {
      p_question_set: saved.questionSet,
    });

    const scored: MatchResult[] = (matches || [])
      .map(
        (m: {
          id: string;
          nickname: string;
          twitter_url: string | null;
          instagram_url: string | null;
          comment: string | null;
          match_count: number;
        }) => ({
          id: m.id,
          nickname: m.nickname,
          twitter_url: m.twitter_url,
          instagram_url: m.instagram_url,
          comment: m.comment,
          matchCount: m.match_count,
        })
      )
      .filter((m: MatchResult) => m.matchCount >= 10);

    setNickname(saved.nickname);
    setTopMatches(scored);
    setExactMatchCount(typeof exactCount === "number" ? exactCount : 0);
    setTotalParticipants(typeof totalCount === "number" ? totalCount : 0);
    setLoadingSaved(false);
    setStage("result");
  };

  const restart = () => {
    setStage("intro");
    setQuizMode("twenty");
    setQIndex(0);
    setAnswers([]);
    setNickname("");
    setTwitterHandle("");
    setInstagramHandle("");
    setComment("");
    setFormError("");
    setTopMatches([]);
    setExactMatchCount(0);
    setFirstFiveMatchCount(0);
    setTotalParticipants(0);
    setReferrerMatch(null);
    pickRandomSubject();
  };

  // プライバシー対応:保存済みのSNS連携・コメントだけを削除する(回答パターン自体は残る)
  const clearSnsAndComment = async () => {
    if (!saved) return;
    const confirmed = window.confirm(
      "Twitter/Instagramのユーザー名と、ひとことコメントを削除します。この操作は取り消せません。よろしいですか?"
    );
    if (!confirmed) return;

    setContactClearStatus("pending");
    const { error } = await supabase.rpc("clear_participant_contact_info", {
      p_id: saved.id,
    });

    if (error) {
      setContactClearStatus("error");
      return;
    }

    setTwitterHandle("");
    setInstagramHandle("");
    setComment("");
    setContactClearStatus("done");
  };

  // 結果画面のシェア用テキストを組み立てる
  const buildShareText = () => {
    const headline =
      exactMatchCount >= 1
        ? `${totalParticipants}人中、私と全く同じ回答をした人が【${exactMatchCount}人】いました。`
        : `${totalParticipants}人中、私と全く同じ回答をした人は一人もいませんでした。`;
    return `${headline}\n\nあなたもMEBI-Connectで自分を探してみよう`;
  };

  // 自分のIDを ?ref= に載せたリンク。ここから来た友達が診断を終えると、
  // 自分との一致度を相手の結果画面に表示できる
  const buildShareUrl = () => {
    const base = window.location.origin;
    return saved?.id ? `${base}/?ref=${saved.id}` : base;
  };

  const shareToX = () => {
    const text = buildShareText();
    const url = buildShareUrl();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToLine = () => {
    const text = `${buildShareText()}\n${buildShareUrl()}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  // Instagramには任意テキストをそのまま共有できるWeb Intentが存在しないため、
  // 共有文をクリップボードにコピーしたうえでInstagramを開く(貼り付けはユーザー操作)
  const shareToInstagram = async () => {
    const text = `${buildShareText()}\n${buildShareUrl()}`;
    try {
      await navigator.clipboard.writeText(text);
      setInstagramCopyStatus("done");
    } catch {
      setInstagramCopyStatus("error");
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  // 管理者専用:記録(ID)は保持したまま、質問に答え直してテストできるようにする
  const adminRetakeQuiz = () => {
    setQuizMode("twenty");
    setQIndex(0);
    setAnswers([]);
    setFormError("");
    setStage("quiz");
  };

  // トップページで選んだモードに応じて出題する質問の範囲
  const activeQuestions = quizMode === "five" ? QUESTIONS.slice(0, 5) : QUESTIONS;

  const startQuiz = (mode: "five" | "twenty") => {
    setQuizMode(mode);
    setStage("quiz");
  };

  const choose = (value: string) => {
    const next = [...answers, value];
    setAnswers(next);
    if (qIndex + 1 < activeQuestions.length) {
      setQIndex(qIndex + 1);
    } else {
      registerEnteredAt.current = Date.now();
      setStage(quizMode === "five" ? "register-five" : "register");
    }
  };

  // 5問版の結果画面から、6問目以降に進んで20問版へ継続する
  const continueToTwenty = () => {
    const baseAnswers = saved?.answerPattern
      ? saved.answerPattern.replace(/C+$/, "").split("")
      : answers;
    setQuizMode("twenty");
    setAnswers(baseAnswers);
    setQIndex(baseAnswers.length);
    setFormError("");
    setStage("quiz");
  };

  // 1問前に戻り、その回答を変更できるようにする
  const goToPreviousQuestion = () => {
    if (qIndex === 0) return;
    setAnswers((prev) => prev.slice(0, prev.length - 1));
    setQIndex((i) => i - 1);
  };

  const HANDLE_PATTERN = /^[A-Za-z0-9_.]{1,30}$/;

  const cleanHandle = (raw: string) => raw.trim().replace(/^@/, "");

  const submitRegistration = async () => {
    // Bot対策:見えない欄に何か入力されていたら、機械的な送信とみなして静かに弾く
    if (honeypot.trim()) {
      return;
    }
    // Bot対策:登録画面表示から2秒未満での送信は、機械的な送信とみなして静かに弾く
    if (registerEnteredAt.current && Date.now() - registerEnteredAt.current < 2000) {
      return;
    }

    if (!nickname.trim()) {
      setFormError("ニックネームを入力してください。");
      return;
    }

    const cleanTwitter = cleanHandle(twitterHandle);
    const cleanInstagram = cleanHandle(instagramHandle);

    if (cleanTwitter && !HANDLE_PATTERN.test(cleanTwitter)) {
      setFormError("Twitterのユーザー名は英数字・_(アンダースコア)・.(ピリオド)のみ使えます。");
      return;
    }
    if (cleanInstagram && !HANDLE_PATTERN.test(cleanInstagram)) {
      setFormError("Instagramのユーザー名は英数字・_(アンダースコア)・.(ピリオド)のみ使えます。");
      return;
    }

    setFormError("");
    setSubmitting(true);

    const answerPattern = answers.join("");
    const twitterUrl = cleanTwitter ? `https://twitter.com/${cleanTwitter}` : null;
    const instagramUrl = cleanInstagram ? `https://instagram.com/${cleanInstagram}` : null;
    // 以前回答済みの場合は同じIDを引き継ぎ、上書き保存にする
    const myId = saved?.id ?? crypto.randomUUID();

    // 自分の回答をSupabaseに保存する(同じIDなら上書き)
    const { error: insertError } = await supabase.rpc("upsert_participant", {
      p_id: myId,
      p_nickname: nickname.trim(),
      p_twitter_url: twitterUrl,
      p_instagram_url: instagramUrl,
      p_answer_pattern: answerPattern,
      p_question_set: QUESTION_SET_NUMBER,
      p_comment: comment.trim() || null,
      p_is_admin: isAdmin,
    });

    if (insertError) {
      if (insertError.message?.includes("EDIT_LIMIT_REACHED")) {
        setFormError("編集できる回数の上限(5回)に達しました。これ以上は変更できません。");
      } else {
        setFormError("保存に失敗しました。時間をおいて再度お試しください。");
      }
      setSubmitting(false);
      return;
    }

    // マッチング専用関数を呼び出して、上位3人だけを取得する
    const { data: matches, error: rpcError } = await supabase.rpc("get_top_matches", {
      p_answer_pattern: answerPattern,
      p_exclude_id: myId,
      p_question_set: QUESTION_SET_NUMBER,
      p_limit: 3,
    });

    if (rpcError || !matches) {
      setFormError("結果の取得に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
      return;
    }

    // 完全一致(全問同じ回答)の人数を取得する
    const { data: exactCount } = await supabase.rpc("count_exact_matches", {
      p_answer_pattern: answerPattern,
      p_exclude_id: myId,
      p_question_set: QUESTION_SET_NUMBER,
    });
    setExactMatchCount(typeof exactCount === "number" ? exactCount : 0);

    // 全回答者数を取得する
    const { data: totalCount } = await supabase.rpc("count_total_participants", {
      p_question_set: QUESTION_SET_NUMBER,
    });
    setTotalParticipants(typeof totalCount === "number" ? totalCount : 0);

    // 紹介リンク経由で来ていれば、その紹介者との一致度も取得する
    let foundReferrerMatch = false;
    if (referrerId && referrerId !== myId) {
      const { data: referrerRows } = await supabase.rpc("get_referrer_match", {
        p_answer_pattern: answerPattern,
        p_referrer_id: referrerId,
        p_question_set: QUESTION_SET_NUMBER,
      });
      const referrerRow = Array.isArray(referrerRows) ? referrerRows[0] : null;
      if (referrerRow) {
        setReferrerMatch({ nickname: referrerRow.nickname, matchCount: referrerRow.match_count });
        foundReferrerMatch = true;
      }
    }

    const scored: MatchResult[] = matches
      .map(
        (m: {
          id: string;
          nickname: string;
          twitter_url: string | null;
          instagram_url: string | null;
          comment: string | null;
          match_count: number;
        }) => ({
          id: m.id,
          nickname: m.nickname,
          twitter_url: m.twitter_url,
          instagram_url: m.instagram_url,
          comment: m.comment,
          matchCount: m.match_count,
        })
      )
      // 10問未満の一致は「最も近い3人」として表示しない
      .filter((m: MatchResult) => m.matchCount >= 10);

    // 次回以降、答え直さずに結果を見られるようブラウザに記録しておく
    try {
      const record: SavedParticipant = {
        id: myId,
        nickname: nickname.trim(),
        answerPattern,
        questionSet: QUESTION_SET_NUMBER,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      setSaved(record);
    } catch {
      // 保存に失敗しても結果表示自体は続ける
    }

    setTopMatches(scored);
    setSubmitting(false);
    // 紹介リンク経由で完走した場合は、先に紹介者との一致率だけを見せる画面を挟む
    setStage(foundReferrerMatch ? "referrer-result" : "result");
  };

  // 5問版の登録:ニックネームのみ。6〜20問目はCで埋めて保存する
  const submitRegistrationFive = async () => {
    // Bot対策:見えない欄に何か入力されていたら、機械的な送信とみなして静かに弾く
    if (honeypot.trim()) {
      return;
    }
    // Bot対策:登録画面表示から2秒未満での送信は、機械的な送信とみなして静かに弾く
    if (registerEnteredAt.current && Date.now() - registerEnteredAt.current < 2000) {
      return;
    }

    if (!nickname.trim()) {
      setFormError("ニックネームを入力してください。");
      return;
    }

    setFormError("");
    setSubmitting(true);

    const answerPattern = answers.join("").padEnd(QUESTIONS.length, "C");
    const myId = crypto.randomUUID();

    const { error: insertError } = await supabase.rpc("upsert_participant", {
      p_id: myId,
      p_nickname: nickname.trim(),
      p_twitter_url: null,
      p_instagram_url: null,
      p_answer_pattern: answerPattern,
      p_question_set: QUESTION_SET_NUMBER,
      p_comment: null,
      p_is_admin: isAdmin,
    });

    if (insertError) {
      setFormError("保存に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
      return;
    }

    const { data: firstFiveCount } = await supabase.rpc("count_first_five_matches", {
      p_pattern5: answers.join(""),
      p_exclude_id: myId,
      p_question_set: QUESTION_SET_NUMBER,
    });
    setFirstFiveMatchCount(typeof firstFiveCount === "number" ? firstFiveCount : 0);

    const { data: totalCount } = await supabase.rpc("count_total_participants", {
      p_question_set: QUESTION_SET_NUMBER,
    });
    setTotalParticipants(typeof totalCount === "number" ? totalCount : 0);

    try {
      const record: SavedParticipant = {
        id: myId,
        nickname: nickname.trim(),
        answerPattern,
        questionSet: QUESTION_SET_NUMBER,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      setSaved(record);
    } catch {
      // 保存に失敗しても結果表示自体は続ける
    }

    setSubmitting(false);
    setStage("result-five");
  };

  // 5問版から20問版へ継続中(ニックネームを引き継いで読み取り専用にする)かどうか
  const isContinuationFromFive = quizMode === "twenty" && !!saved && saved.answerPattern.includes("C");

  // 主語の文字数に応じて見出しの文字サイズを調整し、1行に収まりやすくする
  const headlineText = subject ? `${subject}も、` : "";
  const headlineMaxPx = headlineText
    ? Math.max(20, Math.min(34, Math.round(420 / headlineText.length)))
    : 34;

  // ---- ライト/ダークの2択切り替え:タイトル+Q1-5はライト、Q6-20と結果画面はダーク ----
  // ただし、既に回答済み(saved)の再訪ユーザーには、トップ画面から夜空を見せる
  const qNum = qIndex + 1; // 表示上の問題番号(1始まり)
  const isLightMode = (stage === "intro" && !saved) || (stage === "quiz" && qNum <= 5);

  const dynamicFg = isLightMode ? DAY_INK : colors.textPrimary;
  const dynamicMutedFg = isLightMode ? DAY_INK_MUTED : colors.textMuted;

  // 星は、ライトモードの間はほとんど見えないようにする
  const starOpacity = isLightMode ? 0.05 : 1;
  const starTargetCount = STARFIELD_BASE;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        color: colors.textPrimary,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{fontImport}</style>

      {/* ---- 背景レイヤー（ライトモード用とダークモード用を重ねて opacity で 2s かけてフェード） ---- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 0%, ${DAY_BG_SOFT}, ${DAY_BG} 65%)`,
          opacity: isLightMode ? 1 : 0,
          transition: reducedMotion || !bgTransitionReady ? "none" : "opacity 3s ease-in-out",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 0%, ${colors.bgBaseSoft}, ${colors.bgBase} 65%)`,
          opacity: isLightMode ? 0 : 1,
          transition: reducedMotion || !bgTransitionReady ? "none" : "opacity 3s ease-in-out",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Starfield targetCount={starTargetCount} dimOpacity={starOpacity} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 440,
          margin: "0 auto",
          padding: "56px 24px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ---- INTRO ---- */}
        {stage === "intro" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: colors.goldSoft,
                color: colors.gold,
                fontSize: 13,
                marginBottom: 28,
              }}
            >
              <img src="/logo-mark.svg" alt="" style={{ height: 16, width: "auto", objectFit: "contain" }} />
              〈 MEBI-Connect 〉
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: `clamp(18px, 6vw, ${headlineMaxPx}px)`,
                fontWeight: 600,
                lineHeight: 1.4,
                margin: "0 0 16px",
                color: dynamicFg,
                transition: "color 1s linear",
              }}
            >
              <span
                key={subject ?? "fallback"}
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: subject ? "fadeInUp 0.5s ease" : "none",
                }}
              >
                {headlineText}
              </span>
              <br />
              きっとどこかにいる。
            </h1>
            <p
              style={{
                color: dynamicMutedFg,
                fontSize: "clamp(12.5px, 3.8vw, 15px)",
                fontWeight: 400,
                margin: "0 0 40px",
                whiteSpace: "nowrap",
                transition: "color 1s linear",
              }}
            >
              二択に答えて、あなたと似た選択をした人と知りあおう。
            </p>

            {saved ? (
              <div>
                <p style={{ color: dynamicMutedFg, fontSize: 13, margin: "0 0 16px", transition: "color 1s linear" }}>
                  前回、「{saved.nickname}」として回答済みです。
                </p>
                <button
                  onClick={viewSavedResult}
                  disabled={loadingSaved}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 28px",
                    borderRadius: 999,
                    border: "none",
                    background: colors.gold,
                    color: "#1A1200",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: loadingSaved ? "default" : "pointer",
                    opacity: loadingSaved ? 0.6 : 1,
                  }}
                >
                  {loadingSaved ? "読み込み中..." : "前回の結果を見る"} <ArrowRight size={16} />
                </button>
                {isAdmin && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      onClick={adminRetakeQuiz}
                      style={{
                        background: "none",
                        border: "none",
                        color: dynamicMutedFg,
                        fontSize: 12.5,
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                        transition: "color 1s linear",
                      }}
                    >
                      [管理者用] テストのため回答をやり直す
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
                <button
                  onClick={() => startQuiz("five")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "14px 28px",
                    borderRadius: 999,
                    border: "none",
                    background: colors.gold,
                    color: "#1A1200",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  5問でサクッと試す <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => startQuiz("twenty")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 28px",
                    borderRadius: 999,
                    border: `1px solid ${isLightMode ? "rgba(43,30,18,0.25)" : colors.cardBorder}`,
                    background: "transparent",
                    color: dynamicFg,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "color 1s linear, border-color 1s linear",
                  }}
                >
                  20問でじっくり診断する
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- QUIZ ---- */}
        {stage === "quiz" && (
          <div style={{ width: "100%" }}>
            <ConstellationProgress total={activeQuestions.length} current={qIndex} tone={dynamicFg} />
            <p style={{ textAlign: "center", color: dynamicMutedFg, fontSize: 13, margin: "0 0 12px", transition: "color 1s linear" }}>
              Q{qIndex + 1} / {activeQuestions.length}
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 24,
                lineHeight: 1.5,
                textAlign: "center",
                margin: "0 0 36px",
                minHeight: 72,
                color: dynamicFg,
                transition: "color 1s linear",
              }}
            >
              {QUESTIONS[qIndex].text}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["a", "b"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => choose(key.toUpperCase())}
                  style={{
                    padding: "22px 12px",
                    minHeight: 88,
                    borderRadius: 16,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    color: colors.textPrimary,
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "transform 0.12s ease, border-color 0.12s ease",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {QUESTIONS[qIndex][key]}
                </button>
              ))}
            </div>

            {qIndex > 0 && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  onClick={goToPreviousQuestion}
                  style={{
                    background: "none",
                    border: "none",
                    color: dynamicMutedFg,
                    fontSize: 12.5,
                    cursor: "pointer",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    transition: "color 1s linear",
                  }}
                >
                  ← 戻る
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- REGISTER-FIVE(5問版:ニックネームのみ) ---- */}
        {stage === "register-five" && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: colors.goldSoft,
                color: colors.gold,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <User size={14} />
              あと少しで結果を見られます
            </div>
            <h2
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 24,
                lineHeight: 1.5,
                margin: "0 0 8px",
              }}
            >
              ニックネームを入力して結果を見る
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 28px" }}>
              5問だけの簡易診断です。残りの質問に答えるとSNS連携やコメント機能が解放されます。
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              {/* Bot対策:人間には見えない入力欄。人が触ることは通常ない */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                  left: "-9999px",
                }}
              />
              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>ニックネーム</span>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例: あなた"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    color: colors.textPrimary,
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
            </div>

            {formError && (
              <p style={{ color: colors.rose, fontSize: 13, margin: "14px 0 0" }}>{formError}</p>
            )}

            <button
              onClick={submitRegistrationFive}
              disabled={submitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 24,
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: colors.gold,
                color: "#1A1200",
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
                width: "100%",
                justifyContent: "center",
              }}
            >
              {submitting ? "送信中..." : (
                <>結果を見る <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ---- REGISTER ---- */}
        {stage === "register" && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: colors.goldSoft,
                color: colors.gold,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <User size={14} />
              あと少しで結果を見られます
            </div>
            <h2
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 24,
                lineHeight: 1.5,
                margin: "0 0 8px",
              }}
            >
              あなたみたいなユーザーに見せる<br />プロフィールを登録
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 28px" }}>
              ニックネームを入力してください。TwitterやInstagramのユーザー名を入力すると、あなたみたいな相手と実際につながれるようになります。
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              {/* Bot対策:人間には見えない入力欄。人が触ることは通常ない */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                  left: "-9999px",
                }}
              />
              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>ニックネーム</span>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => !isContinuationFromFive && setNickname(e.target.value)}
                  readOnly={isContinuationFromFive}
                  placeholder="例: あなた"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    color: colors.textPrimary,
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                    opacity: isContinuationFromFive ? 0.6 : 1,
                    cursor: isContinuationFromFive ? "not-allowed" : "text",
                  }}
                />
                {isContinuationFromFive && (
                  <span style={{ display: "block", marginTop: 4, fontSize: 11, color: colors.textMuted }}>
                  </span>
                )}
              </label>

              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>
                  Twitterのユーザー名<span style={{ color: colors.gold, fontSize: 11 }}>(任意)</span>
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 12,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    overflow: "hidden",
                  }}
                >
                  <span style={{ padding: "12px 0 12px 14px", color: colors.textMuted, fontSize: 15 }}>@</span>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="username"
                    style={{
                      flex: 1,
                      padding: "12px 14px 12px 4px",
                      border: "none",
                      background: "transparent",
                      color: colors.textPrimary,
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </label>

              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>
                  Instagramのユーザー名<span style={{ color: colors.gold, fontSize: 11 }}>(任意)</span>
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 12,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    overflow: "hidden",
                  }}
                >
                  <span style={{ padding: "12px 0 12px 14px", color: colors.textMuted, fontSize: 15 }}>@</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="username"
                    style={{
                      flex: 1,
                      padding: "12px 14px 12px 4px",
                      border: "none",
                      background: "transparent",
                      color: colors.textPrimary,
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </label>

              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>
                  ひとことコメント<span style={{ color: colors.gold, fontSize: 11 }}>(任意)</span>
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 80))}
                  placeholder="例: 冬でもアイスは食べたいなあ"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.card,
                    color: colors.textPrimary,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
                <span style={{ display: "block", marginTop: 4, textAlign: "right", color: colors.textMuted, fontSize: 11 }}>
                  {comment.length} / 80
                </span>
              </label>
            </div>

            <p
              style={{
                color: colors.textMuted,
                fontSize: 11.5,
                lineHeight: 1.7,
                margin: "16px 0 0",
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(216,105,122,0.08)",
                border: "1px solid rgba(216,105,122,0.2)",
              }}
            >
              本名・住所・電話番号・メールアドレスなど過度な個人情報や誹謗中傷は入力しないでください。
              個人が運営するサービスのため、セキュリティを完全に保証するものではありません。
              詳しくは
              <a href="/privacy" style={{ color: colors.rose, textDecoration: "underline" }}>
                プライバシーについて
              </a>
              ・
              <a href="/terms" style={{ color: colors.rose, textDecoration: "underline" }}>
                利用規約
              </a>
              をご覧ください。
            </p>

            {formError && (
              <p style={{ color: colors.rose, fontSize: 13, margin: "14px 0 0" }}>{formError}</p>
            )}

            <button
              onClick={submitRegistration}
              disabled={submitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 24,
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: colors.gold,
                color: "#1A1200",
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
                width: "100%",
                justifyContent: "center",
              }}
            >
              {submitting ? "送信中..." : (
                <>結果を見る <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ---- REFERRER-RESULT(招待者との一致率だけを見せる中間画面) ---- */}
        {stage === "referrer-result" && referrerMatch && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 8px" }}>
              この診断を教えてくれた
            </p>
            <p style={{ fontSize: 20, fontWeight: 600, margin: "0 0 32px" }}>
              「{referrerMatch.nickname}」さんとの一致率
            </p>

            {(() => {
              const referrerPercent = Math.round((referrerMatch.matchCount / QUESTIONS.length) * 100);
              const isPerfectMatch = referrerPercent >= 100;
              return (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {isPerfectMatch && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: 220,
                            height: 220,
                            marginLeft: -110,
                            marginTop: -110,
                            background: `repeating-conic-gradient(${colors.gold} 0deg 3deg, transparent 3deg 15deg)`,
                            opacity: 0.18,
                            borderRadius: "50%",
                            animation: "raysSpin 15s linear infinite",
                            pointerEvents: "none",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: "-14px",
                            borderRadius: "50%",
                            border: `1.5px solid ${colors.gold}`,
                            animation: "miracleRingPulse 1.8s ease-in-out infinite",
                            pointerEvents: "none",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            top: "28%",
                            left: -26,
                            transform: "translateY(-50%)",
                            fontSize: 14,
                            animation: "miracleSparkle 1.8s ease-in-out infinite",
                            pointerEvents: "none",
                          }}
                        >
                          ✦
                        </span>
                        <span
                          style={{
                            position: "absolute",
                            top: "72%",
                            right: -26,
                            transform: "translateY(-50%)",
                            fontSize: 14,
                            animation: "miracleSparkle 1.8s ease-in-out infinite 0.6s",
                            pointerEvents: "none",
                          }}
                        >
                          ✦
                        </span>
                      </>
                    )}
                    <p
                      style={{
                        fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                        fontSize: 56,
                        fontWeight: 600,
                        color: colors.gold,
                        margin: "0 0 40px",
                        textAlign: "center",
                        animation: isPerfectMatch ? "miracleGlow 1.8s ease-in-out infinite" : "none",
                      }}
                    >
                      <RarityNumber target={referrerPercent} />%
                    </p>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setStage("result")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: colors.gold,
                color: "#1A1200",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
              }}
            >
              みんなとの結果を見る <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ---- RESULT ---- */}
        {stage === "result" && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 8px" }}>
              {nickname ? `${nickname}さんと同じ回答をした人は、` : "あなたと同じ回答をした人は、"}
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                {exactMatchCount >= 1 && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: 220,
                        height: 220,
                        marginLeft: -110,
                        marginTop: -110,
                        background: `repeating-conic-gradient(${colors.gold} 0deg 3deg, transparent 3deg 15deg)`,
                        opacity: 0.18,
                        borderRadius: "50%",
                        animation: "raysSpin 15s linear infinite",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: "-14px",
                        borderRadius: "50%",
                        border: `1.5px solid ${colors.gold}`,
                        animation: "miracleRingPulse 1.8s ease-in-out infinite",
                        pointerEvents: "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "28%",
                        left: -26,
                        transform: "translateY(-50%)",
                        fontSize: 14,
                        animation: "miracleSparkle 1.8s ease-in-out infinite",
                        pointerEvents: "none",
                      }}
                    >
                      ✦
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        top: "72%",
                        right: -26,
                        transform: "translateY(-50%)",
                        fontSize: 14,
                        animation: "miracleSparkle 1.8s ease-in-out infinite 0.6s",
                        pointerEvents: "none",
                      }}
                    >
                      ✦
                    </span>
                  </>
                )}
                <p
                  style={{
                    fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                    fontSize: 44,
                    fontWeight: 600,
                    color: colors.gold,
                    margin: "0 0 4px",
                    textAlign: "center",
                    animation: exactMatchCount >= 1 ? "miracleGlow 1.8s ease-in-out infinite" : "none",
                  }}
                >
                  <RarityNumber target={exactMatchCount} />
                  人
                </p>
              </div>
            </div>

            <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 40px" }}>
              / {totalParticipants}人(全回答者の総数中)
            </p>

            

            {exactMatchCount === 0 && (
              <p
                style={{
                  fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                  fontSize: 24,
                  fontWeight: 600,
                  color: colors.gold,
                  lineHeight: 1.6,
                  margin: "0 0 32px",
                }}
              >
                あなたは分類されません
                <br />
                これまでも これからも
              </p>
            )}
            <div style={{ height: 1, background: colors.cardBorder, margin: "0 0 32px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px", textAlign: "left" }}>
              あなたに最も近い3人
            </p>

            {topMatches.length === 0 ? (
              <p
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  lineHeight: 1.8,
                  textAlign: "left",
                  padding: "16px",
                  borderRadius: 16,
                  background: colors.card,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                あなたはまだ見つかっていません。もう少し参加者が増えるのをお待ちください。
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topMatches.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: colors.card,
                      border: `1px solid ${colors.cardBorder}`,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: colors.bgBaseSoft,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 600,
                        boxShadow: `${RANK_STYLE[i].glow}, inset 0 0 0 1.5px ${RANK_STYLE[i].ring}`,
                        flexShrink: 0,
                      }}
                    >
                      {m.nickname[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 12, color: RANK_STYLE[i].ring, fontWeight: 600 }}>
                          {RANK_STYLE[i].label}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{m.nickname}</span>
                      </div>
                      <p style={{ fontSize: 12, color: colors.textMuted, margin: "2px 0 6px" }}>
                        {m.matchCount} / {QUESTIONS.length}問 一致
                      </p>
                      {m.comment && (
                        <p
                          style={{
                            fontSize: 12.5,
                            color: colors.textPrimary,
                            margin: "0 0 8px",
                            lineHeight: 1.6,
                            fontStyle: "italic",
                          }}
                        >
                          「{m.comment}」
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        {m.twitter_url && (
                          <a
                            href={m.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: colors.rose, textDecoration: "none" }}
                          >
                            Twitter
                          </a>
                        )}
                        {m.instagram_url && (
                          <a
                            href={m.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: colors.rose, textDecoration: "none" }}
                          >
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 1, background: colors.cardBorder, margin: "32px 0 24px" }} />

            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>
              友達にもシェアする
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <button
                onClick={shareToX}
                aria-label="Xでシェア"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "#000000",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                X
              </button>
              <button
                onClick={shareToLine}
                aria-label="LINEでシェア"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "#06C755",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MessageCircle size={24} fill="#ffffff" strokeWidth={0} />
              </button>
              <button
                onClick={shareToInstagram}
                aria-label="Instagram用に共有文をコピー"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(45deg, #f9ce34, #ee2a7b 50%, #6228d7)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Camera size={22} />
              </button>
            </div>
            {instagramCopyStatus === "done" && (
              <p style={{ color: colors.textMuted, fontSize: 12, margin: "10px 0 0" }}>
                共有文をコピーしました。Instagramに貼り付けて共有してください。
              </p>
            )}
            {instagramCopyStatus === "error" && (
              <p style={{ color: colors.rose, fontSize: 12, margin: "10px 0 0" }}>
                コピーに失敗しました。お使いの端末ではこの機能に対応していない可能性があります。
              </p>
            )}

            <button
              onClick={clearSnsAndComment}
              disabled={contactClearStatus === "pending" || contactClearStatus === "done"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 36,
                padding: "12px 24px",
                borderRadius: 999,
                border: `1px solid rgba(216,105,122,0.35)`,
                background: "transparent",
                color: colors.rose,
                fontSize: 14,
                cursor: contactClearStatus === "pending" || contactClearStatus === "done" ? "default" : "pointer",
                opacity: contactClearStatus === "pending" ? 0.6 : 1,
              }}
            >
              <Trash2 size={14} />
              {contactClearStatus === "pending"
                ? "削除中..."
                : contactClearStatus === "done"
                ? "削除しました"
                : "SNS連携・コメントを削除する"}
            </button>
            {contactClearStatus === "error" && (
              <p style={{ color: colors.rose, fontSize: 12, margin: "8px 0 0" }}>
                削除に失敗しました。時間をおいて再度お試しください。
              </p>
            )}
          </div>
        )}

        {/* ---- RESULT-FIVE(5問版の簡易結果) ---- */}
        {stage === "result-five" && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 8px" }}>
              {nickname ? `${nickname}さんの最初の5問の回答パターンは` : "最初の5問の回答パターンは"}
            </p>

            <p
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 44,
                fontWeight: 600,
                color: colors.gold,
                margin: "0 0 4px",
                textAlign: "center",
              }}
            >
              <RarityNumber target={firstFiveMatchCount} />人
            </p>

            <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 40px" }}>
              / {totalParticipants}人(全回答者の総数中)と同じでした
            </p>

            <div style={{ height: 1, background: colors.cardBorder, margin: "0 0 32px" }} />

            <p
              style={{
                color: colors.textMuted,
                fontSize: 13,
                lineHeight: 1.8,
                textAlign: "left",
                margin: "0 0 28px",
                padding: "16px",
                borderRadius: 16,
                background: colors.card,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              残り15問に答えると、より詳しいマッチング結果(あなたに最も近い3人)が見られるようになります。
            </p>

            <button
              onClick={continueToTwenty}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: colors.gold,
                color: "#1A1200",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
              }}
            >
              もっと深掘りする(残り15問) <ArrowRight size={16} />
            </button>

            <button
              onClick={restart}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                padding: "12px 24px",
                borderRadius: 999,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textMuted,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={14} /> もう一度試す
            </button>
          </div>
        )}

        <p
          style={{
            color: dynamicMutedFg,
            fontSize: 10.5,
            opacity: 0.6,
            textAlign: "center",
            margin: "40px 0 0",
            transition: "color 1s linear",
          }}
        >
          第{QUESTION_SET_NUMBER}セット目・{formatJapaneseDate(QUESTION_SET_EFFECTIVE_DATE)}から適用
        </p>
      </div>
    </div>
  );
}