require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app'); 
const { autoSeedUsers } = require('./controllers/authController');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Kết nối Database
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    try {
      await autoSeedUsers();
    } catch (err) { console.error('Seed error:', err); }
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}
module.exports = app;