// ================================================
//  JermSky Backend — server.js
//  Entry point chính
// ================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const rateLimit  = require('express-rate-limit');

const weatherRoutes = require('./routes/weather');
const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');
const adminRoutes   = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------
// Middleware
// ------------------------------------------------
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// Rate limit toàn bộ API — tối đa 100 req / 15 phút / IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Quá nhiều request, thử lại sau 15 phút.' },
}));

// ------------------------------------------------
// Routes
// ------------------------------------------------
app.use('/api/weather', weatherRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin',   adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route không tồn tại.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Lỗi server.' });
});

// ------------------------------------------------
// Kết nối MongoDB rồi mới start server
// ------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 JermSky backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

  app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://jermsky.vercel.app',
  ],
  credentials: true,
}));