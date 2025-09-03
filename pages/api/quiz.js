// pages/api/quiz.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const url = "https://wikitechlibrary.com/today-telenor-quiz-answers/";

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: "Upstream fetch failed" });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const norm = (s = "") => s.replace(/\s+/g, " ").trim();

    // pick article body (WordPress-ish)
    let $root =
      $(".entry-content").first() ||
      $(".td-post-content").first() ||
      $("article .post-content").first() ||
      $("article").first();
    if (!$root || $root.length === 0) $root = $("body");

    // remove ToC / shares / sidebars
    $root.find('[id*="toc"], [class*="toc"], .ez-toc-container, .toc-container').remove();
    $root.find('[class*="share"], .sharedaddy, .jp-relatedposts').remove();
    $root.find("nav, aside").remove();

    // --- question/answer helpers ---
    // Require: "Question" or "Q" + number, then later a '?'
    const isQuestion = (t) =>
      /^(?:Question|Q)\s*\d+\s*[:.)-]?\s*/i.test(t) && /[?]/.test(t);
    const cleanQ = (t) =>
      norm(
        t
          .replace(/^(?:Question|Q)\s*\d+\s*[:.)-]?\s*/i, "")
          .replace(/\s*\?+\s*$/, "?")
      );

    const isExplicitAnswer = (t) =>
      /^(?:Answer|Ans|Correct Answer)\s*[:.)-]?\s*/i.test(t);
    const cleanA = (t) =>
      norm(t.replace(/^(?:Answer|Ans|Correct Answer)\s*[:.)-]?\s*/i, ""));

    const looksLikeOption = (t) => {
      if (!t) return false;
      if (/^\s*[A-Da-d]\s*[).:-]\s+/.test(t)) return true;      // A) A. A: A-
      if (/^\s*\(?\d{1,2}\)?\s*[).:-]?\s+/.test(t)) return true; // (1) 1) 1.
      if (/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s+/.test(t)) return true;       // circled digits
      if (/^\s*[-•▪●]\s+/.test(t)) return true;                 // bullets
      return false;
    };

    // build blocks only from the root
    const blocks = [];
    $root.find("h1,h2,h3,h4,h5,h6,p,li,strong,b").each((_, el) => {
      const tag = el.tagName?.toLowerCase?.() || $(el).prop("tagName")?.toLowerCase() || "";
      const text = norm($(el).text());
      if (!text) return;

      // skip noise
      if (/^read also[:\s]/i.test(text)) return;
      if (/table of contents/i.test(text)) return;
      if (/quiz questions/i.test(text)) return;
      if (/play telenor quiz/i.test(text)) return;

      blocks.push({ tag, text });
    });

    // start at first REAL question
    const firstQIndex = blocks.findIndex((b) => isQuestion(b.text));
    const scanBlocks = firstQIndex >= 0 ? blocks.slice(firstQIndex) : [];

    const qa = [];
    for (let i = 0; i < scanBlocks.length && qa.length < 5; i++) {
      const blk = scanBlocks[i];
      if (!isQuestion(blk.text)) continue;

      const q = cleanQ(blk.text);
      if (!q || !q.endsWith("?")) continue; // enforce a proper question

      // collect window until next question
      const windowBlocks = [];
      for (let j = i + 1; j < Math.min(i + 30, scanBlocks.length); j++) {
        if (isQuestion(scanBlocks[j].text)) break;
        windowBlocks.push(scanBlocks[j]);
      }

      // 1) explicit Answer:
      let ans = "";
      const explicit = windowBlocks.find((b) => isExplicitAnswer(b.text));
      if (explicit) ans = cleanA(explicit.text);

      // 2) bold/strong line (often the correct option is bold)
      if (!ans) {
        const bold = windowBlocks.find(
          (b) => (b.tag === "strong" || b.tag === "b") && b.text.length > 1
        );
        if (bold) ans = cleanA(bold.text.replace(/^Correct\s*[:\-]?\s*/i, ""));
      }

      // 3) list-looking option (prefer LI, else P)
      if (!ans) {
        const opt = windowBlocks.find(
          (b) => (b.tag === "li" || b.tag === "p") && looksLikeOption(b.text)
        );
        if (opt) {
          ans = norm(
            opt.text
              .replace(/^\s*[A-Da-d]\s*[).:-]\s+/, "")
              .replace(/^\s*\(?\d{1,2}\)?\s*[).:-]?\s+/, "")
          );
        }
      }

      // 4) first meaningful paragraph
      if (!ans) {
        const para = windowBlocks.find((b) => b.tag === "p" && b.text.length > 2);
        if (para) ans = cleanA(para.text);
      }

      qa.push({ question: q, answer: ans || "Answer not found" });
    }

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      "Telenor Quiz";

    return res.status(200).json({
      ok: true,
      title,
      questions: qa.slice(0, 5),
      source: url,
    });
  } catch (err) {
    console.error("Quiz scrape failed:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch quiz" });
  }
}
