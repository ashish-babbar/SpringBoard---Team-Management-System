import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    minPoolSize: 1,
    autoIndex: process.env.NODE_ENV !== 'production'
  });
  console.info(`MongoDB connected (${mongoose.connection.name})`);
}
