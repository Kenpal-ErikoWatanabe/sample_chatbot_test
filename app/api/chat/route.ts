import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { systemPrompt } from "@/lib/systemPrompt";

// ── 入力バリデーション定数 ──────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 1000; // 1メッセージあたりの最大文字数
const MAX_HISTORY = 20;          // 送信できる最大メッセージ件数

// ── レートリミット（Upstash Redis）──────────────────────────────────────────
// Upstash未設定の場合（ローカル開発など）は null になりスキップ
let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, "1 h"),
      analytics: false,
    });
  }
  return ratelimit;
}

// ── CORS ────────────────────────────────────────────────────────────────────
// 許可するオリジン: 環境変数 ALLOWED_ORIGINS（カンマ区切り）+ localhost
function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [
    ...fromEnv,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ];
}

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] ?? "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// ── ハンドラー ───────────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // APIキー確認
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバー設定エラーが発生しました。" },
      { status: 500, headers }
    );
  }

  // レートリミット
  const rl = getRatelimit();
  if (rl) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success } = await rl.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "リクエスト数の上限に達しました。しばらくしてからお試しください。" },
        { status: 429, headers }
      );
    }
  }

  // 入力バリデーション
  let messages: { role: string; content: string }[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();

    // 件数制限
    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
    }

    // 各メッセージの文字数制限・roleチェック
    for (const m of messages) {
      if (typeof m.content !== "string" || typeof m.role !== "string") throw new Error();
      if (!["user", "assistant"].includes(m.role)) throw new Error();
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          { error: `1メッセージは${MAX_MESSAGE_LENGTH}文字以内でお送りください。` },
          { status: 400, headers }
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400, headers }
    );
  }

  // Gemini API 呼び出し
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text ?? "";
    return NextResponse.json({ content: text }, { headers });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        error:
          "現在つながりにくい状態です。しばらくしてからお試しいただくか、お問い合わせフォームをご利用ください。",
      },
      { status: 500, headers }
    );
  }
}
