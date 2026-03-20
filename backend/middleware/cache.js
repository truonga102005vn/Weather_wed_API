// ================================================
//  middleware/cache.js
//  Cache response theo key (mặc định = URL)
// ================================================

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 600 });

/**
 * Tạo middleware cache với TTL tùy chỉnh (giây)
 * Dùng: router.get('/current', cacheMiddleware(600), controller)
 */
function cacheMiddleware(ttl) {
  return (req, res, next) => {
    // Tạo cache key từ URL + query params
    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached) {
      console.log(`[Cache HIT] ${key}`);
      return res.json({ ...cached, _cached: true });
    }

    // Ghi đè res.json để lưu kết quả vào cache
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
        console.log(`[Cache SET] ${key} — TTL ${ttl}s`);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Xóa toàn bộ cache (dùng khi cần)
 */
function clearCache() {
  cache.flushAll();
}

/**
 * Lấy stats cache (debug)
 */
function getCacheStats() {
  return cache.getStats();
}

module.exports = { cacheMiddleware, clearCache, getCacheStats };