const User          = require('../models/User');
const SearchHistory = require('../models/SearchHistory');

exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalAdmins, totalSearches, newUsersToday, topCities, recentSearches, userGrowth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      SearchHistory.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      SearchHistory.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 }, country: { $first: '$country' } } },
        { $sort: { count: -1 } }, { $limit: 8 }
      ]),
      SearchHistory.find().sort({ createdAt: -1 }).limit(10)
        .populate('user', 'username email').select('city country weatherSnapshot createdAt'),
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
    ]);
    res.json({ stats: { totalUsers, totalAdmins, totalSearches, newUsersToday }, topCities, recentSearches, userGrowth });
  } catch(err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';
    const filter = search ? { $or: [{ username: new RegExp(search,'i') }, { email: new RegExp(search,'i') }] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).select('-password'),
      User.countDocuments(filter),
    ]);
    const scMap = Object.fromEntries(
      (await SearchHistory.aggregate([
        { $match: { user: { $in: users.map(u=>u._id) } } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ])).map(s => [s._id.toString(), s.count])
    );
    res.json({
      users: users.map(u => ({ ...u.toJSON(), searchCount: scMap[u._id.toString()] || 0 })),
      total, page, totalPages: Math.ceil(total/limit)
    });
  } catch(err) { next(err); }
};

exports.updateRole = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Không thể tự thay đổi quyền của mình.' });
    const user = await User.findByIdAndUpdate(req.params.id, { isAdmin: req.body.isAdmin }, { new: true });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user.' });
    res.json({ message: `Đã ${req.body.isAdmin ? 'cấp' : 'thu hồi'} quyền admin.`, user });
  } catch(err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình.' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user.' });
    await SearchHistory.deleteMany({ user: req.params.id });
    res.json({ message: `Đã xóa user "${user.username}".` });
  } catch(err) { next(err); }
};

exports.getAllHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';
    const match = search ? { city: new RegExp(search,'i') } : {};
    const [history, total] = await Promise.all([
      SearchHistory.find(match).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
        .populate('user', 'username email isAdmin'),
      SearchHistory.countDocuments(match),
    ]);
    res.json({ history, total, page, totalPages: Math.ceil(total/limit) });
  } catch(err) { next(err); }
};

exports.deleteHistory = async (req, res, next) => {
  try {
    const record = await SearchHistory.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Không tìm thấy.' });
    res.json({ message: 'Đã xóa.' });
  } catch(err) { next(err); }
};