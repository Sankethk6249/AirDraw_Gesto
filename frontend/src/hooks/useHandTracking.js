import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  import.meta.env.VITE_HAND_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const FINGERTIPS = [4, 8, 12, 16, 20];

// The model is created once and shared (it is expensive to load).
let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const make = (delegate) =>
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      try {
        return await make('GPU');
      } catch (err) {
        console.warn('GPU delegate unavailable, falling back to CPU.', err);
        return make('CPU');
      }
    })().catch((err) => {
      landmarkerPromise = null; // allow retry
      throw err;
    });
  }
  return landmarkerPromise;
}

function friendlyError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Click the camera icon in the address bar, allow access, then press "Try again".';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found. Connect a webcam and try again.';
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again.';
    case 'NotSupportedError':
      return err.message;
    default:
      return `Could not start hand tracking: ${err?.message || 'unknown error'}. Check your internet connection (the model is downloaded once) and try again.`;
  }
}

function drawOverlay(canvas, video, landmarks, show) {
  if (!canvas) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!show || !landmarks) return;
  ctx.lineWidth = Math.max(2, w / 320);
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)';
  ctx.beginPath();
  for (const [a, b] of CONNECTIONS) {
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
  }
  ctx.stroke();
  landmarks.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = FINGERTIPS.includes(i) ? '#22d3ee' : '#ffffff';
    ctx.arc(p.x * w, p.y * h, FINGERTIPS.includes(i) ? w / 110 : w / 190, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Starts the webcam + MediaPipe HandLandmarker and calls onFrame({ landmarks, handedness, time })
 * once per new video frame. Frames are processed only in the browser – nothing is uploaded.
 * onFrame is called outside React state so drawing never triggers re-renders.
 */
export function useHandTracking({ videoRef, overlayRef, enabled, showLandmarks, onFrame }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const onFrameRef = useRef(onFrame);
  const showRef = useRef(showLandmarks);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);
  useEffect(() => {
    showRef.current = showLandmarks;
  }, [showLandmarks]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setError(null);
      setFps(0);
      return undefined;
    }

    const video = videoRef.current;
    let cancelled = false;
    let raf = 0;
    let stream = null;
    let lastVideoTime = -1;
    let frames = 0;
    let fpsStart = performance.now();

    const stopStream = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    async function start() {
      setStatus('loading');
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          const e = new Error('Camera API is unavailable. Use a modern browser on https:// or http://localhost.');
          e.name = 'NotSupportedError';
          throw e;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) return stopStream();

        const landmarker = await getLandmarker();
        if (cancelled) return stopStream();

        video.srcObject = stream;
        await video.play();
        if (cancelled) return stopStream();
        setStatus('ready');

        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
          lastVideoTime = video.currentTime;

          let result;
          try {
            result = landmarker.detectForVideo(video, performance.now());
          } catch (e) {
            console.warn('detectForVideo failed', e);
            return;
          }
          const landmarks = result.landmarks?.[0] || null;
          // MediaPipe assumes a mirrored image, our raw video is not, so the label is swapped.
          const raw = result.handedness?.[0]?.[0]?.categoryName;
          const handedness = raw ? (raw === 'Left' ? 'Right' : 'Left') : null;

          drawOverlay(overlayRef.current, video, landmarks, showRef.current);
          try {
            onFrameRef.current?.({ landmarks, handedness, time: performance.now() });
          } catch (e) {
            console.error('onFrame error', e);
          }

          frames += 1;
          const now = performance.now();
          if (now - fpsStart >= 1000) {
            setFps(Math.round((frames * 1000) / (now - fpsStart)));
            frames = 0;
            fpsStart = now;
          }
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        stopStream();
        if (cancelled) return;
        console.error(err);
        setError(friendlyError(err));
        setStatus('error');
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopStream();
      if (video) video.srcObject = null;
      const overlay = overlayRef.current;
      overlay?.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    };
  }, [enabled, videoRef, overlayRef]);

  return { status, error, fps };
}