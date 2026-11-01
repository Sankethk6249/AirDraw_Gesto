import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import DrawingCanvas from '../components/DrawingCanvas.jsx';
import DrawingToolbar from '../components/DrawingToolbar.jsx';
import WebcamPanel from '../components/WebcamPanel.jsx';
import GestureGuide from '../components/GestureGuide.jsx';
import { useHandTracking } from '../hooks/useHandTracking.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { saveDrawing } from '../services/api.js';
import { CANVAS_H, CANVAS_W, PointFilter, downloadDataUrl, mapToCanvas } from '../utils/canvasUtils.js';
import { GESTURES, GestureStabilizer, classifyGesture, cursorPoint } from '../utils/gestureRecognition.js';

const CLICK_COOLDOWN_MS = 700;

function SaveDialog({ defaultTitle, saving, onClose, onSave }) {
  const [title, setTitle] = useState(defaultTitle);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Save drawing">
      <form
        className="glass w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 dark:bg-slate-900"
        onSubmit={(e) => { e.preventDefault(); onSave(title.trim() || 'Untitled drawing'); }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Save to gallery</h2>
          <button type="button" onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close"><X size={16} /></button>
        </div>
        <label className="block text-sm font-medium">
          Title
          <input
            autoFocus
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300/60 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save drawing'}
        </button>
      </form>
    </div>
  );
}

