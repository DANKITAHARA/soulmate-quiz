import { renderOgImage, OG_SIZE } from "../../lib/ogImage";
import { fetchPublicConstellation, renderConstellationOgImage } from "../../lib/ogConstellationImage";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await fetchPublicConstellation(id);

  if (!found) {
    // 見つからない場合は、サイト共通のブランドOGP画像にフォールバックする
    return renderOgImage();
  }

  return renderConstellationOgImage(found.nickname, found.answerPattern);
}
