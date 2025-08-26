Telenor Quiz Fetcher

A simple Next.js application that fetches the daily Telenor quiz questions and answers from the web, displays them with a clean UI, includes a 24-hour progress bar for the day, and offers Floating Action Buttons (FAB) for quick links like YouTube and Telegram.


---

🚀 Features

Daily Quiz Fetching: Automatically scrapes the latest questions and answers.

Server-Side Rendering (SSR): Data is ready before the page loads for faster performance.

24-Hour Progress Bar: Visual day progress with time left until midnight in Asia/Karachi timezone.

Floating Action Buttons: Quick access to YouTube and Telegram links.

Responsive UI: Fully optimized for mobile and desktop.



---

📂 Project Structure

.
├── pages
│   ├── api
│   │   └── quiz.js          # API endpoint for scraping quiz data
│   ├── _app.js              # Global CSS imports
│   └── index.js             # Main page with SSR and UI logic
├── public
│   └── telenor.svg          # App logo
├── styles
│   └── globals.css          # Global styles and FAB design
└── README.md


---

🛠️ Installation & Setup

1. Clone this repository



git clone https://github.com/your-username/telenor-quiz-fetcher.git
cd telenor-quiz-fetcher

2. Install dependencies



npm install

3. Start the development server



npm run dev

4. Open http://localhost:3000 in your browser.




---

⚙️ Environment Variables (Optional)

If you deploy on Vercel or another platform, set your site URL in a .env file:

NEXT_PUBLIC_SITE_URL=https://your-vercel-deployment-url.vercel.app


---

📦 Deployment

For deployment on Vercel:

npm run build
vercel deploy


---

🔧 Tech Stack

Next.js — React framework

Cheerio — Web scraping

Font Awesome — Icons

Vercel — Hosting & deployment



---

🤝 Contributing

1. Fork this repository


2. Create a new branch: git checkout -b feature-name


3. Commit changes: git commit -m "Add feature-name"


4. Push the branch: git push origin feature-name


5. Open a Pull Request




---

📜 License

This project is licensed under the MIT License.

