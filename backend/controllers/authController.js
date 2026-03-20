// ================================================
//  controllers/authController.js
//  Đăng ký / Đăng nhập / Lấy thông tin user
// ================================================

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Tạo JWT token
function signToken(user) {
  return jwt.sign(
    { id: user._id || user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ------------------------------------------------
// POST /api/auth/register
// Body: { username, email, password }
// ------------------------------------------------
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ username, email, password.' });
    }

    // Kiểm tra trùng
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      const field = exists.email === email ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} đã được sử dụng.` });
    }

    const user = await User.create({ username, email, password });
    const token = signToken(user);

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    next(err);
  }
};

// ------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ------------------------------------------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và password.' });
    }

    // Lấy user kèm password (bị ẩn mặc định)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc password không đúng.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc password không đúng.' });
    }

    const token = signToken(user);

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        favoriteCity: user.favoriteCity,
        preferredUnit: user.preferredUnit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// GET /api/auth/me  (cần đăng nhập)
// ------------------------------------------------
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// PATCH /api/auth/me  (cập nhật profile)
// Body: { favoriteCity?, preferredUnit? }
// ------------------------------------------------
exports.updateMe = async (req, res, next) => {
  try {
    const { favoriteCity, preferredUnit } = req.body;
    const update = {};
    if (favoriteCity !== undefined) update.favoriteCity = favoriteCity;
    if (preferredUnit !== undefined) update.preferredUnit = preferredUnit;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    res.json({ message: 'Cập nhật thành công!', user });
  } catch (err) {
    next(err);
  }
};