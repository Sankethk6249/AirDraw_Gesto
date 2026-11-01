import { ExternalLink } from 'lucide-react';
import GestureGuide from '../components/GestureGuide.jsx';
import { DEVELOPER } from '../utils/constants.js';

const STACK = [
  ['Frontend', 'React 18, Vite, Tailwind CSS, HTML5 Canvas, Lucide icons'],
  ['AI & vision', 'MediaPipe Tasks Vision – HandLandmarker (21 landmarks, runs in the browser)'],
  ['Backend', 'Node.js, Express, REST API, express-validator, Helmet, CORS, rate limiting'],
  ['Database', 'MongoDB with Mongoose; PNG files on disk, metadata in MongoDB'],
];

export default function About() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <section>
        <h1 className="font-display text-3xl font-bold">About AirDraw</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          AirDraw is a touch-free drawing studio. Your webcam feed goes through a hand-landmark model running in your browser;
          fingertip positions are smoothed and mapped onto a canvas, and a gesture classifier decides whether you are drawing,
          erasing, moving or paused. Only artwork you explicitly save is sent to the server.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Technology">
        {STACK.map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-4">
            <h2 className="font-semibold">{k}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{v}</p>
          </div>
        ))}
      </section>

      <GestureGuide />

      <section className="glass rounded-2xl p-6" aria-label="Developer information">
        <h2 className="text-lg font-semibold">Developer</h2>
        <div className="mt-3 flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 font-display text-2xl font-bold text-white">SK</span>
          <div>
            <p className="text-xl font-bold">{DEVELOPER.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{DEVELOPER.role}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{DEVELOPER.education}</p>
          </div>
        </div>
        <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer" className="btn-ghost mt-4">
          LinkedIn <ExternalLink size={15} />
        </a>
      </section>
    </div>
  );
}