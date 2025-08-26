// pages/index.js
import { useEffect, useState } from "react";
import Head from "next/head"; // keep this!

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCards, setOpenCards] = useState(new Set());

  // Fetch quiz
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/quiz");
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("Error fetching quiz:", err);
      }
    }
    fetchData();
  }, []);

  // Progress bar animation
  useEffect(() => {
    const bar = document.querySelector(".progress-fill");
    if (!bar) return;
    let width = 0;
    const interval = setInterval(() => {
      width = (width + 1) % 100;
      bar.style.width = `${width}%`;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleCard = (idx) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openTelegram = () => {
    if (typeof window !== "undefined") {
      window.open("https://t.me/YourTelegram", "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <Head>
        <title>Telenor Quiz Fetcher</title>
        <meta name="description" content="Daily Telenor Quiz Answers" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </Head>

      {/* Header (sticky) */}
      <header id="top">
        <div className="header-content">
          <img src="/telenor-logo.svg" alt="Telenor" className="logo" />
          <span>Telenor Quiz Fetcher</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </header>

      {/* Questions grid */}
      <main className="container">
        {questions.length > 0 ? (
          questions.map((q, i) => (
            <div
              className={`question-card ${openCards.has(i) ? "open" : ""}`}
              key={i}
              onClick={() => toggleCard(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCard(i);
                }
              }}
            >
              <div className="question">Q{i + 1}: {q?.question || "Not found"}</div>
              {q?.answer && <div className="answer">{q.answer}</div>}
            </div>
          ))
        ) : (
          <p className="no-data">No quiz found</p>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fab">
        <button
          className="fab-main"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <i className="fas fa-times" /> : <i className="fas fa-ellipsis-h" />}
        </button>

        <div className={`fab-options ${menuOpen ? "show" : ""}`}>
          <button title="Go Top" onClick={scrollToTop} aria-label="Go to top">
            <i className="fas fa-arrow-up" />
          </button>
          <button title="Telegram" onClick={openTelegram} aria-label="Open Telegram">
            <i className="fab fa-telegram" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer>© 2025 Telenor Quiz — Saeed Ahmed</footer>
    </>
  );
}
