const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },   
  address: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }, 
  createdAt: { type: Date, default: Date.now },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'editor'],
    default: 'user' 
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});


module.exports = mongoose.model('User', UserSchema);
