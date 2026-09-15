"use client";

import type { Constellation, StarPoint } from "../lib/generateStar";

// 星の実際の分布ぎりぎりまでviewBoxを詰めて、上下左右の余白を削る
// (compact指定時のみ。通常表示は演出上の一貫性のため固定のviewBoxを使う)
function computeTightViewBox(stars: StarPoint[], sizeMultipliers: number[]): string {
  const padding = 24;
  const radii = stars.map((_, i) => 4 * (sizeMultipliers[i] ?? 1));
  const minX = Math.min(...stars.map((s, i) => s.x - radii[i])) - padding;
  const maxX = Math.max(...stars.map((s, i) => s.x + radii[i])) + padding;
  const minY = Math.min(...stars.map((s, i) => s.y - radii[i])) - padding;
  const maxY = Math.max(...stars.map((s, i) => s.y + radii[i])) + padding;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

export function ConstellationVisual({
  constellation,
  glow = false,
  twinkle = false,
  compact = false,
}: {
  constellation: Constellation;
  glow?: boolean;
  twinkle?: boolean;
  compact?: boolean;
}) {
  const { stars, edges, starSizeMultipliers, starBrightnessMultipliers } = constellation;
  const viewBox = compact ? computeTightViewBox(stars, starSizeMultipliers) : "0 0 680 460";

  return (
    <svg viewBox={viewBox} style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
      {edges.map((e, i) => (
        <line
          key={`edge-${i}`}
          x1={stars[e.from].x}
          y1={stars[e.from].y}
          x2={stars[e.to].x}
          y2={stars[e.to].y}
          stroke="rgba(231,183,80,0.55)"
          strokeWidth={1.4}
        />
      ))}
      {stars.map((s, i) => {
        const sizeMul = starSizeMultipliers[i] ?? 1;
        const brightMul = starBrightnessMultipliers[i] ?? 1;
        const radius = (glow ? 5 : 4) * sizeMul;

        // rise演出中(glow)は全体がうっすら光る。明るさが高い星だけ、そこにハローを追加する
        const ambientGlow = glow ? 6 : 0;
        const brightBoost = (brightMul - 1) * 8;
        const glowRadius = ambientGlow + brightBoost;
        const glowOpacity = glow ? 0.9 : Math.min(0.9, 0.3 + (brightMul - 1) * 0.3);

        // 常時、星ごとにタイミングをずらして10秒に1回程度キラリと瞬かせる
        const glintDelay = (i * 3.7) % 10;
        const glintDuration = 9 + (i % 4);
        const animations = [`starGlint ${glintDuration}s ease-in-out ${glintDelay}s infinite`];
        if (twinkle) {
          animations.push(`starTwinkle 2.4s ease-in-out ${(i % 5) * 0.3}s infinite`);
        }

        return (
          <circle
            key={`star-${i}`}
            cx={s.x}
            cy={s.y}
            r={radius}
            fill="#ECEAF6"
            style={{
              filter: glowRadius > 0 ? `drop-shadow(0 0 ${glowRadius}px rgba(236,234,246,${glowOpacity}))` : "none",
              animation: animations.join(", "),
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
          />
        );
      })}
    </svg>
  );
}
