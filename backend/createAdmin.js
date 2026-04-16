require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Admin = require('./models/Admin');

// Default to local DB named "Clothing-Store" (hyphen)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Clothing-Store';
const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'adminpass';

if (!email) {
  console.error('Usage: node createAdmin.js <email> [password]');
  process.exit(1);
}

async function main(){
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', MONGO_URI);

  try{
    let user = await User.findOne({ email });
    if (user){
      if (!user.isAdmin){
        user.isAdmin = true;
        await user.save();
        console.log('Promoted existing user to admin:', email);
      } else {
        console.log('User already admin:', email);
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      user = new User({ email, name: 'Admin', passwordHash: hash, isAdmin: true });
      await user.save();
      console.log('Created admin:', email, 'password:', password);
    }

    // Ensure an Admin document exists that references this user
    try {
      await Admin.findOneAndUpdate(
        { user: user._id },
        { user: user._id, email: user.email, name: user.name || 'Admin' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log('Admin collection updated for:', email);
    } catch (e) {
      console.warn('Could not upsert Admin doc:', e.message || e);
    }
  }catch(err){
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
