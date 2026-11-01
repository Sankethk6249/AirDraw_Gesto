import { Palette } from 'lucide-react';

export const SWATCHES = [
  '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#facc15',
  '#22c55e', '#06b6d4', '#3b82f6', '#ffffff', '#0f172a',
];

export default function ColourPicker({ color, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Brush colour">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={color === c}
          aria-label={`Colour ${c}`}
          title={c}
          data-gesture-target
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-full border border-black/20 transition-transform hover:scale-110 sm:h-6 sm:w-6 ${
            color === c ? 'scale-110 ring-2 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        title="Custom colour"
        className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 text-white sm:h-6 sm:w-6"
      >
        <Palette size={13} />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Custom colour picker"
        />
      </label>
    </div>
  );
}