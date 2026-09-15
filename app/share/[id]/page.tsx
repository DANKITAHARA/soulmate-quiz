import type { Metadata } from "next";
import Link from "next/link";
import { ConstellationVisual } from "../../components/ConstellationVisual";
import { generateConstellation } from "../../lib/generateStar";
import { fetchPublicConstellation } from "../../lib/ogConstellationImage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await fetchPublicConstellation(id);

  if (!found) {
    return { title: "MEBI-Connect" };
  }

  return {
    title: `${found.nickname} | MEBI-Connect`,
    description: `「${found.nickname}」が見つかりました。あなたはどんな星座を見つける?`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await fetchPublicConstellation(id);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 0%, #10132E, #0D0F26 65%)",
        color: "#ECEAF6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "64px 24px",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 999,
          background: "rgba(231,183,80,0.16)",
          color: "#E7B750",
          fontSize: 13,
          marginBottom: 28,
        }}
      >
        〈 MEBI-Connect 〉
      </div>

      {found ? (
        <>
          <p style={{ color: "#9C9FC4", fontSize: 14, margin: "0 0 20px" }}>
            この星座を見つけました
          </p>
          <div style={{ width: "100%", maxWidth: 420, margin: "0 0 20px" }}>
            <ConstellationVisual constellation={generateConstellation(found.answerPattern)} />
          </div>
          <p
            style={{
              fontFamily: "'Fraunces', ui-serif, Georgia, serif",
              fontSize: 30,
              fontWeight: 600,
              color: "#E7B750",
              margin: "0 0 40px",
            }}
          >
            {found.nickname}
          </p>
        </>
      ) : (
        <p style={{ color: "#9C9FC4", fontSize: 14, margin: "0 0 40px" }}>
          この星座は見つかりませんでした。
        </p>
      )}

      <Link
        href={`/?ref=${id}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 28px",
          borderRadius: 999,
          background: "#E7B750",
          color: "#1A1200",
          fontSize: 15,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        あなたも星座を見つける
      </Link>
    </main>
  );
}
