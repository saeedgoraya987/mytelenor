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

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      "Telenor Quiz";

    // ---------- helpers ----------
    const norm = (s = "") => s.replace(/\s+/g, " ").trim();
    const isQuestion = (t) => /^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i.test(t);
    const cleanQ = (t) => norm(t.replace(/^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i, ""));
    const isExplicitAnswer = (t) => /^(?:Answer|Ans)\s*[:.)-]?\s*/i.test(t);
    const cleanA = (t) => norm(t.replace(/^(?:Answer|Ans)\s*[:.)-]?\s*/i, ""));

    // Many posts put answers in lists or bold. Consider these as answer candidates.
    const looksLikeOption = (t) =>
      /^([A-D][\).:-]|[①-⑩🅐-🅩])\s*/i.test(t) || // A) A. ① 🅐 etc.
      /^[\-\•]\s+/.test(t);

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

      // Scan forward until next question or max window
      const windowEnd = Math.min(i + 20, blocks.length); // generous window
      const windowBlocks = [];

      for (let j = i + 1; j < windowEnd; j++) {
        if (isQuestion(blocks[j].text)) break; // stop at next question
        windowBlocks.push(blocks[j]);
      }

      // 1) Prefer explicit "Answer:" lines
      const explicit = windowBlocks.find((b) => isExplicitAnswer(b.text));
      if (explicit) ans = cleanA(explicit.text);

      // 2) Otherwise, first strong/bold after Q
      if (!ans) {
        const bold = windowBlocks.find((b) => (b.tag === "strong" || b.tag === "b") && b.text.length > 1);
        if (bold) ans = norm(bold.text.replace(/^Correct\s*[:\-]?\s*/i, ""));
      }

      // 3) Otherwise, first list item that looks like an option
      if (!ans) {
        const opt = windowBlocks.find((b) => b.tag === "li" && looksLikeOption(b.text));
        if (opt) {
          // Sometimes list lines are like "A) Islamabad". Drop the "A) "
          ans = norm(opt.text.replace(/^([A-D][\).:-]\s*)/i, ""));
        }
      }

      // 4) Otherwise, first meaningful paragraph after Q
      if (!ans) {
        const para = windowBlocks.find((b) => b.tag === "p" && b.text.length > 2);
        if (para) ans = cleanA(para.text);
      }

      // Fallback
      if (!ans) ans = "Answer not found";

      questions.push({ question: q, answer: ans });
    }

    // Secondary fallback (rare): if nothing collected, try a simple adjacent selector scan
    if (questions.length === 0) {
      $("h3,h4,strong,b,p").each((_, el) => {
        const t = norm($(el).text());
        if (isQuestion(t) && questions.length < 5) {
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
            if (looksLikeOption(s) || $(sibs[k]).prop("tagName")?.toLowerCase() === "strong") {
              ans = norm(s.replace(/^([A-D][\).:-]\s*)/i, ""));
              break;
            }
            if ($(sibs[k]).prop("tagName")?.toLowerCase() === "p" && s.length > 2) {
              ans = cleanA(s);
              break;
            }
          }
          questions.push({ question: q, answer: ans });
        }
      });
    }

    // De-duplicate empty/noisy answers
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
