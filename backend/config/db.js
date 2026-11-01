import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('✖ MONGO_URI is not set. Copy backend/.env.example to backend/.env first.');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✔ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('✖ MongoDB connection failed:', err.message);
    console.error('  Is MongoDB running? (Windows: start the "MongoDB" service) or use a MongoDB Atlas URI.');
    process.exit(1);
  }
}