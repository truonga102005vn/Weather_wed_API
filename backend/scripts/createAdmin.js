require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const mongoose = require('mongoose');
const User = require('../models/User');

console.log('MONGODB_URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Kết nối DB thành công'))
  .catch(err => {
    console.error('❌ Lỗi kết nối DB:', err.message);
    process.exit(1);
  });

async function createAdmin() {
  try {
    const admin = await User.create({
      username: 'admin',
      email: 'admin@gmail.com',
      password: '123456',
      isAdmin: true
    });

    console.log('🎉 Tạo admin thành công!');
    console.log(admin);

    process.exit();

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

createAdmin();