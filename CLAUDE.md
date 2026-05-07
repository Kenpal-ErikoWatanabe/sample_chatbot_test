# CLAUDE.md

このファイルは、このリポジトリで作業する際の Claude Code (claude.ai/code) へのガイダンスを提供します。

## 重要：Next.js バージョンについて

このプロジェクトは **Next.js 16** を使用しています。古いバージョンから破壊的変更があります。Next.js 固有のコードを書く前に `node_modules/next/dist/docs/` を参照し、非推奨の通知に注意してください。

## コマンド

パッケージマネージャーは **bun** を使用します。

```bash
bun run dev      # 開発サーバーを http://localhost:3000 で起動
bun run build    # プロダクションビルド
bun run start    # プロダクションビルドを実行
bun run lint     # ESLint を実行
```

## プロジェクト概要

**Kenpal株式会社 チャットボット MVP**

kenpalinc.com に埋め込む問い合わせ対応チャットボット。Gemini API を使い、HP情報をもとに日本語・英語で自動応答する。

- **AIモデル:** Gemini 2.5 Flash（無料枠使用）
- **デプロイ先:** Vercel（無料枠）
- **埋め込み方法:** STUDIO の Embed 機能で iframe 挿入

## アーキテクチャ

Next.js App Router プロジェクト（ルートはすべて `app/` 以下）。`pages/` ディレクトリは存在しません。

```
app/
├── layout.tsx              # ルートレイアウト（Geist フォント、iframe 用フルハイト設定）
├── page.tsx                # チャット画面（ChatWidget を表示）
├── globals.css             # グローバルスタイル（Tailwind v4）
└── api/
    └── chat/
        └── route.ts        # Gemini API を呼ぶ Route Handler（CORS 対応済み）
components/
└── ChatWidget.tsx          # チャット UI 本体（クライアントコンポーネント）
lib/
└── systemPrompt.ts         # Kenpal HP情報 + AI への指示（system prompt）
```

**パスエイリアス**: `@/*` はプロジェクトルートに解決されます（例: `@/lib/...`）。

## 環境変数

`.env.local` に以下を設定（Git にはコミットしない。`.gitignore` で `.env*` を除外済み）。

```
GEMINI_API_KEY=      # Google AI Studio で発行（無料）
CONTACT_FORM_URL=    # 問い合わせフォームの URL（https://www.kenpalinc.com/contact）
```

Vercel にも同じ環境変数を設定すること。

## API Route の仕様（app/api/chat/route.ts）

- `POST /api/chat` を受け付ける
- リクエストボディ: `{ messages: { role: "user" | "assistant", content: string }[] }`
- Gemini の `generateContent` を呼び、レスポンスをストリーミング返却
- CORS ヘッダー: `Access-Control-Allow-Origin: *`（iframe 埋め込みのため必須）
- IPベースの簡易レートリミット実装済み（無料枠保護）
- エラー時は適切なメッセージを返す

## スタイリング

Tailwind CSS v4 を使用。設定は CSS ベース（`tailwind.config.js` は存在しない）。カスタムトークンやバリアントは `globals.css` の `@theme` ディレクティブで追加する。

## 懸念点・注意事項

- `.env.local` は絶対に Git にコミットしないこと（`.gitignore` で `.env*` を除外済み）
- CORS 設定は API Route の `next.config.ts` または `route.ts` ヘッダーで対応
- Gemini 無料枠の上限は 1日 1,500 リクエスト。レートリミットで保護すること
- AIの回答は参考情報である旨の免責事項をチャット UI 内に表示すること

## HPへの埋め込み手順（STUDIO）

```html
<iframe
  src="https://your-chatbot.vercel.app"
  style="position:fixed; bottom:20px; right:20px;
         width:380px; height:600px;
         border:none; z-index:9999;"
  allow="clipboard-write"
/>
```

> STUDIOの埋め込み機能は Starter プラン以上が必要。
