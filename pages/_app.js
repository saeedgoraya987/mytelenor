// pages/_app.js
import "@/styles/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css"; // icons

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
