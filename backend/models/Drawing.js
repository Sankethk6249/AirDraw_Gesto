import mongoose from 'mongoose';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const drawingSchema = new mongoose.Schema(
  {
    // Anonymous browser id – lets people save artwork without creating an account.
    clientId: { type: String, required: true, index: true, match: UUID_RE },
    title: { type: String, required: true, trim: true, maxlength: 80, default: 'Untitled drawing' },
    fileName: { type: String, required: true, unique: true },
    width: { type: Number, required: true, min: 1, max: 8192 },
    height: { type: Number, required: true, min: 1, max: 8192 },
    bytes: { type: Number, required: true, min: 1 },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.clientId;
        delete ret.fileName;
        return ret;
      },
    },
  }
);

drawingSchema.virtual('imageUrl').get(function imageUrl() {
  return `/uploads/${this.fileName}`;
});

export default mongoose.model('Drawing', drawingSchema);