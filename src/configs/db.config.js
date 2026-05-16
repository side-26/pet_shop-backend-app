// src/configs/database.js
const mongoose = require('mongoose');

async function connectDB(onSuccess) {
  try {
    // حذف options خالی - در mongoose 6+ دیگر نیازی نیست
    const res = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_shop_db'
    );

    console.log(`✅ MongoDB Connected: ${res.connection.host}`);
    onSuccess?.(res);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1); // خروج از برنامه در صورت عدم اتصال
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err);
});

module.exports = connectDB;
