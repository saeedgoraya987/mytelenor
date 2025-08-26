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


    </div>
  );
}
