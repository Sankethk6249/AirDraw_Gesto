import { Download, Eraser, Maximize2, Minimize2, Move, Pencil, Redo2, Save, Trash2, Undo2 } from 'lucide-react';
import ColourPicker from './ColourPicker.jsx';

const TOOLS = [
  { id: 'draw', label: 'Draw (D)', icon: Pencil },
  { id: 'erase', label: 'Eraser (E)', icon: Eraser },
  { id: 'move', label: 'Move (M)', icon: Move },
];
const SIZES = [4, 8, 14, 24];

function IconButton({ label, onClick, disabled, active, live, danger, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      data-gesture-target
      onClick={onClick}
      disabled={disabled}
      className={`tool-btn ${active ? 'tool-btn-active' : ''} ${danger ? 'hover:!bg-rose-500/20 hover:!text-rose-500' : ''}`}
    >
      {children}
      {live && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-cyan-400" />}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 hidden h-6 w-px bg-slate-400/30 sm:block" />;

export default function DrawingToolbar({
  tool, setTool, activeMode, color, setColor, size, setSize,
  canUndo, canRedo, onUndo, onRedo, onClear, onSave, onDownload, onFullscreen, isFullscreen,
}) {
  return (
    <div className="glass pointer-events-auto flex max-w-full flex-col gap-2 rounded-2xl p-2 sm:p-2.5" role="toolbar" aria-label="Drawing tools">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <IconButton key={id} label={label} active={tool === id} live={activeMode === id} onClick={() => setTool(id)}>
            <Icon size={18} />
          </IconButton>
        ))}
        <Divider />
        <IconButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}><Undo2 size={18} /></IconButton>
        <IconButton label="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /></IconButton>
        <IconButton label="Clear canvas" onClick={onClear} danger><Trash2 size={18} /></IconButton>
        <Divider />
        <IconButton label="Save to gallery" onClick={onSave}><Save size={18} /></IconButton>
        <IconButton label="Download PNG" onClick={onDownload}><Download size={18} /></IconButton>
        <IconButton label={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={onFullscreen}>
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </IconButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <ColourPicker color={color} onChange={setColor} />
        <div className="flex items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              data-gesture-target
              title={`Brush size ${s}`}
              aria-label={`Brush size ${s}`}
              aria-pressed={size === s}
              onClick={() => setSize(s)}
              className={`tool-btn !h-8 !w-8 ${size === s ? 'tool-btn-active' : ''}`}
            >
              <span className="rounded-full bg-current" style={{ width: Math.min(s, 18) * 0.8 + 3, height: Math.min(s, 18) * 0.8 + 3 }} />
            </button>
          ))}
          <input
            type="range"
            min="2"
            max="40"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="Brush size"
            className="ml-1 hidden w-24 accent-violet-500 sm:block"
          />
        </div>
      </div>
    </div>
  );
}