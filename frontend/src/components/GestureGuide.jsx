const ITEMS = [
  { id: 'DRAW', icon: '☝️', title: 'Index finger up', text: 'Draw with the selected tool (brush or eraser).' },
  { id: 'TWO_FINGER', icon: '✌️', title: 'Two fingers up', text: 'Move mode: drag the whole artwork. Releases back to your tool.' },
  { id: 'FIST', icon: '✊', title: 'Closed fist', text: 'Eraser: wipe with your palm.' },
  { id: 'PALM', icon: '🖐️', title: 'Open palm', text: 'Pause: nothing is drawn while you reposition.' },
  { id: 'PINCH', icon: '🤏', title: 'Pinch', text: 'Click the toolbar button under your cursor.' },
];

export default function GestureGuide({ active, compact = false }) {
  return (
    <section className="glass rounded-2xl p-3" aria-label="Gesture guide">
      <h2 className="mb-2 text-sm font-semibold">Gesture guide</h2>
      <ul className="space-y-1.5">
        {ITEMS.map((g) => (
          <li
            key={g.id}
            className={`flex items-start gap-3 rounded-xl p-2 transition-colors ${
              active === g.id ? 'bg-violet-500/15 ring-1 ring-violet-500/40' : 'bg-slate-500/5'
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden="true">{g.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{g.title}</p>
              {!compact && <p className="text-xs text-slate-500 dark:text-slate-400">{g.text}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Tips: good front lighting, keep your hand 40–80 cm from the camera, and hold each pose for a moment. Mouse and touch also work.
      </p>
    </section>
  );
}