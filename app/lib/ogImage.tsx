import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "MEBI-Connect ── あなたは分類されません。でも、たまに同じ人がいます。";

// フォントの文字化け(豆腐)を防ぐため、実際に画像内で使う文字だけを
// Google Fontsにsubset指定して取得する(帯域・ビルド時間の節約にもなる)
const OG_TEXT_FOR_SUBSET =
  "〈 MEBI-Connect 〉あなたは分類されません。でも、たまに同じ人がいます。20問の二択で、似た人と出会う診断サイト";

export async function loadJapaneseFont(text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      // ImageResponse(satori)はwoff2を読めないため、古いUAを装って
      // Google FontsからTTF形式のURLを返してもらう
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win32; x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\)/);
  if (!match) {
    throw new Error("Noto Sans JPのフォントURLを取得できませんでした");
  }
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

// リクエストに依存しない値なので、モジュール読み込み時に一度だけ取得する
const notoSansJPBold = loadJapaneseFont(OG_TEXT_FOR_SUBSET);

// 位置固定の星屑(見た目だけなので毎回ランダムにする必要はない)
const STARS: { top: number; left: number; size: number; opacity: number }[] = [
  { top: 8, left: 10, size: 3, opacity: 0.5 },
  { top: 14, left: 32, size: 2, opacity: 0.4 },
  { top: 6, left: 55, size: 2, opacity: 0.6 },
  { top: 18, left: 74, size: 3, opacity: 0.45 },
  { top: 10, left: 90, size: 2, opacity: 0.5 },
  { top: 30, left: 4, size: 2, opacity: 0.4 },
  { top: 40, left: 95, size: 3, opacity: 0.5 },
  { top: 60, left: 6, size: 3, opacity: 0.45 },
  { top: 72, left: 92, size: 2, opacity: 0.5 },
  { top: 85, left: 15, size: 2, opacity: 0.4 },
  { top: 90, left: 40, size: 3, opacity: 0.5 },
  { top: 88, left: 68, size: 2, opacity: 0.45 },
  { top: 92, left: 85, size: 2, opacity: 0.4 },
  { top: 22, left: 20, size: 2, opacity: 0.35 },
  { top: 50, left: 88, size: 2, opacity: 0.4 },
];

export async function renderOgImage() {
  const fontData = await notoSansJPBold;

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
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "#ECEAF6",
              opacity: s.opacity,
              display: "flex",
            }}
          />
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 28px",
            borderRadius: 999,
            background: "rgba(231,183,80,0.16)",
            color: "#E7B750",
            fontSize: 28,
            marginBottom: 36,
          }}
        >
          〈 MEBI-Connect 〉
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#ECEAF6",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          あなたは分類されません。
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 38,
            color: "#9C9FC4",
            marginBottom: 56,
            textAlign: "center",
          }}
        >
          でも、たまに同じ人がいます。
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#B9BEDC",
          }}
        >
          20問の二択で、似た人と出会う診断サイト
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
