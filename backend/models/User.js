// ================================================
//  models/User.js
//  Schema tài khoản người dùng
// ================================================

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username là bắt buộc'],
      unique: true,
      trim: true,
      minlength: [3, 'Username tối thiểu 3 ký tự'],
      maxlength: [30, 'Username tối đa 30 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      required: [true, 'Password là bắt buộc'],
      minlength: [6, 'Password tối thiểu 6 ký tự'],
      select: false, // Không trả password trong query mặc định
    },
    favoriteCity: {
      type: String,
      default: '',
    },
    preferredUnit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
  },
  { timestamps: true }
);

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method kiểm tra password
userSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

// Không trả _id dạng __v
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);