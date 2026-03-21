// ================================================
//  middleware/auth.js
//  Xác thực JWT + phân quyền
// ================================================

const jwt = require('jsonwebtoken');

/**
 * Middleware: Bắt buộc đăng nhập
 * - Lấy token từ header: Authorization: Bearer <token>
 * - Giải mã token và gắn vào req.user
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  // Kiểm tra header có tồn tại không
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Chưa đăng nhập. Vui lòng cung cấp token.'
    });
  }

  // Lấy token
  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn thông tin user vào request
    // Lưu ý: token phải chứa isAdmin
    req.user = decoded;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }

    return res.status(401).json({
      error: 'Token không hợp lệ.'
    });
  }
}

/**
 * Middleware: Kiểm tra quyền admin
 * - Phải chạy sau protect
 */
function requireAdmin(req, res, next) {
  // Nếu chưa có user
  if (!req.user) {
    return res.status(401).json({
      error: 'Chưa xác thực người dùng.'
    });
  }

  // Kiểm tra quyền admin
  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: 'Bạn không có quyền truy cập (Admin only).'
    });
  }

  next();
}

/**
 * Middleware: Không bắt buộc đăng nhập
 * - Nếu có token → attach user
 * - Không có cũng không sao
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token lỗi thì bỏ qua
    }
  }

  next();
}

// ✅ EXPORT ĐẦY ĐỦ (fix lỗi của bạn)
module.exports = {
  protect,
  requireAdmin,
  optionalAuth
};