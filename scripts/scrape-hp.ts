import { chromium } from "playwright";
import { writeFileSync } from "fs";

const PAGES = [
  { url: "https://www.kenpalinc.com/", label: "トップページ" },
  { url: "https://www.kenpalinc.com/about", label: "企業情報" },
  { url: "https://www.kenpalinc.com/philosophy", label: "企業理念" },
  { url: "https://www.kenpalinc.com/service", label: "開発事例" },
  { url: "https://www.kenpalinc.com/strengths", label: "Kenpalの強み" },
  { url: "https://www.kenpalinc.com/sdgs", label: "SDGs" },
  { url: "https://www.kenpalinc.com/careers", label: "健康経営・採用" },
  { url: "https://www.kenpalinc.com/careers/numbers", label: "数字で見るKenpal" },
  { url: "https://www.kenpalinc.com/careers/voices", label: "社員の声" },
  { url: "https://www.kenpalinc.com/careers/work-styles", label: "勤務制度" },
  { url: "https://www.kenpalinc.com/contact", label: "お問い合わせ" },
];

async function scrapePage(page: Awaited<ReturnType<typeof chromium.launch>>["contexts"][number]["pages"][number], url: string): Promise<string> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // STUDIOサイトはアニメーション後にコンテンツが表示される場合があるため少し待つ
  await page.waitForTimeout(2000);

  const text = await page.evaluate(() => {
    // 非表示要素・スクリプト・スタイルを除外してテキストを取得
    const excludeTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "SVG"]);
    function getText(el: Element): string {
      if (excludeTags.has(el.tagName)) return "";
      if (el instanceof HTMLElement && el.offsetParent === null && el.tagName !== "BODY") return "";
      const children = Array.from(el.childNodes);
      return children.map(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
        if (node.nodeType === Node.ELEMENT_NODE) return getText(node as Element);
        return "";
      }).join("");
    }
    return getText(document.body);
  });

  // 余分な空白行を圧縮
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join("\n");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
  });
  const page = await context.newPage();

  const results: string[] = [];

  for (const { url, label } of PAGES) {
    process.stdout.write(`取得中: ${label} (${url}) ... `);
    try {
      const text = await scrapePage(page, url);
      const section = `## ${label}\nURL: ${url}\n\n${text}`;
      results.push(section);
      console.log(`完了 (${text.length} 文字)`);
    } catch (e) {
      console.log(`エラー: ${e}`);
      results.push(`## ${label}\nURL: ${url}\n\n（取得失敗）`);
    }
  }

  await browser.close();

  const output = results.join("\n\n---\n\n");
  writeFileSync("scripts/hp-content.txt", output, "utf-8");
  console.log("\n✓ scripts/hp-content.txt に保存しました");
}

main().catch(console.error);
