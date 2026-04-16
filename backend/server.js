require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app'); 
const { autoSeedUsers } = require('./controllers/authController');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    try {
      // Chỉ tạo Admin, không đụng đến sản phẩm
      await autoSeedUsers();
    } catch (err) { console.error('Seed error:', err); }

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  });