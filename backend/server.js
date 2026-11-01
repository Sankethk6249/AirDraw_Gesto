import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { UPLOAD_DIR } from './config/paths.js';
import drawingRoutes from './routes/drawingRoutes.js';
import { notFound, errorHandler, httpError } from './middleware/errorMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(httpError(403, 'Origin not allowed by CORS')),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-client-id'],
  })
);
app.use(express.json({ limit: '12mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    service: 'AirDraw API',
    developer: 'Sanketh Kumar',
    uptime: Math.round(process.uptime()),
    database: states[mongoose.connection.readyState] || 'unknown',
  });
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));
app.use('/api/drawings', drawingRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  const server = app.listen(PORT, () => console.log(`✔ AirDraw API running on http://localhost:${PORT}`));
  const shutdown = () => server.close(() => mongoose.connection.close().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});