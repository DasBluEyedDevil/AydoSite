// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
