<div align="center">

# ◈ JermSky

### Ứng dụng thời tiết full-stack với giao diện Dark Glassmorphism

[![Node.js](https://img.shields.io/badge/Node.js-v24+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 📸 Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🌤 **Hôm nay** | Nhiệt độ, cảm giác như, độ ẩm, gió, tầm nhìn, áp suất, bình minh/hoàng hôn |
| 📅 **7 Ngày** | Dự báo từng ngày, bấm vào để xem chi tiết kèm biểu đồ nhiệt độ |
| 📈 **Theo Giờ** | Biểu đồ nhiệt độ 24 giờ tới dạng line chart |
| 🌬 **Không Khí** | AQI, PM2.5, PM10, CO, NO₂, O₃, UV Index |
| 📰 **Bản Tin** ✦ | Thống kê 5 ngày, thời tiết thế giới, cảnh báo nguy hiểm *(yêu cầu đăng nhập)* |
| 🕑 **Lịch Sử** | 50 lần tìm kiếm gần nhất theo tài khoản *(yêu cầu đăng nhập)* |
| 👤 **Hồ sơ** | Đổi thông tin, mật khẩu, avatar, thành phố yêu thích, đơn vị nhiệt độ |
| 🛡 **Admin Panel** | Quản lý user, phân quyền, xem lịch sử toàn bộ, thống kê hệ thống |
| 📍 **GPS** | Tự động lấy thời tiết theo vị trí hiện tại |
| 🌡 **°C / °F** | Chuyển đổi đơn vị tức thì |

---

## 🗂 Cấu trúc dự án

```
Weather_web/
├── frontend/
│   ├── index.html            # App chính
│   ├── style.css             # Dark Glassmorphism UI
│   ├── script.js             # Logic frontend
│   └── admin.html            # Trang quản trị
│
└── backend/
    ├── server.js             # Entry point — Express server
    ├── package.json
    ├── .env                  # ⚠️ Không commit file này!
    ├── .env.example          # Mẫu biến môi trường
    ├── .gitignore
    │
    ├── routes/
    │   ├── weather.js        # /api/weather/*
    │   ├── auth.js           # /api/auth/*
    │   ├── history.js        # /api/history/*
    │   └── admin.js          # /api/admin/*
    │
    ├── controllers/
    │   ├── weatherController.js
    │   ├── authController.js
    │   ├── historyController.js
    │   └── adminController.js
    │
    ├── models/
    │   ├── User.js           # username, email, password, isAdmin, favoriteCity...
    │   └── SearchHistory.js  # city, country, weatherSnapshot, timestamp
    │
    └── middleware/
        ├── auth.js           # Xác thực JWT
        ├── admin.js          # Kiểm tra quyền Admin
        └── cache.js          # Cache response
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- [Node.js](https://nodejs.org) v18 trở lên
- [MongoDB Community](https://www.mongodb.com/try/download/community) v6 trở lên
- API key từ [OpenWeatherMap](https://openweathermap.org/api) *(miễn phí, cần 2–3 giờ kích hoạt)*
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) *(VS Code extension)*

---

### Bước 1 — Clone repo

```bash
git clone https://github.com/username/Weather_web.git
cd Weather_web
```

### Bước 2 — Cài dependencies

```bash
cd backend
npm install
```

### Bước 3 — Tạo file .env

```bash
cp .env.example .env
```

Mở `.env` và điền vào:

```env
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
MONGODB_URI=mongodb://localhost:27017/jermsky
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
PORT=3000
CACHE_TTL=600
NODE_ENV=development
```

### Bước 4 — Khởi động MongoDB

```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community
```

### Bước 5 — Chạy backend

```bash
npm run dev
```

Kết quả mong đợi:
```
✅ MongoDB connected
🚀 JermSky backend running at http://localhost:3000
```

### Bước 6 — Mở frontend

Chuột phải vào `frontend/index.html` → **Open with Live Server**

| Địa chỉ | Mô tả |
|---------|-------|
| `http://127.0.0.1:5500/frontend/index.html` | App chính |
| `http://127.0.0.1:5500/frontend/admin.html` | Trang Admin |

---

## 🔌 API Endpoints

### Weather
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/weather/current?city=Hanoi&units=metric` | Thời tiết hiện tại |
| `GET` | `/api/weather/current?lat=21.02&lon=105.83` | Thời tiết theo tọa độ GPS |
| `GET` | `/api/weather/forecast?city=Hanoi&cnt=56` | Dự báo 7 ngày |
| `GET` | `/api/weather/airquality?lat=21.02&lon=105.83` | Chất lượng không khí & UV |

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập |
| `GET` | `/api/auth/me` | Lấy thông tin user |
| `PATCH` | `/api/auth/me` | Cập nhật username, email, settings |
| `PATCH` | `/api/auth/me/password` | Đổi mật khẩu |

### History *(cần đăng nhập)*
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/history` | Lấy lịch sử tìm kiếm |
| `DELETE` | `/api/history` | Xóa toàn bộ lịch sử |
| `DELETE` | `/api/history/:id` | Xóa 1 bản ghi |

### Admin *(cần quyền Admin)*
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/admin/stats` | Thống kê tổng quan |
| `GET` | `/api/admin/users` | Danh sách tất cả user |
| `DELETE` | `/api/admin/users/:id` | Xóa user |
| `PATCH` | `/api/admin/users/:id/role` | Cấp / Thu hồi quyền Admin |
| `GET` | `/api/admin/history` | Lịch sử tìm kiếm của tất cả user |

---

## 🛡 Tạo tài khoản Admin

**Bước 1** — Đăng ký tài khoản bình thường qua app

**Bước 2** — Mở **MongoDB Compass** → database `jermsky` → collection `users`

**Bước 3** — Tìm tài khoản của bạn → sửa trường `isAdmin` từ `false` → `true` → Save

**Bước 4** — Truy cập `http://127.0.0.1:5500/frontend/admin.html` và đăng nhập

---

## 🛠 Công nghệ sử dụng

| Phần | Công nghệ |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Font | Poppins (Google Fonts) |
| Chart | Chart.js 4.x |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Cache | node-cache |
| HTTP Client | Axios |
| Data source | OpenWeatherMap API |

---

## 🔒 Bảo mật

- API key OpenWeatherMap **không bao giờ lộ** ở frontend — chỉ lưu trong `.env`
- Password hash bằng **bcrypt** (salt rounds: 12)
- JWT token hết hạn sau **7 ngày**
- **Rate limiting**: 100 req / 15 phút / IP
- **Login limiter**: tối đa 10 lần thử / 15 phút (chống brute force)
- File `.env` được bảo vệ bởi `.gitignore`
- Admin routes có middleware kiểm tra quyền riêng biệt

---

## 📝 Ghi chú

- API key OpenWeatherMap mới cần **2–3 giờ** kích hoạt sau khi đăng ký
- Cache: thời tiết hiện tại **10 phút** · dự báo **30 phút** · không khí **1 giờ**
- Mỗi user lưu tối đa **50** lịch sử tìm kiếm gần nhất
- Tab **Bản Tin ✦** và **Lịch Sử** chỉ hiện sau khi đăng nhập

---

## 👤 Tác giả

**Jerm** — [GitHub](https://github.com/username)

---

<div align="center">
  <i>Built with ❤️ using Node.js + MongoDB + OpenWeatherMap</i>
</div>
