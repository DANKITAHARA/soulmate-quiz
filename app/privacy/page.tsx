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

export default function PrivacyPage() {
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
        <a
          href="/"
          style={{ color: colors.textMuted, fontSize: 13, textDecoration: "none" }}
        >
          ← トップに戻る
        </a>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: "24px 0 32px",
          }}
        >
          プライバシーについて
        </h1>

        <Section title="このサービスについて">
          このサービスは、個人が趣味の範囲で開発・運営しています。企業が運営するサービスのような、専門チームによる継続的なセキュリティ監査などは行っていません。
          安心してご利用いただくため、入力する情報は必要最小限にしてください。
        </Section>

        <Section title="取得する情報">
          以下の情報のみをお預かりします。
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
            <li>ニックネーム(自由入力)</li>
            <li>Twitterのユーザー名(任意)</li>
            <li>Instagramのユーザー名(任意)</li>
            <li>20問の質問への回答(はい/いいえ)</li>
          </ul>
          本名・住所・電話番号・メールアドレスなど、上記以外の個人情報は入力しないでください。
        </Section>

        <Section title="情報の使いみち">
          お預かりした情報は、回答パターンが近い参加者どうしをマッチングする目的にのみ使用します。
          広告目的での利用や、第三者への販売・提供は行いません。
        </Section>

        <Section title="公開範囲">
          回答内容(はい/いいえ)そのものが他の参加者に表示されることはありません。
          ニックネームとSNSのユーザー名は、回答パターンが一定以上近い相手にのみ表示されます。それ以外の参加者には表示されません。
        </Section>

        <Section title="セキュリティについて">
          通信の暗号化など基本的な対策は行っていますが、個人開発のため、大規模なサービスと同等のセキュリティを保証するものではありません。
          そのため、SNSのユーザー名以外の機密性の高い情報は入力しないようお願いします。
        </Section>

        <Section title="データの削除について">
          登録した内容の削除を希望される場合は、下記の連絡先までご連絡ください。
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
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: colors.gold,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.9, color: colors.textPrimary, margin: 0 }}>
        {children}
      </div>
    </div>
  );
}