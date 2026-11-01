import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Studio from './pages/Studio.jsx';
import Gallery from './pages/Gallery.jsx';
import About from './pages/About.jsx';
import { DEVELOPER } from './utils/constants.js';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200/60 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        AirDraw – AI-Powered Gesture-Based Drawing Platform · Designed &amp; developed by{' '}
        <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer" className="font-semibold text-violet-600 hover:underline dark:text-violet-300">
          {DEVELOPER.name}
        </a>
      </footer>
    </div>
  );
}