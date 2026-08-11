const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in .env');
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection lost, will retry on next request');
  });

  await mongoose.connect(uri);
  console.log(`MongoDB connected -> ${mongoose.connection.name}`);
}

module.exports = connectDB;
