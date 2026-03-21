// ================================================
//  routes/admin.js
//  Các API dành riêng cho Admin
// ================================================

const express = require('express');
const router = express.Router();

// Import controller
const ctrl = require('../controllers/adminController');

// Import middleware (đã fix)
const { protect, requireAdmin } = require('../middleware/auth');

/**
 * Áp dụng middleware cho toàn bộ route bên dưới
 * - protect: phải đăng nhập
 * - requireAdmin: phải là admin
 */
router.use(protect);
router.use(requireAdmin);

// ================= ROUTES =================

// Lấy thống kê hệ thống
router.get('/stats', ctrl.getStats);

// Lấy danh sách user
router.get('/users', ctrl.getUsers);

// Cập nhật quyền user (admin/user)
router.patch('/users/:id/role', ctrl.updateRole);

// Xoá user
router.delete('/users/:id', ctrl.deleteUser);

// Lấy lịch sử (weather/search/...)
router.get('/history', ctrl.getAllHistory);

// Xoá lịch sử
router.delete('/history/:id', ctrl.deleteHistory);

module.exports = router;