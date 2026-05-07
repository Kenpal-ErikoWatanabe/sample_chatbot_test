# Kenpal株式会社 チャットボット MVP 要件定義

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| 対象サイト | https://www.kenpalinc.com/ |
| サイト構成 | STUDIO（有料プラン必須） |
| 目的 | 問い合わせ対応（FAQ自動応答） |
| フェーズ | MVP |

---

## 2. 機能要件

### 2.1 チャット機能
- AIによる自由会話形式の応答
- 日本語・英語の両言語対応
- Kenpal株式会社のHP情報をもとに回答する

### 2.2 知識ソース
- kenpalinc.com のコンテンツのみを使用
- HP情報はsystem promptにテキストとして埋め込む
- 別途FAQドキュメントは用意しない（MVP段階）

### 2.3 有人対応への引き継ぎ
- AIが回答できない場合、既存の問い合わせフォームへ誘導する
- 誘導はチャット内のメッセージ＋リンクで行う

---

## 3. 技術スタック

| 項目 | 採用技術 |
|---|---|
| 言語 | TypeScript |
| フレームワーク | Next.js (App Router) |
| AIモデル | Gemini API（gemini-2.5-flash、無料枠使用） |
| デプロイ | Vercel（無料枠） |
| HPへの組み込み | STUDIOの埋め込み（Embed）機能でiframe挿入 |

---

## 4. システム構成

```
訪問者
  ↓
kenpalinc.com（STUDIO）
  └── 埋め込みiframe
        ↓
Next.js app（Vercel）
  ├── Chat UI（React コンポーネント）
  │     ↓ POST /api/chat
  └── API Route（app/api/chat/route.ts）
        ├── → Gemini API（system prompt + 会話履歴）
        └── → 問い合わせフォームURL（回答不能時に返却）
```

---

## 5. ファイル構成

```
kenpal-chatbot/
├── app/
│   ├── page.tsx                  # チャット画面（iframe表示用）
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Gemini APIを呼ぶRoute Handler
│   └── layout.tsx
├── components/
│   └── ChatWidget.tsx            # チャットUI本体
├── lib/
│   └── systemPrompt.ts           # HP情報 + AIへの指示
├── .env.local                    # APIキー（ローカル用）
└── public/
```

---

## 6. system prompt 方針

- Kenpalの会社概要・サービス内容・FAQをテキストで記述
- 日英両対応の指示を含める（ユーザーの言語に合わせて応答）
- 回答範囲をHP情報に限定する旨を明記
- 回答できない場合は問い合わせフォームへ誘導する旨を明記

---

## 7. HPへの埋め込み手順（STUDIO）

1. STUDIOエディタで対象ページを開く
2. 左パネルから「埋め込み（Embed）」要素を追加
3. 以下のiframeコードを貼り付ける

```html
<iframe
  src="https://your-chatbot.vercel.app"
  style="position:fixed; bottom:20px; right:20px;
         width:380px; height:600px;
         border:none; z-index:9999;"
  allow="clipboard-write"
/>
```

4. 公開して完了

> **注意:** STUDIOの埋め込み機能はStarterプラン以上が必要です。

---

## 8. 環境変数

| 変数名 | 説明 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio で発行するAPIキー（無料） |
| `CONTACT_FORM_URL` | 問い合わせフォームのURL |

---

## 9. MVP スコープ外（将来検討）

- 会話ログの保存・分析
- 有人チャットへのリアルタイム引き継ぎ
- FAQ専用ドキュメントの管理画面
- チャット履歴のセッション保持（現在はページリロードでリセット）

---

## 11. Gemini APIキーの取得方法

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Googleアカウントでログイン
3. 左サイドバーの「Get API key」をクリック
4. 「Create API key」で発行
5. Vercelの環境変数 `GEMINI_API_KEY` に設定

---

## 12. コスト目安

| 項目 | 目安 |
|---|---|
| Gemini API | **無料枠：1日1,500リクエストまで無料**（クレカ不要） |
| MVP運用コスト | **$0**（無料枠内に収まる見込み） |
| Vercel | 無料枠で運用可能 |

---

## 13. 懸念点・抜け漏れ

### 優先度：必須（リリース前に対応）

| 項目 | 内容 | 対応方法 |
|---|---|---|
| APIキー漏洩リスク | `.env.local` をGitにコミットするミスが起きやすい | `.gitignore` に `.env.local` を必ず追加する |
| CORSエラー | kenpalinc.com → vercel.app はクロスオリジンになりブロックされる | API Routeに `Access-Control-Allow-Origin` ヘッダーを設定する |
| エラー時の表示未定義 | APIタイムアウトや無料枠上限到達時にユーザーへ何も表示されない | エラーメッセージ（例：「現在つながりにくい状態です」）をUIに実装する |

### 優先度：推奨（できればMVPに含める）

| 項目 | 内容 | 対応方法 |
|---|---|---|
| レートリミット未設定 | 悪意あるbotなどに無料枠1,500件/日を使い切られる可能性がある | API RouteにIPベースの簡易レートリミットを実装する |
| 免責事項の未表示 | AIが誤情報を返した場合の責任が曖昧 | チャットUI内に「AIの回答は参考情報です」などの注記を表示する |
| エッジケーステスト不足 | HP外の質問・競合他社の話・悪意ある入力への対応が未検証 | system prompt完成後にエッジケースを網羅したテストを実施する |

### 優先度：将来対応でOK

| 項目 | 内容 | 対応方法 |
|---|---|---|
| プライバシーポリシー未整備 | ユーザー入力がGoogleサーバーを経由することの開示が必要 | HPのプライバシーポリシーにAI chatbotのデータ利用について追記する |
| チャットUIデザイン仕様未定 | ブランドカラー・フォント・ウィンドウ開閉ボタンの位置などが未決定 | HPのデザインガイドラインに合わせてUIを詰める |
| モバイル対応仕様未定 | STUDIOサイトはモバイル対応済みだが、iframeのレスポンシブ対応が必要 | iframeのサイズをメディアクエリで切り替える実装を追加する |
| system promptのトークン最適化 | HP情報が増えると毎リクエストのトークン消費が増加する | 有料化時にsystem promptを圧縮・構造化して対応する |
