// Canvas helpers: fixed logical resolution, smooth stroke rendering, coordinate mapping and filtering.

export const CANVAS_W = 1280; // logical drawing resolution (CSS scales it to any screen size)
export const CANVAS_H = 720;
const MARGIN = 0.1; // ignore the outer 10% of the camera frame so every canvas edge is reachable

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function applyStyle(ctx, s) {
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Dot at the first point of a stroke (also the full render of a single-point stroke). */
export function drawDot(ctx, s) {
  const p = s.points[0];
  ctx.save();
  applyStyle(ctx, s);
  ctx.beginPath();
  ctx.arc(p.x, p.y, s.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Full render of a stroke using midpoint quadratic smoothing (used for undo/redo replay). */
export function drawStroke(ctx, s) {
  const p = s.points;
  if (!p.length) return;
  if (p.length === 1) return drawDot(ctx, s);
  ctx.save();
  applyStyle(ctx, s);
  ctx.beginPath();
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 1; i++) {
    const m = mid(p[i], p[i + 1]);
    ctx.quadraticCurveTo(p[i].x, p[i].y, m.x, m.y);
  }
  const last = p[p.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

/** Draws only the newest curve segment while the stroke is live (identical result to drawStroke). */
export function drawIncremental(ctx, s) {
  const p = s.points;
  const n = p.length;
  if (n < 3) return;
  ctx.save();
  applyStyle(ctx, s);
  ctx.beginPath();
  const from = n === 3 ? p[0] : mid(p[n - 3], p[n - 2]);
  ctx.moveTo(from.x, from.y);
  const to = mid(p[n - 2], p[n - 1]);
  ctx.quadraticCurveTo(p[n - 2].x, p[n - 2].y, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/** Final segment when the stroke ends. */
export function finishStroke(ctx, s) {
  const p = s.points;
  const n = p.length;
  if (n < 2) return;
  ctx.save();
  applyStyle(ctx, s);
  ctx.beginPath();
  const from = n === 2 ? p[0] : mid(p[n - 2], p[n - 1]);
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(p[n - 1].x, p[n - 1].y);
  ctx.stroke();
  ctx.restore();
}

/** Shifts everything currently on the canvas by (dx, dy). `tmp` is a same-size scratch canvas. */
export function applyMove(ctx, tmp, dx, dy) {
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, tmp.width, tmp.height);
  t.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(tmp, dx, dy);
  ctx.restore();
}

/** Applies one history operation: { kind: 'stroke' | 'move' | 'clear' }. */
export function applyOp(ctx, tmp, op) {
  if (op.kind === 'stroke') drawStroke(ctx, op);
  else if (op.kind === 'move') applyMove(ctx, tmp, op.dx, op.dy);
  else if (op.kind === 'clear') ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Camera landmark (0..1, un-mirrored) → logical canvas coordinates (mirrored, margin-trimmed). */
export function mapToCanvas(p) {
  const x = clamp((1 - p.x - MARGIN) / (1 - 2 * MARGIN), 0, 1);
  const y = clamp((p.y - MARGIN) / (1 - 2 * MARGIN), 0, 1);
  return { x: x * CANVAS_W, y: y * CANVAS_H };
}

// ---- One Euro filter: strong smoothing when slow (no jitter), little lag when fast ----
const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);

class LowPass {
  constructor() {
    this.y = null;
  }
  filter(x, a) {
    this.y = this.y === null ? x : a * x + (1 - a) * this.y;
    return this.y;
  }
}

class OneEuro {
  constructor(minCutoff = 1.6, beta = 0.012, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.x = new LowPass();
    this.dx = new LowPass();
    this.last = null;
  }
  filter(v, dt) {
    const dv = this.last === null ? 0 : (v - this.last) / dt;
    const edv = this.dx.filter(dv, alpha(this.dCutoff, dt));
    const out = this.x.filter(v, alpha(this.minCutoff + this.beta * Math.abs(edv), dt));
    this.last = v;
    return out;
  }
}

export class PointFilter {
  constructor() {
    this.reset();
  }
  reset() {
    this.fx = new OneEuro();
    this.fy = new OneEuro();
    this.t = null;
  }
  /** t = timestamp in ms */
  filter(x, y, t) {
    const dt = this.t === null ? 1 / 60 : Math.max((t - this.t) / 1000, 1 / 240);
    this.t = t;
    return { x: this.fx.filter(x, dt), y: this.fy.filter(y, dt) };
  }
}

export function exportWithBackground(canvas, bg) {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const c = out.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(canvas, 0, 0);
  return out.toDataURL('image/png');
}

export function downloadDataUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}