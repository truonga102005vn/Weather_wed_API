// ================================================
//  middleware/auth.js
//  Xác thực JWT token
// ================================================

const jwt = require('jsonwebtoken');

/**
 * Middleware bảo vệ route — yêu cầu đăng nhập
 * Header:  Authorization: Bearer <token>
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng cung cấp token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }
}

/**
 * Middleware tuỳ chọn — attach user nếu có token,
 * nhưng không block nếu không có token
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      // Token lỗi → bỏ qua, không block
    }
  }
  next();
}

module.exports = { protect, optionalAuth };