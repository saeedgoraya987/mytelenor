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
    const isQuestion = (t) => /^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i.test(t);
    const cleanQ = (t) => norm(t.replace(/^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i, ""));
    const isExplicitAnswer = (t) => /^(?:Answer|Ans)\s*[:.)-]?\s*/i.test(t);
    const cleanA = (t) => norm(t.replace(/^(?:Answer|Ans)\s*[:.)-]?\s*/i, ""));

    // --- SAFE option/bullet detector (no astral ranges) ---
    // Matches:
    //   A) A. A: A-   (also lower-case)
    //   (1) 1) 1. 1:
    //   ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩
    //   • - ▪ ● bullets
    const looksLikeOption = (t) => {
      if (!t) return false;
      // Letter options A-D (expand if needed)
      if (/^\s*[A-Da-d]\s*[\)\.\:\-]\s+/u.test(t)) return true;
      // Numbered options
      if (/^\s*\(?\d{1,2}\)?\s*[\)\.\:\-]?\s+/u.test(t)) return true;
      // Circled digits ①..⑩
      if (/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s+/u.test(t)) return true;
      // Common bullets
      if (/^\s*[\-\•▪●]\s+/u.test(t)) return true;
      return false;
    };

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      "Telenor Quiz";

    // Collect ordered blocks with tag context
    const blocks = [];
    $("h1,h2,h3,h4,h5,h6,p,li,strong,b").each((_, el) => {
      const tag = el.tagName?.toLowerCase?.() || $(el).prop("tagName")?.toLowerCase() || "";
      const text = norm($(el).text());
      if (text) blocks.push({ tag, text });
    });

    const questions = [];

    for (let i = 0; i < blocks.length && questions.length < 5; i++) {
      const blk = blocks[i];
      if (!isQuestion(blk.text)) continue;

      const q = cleanQ(blk.text);
      let ans = "";

      // scan forward until next question or a max window
      const windowEnd = Math.min(i + 20, blocks.length);
      const windowBlocks = [];
      for (let j = i + 1; j < windowEnd; j++) {
        if (isQuestion(blocks[j].text)) break;
        windowBlocks.push(blocks[j]);
      }

      // 1) explicit Answer:
      const explicit = windowBlocks.find((b) => isExplicitAnswer(b.text));
      if (explicit) ans = cleanA(explicit.text);

      // 2) bold/strong immediately after
      if (!ans) {
        const bold = windowBlocks.find(
          (b) => (b.tag === "strong" || b.tag === "b") && b.text.length > 1
        );
        if (bold) ans = norm(bold.text.replace(/^Correct\s*[:\-]?\s*/i, ""));
      }

      // 3) list-looking option
      if (!ans) {
        const opt = windowBlocks.find((b) => (b.tag === "li" || b.tag === "p") && looksLikeOption(b.text));
        if (opt) {
          ans = norm(
            opt.text
              .replace(/^\s*[A-Da-d]\s*[\)\.\:\-]\s+/, "")
              .replace(/^\s*\(?\d{1,2}\)?\s*[\)\.\:\-]?\s+/, "")
          );
        }
      }

      // 4) first non-empty paragraph
      if (!ans) {
        const para = windowBlocks.find((b) => b.tag === "p" && b.text.length > 2);
        if (para) ans = cleanA(para.text);
      }

      if (!ans) ans = "Answer not found";
      questions.push({ question: q, answer: ans });
    }

    // secondary fallback if needed
    if (questions.length === 0) {
      $("h3,h4,strong,b,p").each((_, el) => {
        const t = norm($(el).text());
        if (!isQuestion(t) || questions.length >= 5) return;
        const q = cleanQ(t);
        let ans = "Answer not found";
        const sibs = $(el).nextAll("p,li,strong,b").slice(0, 10);
        for (let k = 0; k < sibs.length; k++) {
          const s = norm($(sibs[k]).text());
          if (!s) continue;
          if (isExplicitAnswer(s)) {
            ans = cleanA(s);
            break;
          }
          if (looksLikeOption(s)) {
            ans = norm(
              s
                .replace(/^\s*[A-Da-d]\s*[\)\.\:\-]\s+/, "")
                .replace(/^\s*\(?\d{1,2}\)?\s*[\)\.\:\-]?\s+/, "")
            );
            break;
          }
          const tag = $(sibs[k]).prop("tagName")?.toLowerCase();
          if (tag === "strong" || tag === "b" || tag === "p") {
            ans = cleanA(s);
            break;
          }
        }
        questions.push({ question: q, answer: ans });
      });
    }

    const cleaned = questions
      .map((qa) => ({
        question: qa.question,
        answer: qa.answer.replace(/^(?:Correct\s*Answer\s*[:\-]?\s*)/i, "").trim(),
      }))
      .filter((qa) => qa.question && qa.answer);

    return res.status(200).json({
      ok: true,
      title,
      questions: cleaned.slice(0, 5),
      source: url,
    });
  } catch (err) {
    console.error("Quiz scrape failed:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch quiz" });
  }
}
