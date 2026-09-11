"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowRight, RotateCcw, Sparkle } from "lucide-react";

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

// ---- デモ用ダミーデータ(本番は30問想定。デモでは6問に短縮) -------------
const QUESTIONS = [
  { id: "q1", text: "朝型か、夜型か。", a: "朝型", b: "夜型" },
  { id: "q2", text: "犬派か、猫派か。", a: "犬派", b: "猫派" },
  { id: "q3", text: "旅行は計画を立てる派か、即興で決める派か。", a: "計画派", b: "即興派" },
  { id: "q4", text: "休日は一人でいたいか、誰かといたいか。", a: "一人でいたい", b: "誰かといたい" },
  { id: "q5", text: "甘いものが好きか、しょっぱいものが好きか。", a: "甘党", b: "辛党" },
  { id: "q6", text: "雨の日は好きか、苦手か。", a: "雨は好き", b: "雨は苦手" },
];

const DUMMY_CANDIDATES = [
  { name: "N.Kobayashi", handle: "@n_koba_sky", answers: ["A","A","B","A","A","B"], twitter: "#", instagram: "#" },
  { name: "R.Aoyama", handle: "@ryo_aoyama", answers: ["A","A","A","A","A","B"], twitter: "#", instagram: "#" },
  { name: "M.Fujita", handle: "@mfujita_", answers: ["B","A","B","B","A","B"], twitter: "#", instagram: "#" },
  { name: "S.Nakata", handle: "@s_nakata", answers: ["A","B","B","A","A","A"], twitter: "#", instagram: "#" },
  { name: "Y.Hoshino", handle: "@yhoshino_star", answers: ["A","A","B","A","B","B"], twitter: "#", instagram: "#" },
];

const RANK_STYLE = [
  { label: "1位", ring: colors.gold, glow: "0 0 0 3px rgba(231,183,80,0.35)" },
  { label: "2位", ring: colors.silver, glow: "0 0 0 3px rgba(185,190,220,0.25)" },
  { label: "3位", ring: colors.bronze, glow: "0 0 0 3px rgba(201,138,90,0.25)" },
];

// ---- 星の背景(控えめな一回きりの演出) -----------------------------------
function Starfield() {
  const [stars, setStars] = useState([]);

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
function ConstellationProgress({ total, current }) {
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
function RarityNumber({ target }) {
  const [value, setValue] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString("ja-JP")}</span>
  );
}

// ---- メインコンポーネント --------------------------------------------------
export default function ConstellationMatchPrototype() {
  const [stage, setStage] = useState("intro"); // intro | quiz | result
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [rarity] = useState(() => Math.floor(Math.random() * 400) + 40);

  const restart = () => {
    setStage("intro");
    setQIndex(0);
    setAnswers([]);
  };

  const choose = (value) => {
    const next = [...answers, value];
    setAnswers(next);
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1);
    } else {
      setStage("result");
    }
  };

  const topMatches = useMemo(() => {
    if (answers.length < QUESTIONS.length) return [];
    const scored = DUMMY_CANDIDATES.map((c) => {
      const matchCount = c.answers.reduce((acc, v, i) => acc + (v === answers[i] ? 1 : 0), 0);
      return { ...c, matchCount };
    });
    return scored.sort((a, b) => b.matchCount - a.matchCount).slice(0, 3);
  }, [answers]);

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
              いくつかの二択に答えると、あなたと同じ選び方をした人を探します。
              本番は30問、このデモでは{QUESTIONS.length}問で体験できます。
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
              {["a", "b"].map((key) => (
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

        {/* ---- RESULT ---- */}
        {stage === "result" && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 8px" }}>
              あなたの回答パターンは
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
              / 2^30人中(約10.7億通り)
            </p>

            <div style={{ height: 1, background: colors.cardBorder, margin: "0 0 32px" }} />

            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px", textAlign: "left" }}>
              あなたに最も近い3人
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topMatches.map((m, i) => (
                <div
                  key={m.handle}
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
                    {m.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 12, color: RANK_STYLE[i].ring, fontWeight: 600 }}>
                        {RANK_STYLE[i].label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                    </div>
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: "2px 0 6px" }}>
                      {m.matchCount} / {QUESTIONS.length}問 一致 ・ {m.handle}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={m.twitter} style={{ fontSize: 12, color: colors.rose, textDecoration: "none" }}>
                        Twitter
                      </a>
                      <a href={m.instagram} style={{ fontSize: 12, color: colors.rose, textDecoration: "none" }}>
                        Instagram
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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