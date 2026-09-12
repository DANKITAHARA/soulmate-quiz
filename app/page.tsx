"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, RotateCcw, Sparkle, User } from "lucide-react";
import { QUESTIONS } from "./questions";
import { supabase } from "./lib/supabaseClient";

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

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');
`;

// ---- 参加者データはSupabaseから取得します(ダミーデータは廃止) ----

const RANK_STYLE = [
  { label: "1位", ring: colors.gold, glow: "0 0 0 3px rgba(231,183,80,0.35)" },
  { label: "2位", ring: colors.silver, glow: "0 0 0 3px rgba(185,190,220,0.25)" },
  { label: "3位", ring: colors.bronze, glow: "0 0 0 3px rgba(201,138,90,0.25)" },
];

// ---- 星の背景(控えめな一回きりの演出) -----------------------------------
function Starfield() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        opacity: Math.random() * 0.5 + 0.15,
      }))
    );
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s) => (
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
          }}
        />
      ))}
    </div>
  );
}

// ---- 進捗を星座の線で見せるインジケーター ---------------------------------
function ConstellationProgress({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: active ? 10 : 7,
                height: active ? 10 : 7,
                borderRadius: "50%",
                background: done || active ? colors.gold : "rgba(236,234,246,0.18)",
                boxShadow: active ? `0 0 8px ${colors.gold}` : "none",
                transition: "all 0.3s ease",
              }}
            />
            {i < total - 1 && (
              <div
                style={{
                  width: 16,
                  height: 1,
                  background: done ? colors.gold : "rgba(236,234,246,0.14)",
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

// ---- メインコンポーネント --------------------------------------------------
export default function ConstellationMatchPrototype() {
  const [stage, setStage] = useState<"intro" | "quiz" | "register" | "result">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [rarity] = useState(() => Math.floor(Math.random() * 400) + 40);

  const [nickname, setNickname] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [topMatches, setTopMatches] = useState<MatchResult[]>([]);

  const restart = () => {
    setStage("intro");
    setQIndex(0);
    setAnswers([]);
    setNickname("");
    setTwitterHandle("");
    setInstagramHandle("");
    setFormError("");
    setTopMatches([]);
  };

  const choose = (value: string) => {
    const next = [...answers, value];
    setAnswers(next);
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1);
    } else {
      setStage("register");
    }
  };

  const HANDLE_PATTERN = /^[A-Za-z0-9_.]{1,30}$/;

  const cleanHandle = (raw: string) => raw.trim().replace(/^@/, "");

  const submitRegistration = async () => {
    if (!nickname.trim()) {
      setFormError("ニックネームを入力してください。");
      return;
    }

    const cleanTwitter = cleanHandle(twitterHandle);
    const cleanInstagram = cleanHandle(instagramHandle);

    if (!cleanTwitter && !cleanInstagram) {
      setFormError("TwitterかInstagramのどちらか一方は入力してください。");
      return;
    }
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

    // 自分の回答をSupabaseに保存する
    const { data: inserted, error: insertError } = await supabase
      .from("participants")
      .insert([
        {
          nickname: nickname.trim(),
          twitter_url: twitterUrl,
          instagram_url: instagramUrl,
          answer_pattern: answerPattern,
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      setFormError("保存に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
      return;
    }

    // 自分以外の参加者を取得して一致率を計算する
    const { data: others, error: fetchError } = await supabase
      .from("participants")
      .select("id, nickname, twitter_url, instagram_url, answer_pattern")
      .neq("id", inserted.id);

    if (fetchError || !others) {
      setFormError("結果の取得に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
      return;
    }

    const scored: MatchResult[] = others.map((o) => {
      let matchCount = 0;
      for (let i = 0; i < answerPattern.length; i++) {
        if (o.answer_pattern[i] === answerPattern[i]) matchCount++;
      }
      return {
        id: o.id,
        nickname: o.nickname,
        twitter_url: o.twitter_url,
        instagram_url: o.instagram_url,
        matchCount,
      };
    });

    scored.sort((a, b) => b.matchCount - a.matchCount);
    setTopMatches(scored.slice(0, 3));
    setSubmitting(false);
    setStage("result");
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: 640,
        background: `radial-gradient(circle at 50% 0%, ${colors.bgBaseSoft}, ${colors.bgBase} 65%)`,
        color: colors.textPrimary,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <style>{fontImport}</style>
      <Starfield />

      <div
        style={{
          position: "relative",
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
              <Sparkle size={14} />
              2^30分の1の出会い
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1.35,
                margin: "0 0 16px",
              }}
            >
              同じ選択をした<br />誰かが、どこかにいる。
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.8, margin: "0 0 40px" }}>
              {QUESTIONS.length}個の二択に答えると、あなたと同じ選び方をした人を探します。
              全問答えると2^{QUESTIONS.length}分の1の確率の出会いが待っています。
            </p>
            <button
              onClick={() => setStage("quiz")}
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
              }}
            >
              はじめる <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ---- QUIZ ---- */}
        {stage === "quiz" && (
          <div style={{ width: "100%" }}>
            <ConstellationProgress total={QUESTIONS.length} current={qIndex} />
            <p style={{ textAlign: "center", color: colors.textMuted, fontSize: 13, margin: "0 0 12px" }}>
              Q{qIndex + 1} / {QUESTIONS.length}
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 24,
                lineHeight: 1.5,
                textAlign: "center",
                margin: "0 0 36px",
                minHeight: 72,
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
              マッチした相手に見せる<br />プロフィールを登録
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 28px" }}>
              ニックネームと、TwitterまたはInstagramのユーザー名を(どちらか一方、両方でも可)入力してください。
              マッチした相手だけがこの情報を見られます。
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>ニックネーム</span>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例: ほしの"
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

              <label style={{ fontSize: 13 }}>
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>Twitterのユーザー名</span>
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
                <span style={{ display: "block", marginBottom: 6, color: colors.textMuted }}>Instagramのユーザー名</span>
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
            </div>

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

        {/* ---- RESULT ---- */}
        {stage === "result" && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 8px" }}>
              {nickname ? `${nickname}さんの回答パターンは` : "あなたの回答パターンは"}
            </p>
            <p
              style={{
                fontFamily: "'Fraunces', ui-serif, Georgia, serif",
                fontSize: 44,
                fontWeight: 600,
                color: colors.gold,
                margin: "0 0 4px",
              }}
            >
              <RarityNumber target={rarity} /> 人
            </p>
            <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 40px" }}>
              / 2^{QUESTIONS.length}人中(約{(2 ** QUESTIONS.length).toLocaleString("ja-JP")}通り)
            </p>

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
                まだ運命の人は見つかっていません。もう少し参加者が増えるのをお待ちください。
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

            <button
              onClick={restart}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 36,
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
      </div>
    </div>
  );
}