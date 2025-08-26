// pages/_app.js
import "../styles/globals.css"; // ✅ only place for global CSS

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
