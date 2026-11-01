import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  CANVAS_W as W,
  CANVAS_H as H,
  drawDot,
  drawIncremental,
  finishStroke,
  applyOp,
  exportWithBackground,
} from '../utils/canvasUtils.js';

const MAX_OPS = 120; // history length before the oldest operations are baked into a base layer
const KEEP_OPS = 80;

/**
 * Drawing engine. The artwork is a list of operations (strokes, moves, clears) replayed on undo,
 * so history is cheap in memory. Hands and pointers drive it through the same `drive(mode, x, y)` call.
 */
function createDrawingEngine(canvas, getLive) {
  const ctx = canvas.getContext('2d');
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const base = make();
  const tmp = make();
  const snap = make();
  const baseCtx = base.getContext('2d');

  let ops = [];
  let redoStack = [];
  let current = null;
  let mode = null;
  let move = null;

  const notify = () => getLive().onHistoryChange?.({ canUndo: ops.length > 0, canRedo: redoStack.length > 0 });

  const replay = () => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    for (const op of ops) applyOp(ctx, tmp, op);
  };

  const push = (op) => {
    ops.push(op);
    redoStack = [];
    if (ops.length > MAX_OPS) {
      const dropped = ops.splice(0, ops.length - KEEP_OPS);
      for (const d of dropped) applyOp(baseCtx, tmp, d);
    }
    notify();
  };

  const begin = (m, x, y) => {
    mode = m;
    if (m === 'move') {
      const s = snap.getContext('2d');
      s.clearRect(0, 0, W, H);
      s.drawImage(canvas, 0, 0);
      move = { sx: x, sy: y, dx: 0, dy: 0 };
      return;
    }
    const { color, size } = getLive();
    const erase = m === 'erase';
    current = { kind: 'stroke', erase, color, size: erase ? Math.max(18, size * 3) : size, points: [{ x, y }] };
    drawDot(ctx, current);
  };

  const extend = (x, y) => {
    const last = current.points[current.points.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 1.5) return;
    current.points.push({ x, y });
    drawIncremental(ctx, current);
  };

  const finish = () => {
    if (!mode) return;
    if (mode === 'move') {
      if (move && Math.abs(move.dx) + Math.abs(move.dy) > 2) push({ kind: 'move', dx: move.dx, dy: move.dy });
      else replay();
    } else if (current) {
      finishStroke(ctx, current);
      push(current);
    }
    mode = null;
    current = null;
    move = null;
  };

  return {
    /** mode: 'draw' | 'erase' | 'move' | null (null ends the current action) */
    drive(nextMode, x, y) {
      if (nextMode !== mode) {
        finish();
        if (nextMode) begin(nextMode, x, y);
        return;
      }
      if (!nextMode) return;
      if (mode === 'move') {
        move.dx = Math.round(x - move.sx);
        move.dy = Math.round(y - move.sy);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(snap, move.dx, move.dy);
        ctx.restore();
      } else {
        extend(x, y);
      }
    },
    undo() {
      finish();
      if (!ops.length) return;
      redoStack.push(ops.pop());
      replay();
      notify();
    },
    redo() {
      finish();
      const op = redoStack.pop();
      if (!op) return;
      ops.push(op);
      applyOp(ctx, tmp, op);
      notify();
    },
    clear() {
      finish();
      if (ops.length && ops[ops.length - 1].kind === 'clear') return;
      push({ kind: 'clear' });
      ctx.clearRect(0, 0, W, H);
    },
    exportPNG(bg) {
      finish();
      return exportWithBackground(canvas, bg);
    },
  };
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { tool, color, size, bg, fullscreen, onHistoryChange, children },
  ref
) {
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const engine = useRef(null);
  const live = useRef({ tool, color, size, onHistoryChange });

  useEffect(() => {
    live.current = { tool, color, size, onHistoryChange };
  }, [tool, color, size, onHistoryChange]);

  useEffect(() => {
    engine.current = createDrawingEngine(canvasRef.current, () => live.current);
    live.current.onHistoryChange?.({ canUndo: false, canRedo: false });
    return () => {
      engine.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      drive: (mode, x, y) => engine.current?.drive(mode, x, y),
      undo: () => engine.current?.undo(),
      redo: () => engine.current?.redo(),
      clear: () => engine.current?.clear(),
      exportPNG: (bg) => engine.current?.exportPNG(bg),
      getRect: () => canvasRef.current.getBoundingClientRect(),
      /** Moves the on-screen hand cursor (direct DOM update, no React render). */
      showCursor: ({ visible, x, y, mode } = {}) => {
        const el = cursorRef.current;
        if (!el) return;
        if (!visible) {
          el.style.opacity = '0';
          return;
        }
        const { size: s, color: c } = live.current;
        const d = mode === 'erase' ? Math.max(18, s * 3) : Math.max(s, 14);
        el.style.opacity = '1';
        el.style.left = `${(x / W) * 100}%`;
        el.style.top = `${(y / H) * 100}%`;
        el.style.width = `${(d / W) * 100}%`;
        el.style.color = c;
        el.dataset.mode = mode || 'idle';
      },
    }),
    []
  );

  const toPoint = (e, rect) => ({
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  });

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPoint(e, e.currentTarget.getBoundingClientRect());
    engine.current?.drive(live.current.tool, p.x, p.y);
  };

  const onPointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    for (const ev of events) {
      const p = toPoint(ev, rect);
      engine.current?.drive(live.current.tool, p.x, p.y);
    }
  };

  const onPointerUp = () => engine.current?.drive(null);

  return (
    <div
      className="board relative w-full overflow-hidden rounded-2xl border border-slate-300/60 shadow-2xl shadow-violet-900/10 dark:border-white/10"
      style={{
        aspectRatio: '16 / 9',
        backgroundColor: bg,
        backgroundImage: 'radial-gradient(rgba(128,128,160,.2) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        width: fullscreen ? 'min(100vw, calc(100vh * 16 / 9))' : '100%',
        borderRadius: fullscreen ? 0 : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label="Drawing canvas"
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div ref={cursorRef} className="air-cursor" data-mode="idle" />
      {children}
    </div>
  );
});

export default DrawingCanvas;