// ================================================
//  models/User.js
//  Schema User + Hash password + Methods
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
      minlength: [3, 'Tối thiểu 3 ký tự'],
      maxlength: [30, 'Tối đa 30 ký tự']
    },

    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
    },

    password: {
      type: String,
      required: [true, 'Password là bắt buộc'],
      minlength: [6, 'Tối thiểu 6 ký tự'],
      select: false // không trả về mặc định
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    favoriteCity: {
      type: String,
      default: ''
    },

    preferredUnit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },

    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

/**
 * Hash password trước khi lưu
 */
userSchema.pre('save', async function (next) {
  // Nếu không sửa password thì bỏ qua
  if (!this.isModified('password')) return next();

  // Hash password
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * So sánh password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Ẩn field nhạy cảm khi trả về JSON
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);