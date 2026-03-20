// ================================================
//  models/SearchHistory.js
//  Lịch sử tìm kiếm của user
// ================================================

const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: '',
    },
    lat: Number,
    lon: Number,
    // Snapshot thời tiết tại thời điểm tìm kiếm
    weatherSnapshot: {
      temp: Number,
      description: String,
      icon: String,
    },
  },
  { timestamps: true }
);

// Mỗi user tối đa 50 bản ghi — xóa cũ nhất khi vượt
searchHistorySchema.statics.addEntry = async function (userId, data) {
  await this.create({ user: userId, ...data });

  // Đếm tổng record của user
  const count = await this.countDocuments({ user: userId });
  if (count > 50) {
    // Tìm và xóa record cũ nhất
    const oldest = await this.findOne({ user: userId }).sort({ createdAt: 1 });
    if (oldest) await oldest.deleteOne();
  }
};

module.exports = mongoose.model('SearchHistory', searchHistorySchema);