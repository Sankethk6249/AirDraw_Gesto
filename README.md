# AirDraw_Gesto

# AirDraw – AI-Powered Gesture-Based Drawing Platform

> **Draw Beyond Touch. Create with Gestures.**
> Draw, erase and move artwork on a digital canvas with your bare hand – no mouse, no touch screen.

**Developer:** [Sanketh Kumar](https://www.linkedin.com/in/sanketh-k-387aa432a)

## Problem statement
Digital drawing normally needs a mouse, stylus or touch screen. That excludes touch-free situations (shared screens, classrooms, presentations, hygiene-sensitive spaces) and limits accessibility. AirDraw explores how far a plain webcam plus browser-based computer vision can replace physical input devices.

## Objectives
- Track a hand in real time in the browser and convert fingertip motion into drawing coordinates.
- Recognise gestures reliably (no flicker, no accidental strokes).
- Provide a complete drawing toolkit and a saved-artwork gallery backed by a real API and database.
- Keep webcam video 100% on the user's device.

## Features
- Real-time 21-landmark hand tracking (MediaPipe HandLandmarker), left or right hand
- Gesture recognition with frame-debouncing and One Euro smoothing
- Draw, eraser, move; colours, brush sizes; undo / redo / clear; PNG download; full screen
- Mouse and touch fallback (works without a camera)
- Gallery: save, preview, rename, delete, download
- Dark / light theme, glassmorphism UI, responsive layout
- Graceful errors for denied or missing camera and model-load failures

## Technology stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, HTML5 Canvas, Lucide React, React Router |
| Computer vision | `@mediapipe/tasks-vision` HandLandmarker |
| Backend | Node.js, Express 4, express-validator, Helmet, CORS, express-rate-limit, Morgan |
| Database | MongoDB + Mongoose (metadata); PNG files in `backend/uploads` |

## System architecture
```
 Webcam ──► <video> ──► MediaPipe HandLandmarker (in browser, WASM/GPU)
                              │ 21 landmarks / frame
                              ▼
                  gestureRecognition.js  (classify + stabilise)
                              │ gesture + fingertip
                              ▼
        canvasUtils.js (map coords, One Euro smoothing)
                              │ drive(mode, x, y)
                              ▼
   DrawingCanvas engine (strokes · move · clear ops, undo/redo replay)
                              │ Save (PNG data URL – only on user action)
                              ▼
   Express REST API ──► MongoDB (metadata) + uploads/ (PNG files)
```
- The canvas has a fixed logical size (1280×720) scaled with CSS, so coordinates are identical on every screen.
- History is a list of operations, replayed for undo; old operations are baked into a base layer to cap memory.
- The tracking loop calls handlers through refs and writes the on-screen cursor straight to the DOM, so drawing never triggers React re-renders.

## Gesture mapping
| Gesture | Action |
|---|---|
| ☝️ Index finger raised | Draw (or erase / move if that tool is selected) |
| ✌️ Index + middle raised | **Move mode** – drag the whole artwork; switches back when you release |
| ✊ Closed fist | Eraser |
| 🖐️ Open palm | Pause (nothing is drawn) |
| 🤏 Thumb + index pinch | Click the toolbar button under the cursor |

Keyboard: `D` draw · `E` eraser · `M` move · `Ctrl+Z` undo · `Ctrl+Y` / `Ctrl+Shift+Z` redo.
Thresholds live at the top of `frontend/src/utils/gestureRecognition.js`.

## API
All routes except health need the header `x-client-id: <uuid>` (generated automatically per browser, so no account is needed).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Service + DB status |
| POST | `/api/drawings` | Save drawing `{ title?, imageData (PNG data URL), width, height, theme? }` |
| GET | `/api/drawings` | List your drawings |
| GET | `/api/drawings/:id` | Get one drawing |
| PATCH | `/api/drawings/:id` | Rename `{ title }` |
| DELETE | `/api/drawings/:id` | Delete (record + file) |

Security: input validation, PNG signature check, 8 MB limit, per-owner queries, Helmet, CORS allow-list, rate limiting, secrets in `.env`.
User registration/login is intentionally not included – drawing and saving work anonymously.

## Project structure
```
AirDraw/
├── backend/
│   ├── config/ (db.js, paths.js)
│   ├── controllers/drawingController.js
│   ├── middleware/ (errorMiddleware.js, validate.js)
│   ├── models/Drawing.js
│   ├── routes/drawingRoutes.js
│   ├── uploads/            (saved PNGs, git-ignored)
│   ├── server.js · package.json · .env.example
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/ (Navbar, DrawingCanvas, DrawingToolbar, WebcamPanel, GestureGuide, ColourPicker, SavedGallery)
│   │   ├── pages/ (Home, Studio, Gallery, About)
│   │   ├── hooks/useHandTracking.js
│   │   ├── services/api.js
│   │   ├── utils/ (gestureRecognition.js, canvasUtils.js, constants.js)
│   │   ├── context/ThemeContext.jsx · styles/index.css
│   │   └── App.jsx · main.jsx
│   └── index.html · package.json · vite.config.js · tailwind/postcss config
├── .gitignore
└── README.md
```

## Installation (Windows + VS Code)
1. Install **Node.js 20 LTS** (nodejs.org), **Git**, **VS Code**, and **MongoDB Community Server** (install it as a Windows service) – or create a free **MongoDB Atlas** cluster and use its connection string.
2. Open the `AirDraw` folder in VS Code → Terminal → New Terminal (PowerShell).
3. Backend (terminal 1):
```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```
You should see `MongoDB connected` and `AirDraw API running on http://localhost:5000`. For Atlas, edit `MONGO_URI` in `backend/.env`.

4. Frontend (terminal 2):
```powershell
cd frontend
npm install
npm run dev
```
5. Open **http://localhost:5173** in Chrome or Edge, press **Start Drawing**, and click **Allow** when asked for the camera.

The first launch downloads the hand model (~8 MB) and WASM files, so it needs internet once; the browser caches them afterwards.

## Testing checklist
- [ ] **Webcam init:** camera permission prompt appears; status shows `Live · NN fps`.
- [ ] **Hand detection:** landmarks overlay follows your hand; toggling "Landmarks" hides it.
- [ ] **Index tracking:** the on-canvas cursor follows your fingertip, left and right hand.
- [ ] **Gestures:** label under the video changes for each pose; holding a pose ~0.1 s switches it.
- [ ] **Drawing accuracy:** strokes start/stop when you raise/lower the finger; fast motion stays smooth.
- [ ] **Eraser:** fist erases; selecting the Eraser tool + index finger also erases.
- [ ] **Colour / size:** swatches, custom picker, size buttons and slider change new strokes.
- [ ] **Undo / redo / clear:** buttons and Ctrl+Z / Ctrl+Y; clear is undoable.
- [ ] **Move:** two fingers drag the artwork; undo reverts the move.
- [ ] **Pinch click:** hover a toolbar button with the cursor (cyan outline) and pinch.
- [ ] **Download PNG** and **full screen** work.
- [ ] **Backend:** open http://localhost:5000/api/health → `"database":"connected"`.
- [ ] **Save + persistence:** save, restart both servers, the drawing is still in the Gallery (also visible in MongoDB Compass → `airdraw.drawings`).
- [ ] **Gallery:** preview, rename, delete, download.
- [ ] **Responsive:** resize the window / use device mode; toolbar wraps, layout stacks.
- [ ] **Camera denied:** block the camera in the address bar → a clear error and "Try again".

## Troubleshooting
| Problem | Fix |
|---|---|
| Camera permission denied | Click the camera/lock icon in the address bar → Allow → press **Try again**. |
| "No camera found" / camera busy | Plug in a webcam; close Zoom/Teams/other tabs using it. |
| Stuck on "Loading hand-tracking model…" | Check internet; ad-blockers may block cdn.jsdelivr.net or storage.googleapis.com. |
| `MongoDB connection failed` | Start the MongoDB service (`services.msc` → MongoDB Server) or fix `MONGO_URI`. |
| Save says "Cannot reach the AirDraw server" | Backend is not running – `npm run dev` in `/backend`. |
| CORS error | Make sure `CLIENT_ORIGIN` in `backend/.env` equals the URL shown by Vite, then restart the backend. |
| Port 5000 already in use | Change `PORT` in `backend/.env` **and** the proxy targets in `frontend/vite.config.js`. |
| Hand flickers between gestures | Improve front lighting, keep the hand 40–80 cm away, or raise `enter` in `GestureStabilizer` options (Studio.jsx). |

## Screenshots
Add your screenshots to `docs/screenshots/` and link them here:
`![Landing page](docs/screenshots/landing.png)` · `![Studio](docs/screenshots/studio.png)` · `![Gallery](docs/screenshots/gallery.png)`

## Future enhancements
Voice-controlled drawing · two-hand and multi-hand gestures (`numHands` is a one-line change) · AI shape recognition and clean-up · AI-assisted artwork generation · real-time collaborative canvas (WebSockets) · per-drawing history / versions · custom gesture configuration · optional accounts (JWT) · mobile and tablet layouts for front cameras.

## Production notes
`npm run build` in `frontend/` creates `dist/`. Set `VITE_API_ORIGIN` to your API URL before building, and `CLIENT_ORIGIN` on the server. Camera access requires HTTPS outside localhost.

## GitHub setup
Suggested **description:** `AirDraw – AI-powered, touch-free drawing in the browser using MediaPipe hand tracking, React, Node.js and MongoDB.`
Suggested **topics:** `react` `vite` `tailwindcss` `mediapipe` `computer-vision` `hand-tracking` `gesture-recognition` `canvas` `nodejs` `express` `mongodb` `mongoose` `ai` `full-stack`

```bash
git init
git add .
git commit -m "feat: initial commit – AirDraw gesture-based drawing platform"
git branch -M main
git remote add origin https://github.com/<your-username>/AirDraw.git
git push -u origin main
```

## Developer
**Sanketh Kumar** – B.Tech Computer Science Engineering (VTU). LinkedIn: https://www.linkedin.com/in/sanketh-k-387aa432a

© AirDraw – designed and developed by Sanketh Kumar.