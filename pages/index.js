// pages/index.js
import { useEffect, useState } from "react";
import Head from "next/head";

// --- Helpers for Asia/Karachi day math (no libs) ---
function getKarachiNow() {
  // Build a Date from Karachi components to avoid local timezone drift
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  // YYYY-MM-DDTHH:mm:ss treated as local; append "Z" using the *actual* TZ offset by recomputing.
  // Easier: construct a Date from UTC pieces by subtracting the Karachi offset from real now:
  // But different offsets across systems can be tricky; simpler approach:
  const { year, month, day, hour, minute, second } = parts;
  // Create a date string and let Date parse as local, then compensate using Karachi clock:
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

function karachiDayBounds(now = getKarachiNow()) {
  // Derive Karachi Y/M/D from formatted parts again
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month) - 1;
  const d = Number(parts.day);
  // Start/end as local Dates (we only use differences, so it’s fine)
  const start = new Date(y, m, d, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  return { start, end };
}

function fmtHMS(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  s %= 3600;
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  s %= 60;
  const ss = String(s).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

export default function Home({ initialQuestions = [] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCards, setOpenCards] = useState(new Set());

  // Optional: background refresh on client (keeps content fresh if API updates)
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/quiz", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.questions)) setQuestions(data.questions);
      } catch (e) {
        console.warn("Refresh failed:", e);
      }
    }
    // Refresh once after mount and every 10 min (quiz changes daily anyway)
    refresh();
    const t = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // 24-hour progress for Asia/Karachi + time left
  const [dayPct, setDayPct] = useState(0);
  const [timeLeft, setTimeLeft] = useState("00:00:00");

  useEffect(() => {
    const tick = () => {
      const now = getKarachiNow();
      const { start, end } = karachiDayBounds(now);
      const total = end - start;
      const passed = now - start;
      const pct = Math.min(100, Math.max(0, (passed / total) * 100));
      setDayPct(pct);
      setTimeLeft(fmtHMS(end - now));
      // also drive the CSS width
      const bar = document.querySelector(".progress-fill");
      if (bar) bar.style.width = `${pct}%`;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleCard = (idx) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const openTelegram = () => window.open("https://t.me/YourTelegram", "_blank", "noopener,noreferrer");

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
          <img src="/telenor.svg" alt="Telenor" className="logo" />
          <span>Telenor Quiz Fetcher</span>
        </div>
        <div className="progress-bar" aria-label="Day progress in Asia/Karachi" title={`Ends in ${timeLeft}`}>
          <div className="progress-fill" />
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
          Day progress (Asia/Karachi): {dayPct.toFixed(1)}% — Time to midnight: {timeLeft}
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
              <div className="question">
                Q{i + 1}: {q?.question || "Not found"}
              </div>
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

// --- Server-side render so the quiz is ready on first paint ---
export async function getServerSideProps({ req }) {
  try {
    const proto =
      (req.headers["x-forwarded-proto"] as string) ||
      (req.connection && req.connection.encrypted ? "https" : "http") ||
      "https";
    const host = req.headers.host;
    const base = `${proto}://${host}`;
    const r = await fetch(`${base}/api/quiz`, { cache: "no-store" });
    const data = await r.json();
    return { props: { initialQuestions: data.questions || [] } };
  } catch {
    // Fallback to empty; client refresh will try again
    return { props: { initialQuestions: [] } };
  }
}
