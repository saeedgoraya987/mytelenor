
// pages/index.js
import { useEffect, useState } from "react";
import Head from "next/head";   // ✅ required
// ❌ Do NOT import globals.css here (it lives in pages/_app.js)

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

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

      {/* Header */}
      <header className="header" id="top">
        <div className="header-content">
          <img src="/telenor-logo.svg" alt="Telenor" className="logo" />
          <h1>Telenor Quiz Fetcher</h1>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </header>

      {/* Questions */}
      <main className="container">
        {questions.length > 0 ? (
          questions.map((q, i) => (
            <div className="question-card" key={i}>
              <div className="question">
                Q{i + 1}: {q.question || "Not found"}
              </div>
              {q.answer && <div className="answer">{q.answer}</div>}
            </div>
          ))
        ) : (
          <p className="no-data">No quiz found</p>
        )}
      </main>

      {/* Floating menu */}
      <div className="fab-container">
        <button
          className={`fab ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <i className="fas fa-times"></i> : <i className="fas fa-ellipsis-h"></i>}
        </button>
        {menuOpen && (
          <div className="fab-options">
            <a href="#top" className="fab-btn" title="Go Top">
              <i className="fas fa-arrow-up"></i>
            </a>
            <a href="https://t.me/YourTelegram" target="_blank" className="fab-btn" title="Telegram">
              <i className="fab fa-telegram"></i>
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        © 2025 Telenor Quiz — Saeed Ahmed
      </footer>
    </>
  );
}
