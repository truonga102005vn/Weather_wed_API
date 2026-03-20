// ================================================
//  controllers/historyController.js
//  Quản lý lịch sử tìm kiếm
// ================================================

const SearchHistory = require('../models/SearchHistory');

// ------------------------------------------------
// GET /api/history  — lấy lịch sử của user
// ------------------------------------------------
exports.getHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const history = await SearchHistory
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-user -__v');

    res.json({ count: history.length, history });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// DELETE /api/history  — xóa toàn bộ lịch sử
// ------------------------------------------------
exports.clearHistory = async (req, res, next) => {
  try {
    await SearchHistory.deleteMany({ user: req.user.id });
    res.json({ message: 'Đã xóa toàn bộ lịch sử tìm kiếm.' });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// DELETE /api/history/:id  — xóa 1 bản ghi
// ------------------------------------------------
exports.deleteOne = async (req, res, next) => {
  try {
    const record = await SearchHistory.findOne({ _id: req.params.id, user: req.user.id });
    if (!record) return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });

    await record.deleteOne();
    res.json({ message: 'Đã xóa.' });
  } catch (err) {
    next(err);
  }
};