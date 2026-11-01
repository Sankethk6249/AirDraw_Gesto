import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Hand, Layers, Palette, ShieldCheck, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Hand, title: 'Real-time hand tracking', text: 'MediaPipe finds 21 landmarks on your hand, right in the browser, at video frame rate.' },
  { icon: Cpu, title: 'Stable gesture recognition', text: 'Finger angles and distances, debounced over several frames, so poses never flicker into stray lines.' },
  { icon: Zap, title: 'Smooth, fast strokes', text: 'A One Euro filter removes jitter while keeping quick movements responsive.' },
  { icon: Palette, title: 'A full drawing toolkit', text: 'Colours, brush sizes, eraser, move, undo and redo, clear, PNG export and full screen.' },
  { icon: Layers, title: 'Your gallery', text: 'Save artwork to MongoDB-backed storage, then rename, preview, download or delete it.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Webcam frames are processed on your device. Only artwork you choose to save is uploaded.' },
];

const STEPS = [
  ['Allow the camera', 'Your browser asks first. Nothing starts without your permission.'],
  ['Raise your index finger', 'The cursor follows your fingertip and strokes appear on the canvas.'],
  ['Switch with gestures', 'Two fingers move the artwork, a fist erases, an open palm pauses, a pinch clicks.'],
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Draw Beyond Touch. Create with Gestures.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Experience the future of digital creativity with AI-powered hand tracking and touch-free interaction.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/studio?camera=1" className="btn-primary !px-7 !py-3.5 !text-base">
              Start Drawing <ArrowRight size={18} />
            </Link>
            <Link to="/studio" className="btn-ghost !px-6 !py-3.5 !text-base">Open studio without camera</Link>
          </div>
        </div>

        <div className="glass animate-float relative aspect-video overflow-hidden rounded-3xl" aria-hidden="true">
          <svg viewBox="0 0 640 360" className="h-full w-full">
            <defs>
              <linearGradient id="hero-stroke" x1="0" x2="1">
                <stop offset="0" stopColor="#8b5cf6" />
                <stop offset="0.5" stopColor="#ec4899" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M60 250 C 140 80, 220 80, 280 200 S 420 300, 470 150 S 560 70, 590 130" fill="none" stroke="url(#hero-stroke)" strokeWidth="14" strokeLinecap="round" />
            <circle cx="590" cy="130" r="16" fill="none" stroke="#fff" strokeWidth="3" />
            <circle cx="590" cy="130" r="30" fill="#06b6d4" opacity="0.2" />
          </svg>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="features">
        <h2 id="features" className="mb-6 font-display text-2xl font-bold sm:text-3xl">Built for hands, not mice</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glass rounded-2xl p-5">
              <Icon className="mb-3 text-violet-500" size={22} />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="mb-6 font-display text-2xl font-bold sm:text-3xl">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="glass rounded-2xl p-5">
              <span className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">{i + 1}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}