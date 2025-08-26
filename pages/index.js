import { useEffect, useState } from "react";

export default function Home() {
  const [quiz, setQuiz] = useState({ title: "", questions: [] });

  useEffect(() => {
    fetch("/api/quiz")
      .then(res => res.json())
      .then(data => setQuiz(data))
      .catch(() => setQuiz({ title: "Error loading quiz", questions: [] }));
  }, []);

  // Progress bar updater
  useEffect(() => {
    function updateProgress() {
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const percent = ((now - start) / (end - start)) * 100;
      const bar = document.querySelector(".progress-fill");
      if (bar) bar.style.width = percent + "%";
    }
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <img src="/telenor.svg" alt="Telenor" className="logo" />
          <span>Telenor Quiz Fetcher</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </header>

      <main className="container">
        {quiz.questions.length > 0 ? (
          quiz.questions.map((q, i) => (
            <div key={i} className="question-card" onClick={e => e.currentTarget.classList.toggle("open")}>
              <div className="question">Q{i + 1}: {q.question}</div>
              <div className="answer"><i className="fa-solid fa-check-circle"></i> {q.answer}</div>
            </div>
          ))
        ) : (
          <p>⚠️ No quiz data available</p>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fab">
        <div className="fab-options" id="fabOptions">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><i className="fa-solid fa-arrow-up"></i></button>
          <button onClick={() => window.open("https://t.me/yourtelegram", "_blank")}><i className="fa-brands fa-telegram"></i></button>
        </div>
        <button className="fab-main" id="fabMain" onClick={() => {
          const fabOptions = document.getElementById("fabOptions");
          const fabMain = document.getElementById("fabMain").querySelector("i");
          fabOptions.classList.toggle("show");
          if (fabOptions.classList.contains("show")) {
            fabMain.classList.remove("fa-ellipsis");
            fabMain.classList.add("fa-times");
          } else {
            fabMain.classList.remove("fa-times");
            fabMain.classList.add("fa-ellipsis");
          }
        }}>
          <i className="fa-solid fa-ellipsis"></i>
        </button>
      </div>

      <footer>© {new Date().getFullYear()} Telenor Quiz — Saeed Ahmed</footer>

      <style jsx>{`
        :root {
        --bg: #e3f2fd;
        --text: #222;
        --primary: #007bff;
        --success: #28a745;
        --glass: rgba(255,255,255,0.65);
    }
    body {
        margin: 0;
        font-family: "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
        transition: 0.3s;
    }
    header {
        background: linear-gradient(135deg, #007bff, #00bfff);
        color: #fff;
        padding: 15px 20px;
        text-align: center;
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .header-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
    }
    .header-content img.logo { height: 38px; }
    .header-content span { font-size: 22px; font-weight: 600; }
    .progress-bar {
        height: 6px;
        background: rgba(255,255,255,0.3);
        margin-top: 10px;
        border-radius: 5px;
        overflow: hidden;
    }
    .progress-fill { height: 100%; background: var(--success); width: 0; }

    .container {
        max-width: 900px;
        margin: 20px auto;
        padding: 0 15px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
    }

    .question-card {
        background: var(--glass);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
    }
    .question-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.2);
    }
    .question { font-weight: bold; font-size: 17px; margin-bottom: 10px; }
    .answer {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease, padding 0.3s ease;
        color: var(--success);
        font-weight: 600;
    }
    .question-card.open .answer { max-height: 200px; padding-top: 10px; }

    /* FAB styles */
    /* FAB styles */
.fab {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999; /* Always on top */
}

.fab-main, .fab-options button {
    width: 55px;
    height: 55px;
    border-radius: 50%;
    border: none;
    background: var(--primary);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: transform 0.3s, opacity 0.3s;
}

    .fab-options {
        position: absolute;
        bottom: 70px;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
        transition: all 0.3s ease;
    }
    .fab-options.show {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
    }
    footer {
        text-align: center;
        font-size: 14px;
        padding: 30px;
        opacity: 0.8;
    }

      `}</style>
    </div>
  );
}
