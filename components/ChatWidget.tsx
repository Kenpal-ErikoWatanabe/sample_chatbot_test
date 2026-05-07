"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

const CONTACT_FORM_URL =
  process.env.NEXT_PUBLIC_CONTACT_FORM_URL ?? "https://www.kenpalinc.com/contact";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "こんにちは！Kenpal株式会社のAIアシスタントです。\nサービスや会社情報についてご質問があればお気軽にどうぞ。\n\nHello! I'm Kenpal Inc.'s AI assistant.\nFeel free to ask me anything about our services or company.",
};

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="underline text-blue-600 break-all">{part}</a>
    ) : (
      <span key={i} className="whitespace-pre-wrap">{part}</span>
    )
  );
}

function IconChat() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました。");
        setMessages(messages);
      } else {
        setMessages([...next, { role: "assistant", content: data.content }]);
      }
    } catch {
      setError("通信エラーが発生しました。ネットワーク接続をご確認ください。");
      setMessages(messages);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 flex flex-col items-end gap-3 z-50">

      {/* チャットウィンドウ */}
      {isOpen && (
        <div className="flex flex-col w-[360px] h-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

          {/* ヘッダー */}
          <header className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                K
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Kenpal AIアシスタント</p>
                <p className="text-xs text-blue-100">kenpalinc.com の情報をもとに回答します</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="チャットを閉じる"
            >
              <IconClose />
            </button>
          </header>

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mb-1">
                      K
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 shadow-sm">
                      {linkify(msg.content)}
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm shadow-sm">
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mb-1">K</div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
                <p>{error}</p>
                <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer"
                  className="underline font-medium mt-1 inline-block">
                  お問い合わせフォームへ →
                </a>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 免責事項 */}
          <p className="text-center text-[10px] text-gray-400 px-4 py-1 bg-white shrink-0">
            AIの回答は参考情報です。正確な情報は
            <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline">
              お問い合わせフォーム
            </a>
            でご確認ください。
          </p>

          {/* 入力欄 */}
          <form onSubmit={handleSubmit}
            className="flex items-end gap-2 px-3 py-3 bg-white border-t border-gray-200 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力… (Shift+Enter で改行)"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 max-h-28 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex items-center justify-center shrink-0"
              aria-label="送信"
            >
              <IconSend />
            </button>
          </form>
        </div>
      )}

      {/* チャットバブルボタン */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? "bg-gray-500 hover:bg-gray-600 rotate-0"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white`}
        aria-label={isOpen ? "チャットを閉じる" : "チャットを開く"}
      >
        {isOpen ? <IconClose /> : <IconChat />}
      </button>
    </div>
  );
}
