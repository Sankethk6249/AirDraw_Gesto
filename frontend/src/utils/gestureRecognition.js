// Gesture recognition from the 21 MediaPipe hand landmarks.
// All measurements are relative to hand size, so they work at any distance from the camera
// and for left or right hands, in any rotation.

export const GESTURES = {
  NONE: 'NONE',
  DRAW: 'DRAW', // index finger raised
  TWO_FINGER: 'TWO_FINGER', // index + middle raised -> move / select mode
  FIST: 'FIST', // closed fist -> eraser
  PALM: 'PALM', // open palm -> pause
  PINCH: 'PINCH', // thumb + index pinch -> click toolbar
};

export const GESTURE_INFO = {
  NONE: { label: 'No gesture', hint: 'Show your hand to the camera' },
  DRAW: { label: 'Drawing', hint: 'Index finger raised' },
  TWO_FINGER: { label: 'Move mode', hint: 'Two fingers raised' },
  FIST: { label: 'Eraser', hint: 'Closed fist' },
  PALM: { label: 'Paused', hint: 'Open palm' },
  PINCH: { label: 'Pinch / click', hint: 'Thumb + index pinch' },
};

// Tunable thresholds
const PINCH_RATIO = 0.32; // thumb–index distance / hand size
const TIP_VS_PIP = 1.05; // fingertip must be farther from wrist than the middle joint
const TIP_VS_MCP = 1.2; // …and clearly farther than the knuckle

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// [tip, pip, mcp] landmark indices
const FINGERS = {
  index: [8, 6, 5],
  middle: [12, 10, 9],
  ring: [16, 14, 13],
  pinky: [20, 18, 17],
};

function isExtended(lm, [tip, pip, mcp]) {
  const w = lm[0];
  const dTip = dist(w, lm[tip]);
  return dTip > dist(w, lm[pip]) * TIP_VS_PIP && dTip > dist(w, lm[mcp]) * TIP_VS_MCP;
}

export function classifyGesture(lm) {
  const handSize = dist(lm[0], lm[9]) || 1e-6;
  const ext = {
    index: isExtended(lm, FINGERS.index),
    middle: isExtended(lm, FINGERS.middle),
    ring: isExtended(lm, FINGERS.ring),
    pinky: isExtended(lm, FINGERS.pinky),
  };
  const others = Number(ext.middle) + Number(ext.ring) + Number(ext.pinky);
  const count = others + Number(ext.index);

  // Pinch has priority. Requiring a raised finger or a curved (not folded) index keeps a fist from reading as a pinch.
  const pinchRatio = dist(lm[4], lm[8]) / handSize;
  const indexReach = dist(lm[0], lm[8]) > dist(lm[0], lm[5]) * 1.15;
  if (pinchRatio < PINCH_RATIO && (others >= 1 || indexReach)) return GESTURES.PINCH;

  if (ext.index && !ext.middle && !ext.ring && !ext.pinky) return GESTURES.DRAW;
  if (ext.index && ext.middle && !ext.ring && !ext.pinky) return GESTURES.TWO_FINGER;
  if (count === 4) return GESTURES.PALM;
  if (count === 0) return GESTURES.FIST;
  return GESTURES.NONE;
}

/** Which landmark should act as the "cursor" for each gesture. */
export function cursorPoint(gesture, lm) {
  switch (gesture) {
    case GESTURES.PINCH:
      return midpoint(lm[4], lm[8]);
    case GESTURES.TWO_FINGER:
      return midpoint(lm[8], lm[12]);
    case GESTURES.FIST:
    case GESTURES.PALM:
      return lm[9];
    default:
      return lm[8];
  }
}

/**
 * Debounces gesture changes: a new gesture must be seen for `enter` consecutive frames before it
 * becomes the stable gesture, and a lost hand is tolerated for `lost` frames. This prevents flicker
 * and accidental strokes while the hand moves between poses.
 */
export class GestureStabilizer {
  constructor({ enter = 4, lost = 5 } = {}) {
    this.enter = enter;
    this.lost = lost;
    this.reset();
  }
  reset() {
    this.stable = GESTURES.NONE;
    this.candidate = GESTURES.NONE;
    this.count = 0;
    this.missing = 0;
  }
  /** raw = gesture for this frame, or null when no hand is visible */
  update(raw) {
    if (raw === null) {
      this.missing += 1;
      if (this.missing >= this.lost) this.reset();
      return this.stable;
    }
    this.missing = 0;
    if (raw === this.stable) {
      this.candidate = raw;
      this.count = 0;
      return this.stable;
    }
    if (raw === this.candidate) this.count += 1;
    else {
      this.candidate = raw;
      this.count = 1;
    }
    if (this.count >= this.enter) {
      this.stable = raw;
      this.count = 0;
    }
    return this.stable;
  }
}