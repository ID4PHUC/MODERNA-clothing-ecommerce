const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product'); // đường dẫn đến model Product

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Clothing-Store';

async function fixGenders() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const products = await Product.find();
    for (const p of products) {
      let g = (p.gender || '').toLowerCase();
      if (g === 'male') g = 'male';
      else if (g === 'female') g = 'female';
      else g = 'unisex';

      if (p.gender !== g) {
        p.gender = g;
        await p.save();
        console.log(`Updated ${p.title}: gender = ${g}`);
      }
    }

    console.log('All products gender fixed!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixGenders();
