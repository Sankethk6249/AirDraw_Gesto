import { Camera, CameraOff, Hand, Loader2, RefreshCw, ScanLine } from 'lucide-react';
import { GESTURE_INFO } from '../utils/gestureRecognition.js';

export default function WebcamPanel({
  videoRef, overlayRef, enabled, status, error, fps, gesture, showLandmarks, onToggleCamera, onToggleLandmarks,
}) {
  const info = GESTURE_INFO[gesture] || GESTURE_INFO.NONE;
  return (
    <section className="glass rounded-2xl p-3" aria-label="Webcam and hand tracking">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine size={16} className="text-violet-500" /> Hand tracking
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'ready'
              ? 'bg-emerald-500/15 text-emerald-500'
              : status === 'error'
              ? 'bg-rose-500/15 text-rose-500'
              : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
          }`}
        >
          {status === 'ready' ? `Live · ${fps} fps` : status === 'loading' ? 'Starting…' : status === 'error' ? 'Error' : 'Off'}
        </span>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
        {/* Mirrored like a mirror so movement feels natural; landmarks share the same flip. */}
        <div className="absolute inset-0 -scale-x-100">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <canvas ref={overlayRef} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        {status !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/80 p-4 text-center text-sm text-slate-300">
            {status === 'loading' ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Loading hand-tracking model…</span>
            ) : status === 'error' ? (
              <span role="alert">{error}</span>
            ) : (
              <span>Turn on the camera to draw with your hand.<br />Video never leaves your browser.</span>
            )}
          </div>
        )}
        {status === 'ready' && (
          <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            {info.label}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onToggleCamera} className={enabled && status !== 'error' ? 'btn-ghost flex-1' : 'btn-primary flex-1'}>
          {status === 'error' ? <><RefreshCw size={16} /> Try again</> : enabled ? <><CameraOff size={16} /> Stop camera</> : <><Camera size={16} /> Start camera</>}
        </button>
        <button
          type="button"
          onClick={onToggleLandmarks}
          aria-pressed={showLandmarks}
          title="Show hand landmarks"
          className={`btn-ghost ${showLandmarks ? '!bg-violet-500/20 !text-violet-500' : ''}`}
        >
          <Hand size={16} /> Landmarks
        </button>
      </div>
    </section>
  );
}