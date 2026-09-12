const colors = {
  bgBase: "#0D0F26",
  bgBaseSoft: "#10132E",
  card: "#171B3F",
  cardBorder: "rgba(236,234,246,0.10)",
  gold: "#E7B750",
  rose: "#D8697A",
  textPrimary: "#ECEAF6",
  textMuted: "#9C9FC4",
};

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 50% 0%, ${colors.bgBaseSoft}, ${colors.bgBase} 65%)`,
        color: colors.textPrimary,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: "56px 24px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <a href="/" style={{ color: colors.textMuted, fontSize: 13, textDecoration: "none" }}>
          ← トップに戻る
        </a>

        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "24px 0 32px" }}>利用規約</h1>

        <Section title="この規約について">
          この利用規約(以下「本規約」)は、本サービスの利用条件を定めるものです。本サービスに参加した時点で、本規約に同意したものとみなします。
        </Section>

        <Section title="利用対象">
          本サービスは、18歳未満の方はご利用いただけません。
        </Section>

        <Section title="禁止事項">
          本サービスの利用にあたり、以下の行為を禁止します。
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
            <li>他人になりすまして登録する行為(自分以外の名前・SNSアカウントを無断で登録する行為を含む)</li>
            <li>虚偽の情報を登録する行為</li>
            <li>相手に対する、誹謗中傷・嫌がらせ・過度な接触の強要</li>
            <li>相手の情報を、本サービス外の第三者に無断で共有・公開する行為</li>
            <li>宣伝・勧誘・営業などの目的での利用</li>
            <li>本サービスの運営を妨げる行為(不正アクセス、大量の自動登録など)</li>
            <li>法令、公序良俗に違反する行為</li>
          </ul>
          禁止事項に該当する、または該当するおそれがあると運営者が判断した場合、事前の通知なく登録データを削除することがあります。
        </Section>

        <Section title="免責事項">
          本サービスは個人が趣味の範囲で開発・運営しており、以下について保証するものではありません。
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
            <li>サービスが中断・終了することなく継続的に提供されること</li>
            <li>登録データが消失しないこと</li>
          </ul>
          参加者どうしのやり取りやトラブルについて、運営者は責任を負いかねます。当事者間での解決をお願いします。不安な点があれば、個人情報の共有は最小限にとどめてください。
        </Section>

        <Section title="規約の変更">
          本規約は、予告なく変更されることがあります。変更後の規約は、本ページに掲載した時点から効力を持つものとします。
        </Section>

        <Section title="お問い合わせ">
          本規約に関するお問い合わせは、下記までご連絡ください。
          <br />
          メール:{" "}
          <a href="mailto:2tothe20th@gmail.com" style={{ color: colors.rose }}>
            2tothe20th@gmail.com
          </a>
        </Section>

        <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 40 }}>
          最終更新日:2026年9月
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: colors.gold, margin: "0 0 8px" }}>
        {title}
      </h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.9, color: colors.textPrimary, margin: 0 }}>
        {children}
      </div>
    </div>
  );
}