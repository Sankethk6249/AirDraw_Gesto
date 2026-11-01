import { Router } from 'express';
import { body, header, param } from 'express-validator';
import validate from '../middleware/validate.js';
import {
  createDrawing,
  getDrawings,
  getDrawing,
  updateDrawing,
  deleteDrawing,
} from '../controllers/drawingController.js';

const router = Router();

const clientId = header('x-client-id').isUUID().withMessage('x-client-id header must be a UUID');
const id = param('id').isMongoId().withMessage('Invalid drawing id');
const title = () => body('title').isString().trim().isLength({ min: 1, max: 80 }).withMessage('Title must be 1–80 characters');

router
  .route('/')
  .get([clientId], validate, getDrawings)
  .post(
    [
      clientId,
      title().optional(),
      body('imageData').isString().isLength({ min: 100, max: 12 * 1024 * 1024 }).withMessage('imageData is required'),
      body('width').isInt({ min: 1, max: 8192 }).toInt(),
      body('height').isInt({ min: 1, max: 8192 }).toInt(),
      body('theme').optional().isIn(['dark', 'light']),
    ],
    validate,
    createDrawing
  );

router
  .route('/:id')
  .get([clientId, id], validate, getDrawing)
  .patch([clientId, id, title()], validate, updateDrawing)
  .delete([clientId, id], validate, deleteDrawing);

export default router;