export default function Studio() {
  const { theme } = useTheme();
  const [params] = useSearchParams();

  const [tool, setTool] = useState('draw');
  const [color, setColor] = useState('#8b5cf6');
  const [size, setSize] = useState(8);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [cameraOn, setCameraOn] = useState(params.get('camera') === '1');
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [gesture, setGesture] = useState(GESTURES.NONE);
  const [activeMode, setActiveMode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const canvasApi = useRef(null);
  const stageRef = useRef(null);
  const toastTimer = useRef(0);

  const bg = theme === 'dark' ? '#0b1020' : '#ffffff';

  // Refs used by the per-frame handler so it never needs to re-create or trigger renders.
  const toolRef = useRef(tool);
  const stableRef = useRef(GESTURES.NONE);
  const modeRef = useRef(null);
  const hoverRef = useRef(null);
  const pinchRef = useRef({ down: false, lastClick: 0 });
  const stabilizer = useMemo(() => new GestureStabilizer({ enter: 4, lost: 5 }), []);
  const filter = useMemo(() => new PointFilter(), []);

  useEffect(() => { toolRef.current = tool; }, [tool]);

  const setHover = useCallback((el) => {
    if (hoverRef.current === el) return;
    hoverRef.current?.classList.remove('gesture-hover');
    el?.classList.add('gesture-hover');
    hoverRef.current = el;
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const resetHandState = useCallback(() => {
    canvasApi.current?.drive(null);
    canvasApi.current?.showCursor({ visible: false });
    stabilizer.reset();
    filter.reset();
    stableRef.current = GESTURES.NONE;
    modeRef.current = null;
    pinchRef.current.down = false;
    setHover(null);
    setGesture(GESTURES.NONE);
    setActiveMode(null);
  }, [stabilizer, filter, setHover]);

  // Called by the tracking loop once per camera frame.
  const handleFrame = useCallback(({ landmarks, time }) => {
    const api = canvasApi.current;
    if (!api) return;

    const raw = landmarks ? classifyGesture(landmarks) : null;
    const stable = stabilizer.update(raw);

    if (stable !== stableRef.current) {
      stableRef.current = stable;
      filter.reset(); // the cursor landmark changes with the gesture
      setGesture(stable);
    }

    if (!landmarks) {
      api.drive(null);
      api.showCursor({ visible: false });
      setHover(null);
      if (modeRef.current !== null) { modeRef.current = null; setActiveMode(null); }
      return;
    }

    const mapped = mapToCanvas(cursorPoint(stable, landmarks));
    const { x, y } = filter.filter(mapped.x, mapped.y, time);

    // Is the cursor over a toolbar control?
    const rect = api.getRect();
    const el = document.elementFromPoint(rect.left + (x / CANVAS_W) * rect.width, rect.top + (y / CANVAS_H) * rect.height);
    const target = el?.closest?.('[data-gesture-target]') || null;
    setHover(target);

    let mode = null;
    if (stable === GESTURES.DRAW) mode = toolRef.current;
    else if (stable === GESTURES.FIST) mode = 'erase';
    else if (stable === GESTURES.TWO_FINGER) mode = 'move';
    if (target) mode = null; // never draw underneath the toolbar

    // Pinch acts as a click on the hovered control (once per pinch).
    const pinch = pinchRef.current;
    if (stable === GESTURES.PINCH) {
      if (!pinch.down) {
        pinch.down = true;
        if (target && time - pinch.lastClick > CLICK_COOLDOWN_MS) {
          pinch.lastClick = time;
          target.click();
        }
      }
    } else {
      pinch.down = false;
    }

    api.drive(mode, x, y);
    api.showCursor({
      visible: true, x, y,
      mode: mode || (stable === GESTURES.PALM ? 'pause' : target ? 'hover' : 'idle'),
    });

    if (mode !== modeRef.current) { modeRef.current = mode; setActiveMode(mode); }
  }, [stabilizer, filter, setHover]);

  const { status, error, fps } = useHandTracking({
    videoRef, overlayRef, enabled: cameraOn, showLandmarks, onFrame: handleFrame,
  });

  useEffect(() => {
    if (!cameraOn) resetHandState();
  }, [cameraOn, resetHandState]);

  const toggleCamera = () => {
    if (status === 'error') {
      setCameraOn(false);
      setTimeout(() => setCameraOn(true), 60);
    } else {
      setCameraOn((v) => !v);
    }
  };

  // ---- actions ----
  const undo = useCallback(() => canvasApi.current?.undo(), []);
  const redo = useCallback(() => canvasApi.current?.redo(), []);
  const clear = useCallback(() => canvasApi.current?.clear(), []);

  const download = useCallback(() => {
    const url = canvasApi.current?.exportPNG(bg);
    if (url) downloadDataUrl(url, `airdraw-${Date.now()}.png`);
  }, [bg]);

  const openSave = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setSaveOpen(true);
  }, []);

  const save = async (title) => {
    const imageData = canvasApi.current?.exportPNG(bg);
    if (!imageData) return;
    setSaving(true);
    try {
      await saveDrawing({ title, imageData, width: CANVAS_W, height: CANVAS_H, theme });
      setSaveOpen(false);
      showToast('Saved to your gallery.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageRef.current?.requestFullscreen?.().catch(() => showToast('Full screen is not available in this browser.', 'error'));
  }, [showToast]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); (e.shiftKey ? redo : undo)(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (k === 'd') setTool('draw');
        else if (k === 'e') setTool('erase');
        else if (k === 'm') setTool('move');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section ref={stageRef} className={isFullscreen ? 'flex h-full w-full items-center justify-center bg-black' : ''} aria-label="Drawing studio">
        <DrawingCanvas
          ref={canvasApi}
          tool={tool}
          color={color}
          size={size}
          bg={bg}
          fullscreen={isFullscreen}
          onHistoryChange={setHistory}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-2 sm:p-3">
            <DrawingToolbar
              tool={tool} setTool={setTool} activeMode={activeMode}
              color={color} setColor={setColor} size={size} setSize={setSize}
              canUndo={history.canUndo} canRedo={history.canRedo}
              onUndo={undo} onRedo={redo} onClear={clear}
              onSave={openSave} onDownload={download}
              onFullscreen={toggleFullscreen} isFullscreen={isFullscreen}
            />
          </div>
        </DrawingCanvas>
      </section>

      <aside className="space-y-4">
        <WebcamPanel
          videoRef={videoRef} overlayRef={overlayRef}
          enabled={cameraOn} status={status} error={error} fps={fps} gesture={gesture}
          showLandmarks={showLandmarks}
          onToggleCamera={toggleCamera}
          onToggleLandmarks={() => setShowLandmarks((v) => !v)}
        />
        <GestureGuide active={gesture} compact />
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          Saved drawings appear in the <Link to="/gallery" className="font-semibold text-violet-600 underline dark:text-violet-300">gallery</Link>.
        </p>
      </aside>

      {saveOpen && (
        <SaveDialog
          defaultTitle={`AirDraw ${new Date().toLocaleDateString()}`}
          saving={saving}
          onClose={() => setSaveOpen(false)}
          onSave={save}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.type === 'error' ? 'bg-rose-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}