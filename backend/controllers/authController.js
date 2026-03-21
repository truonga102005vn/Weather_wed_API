// ================================================
//  controllers/authController.js
//  Register / Login / Profile / Change Password
// ================================================

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Tạo JWT token
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin // 🔥 QUAN TRỌNG
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

/**
 * Format dữ liệu trả về (tránh leak)
 */
function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    favoriteCity: user.favoriteCity,
    preferredUnit: user.preferredUnit
  };
}

// ================================================
// REGISTER
// ================================================
exports.register = async (req, res, next) => {
  try {
    let { username, email, password } = req.body;

    // Trim dữ liệu
    username = username?.trim();
    email = email?.trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Vui lòng điền đầy đủ thông tin.'
      });
    }

    // Kiểm tra tồn tại
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      const field = exists.email === email ? 'Email' : 'Username';
      return res.status(409).json({
        error: `${field} đã được sử dụng.`
      });
    }

    // Tạo user
    const user = await User.create({ username, email, password });

    // Tạo token
    const token = signToken(user);

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: formatUser(user)
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors)
          .map(e => e.message)
          .join(', ')
      });
    }
    next(err);
  }
};

// ================================================
// LOGIN
// ================================================
exports.login = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        error: 'Vui lòng nhập email và password.'
      });
    }

    // Lấy user + password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Email hoặc password không đúng.'
      });
    }

    // Cập nhật login time
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: formatUser(user)
    });

  } catch (err) {
    next(err);
  }
};

// ================================================
// GET PROFILE
// ================================================
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy user.'
      });
    }

    res.json({
      user: formatUser(user)
    });

  } catch (err) {
    next(err);
  }
};

// ================================================
// UPDATE PROFILE
// ================================================
exports.updateMe = async (req, res, next) => {
  try {
    const { favoriteCity, preferredUnit } = req.body;

    const update = {};

    if (favoriteCity !== undefined) {
      update.favoriteCity = favoriteCity;
    }

    if (preferredUnit !== undefined) {
      update.preferredUnit = preferredUnit;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      message: 'Cập nhật thành công!',
      user: formatUser(user)
    });

  } catch (err) {
    next(err);
  }
};

// ================================================
// CHANGE PASSWORD
// ================================================
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy người dùng.'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Mật khẩu hiện tại không đúng.'
      });
    }

    // Gán password mới → sẽ tự hash nhờ pre-save
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Đổi mật khẩu thành công!'
    });

  } catch (err) {
    next(err);
  }
};