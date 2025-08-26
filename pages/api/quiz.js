// pages/api/quiz.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const url = "https://wikitechlibrary.com/today-telenor-quiz-answers/";

    // Fetch with a real UA and disable caching (Vercel/Next sometimes caches fetch)
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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

    // Collect textual blocks in order to robustly detect Q/A regardless of exact tags
    const blocks = [];
    $("h1, h2, h3, h4, h5, h6, p, li, strong, b").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t) blocks.push(t);
    });

    // Helper cleaners
    const cleanQ = (s) =>
      s
        .replace(/^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i, "")
        .replace(/^Q\s*[:.)-]?\s*/i, "")
        .trim();

    const cleanA = (s) =>
      s
        .replace(/^Answer\s*[:.)-]?\s*/i, "")
        .replace(/^Ans\s*[:.)-]?\s*/i, "")
        .trim();

    // Strategy:
    // 1) Walk the blocks in order.
    // 2) If a block looks like a Question, scan ahead for the nearest plausible Answer
    //    (a block that starts with "Answer" OR the very next non-empty block).
    const questions = [];
    for (let i = 0; i < blocks.length && questions.length < 5; i++) {
      const txt = blocks[i];

      // Detect a question
      if (/^(?:Question|Q)\s*\d*\s*[:.)-]?\s*/i.test(txt)) {
        const q = cleanQ(txt);

        // Find answer: prefer the next block that begins with "Answer".
        // If not found within a small window, fall back to the immediate next non-empty block.
        let ans = "";
        let foundExplicit = false;

        for (let j = i + 1; j < Math.min(i + 6, blocks.length); j++) {
          const cand = blocks[j];
          if (/^Answer\s*[:.)-]?/i.test(cand) || /^Ans\s*[:.)-]?/i.test(cand)) {
            ans = cleanA(cand);
            foundExplicit = true;
            break;
          }
        }

        if (!foundExplicit) {
          // fallback: next non-empty block (often they put Q then the answer text)
          const cand = blocks[i + 1] || "";
          ans = cleanA(cand) || cand;
        }

        if (!ans) ans = "Answer not found";
        questions.push({ question: q, answer: ans });
      }
    }

    // Extra fallback: if nothing matched, try a secondary selector approach
    if (questions.length === 0) {
      $("h4, h3, strong, p").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (/^(?:Question|Q)\s*\d*\s*[:.)-]?/i.test(t) && questions.length < 5) {
          const q = cleanQ(t);
          // look ahead among next siblings
          let ans = "Answer not found";
          const sibs = $(el).nextAll("p, li, strong");
          for (let k = 0; k < sibs.length; k++) {
            const s = $(sibs[k]).text().replace(/\s+/g, " ").trim();
            if (!s) continue;
            if (/^Answer\s*[:.)-]?/i.test(s) || /^Ans\s*[:.)-]?/i.test(s)) {
              ans = cleanA(s) || "Answer not found";
              break;
            } else {
              // take first meaningful sibling as fallback
              ans = cleanA(s) || s;
              break;
            }
          }
          questions.push({ question: q, answer: ans });
        }
      });
    }

    // Ensure we have something to show
    const payload = {
      ok: true,
      title,
      questions: questions.slice(0, 5),
      source: url,
    };

    // CORS (so your frontend fetch works locally and on Vercel)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error("Quiz scrape failed:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch quiz" });
  }
}
