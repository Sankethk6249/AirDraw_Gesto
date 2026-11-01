import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import Drawing from '../models/Drawing.js';
import { UPLOAD_DIR } from '../config/paths.js';
import { asyncHandler, httpError } from '../middleware/errorMiddleware.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;

const owner = (req) => req.get('x-client-id').toLowerCase();

// POST /api/drawings
export const createDrawing = asyncHandler(async (req, res) => {
  const { title, imageData, width, height, theme } = req.body;

  const match = DATA_URL_RE.exec(imageData);
  if (!match) throw httpError(400, 'imageData must be a base64 encoded PNG data URL.');

  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw httpError(413, 'Image is larger than 8 MB.');
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw httpError(400, 'File is not a valid PNG image.');

  const fileName = `${crypto.randomUUID()}.png`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer, { flag: 'wx' });

  try {
    const drawing = await Drawing.create({
      clientId: owner(req),
      title: title || undefined,
      fileName,
      width,
      height,
      bytes: buffer.length,
      theme,
    });
    res.status(201).json({ success: true, data: drawing });
  } catch (err) {
    await fs.unlink(path.join(UPLOAD_DIR, fileName)).catch(() => {});
    throw err;
  }
});

// GET /api/drawings
export const getDrawings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 60, 100);
  const filter = { clientId: owner(req) };
  const [items, total] = await Promise.all([
    Drawing.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Drawing.countDocuments(filter),
  ]);
  res.json({ success: true, count: items.length, total, page, data: items });
});

// GET /api/drawings/:id
export const getDrawing = asyncHandler(async (req, res) => {
  const drawing = await Drawing.findOne({ _id: req.params.id, clientId: owner(req) });
  if (!drawing) throw httpError(404, 'Drawing not found.');
  res.json({ success: true, data: drawing });
});

// PATCH /api/drawings/:id
export const updateDrawing = asyncHandler(async (req, res) => {
  const drawing = await Drawing.findOneAndUpdate(
    { _id: req.params.id, clientId: owner(req) },
    { $set: { title: req.body.title } },
    { new: true, runValidators: true }
  );
  if (!drawing) throw httpError(404, 'Drawing not found.');
  res.json({ success: true, data: drawing });
});

// DELETE /api/drawings/:id
export const deleteDrawing = asyncHandler(async (req, res) => {
  const drawing = await Drawing.findOneAndDelete({ _id: req.params.id, clientId: owner(req) });
  if (!drawing) throw httpError(404, 'Drawing not found.');
  await fs.unlink(path.join(UPLOAD_DIR, drawing.fileName)).catch((e) => {
    if (e.code !== 'ENOENT') console.error('Could not delete file', e.message);
  });
  res.json({ success: true, message: 'Drawing deleted.' });
});