import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Saved artwork (PNG files) lives here. Only explicitly saved drawings are stored – never webcam frames.
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');