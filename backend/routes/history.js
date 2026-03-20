// ================================================
//  routes/history.js
// ================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/historyController');
const { protect } = require('../middleware/auth');

// Tất cả history routes đều cần đăng nhập
router.use(protect);

router.get   ('/',     controller.getHistory);
router.delete('/',     controller.clearHistory);
router.delete('/:id',  controller.deleteOne);

module.exports = router;