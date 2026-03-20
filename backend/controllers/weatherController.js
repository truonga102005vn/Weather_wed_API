// ================================================
//  controllers/weatherController.js
//  Xử lý logic gọi OpenWeatherMap API
// ================================================

const axios         = require('axios');
const SearchHistory = require('../models/SearchHistory');

const BASE = 'https://api.openweathermap.org/data/2.5';
const KEY  = process.env.OPENWEATHER_API_KEY;

// Helper gọi API
async function owmGet(endpoint, params = {}) {
  try {
    const res = await axios.get(`${BASE}/${endpoint}`, {
      params: { appid: KEY, lang: 'vi', ...params },
      timeout: 8000,
    });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) throw { status: 401, message: 'API key không hợp lệ hoặc chưa kích hoạt.' };
    if (status === 404) throw { status: 404, message: 'Không tìm thấy địa điểm.' };
    throw { status: 502, message: 'Không kết nối được OpenWeatherMap.' };
  }
}

// ------------------------------------------------
// GET /api/weather/current?city=Hanoi&units=metric
// GET /api/weather/current?lat=21.02&lon=105.83&units=metric
// ------------------------------------------------
exports.getCurrent = async (req, res, next) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    const params = { units };
    if (city) params.q = city;
    else if (lat && lon) { params.lat = lat; params.lon = lon; }
    else return res.status(400).json({ error: 'Cần truyền city hoặc lat & lon.' });

    const data = await owmGet('weather', params);

    // Lưu lịch sử nếu user đã đăng nhập
    if (req.user) {
      await SearchHistory.addEntry(req.user.id, {
        city: data.name,
        country: data.sys.country,
        lat: data.coord.lat,
        lon: data.coord.lon,
        weatherSnapshot: {
          temp: data.main.temp,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
        },
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// GET /api/weather/forecast?city=Hanoi&units=metric&cnt=56
// ------------------------------------------------
exports.getForecast = async (req, res, next) => {
  try {
    const { city, lat, lon, units = 'metric', cnt = 56 } = req.query;
    const params = { units, cnt };
    if (city) params.q = city;
    else if (lat && lon) { params.lat = lat; params.lon = lon; }
    else return res.status(400).json({ error: 'Cần truyền city hoặc lat & lon.' });

    const data = await owmGet('forecast', params);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------
// GET /api/weather/airquality?lat=21.02&lon=105.83
// ------------------------------------------------
exports.getAirQuality = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Cần truyền lat và lon.' });

    const [aq, uv] = await Promise.all([
      owmGet('air_pollution', { lat, lon }),
      owmGet('uvi', { lat, lon }),
    ]);

    res.json({ airQuality: aq, uv });
  } catch (err) {
    next(err);
  }
};