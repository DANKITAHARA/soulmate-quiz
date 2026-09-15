import { ImageResponse } from "next/og";
import { generateConstellation } from "./generateStar";
import { loadJapaneseFont, OG_SIZE } from "./ogImage";
import { supabase } from "./supabaseClient";

const BADGE_TEXT = "〈 MEBI-Connect 〉";
const CAPTION_TEXT = "この星座を見つけました";

// viewBox "0 0 680 460" の星座を、OGP画像内のこのサイズに収める
const CONSTELLATION_DISPLAY_WIDTH = 460;
const CONSTELLATION_DISPLAY_HEIGHT = (460 / 680) * CONSTELLATION_DISPLAY_WIDTH;
const SCALE = CONSTELLATION_DISPLAY_WIDTH / 680;

export async function fetchPublicConstellation(
  id: string
): Promise<{ nickname: string; answerPattern: string } | null> {
  const { data } = await supabase.rpc("get_public_constellation", { p_id: id });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || !row.answer_pattern) return null;
  return { nickname: row.nickname as string, answerPattern: row.answer_pattern as string };
}

export async function renderConstellationOgImage(nickname: string, answerPattern: string) {
  const constellation = generateConstellation(answerPattern);
  const fontData = await loadJapaneseFont(`${BADGE_TEXT}${nickname}${CAPTION_TEXT}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10132E 0%, #0D0F26 100%)",
          position: "relative",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(231,183,80,0.16)",
            color: "#E7B750",
            fontSize: 22,
            marginBottom: 28,
          }}
        >
          {BADGE_TEXT}
        </div>

        <div
          style={{
            position: "relative",
            width: CONSTELLATION_DISPLAY_WIDTH,
            height: CONSTELLATION_DISPLAY_HEIGHT,
            marginBottom: 32,
          }}
        >
          {constellation.edges.map((e, i) => {
            const a = constellation.stars[e.from];
            const b = constellation.stars[e.to];
            const x1 = a.x * SCALE;
            const y1 = a.y * SCALE;
            const x2 = b.x * SCALE;
            const y2 = b.y * SCALE;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <div
                key={`edge-${i}`}
                style={{
                  position: "absolute",
                  left: x1,
                  top: y1,
                  width: length,
                  height: 1.5,
                  background: "rgba(231,183,80,0.55)",
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "0 0",
                  display: "flex",
                }}
              />
            );
          })}
          {constellation.stars.map((s, i) => {
            const sizeMul = constellation.starSizeMultipliers[i] ?? 1;
            const r = 4 * sizeMul * SCALE * 2.4;
            return (
              <div
                key={`star-${i}`}
                style={{
                  position: "absolute",
                  left: s.x * SCALE - r,
                  top: s.y * SCALE - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: "#ECEAF6",
                  display: "flex",
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            color: "#E7B750",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {nickname}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#9C9FC4",
          }}
        >
          {CAPTION_TEXT}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        {
          name: "Noto Sans JP",
          data: fontData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
