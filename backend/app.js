const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import các Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');


const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Static frontend =====
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ===== Uploads static =====
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);


// ===== SPA fallback (only for non-/api routes) =====
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Export app để server.js sử dụng
module.exports = app;