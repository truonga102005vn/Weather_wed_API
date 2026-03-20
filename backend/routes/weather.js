// ================================================
//  routes/weather.js
// ================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/weatherController');
const { cacheMiddleware } = require('../middleware/cache');
const { optionalAuth }    = require('../middleware/auth');

// Cache 10 phút cho current weather
// Cache 30 phút cho forecast (thay đổi chậm hơn)
// Cache 1 giờ cho air quality

router.get('/current',    optionalAuth, cacheMiddleware(600),  controller.getCurrent);
router.get('/forecast',   optionalAuth, cacheMiddleware(1800), controller.getForecast);
router.get('/airquality', optionalAuth, cacheMiddleware(3600), controller.getAirQuality);

module.exports = router;