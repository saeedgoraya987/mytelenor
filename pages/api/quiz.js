import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const response = await fetch("https://wikitechlibrary.com/today-telenor-quiz-answers/");
    const html = await response.text();
    const $ = cheerio.load(html);

    let data = { title: $("title").text().trim(), questions: [] };

    let count = 0;
    $("h4, strong").each((i, el) => {
      if (count >= 5) return false;

      const question = $(el).text().trim();
      const answer = $(el).next("p").text().trim() || "Answer not found";

      // Clean text
      const cleanQ = question.replace(/^(Question\s*\d+:?|Q\s*\d+:?)/i, "").trim();
      const cleanA = answer.replace(/^Answer:?\s*/i, "").trim();

      data.questions.push({ question: cleanQ, answer: cleanA });
      count++;
    });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
}
