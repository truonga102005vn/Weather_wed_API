/* ============================================
   JermSky — script.js  (Frontend)
   Gọi backend thay vì OpenWeatherMap trực tiếp
   ============================================ */

'use strict';

const API_BASE = 'http://localhost:3000/api';

const State = {
  token: localStorage.getItem('jermsky_token') || '',
  user:  JSON.parse(localStorage.getItem('jermsky_user') || 'null'),
  unit:  'metric',
  lat:   null,
  lon:   null,
  city:  '',
  hourlyChart: null,
};

const $ = (id) => document.getElementById(id);
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'history') loadHistory();
    });
  });

  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.unit === State.unit) return;
      document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.unit = btn.dataset.unit;
      if (State.city) fetchByCity(State.city);
    });
  });

  $('searchBtn').addEventListener('click', doSearch);
  $('searchBar').addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });
  document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => fetchByCity(tag.dataset.city));
  });
  $('gpsBtn').addEventListener('click', getGPS);

  fetchByCity('Da Nang');
});

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (State.token) h['Authorization'] = `Bearer ${State.token}`;
  return h;
}

async function register(username, email, password) {
  const res  = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ username, email, password }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  State.token = data.token; State.user = data.user;
  localStorage.setItem('jermsky_token', data.token);
  localStorage.setItem('jermsky_user', JSON.stringify(data.user));
  return data;
}
window.register = register;

async function login(email, password) {
  const res  = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  State.token = data.token; State.user = data.user;
  localStorage.setItem('jermsky_token', data.token);
  localStorage.setItem('jermsky_user', JSON.stringify(data.user));
  return data;
}
window.login = login;

function logout() {
  State.token = ''; State.user = null;
  localStorage.removeItem('jermsky_token');
  localStorage.removeItem('jermsky_user');
}
window.logout = logout;

function doSearch() {
  const val = $('searchBar').value.trim();
  if (val) fetchByCity(val);
}

function getGPS() {
  if (!navigator.geolocation) { showError('Trình duyệt không hỗ trợ định vị.'); return; }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => { showError('Không thể lấy vị trí.'); setLoading(false); }
  );
}

async function fetchByCity(city) {
  State.city = city; setLoading(true);
  try {
    const current = await apiFetch(`/weather/current?city=${encodeURIComponent(city)}&units=${State.unit}`);
    State.lat = current.coord.lat; State.lon = current.coord.lon;
    renderToday(current);
    await Promise.all([fetchForecast(), fetchHourly(), fetchAirQuality()]);
  } catch (e) { showError(e.message); }
  finally { setLoading(false); }
}

async function fetchByCoords(lat, lon) {
  State.lat = lat; State.lon = lon; setLoading(true);
  try {
    const current = await apiFetch(`/weather/current?lat=${lat}&lon=${lon}&units=${State.unit}`);
    State.city = current.name; renderToday(current);
    await Promise.all([fetchForecast(), fetchHourly(), fetchAirQuality()]);
  } catch (e) { showError(e.message); }
  finally { setLoading(false); }
}

async function fetchForecast() {
  const data = await apiFetch(`/weather/forecast?lat=${State.lat}&lon=${State.lon}&units=${State.unit}&cnt=56`);
  renderForecast(data);
}

async function fetchHourly() {
  const data = await apiFetch(`/weather/forecast?lat=${State.lat}&lon=${State.lon}&units=${State.unit}&cnt=8`);
  renderHourly(data);
}

async function fetchAirQuality() {
  try {
    const data = await apiFetch(`/weather/airquality?lat=${State.lat}&lon=${State.lon}`);
    renderAirQuality(data.airQuality, data.uv);
  } catch (_) { setText('uvIndex', 'N/A'); }
}

async function loadHistory() {
  if (!State.token) return;
  try { const data = await apiFetch('/history'); renderHistory(data.history); } catch (_) {}
}

async function clearHistory() {
  try { await apiFetch('/history', { method: 'DELETE' }); renderHistory([]); } catch (e) { showError(e.message); }
}
window.clearHistory = clearHistory;

async function deleteHistoryItem(id) {
  try { await apiFetch(`/history/${id}`, { method: 'DELETE' }); loadHistory(); } catch (e) { showError(e.message); }
}
window.deleteHistoryItem = deleteHistoryItem;

function renderHistory(list) {
  const container = $('historyList');
  if (!container) return;
  if (!list.length) { container.innerHTML = '<p style="color:var(--muted);font-size:14px">Chưa có lịch sử tìm kiếm.</p>'; return; }
  container.innerHTML = list.map(item => `
    <div class="history-item glass" onclick="fetchByCity('${item.city}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-radius:12px;cursor:pointer;margin-bottom:8px">
      <div>
        <div style="font-weight:600">${item.city}, ${item.country}</div>
        <div style="font-size:12px;color:var(--muted)">${new Date(item.createdAt).toLocaleString('vi-VN')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        ${item.weatherSnapshot?.icon ? `<img src="https://openweathermap.org/img/wn/${item.weatherSnapshot.icon}.png" width="32" />` : ''}
        <span style="font-family:var(--font-head);font-size:18px">${Math.round(item.weatherSnapshot?.temp||0)}${unitSym()}</span>
        <button onclick="event.stopPropagation();deleteHistoryItem('${item._id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:4px">✕</button>
      </div>
    </div>
  `).join('');
}

async function apiFetch(path, options = {}) {
  const res  = await fetch(`${API_BASE}${path}`, { headers: getHeaders(), ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

function renderToday(data) {
  const u = unitSym(), ws = windSym();
  setText('heroLocation', `${data.name}, ${data.sys.country}`);
  setText('heroDate',     formatDate(new Date()));
  setText('heroTemp',     Math.round(data.main.temp) + u);
  setText('heroDesc',     data.weather[0].description);
  setText('heroRange',    `↑ ${Math.round(data.main.temp_max)}${u}  ·  ↓ ${Math.round(data.main.temp_min)}${u}`);
  setText('heroFeels',    `Cảm giác như ${Math.round(data.main.feels_like)}${u}`);
  const icon = $('heroIcon');
  icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  icon.alt = data.weather[0].description;
  setText('sHumidity',  `${data.main.humidity}%`);
  setText('sWind',      `${Math.round(data.wind.speed)} ${ws}`);
  setText('sVis',       `${(data.visibility/1000).toFixed(1)} km`);
  setText('sPressure',  `${data.main.pressure} hPa`);
  setText('sSunrise',   utcToLocal(data.sys.sunrise, data.timezone));
  setText('sSunset',    utcToLocal(data.sys.sunset,  data.timezone));
  setText('sClouds',    `${data.clouds.all}%`);
  setText('sWindDir',   degToCompass(data.wind.deg));
}

function renderForecast(data) {
  const u = unitSym();
  const list = $('forecastList');
  list.innerHTML = '';
  // Lưu toàn bộ data.list vào cache cho modal
  forecastDataCache = data.list;
  const days = {};
  data.list.forEach(item => {
    const key = new Date(item.dt*1000).toISOString().split('T')[0];
    const h   = new Date(item.dt*1000).getHours();
    if (!days[key] || Math.abs(h-12) < Math.abs(new Date(days[key].dt*1000).getHours()-12)) days[key] = item;
  });
  const entries = Object.values(days).slice(0,7);
  const allT = entries.map(e=>[e.main.temp_min,e.main.temp_max]).flat();
  const gMin = Math.min(...allT), gMax = Math.max(...allT);
  entries.forEach((item,i) => {
    const d  = new Date(item.dt*1000);
    const day = i===0 ? 'Hôm nay' : d.toLocaleDateString('vi-VN',{weekday:'long'});
    const hi = Math.round(item.main.temp_max), lo = Math.round(item.main.temp_min);
    const pop = Math.round((item.pop||0)*100);
    const bL  = ((lo-gMin)/(gMax-gMin)*100).toFixed(1);
    const bW  = (((hi-lo)/(gMax-gMin))*100).toFixed(1);
    const el  = document.createElement('div');
    el.className = 'forecast-item glass';
    el.innerHTML = `
      <div class="fc-day">${day}</div>
      <img class="fc-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="" />
      <div class="fc-desc">${item.weather[0].description}</div>
      <div class="fc-bar-wrap">
        <span class="fc-lo">${lo}${u}</span>
        <div class="fc-bar"><div class="fc-bar-fill" style="margin-left:${bL}%;width:${bW}%"></div></div>
      </div>
      <div class="fc-hi">${hi}${u}</div>
      <div class="fc-rain">${pop>0?'💧 '+pop+'%':''}</div>
      <div class="fc-detail-hint">Chi tiết →</div>`;
    // Gắn click mở modal — truyền index của entry trong forecastDataCache
    const cacheIndex = forecastDataCache.findIndex(s => s.dt === item.dt);
    el.addEventListener('click', () => openForecastModal(cacheIndex));
    list.appendChild(el);
  });
}

function renderHourly(data) {
  const u = unitSym();
  const items = data.list.slice(0,8);
  const labels = items.map(i=>new Date(i.dt*1000).getHours().toString().padStart(2,'0')+':00');
  const temps  = items.map(i=>Math.round(i.main.temp));
  if (State.hourlyChart) State.hourlyChart.destroy();
  const ctx  = $('hourlyChart').getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(56,189,248,0.35)');
  grad.addColorStop(1,'rgba(56,189,248,0)');
  State.hourlyChart = new Chart(ctx,{
    type:'line',
    data:{ labels, datasets:[{ data:temps, borderColor:'#38bdf8', backgroundColor:grad, borderWidth:2.5, pointBackgroundColor:'#38bdf8', pointRadius:5, tension:0.4, fill:true }]},
    options:{
      responsive:true,
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'rgba(7,9,15,0.85)', borderColor:'rgba(56,189,248,0.3)', borderWidth:1, titleColor:'#38bdf8', bodyColor:'#e4e8f7', callbacks:{label:c=>` ${c.parsed.y}${u}`}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'rgba(228,232,247,0.5)',font:{family:'Nunito',size:12}}},
        y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'rgba(228,232,247,0.5)',font:{family:'Nunito',size:12},callback:v=>v+u}}
      }
    }
  });
  const container = $('hourlyCards');
  container.innerHTML = '';
  items.forEach(item=>{
    const d   = new Date(item.dt*1000);
    const pop = Math.round((item.pop||0)*100);
    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <div class="hc-time">${d.getHours().toString().padStart(2,'0')}:00</div>
      <img class="hc-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="" />
      <div class="hc-temp">${Math.round(item.main.temp)}${u}</div>
      ${pop>0?`<div class="hc-rain">💧 ${pop}%</div>`:''}`;
    container.appendChild(card);
  });
}

function renderAirQuality(aqData, uvData) {
  const aqi = aqData.list[0].main.aqi, comp = aqData.list[0].components;
  const aqiMap = { 1:{label:'Tốt',color:'#34d399'}, 2:{label:'Khá tốt',color:'#a3e635'}, 3:{label:'Trung bình',color:'#fbbf24'}, 4:{label:'Kém',color:'#f97316'}, 5:{label:'Rất kém',color:'#f87171'} };
  const info = aqiMap[aqi]||aqiMap[3];
  setText('aqiScore', aqi); setText('aqiStatus', info.label);
  $('aqiScore').style.color = $('aqiStatus').style.color = info.color;
  $('aqiBarFill').style.left = `${((aqi-1)/4*88).toFixed(1)}%`;
  setText('aqiPM25', `${comp.pm2_5.toFixed(1)} µg/m³`);
  setText('aqiPM10', `${comp.pm10.toFixed(1)} µg/m³`);
  setText('aqiCO',   `${comp.co.toFixed(1)} µg/m³`);
  setText('aqiNO2',  `${comp.no2.toFixed(1)} µg/m³`);
  setText('aqiO3',   `${comp.o3.toFixed(1)} µg/m³`);
  if (uvData?.value !== undefined) {
    const uv = uvData.value;
    const lb = uv<=2?'Thấp':uv<=5?'Trung bình':uv<=7?'Cao':uv<=10?'Rất cao':'Cực nguy hiểm';
    setText('uvIndex', `${uv} — ${lb}`);
  }
}

function unitSym()  { return State.unit==='metric'?'°C':'°F'; }
function windSym()  { return State.unit==='metric'?'km/h':'mph'; }
function utcToLocal(unix,tz) { const d=new Date((unix+tz)*1000); return `${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}`; }
function formatDate(d) { return d.toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function degToCompass(deg) { if(deg===undefined)return'—'; const dirs=['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc']; return dirs[Math.round(deg/45)%8]; }
function setLoading(on)  { $('loader').classList.toggle('show',on); }
function showError(msg)  { const el=$('errorToast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),5000); }

// ============================================
// FORECAST DETAIL MODAL
// ============================================
let forecastDataCache = [];
let modalChart = null;

function openForecastModal(index) {
  const item = forecastDataCache[index];
  if (!item) return;

  const u  = unitSym();
  const ws = windSym();
  const d  = new Date(item.dt * 1000);
  const dayNames = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];

  document.getElementById('modalDay').textContent  = index === 0 ? 'Hôm nay' : dayNames[d.getDay()];
  document.getElementById('modalDate').textContent = d.toLocaleDateString('vi-VN', { day:'numeric', month:'long', year:'numeric' });
  document.getElementById('modalIcon').src         = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
  document.getElementById('modalTemp').textContent = Math.round(item.main.temp) + u;
  document.getElementById('modalDesc').textContent = item.weather[0].description;
  document.getElementById('modalLo').textContent   = Math.round(item.main.temp_min) + u;
  document.getElementById('modalHi').textContent   = Math.round(item.main.temp_max) + u;
  document.getElementById('modalHumidity').textContent = item.main.humidity + '%';
  document.getElementById('modalWind').textContent     = Math.round(item.wind.speed) + ' ' + ws;
  document.getElementById('modalPressure').textContent = item.main.pressure + ' hPa';
  document.getElementById('modalClouds').textContent   = item.clouds.all + '%';
  document.getElementById('modalPop').textContent      = Math.round((item.pop || 0) * 100) + '%';
  document.getElementById('modalGust').textContent     = item.wind.gust ? Math.round(item.wind.gust) + ' ' + ws : 'N/A';

  // Bar fill width
  document.getElementById('modalBarFill').style.width = '75%';

  // Mini hourly chart for the day — lấy từ forecastDataCache tất cả slot trong ngày đó
  const dayKey  = d.toISOString().split('T')[0];
  const daySlots = forecastDataCache.filter(slot => {
    return new Date(slot.dt * 1000).toISOString().split('T')[0] === dayKey;
  });

  const labels = daySlots.map(s => new Date(s.dt * 1000).getHours().toString().padStart(2,'0') + ':00');
  const temps  = daySlots.map(s => Math.round(s.main.temp));

  if (modalChart) modalChart.destroy();
  const ctx  = document.getElementById('modalChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 120);
  grad.addColorStop(0, 'rgba(56,189,248,0.3)');
  grad.addColorStop(1, 'rgba(56,189,248,0)');

  modalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: temps,
        borderColor: '#38bdf8',
        backgroundColor: grad,
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(7,9,15,0.9)',
          borderColor: 'rgba(56,189,248,0.3)',
          borderWidth: 1,
          titleColor: '#38bdf8',
          bodyColor: '#e4e8f7',
          callbacks: { label: c => ` ${c.parsed.y}${u}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(228,232,247,0.45)', font: { family: 'Poppins', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(228,232,247,0.45)', font: { family: 'Poppins', size: 11 }, callback: v => v + u } }
      }
    }
  });

  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.body.style.overflow = '';
}
window.closeModal = closeModal;

// Đóng modal bằng ESC
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ============================================
// AUTH MODAL UI
// ============================================
function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  document.getElementById('authOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  document.getElementById('authOverlay').classList.remove('show');
  document.body.style.overflow = '';
  // Clear fields
  ['loginEmail','loginPassword','regUsername','regEmail','regPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setAuthError('login', '');
  setAuthError('register', '');
}
window.closeAuthModal = closeAuthModal;

function switchAuthTab(tab) {
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
}
window.switchAuthTab = switchAuthTab;

function setAuthError(form, msg) {
  const el = document.getElementById(form === 'login' ? 'loginError' : 'registerError');
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

function setAuthLoading(form, on) {
  const btn = document.getElementById(form === 'login' ? 'loginSubmit' : 'registerSubmit');
  btn.disabled = on;
  btn.textContent = on ? 'Đang xử lý...' : (form === 'login' ? 'Đăng nhập' : 'Đăng ký');
}

// ============================================
// AUTH ACTIONS
// ============================================
async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { setAuthError('login', 'Vui lòng nhập đầy đủ thông tin.'); return; }

  setAuthLoading('login', true);
  try {
    await login(email, password);
    closeAuthModal();
    renderUserUI();
    showSuccess(`Chào mừng trở lại, ${State.user.username}! 👋`);
    loadHistory();
  } catch (e) {
    setAuthError('login', e.message);
  } finally {
    setAuthLoading('login', false);
  }
}
window.doLogin = doLogin;

async function doRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !email || !password) { setAuthError('register', 'Vui lòng nhập đầy đủ thông tin.'); return; }

  setAuthLoading('register', true);
  try {
    await register(username, email, password);
    closeAuthModal();
    renderUserUI();
    showSuccess(`Đăng ký thành công! Chào mừng, ${State.user.username} ✨`);
  } catch (e) {
    setAuthError('register', e.message);
  } finally {
    setAuthLoading('register', false);
  }
}
window.doRegister = doRegister;

function doLogout() {
  logout();
  renderUserUI();
  showSuccess('Đã đăng xuất thành công.');
  // Reset history tab
  document.getElementById('historyLoginNotice').style.display = '';
  document.getElementById('historyLogged').style.display = 'none';
}
window.doLogout = doLogout;

// ============================================
// RENDER USER UI
// ============================================
function renderUserUI() {
  const userInfo    = document.getElementById('userInfo');
  const authOpenBtn = document.getElementById('authOpenBtn');
  const historyBtn  = document.getElementById('historyNavBtn');

  if (State.user) {
    userInfo.classList.remove('hidden');
    authOpenBtn.style.display = 'none';
    document.getElementById('userName').textContent  = State.user.username;
    document.getElementById('userAvatar').textContent = State.user.username[0].toUpperCase();
    // Show history tab
    historyBtn.style.display = '';
    document.getElementById('historyLoginNotice').style.display = 'none';
    document.getElementById('historyLogged').style.display = '';
    const bulletinBtn = document.getElementById('bulletinNavBtn');
    if (bulletinBtn) bulletinBtn.style.display = '';
  } else {
    userInfo.classList.add('hidden');
    authOpenBtn.style.display = '';
    historyBtn.style.display = 'none';
    const bBtn = document.getElementById('bulletinNavBtn');
    if (bBtn) bBtn.style.display = 'none';
  }
}

// ============================================
// HISTORY UI
// ============================================
async function loadHistory() {
  if (!State.token) return;
  try {
    const data = await apiFetch('/history');
    renderHistoryList(data.history);
  } catch (_) {}
}

function renderHistoryList(list) {
  const container = document.getElementById('historyList');
  const countEl   = document.getElementById('historyCount');
  if (!container) return;

  countEl.textContent = `${list.length} lần tìm kiếm gần nhất`;

  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);font-size:14px">Chưa có lịch sử tìm kiếm nào.</div>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="history-item glass" onclick="fetchByCity('${item.city}')">
      <div class="history-item-left">
        <div class="history-item-city">${item.city}${item.country ? ', ' + item.country : ''}</div>
        <div class="history-item-time">${new Date(item.createdAt).toLocaleString('vi-VN')}</div>
      </div>
      <div class="history-item-right">
        ${item.weatherSnapshot?.icon
          ? `<img src="https://openweathermap.org/img/wn/${item.weatherSnapshot.icon}.png" width="36" height="36" />`
          : ''}
        <span class="history-item-temp">${Math.round(item.weatherSnapshot?.temp || 0)}${unitSym()}</span>
        <button class="history-item-delete" onclick="event.stopPropagation();doDeleteHistory('${item._id}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function doClearHistory() {
  if (!confirm('Xóa toàn bộ lịch sử tìm kiếm?')) return;
  try {
    await apiFetch('/history', { method: 'DELETE' });
    renderHistoryList([]);
    showSuccess('Đã xóa toàn bộ lịch sử.');
  } catch (e) { showError(e.message); }
}
window.doClearHistory = doClearHistory;

async function doDeleteHistory(id) {
  try {
    await apiFetch(`/history/${id}`, { method: 'DELETE' });
    loadHistory();
  } catch (e) { showError(e.message); }
}
window.doDeleteHistory = doDeleteHistory;

// ============================================
// SUCCESS TOAST
// ============================================
function showSuccess(msg) {
  const el = document.getElementById('successToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ============================================
// INIT AUTH STATE ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderUserUI();
  // Enter key cho auth forms
  document.getElementById('loginPassword')?.addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('regPassword')?.addEventListener('keyup',  e => { if (e.key === 'Enter') doRegister(); });
  // Ẩn history tab nếu chưa đăng nhập
  if (!State.user) document.getElementById('historyNavBtn').style.display = 'none';
}, { once: true });

// ============================================
// BULLETIN — Bản tin thời tiết
// ============================================

// Thành phố thế giới cố định
const WORLD_CITIES = [
  { city: 'Tokyo',         country: 'Nhật Bản',    flag: '🇯🇵' },
  { city: 'London',        country: 'Anh',          flag: '🇬🇧' },
  { city: 'New York',      country: 'Mỹ',           flag: '🇺🇸' },
  { city: 'Paris',         country: 'Pháp',         flag: '🇫🇷' },
  { city: 'Sydney',        country: 'Úc',           flag: '🇦🇺' },
  { city: 'Dubai',         country: 'UAE',          flag: '🇦🇪' },
  { city: 'Singapore',     country: 'Singapore',    flag: '🇸🇬' },
  { city: 'Seoul',         country: 'Hàn Quốc',    flag: '🇰🇷' },
];

let weeklyChart = null;

async function loadBulletin() {
  if (!State.token) return;

  // Spinner
  const loader = $('bulletinLoader');
  const content = $('bulletinContent');
  const refreshBtn = $('bulletinRefreshBtn');
  loader.style.display = 'flex';
  content.style.opacity = '0.4';
  refreshBtn.classList.add('spinning');

  try {
    // 1. Lấy lịch sử user
    const histData = await apiFetch('/history?limit=20');
    const history  = histData.history || [];

    // 2. Lấy thời tiết các thành phố thế giới
    await renderWorldCities();

    // 3. Thành phố của user (từ history, unique)
    await renderMyCities(history);

    // 4. Cảnh báo thời tiết
    await renderAlerts(history);

    // 5. Biểu đồ thống kê — dùng thành phố đầu tiên trong history
    if (history.length > 0) {
      await renderWeeklyChart(history[0].city);
    }

    // Cập nhật subtitle
    const sub = $('bulletinSub');
    sub.textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${history.length > 0 ? ' · Dựa trên ' + history.length + ' lần tìm kiếm gần nhất' : ''}`;

  } catch (e) {
    showError('Không thể tải bản tin: ' + e.message);
  } finally {
    loader.style.display = 'none';
    content.style.opacity = '1';
    refreshBtn.classList.remove('spinning');
  }
}

// ---- Thành phố thế giới ----
async function renderWorldCities() {
  const grid = $('worldGrid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted);font-size:13px">Đang tải...</div>';

  const results = await Promise.allSettled(
    WORLD_CITIES.map(c =>
      apiFetch(`/weather/current?city=${encodeURIComponent(c.city)}&units=${State.unit}`)
    )
  );

  grid.innerHTML = '';
  results.forEach((res, i) => {
    const meta = WORLD_CITIES[i];
    if (res.status !== 'fulfilled') return;
    const d  = res.value;
    const u  = unitSym();
    const ws = windSym();
    const card = document.createElement('div');
    card.className = 'world-card';
    card.onclick = () => fetchByCity(meta.city);
    card.innerHTML = `
      <img class="wc-icon" src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" alt="" />
      <div class="wc-flag">${meta.flag}</div>
      <div class="wc-city">${d.name}</div>
      <div class="wc-country">${meta.country}</div>
      <div class="wc-temp">${Math.round(d.main.temp)}${u}</div>
      <div class="wc-desc">${d.weather[0].description}</div>
      <div class="wc-row">
        <span>💧 ${d.main.humidity}%</span>
        <span>💨 ${Math.round(d.wind.speed)} ${ws}</span>
      </div>`;
    grid.appendChild(card);
  });
}

// ---- Thành phố của user ----
async function renderMyCities(history) {
  const section = $('myCitiesSection');
  const grid    = $('myCitiesGrid');
  if (!history.length) { section.style.display = 'none'; return; }

  // Unique cities, max 6
  const seen = new Set();
  const cities = history.filter(h => {
    if (seen.has(h.city)) return false;
    seen.add(h.city); return true;
  }).slice(0, 6);

  section.style.display = '';
  grid.innerHTML = '';

  const results = await Promise.allSettled(
    cities.map(c => apiFetch(`/weather/current?city=${encodeURIComponent(c.city)}&units=${State.unit}`))
  );

  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    const d = res.value;
    const u = unitSym();
    const card = document.createElement('div');
    card.className = 'my-city-card';
    card.onclick = () => fetchByCity(cities[i].city);
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="mc-city">${d.name}, ${d.sys.country}</div>
        <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png" width="32" />
      </div>
      <div class="mc-temp">${Math.round(d.main.temp)}${u}</div>
      <div class="mc-desc">${d.weather[0].description}</div>
      <div class="mc-row">
        <span>↑ ${Math.round(d.main.temp_max)}${u}</span>
        <span>↓ ${Math.round(d.main.temp_min)}${u}</span>
        <span>💧 ${d.main.humidity}%</span>
      </div>`;
    grid.appendChild(card);
  });
}

// ---- Cảnh báo thời tiết ----
async function renderAlerts(history) {
  const section   = $('alertsSection');
  const alertsList = $('alertsList');
  alertsList.innerHTML = '';
  const alerts = [];

  // Lấy thời tiết các thành phố user + world để phân tích
  const checkCities = [...new Set([
    ...history.slice(0, 5).map(h => h.city),
    'Hanoi', 'Ho Chi Minh City', 'Da Nang'
  ])];

  const results = await Promise.allSettled(
    checkCities.map(c => apiFetch(`/weather/current?city=${encodeURIComponent(c)}&units=metric`))
  );

  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    const d    = res.value;
    const name = d.name;
    const temp = d.main.temp;
    const wind = d.wind.speed;
    const id   = d.weather[0].id;
    const desc = d.weather[0].description;

    // Nắng nóng > 38°C
    if (temp >= 38) alerts.push({ type: 'danger', icon: '🔥', title: `Nắng nóng cực độ tại ${name}`, desc: `Nhiệt độ lên đến ${Math.round(temp)}°C — Hạn chế ra ngoài, uống nhiều nước.`, city: name });
    // Nhiệt độ cao > 33°C
    else if (temp >= 33) alerts.push({ type: 'warning', icon: '☀️', title: `Nắng nóng tại ${name}`, desc: `Nhiệt độ ${Math.round(temp)}°C — Mang theo nước và kem chống nắng.`, city: name });
    // Lạnh < 10°C
    if (temp <= 10) alerts.push({ type: 'info', icon: '🥶', title: `Trời lạnh tại ${name}`, desc: `Nhiệt độ chỉ ${Math.round(temp)}°C — Mặc đủ ấm khi ra ngoài.`, city: name });
    // Gió mạnh > 50 km/h
    if (wind * 3.6 >= 50) alerts.push({ type: 'danger', icon: '🌪️', title: `Gió mạnh tại ${name}`, desc: `Tốc độ gió ${Math.round(wind * 3.6)} km/h — Cẩn thận khi lái xe và đi bộ.`, city: name });
    // Bão/mưa lớn (weather id 2xx: thunderstorm, 5xx: rain)
    if (id >= 200 && id < 300) alerts.push({ type: 'danger', icon: '⛈️', title: `Dông bão tại ${name}`, desc: `${desc} — Tránh ở ngoài trời và khu vực trống trải.`, city: name });
    else if (id >= 500 && id < 510) alerts.push({ type: 'warning', icon: '🌧️', title: `Mưa lớn tại ${name}`, desc: `${desc} — Mang theo áo mưa và cẩn thận ngập lụt.`, city: name });
    // Sương mù (id 7xx)
    if (id >= 700 && id < 800) alerts.push({ type: 'info', icon: '🌫️', title: `Sương mù tại ${name}`, desc: `Tầm nhìn thấp — Cẩn thận khi lái xe.`, city: name });
  });

  if (!alerts.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  // Max 5 cảnh báo
  alerts.slice(0, 5).forEach(a => {
    const el = document.createElement('div');
    el.className = `alert-card ${a.type}`;
    el.innerHTML = `
      <div class="alert-icon">${a.icon}</div>
      <div>
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-city">📍 ${a.city}</div>
      </div>`;
    alertsList.appendChild(el);
  });
}

// ---- Biểu đồ thống kê 5 ngày ----
async function renderWeeklyChart(city) {
  const section = $('weeklySection');
  try {
    const data = await apiFetch(`/weather/forecast?city=${encodeURIComponent(city)}&units=${State.unit}&cnt=40`);
    section.style.display = '';
    $('weeklyCity').textContent = '— ' + city;

    // Nhóm theo ngày
    const days = {};
    data.list.forEach(item => {
      const key = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!days[key]) days[key] = [];
      days[key].push(item);
    });

    const entries = Object.entries(days).slice(0, 5);
    const u = unitSym();

    const labels  = entries.map(([key]) => new Date(key).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }));
    const maxTemps = entries.map(([, items]) => Math.round(Math.max(...items.map(i => i.main.temp_max))));
    const minTemps = entries.map(([, items]) => Math.round(Math.min(...items.map(i => i.main.temp_min))));
    const avgTemps = entries.map(([, items]) => Math.round(items.reduce((s, i) => s + i.main.temp, 0) / items.length));
    const rainPops = entries.map(([, items]) => Math.round(Math.max(...items.map(i => (i.pop || 0) * 100))));

    if (weeklyChart) weeklyChart.destroy();
    const ctx = $('weeklyChart').getContext('2d');

    weeklyChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: `Cao nhất`,
            data: maxTemps,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248,113,113,0.08)',
            borderWidth: 2.5, pointRadius: 5, tension: 0.4, fill: false,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: `Trung bình`,
            data: avgTemps,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.08)',
            borderWidth: 2, pointRadius: 4, tension: 0.4,
            borderDash: [5, 3], fill: false,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: `Thấp nhất`,
            data: minTemps,
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129,140,248,0.08)',
            borderWidth: 2.5, pointRadius: 5, tension: 0.4, fill: false,
            yAxisID: 'y',
          },
          {
            type: 'bar',
            label: '% Mưa',
            data: rainPops,
            backgroundColor: 'rgba(129,140,248,0.18)',
            borderColor: 'rgba(129,140,248,0.4)',
            borderWidth: 1, borderRadius: 6,
            yAxisID: 'y2',
          },
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: 'rgba(228,232,247,0.6)', font: { family: 'Poppins', size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: 'rgba(7,9,15,0.9)',
            borderColor: 'rgba(56,189,248,0.25)',
            borderWidth: 1,
            titleColor: '#38bdf8',
            bodyColor: '#e4e8f7',
            callbacks: {
              label: ctx => {
                if (ctx.dataset.yAxisID === 'y2') return ` 💧 Mưa: ${ctx.parsed.y}%`;
                return ` ${ctx.dataset.label}: ${ctx.parsed.y}${u}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(228,232,247,0.5)', font: { family: 'Poppins', size: 11 } } },
          y: {
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(228,232,247,0.5)', font: { family: 'Poppins', size: 11 }, callback: v => v + u }
          },
          y2: {
            position: 'right', min: 0, max: 100,
            grid: { display: false },
            ticks: { color: 'rgba(129,140,248,0.6)', font: { family: 'Poppins', size: 11 }, callback: v => v + '%' }
          }
        }
      }
    });

    // Weekly summary stats
    const allMax  = Math.max(...maxTemps);
    const allMin  = Math.min(...minTemps);
    const maxRain = Math.max(...rainPops);
    $('weeklySummary').innerHTML = `
      <div class="ws-card"><div class="ws-label">🔥 Cao nhất tuần</div><div class="ws-val hot">${allMax}${u}</div></div>
      <div class="ws-card"><div class="ws-label">🧊 Thấp nhất tuần</div><div class="ws-val cold">${allMin}${u}</div></div>
      <div class="ws-card"><div class="ws-label">🌧️ Mưa cao nhất</div><div class="ws-val rain">${maxRain}%</div></div>
    `;
  } catch (_) {
    section.style.display = 'none';
  }
}

// ---- Init bulletin khi click tab ----
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'bulletin') loadBulletin();
    });
  });
}, { once: true });

// ============================================
// PROFILE MODAL
// ============================================

const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg,#38bdf8,#818cf8)', key: 'blue' },
  { bg: 'linear-gradient(135deg,#34d399,#38bdf8)', key: 'teal' },
  { bg: 'linear-gradient(135deg,#f87171,#fbbf24)', key: 'red' },
  { bg: 'linear-gradient(135deg,#a78bfa,#f472b6)', key: 'purple' },
  { bg: 'linear-gradient(135deg,#fbbf24,#f87171)', key: 'orange' },
  { bg: 'linear-gradient(135deg,#34d399,#a78bfa)', key: 'green' },
];
const AVATAR_EMOJIS = ['😎','🌤','⛅','🌈','❄️','🔥','🌊','🍃'];

let selectedAvatarColor = localStorage.getItem('jermsky_avatar_color') || 'blue';
let selectedAvatarEmoji = localStorage.getItem('jermsky_avatar_emoji') || '';
let selectedUnit = State.unit;

function openProfileModal() {
  if (!State.user) return;
  // Fill current info
  document.getElementById('pfUsername').value = State.user.username || '';
  document.getElementById('pfEmail').value    = State.user.email    || '';
  document.getElementById('pfFavCity').value  = State.user.favoriteCity || '';
  const hint = document.getElementById('pfFavCityHint');
  hint.textContent = State.user.favoriteCity
    ? `Hiện tại: ${State.user.favoriteCity} — tự động load khi đăng nhập`
    : 'Thành phố sẽ tự động load mỗi khi đăng nhập';

  // Unit
  selectedUnit = State.user.preferredUnit || State.unit;
  document.getElementById('pfUnitC').classList.toggle('active', selectedUnit === 'metric');
  document.getElementById('pfUnitF').classList.toggle('active', selectedUnit === 'imperial');

  // Init avatar options
  initAvatarOptions();
  applyAvatarPreview();

  // Reset tabs & errors
  switchProfileTab('info');
  ['pfInfoError','pfPwError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });
  ['pfCurrentPw','pfNewPw','pfConfirmPw'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('pwStrengthWrap').style.display = 'none';

  document.getElementById('profileOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
window.openProfileModal = openProfileModal;

function closeProfileModal() {
  document.getElementById('profileOverlay').classList.remove('show');
  document.body.style.overflow = '';
}
window.closeProfileModal = closeProfileModal;

// ---- Tabs ----
function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ptab === tab);
  });
  document.querySelectorAll('.profile-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `ptab-${tab}`);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', () => switchProfileTab(btn.dataset.ptab));
  });
  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProfileModal();
      closeModal();
      closeAuthModal();
    }
  });

  // Password strength meter
  const newPwInput = document.getElementById('pfNewPw');
  if (newPwInput) {
    newPwInput.addEventListener('input', () => {
      const val = newPwInput.value;
      document.getElementById('pwStrengthWrap').style.display = val ? '' : 'none';
      const strength = calcPwStrength(val);
      const fill  = document.getElementById('pwStrengthFill');
      const label = document.getElementById('pwStrengthLabel');
      const levels = [
        { w:'25%', bg:'#f87171', text:'Yếu' },
        { w:'50%', bg:'#fbbf24', text:'Trung bình' },
        { w:'75%', bg:'#38bdf8', text:'Khá mạnh' },
        { w:'100%',bg:'#34d399', text:'Mạnh' },
      ];
      const lv = levels[Math.min(strength, 3)];
      fill.style.width      = lv.w;
      fill.style.background = lv.bg;
      label.textContent     = lv.text;
      label.style.color     = lv.bg;
    });
  }
}, { once: true });

function calcPwStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// ---- Avatar ----
function initAvatarOptions() {
  // Colors
  const colorsEl = document.getElementById('avatarColors');
  colorsEl.innerHTML = AVATAR_COLORS.map(c => `
    <button class="avatar-color-btn ${selectedAvatarColor === c.key && !selectedAvatarEmoji ? 'active' : ''}"
      style="background:${c.bg}"
      onclick="selectAvatarColor('${c.key}','${c.bg}')"></button>
  `).join('');

  // Emojis
  const emojisEl = document.getElementById('avatarEmojis');
  emojisEl.innerHTML = AVATAR_EMOJIS.map(e => `
    <button class="avatar-emoji-btn ${selectedAvatarEmoji === e ? 'active' : ''}"
      onclick="selectAvatarEmoji('${e}')">${e}</button>
  `).join('');
}

function selectAvatarColor(key, bg) {
  selectedAvatarColor = key;
  selectedAvatarEmoji = '';
  localStorage.setItem('jermsky_avatar_color', key);
  localStorage.removeItem('jermsky_avatar_emoji');
  initAvatarOptions();
  applyAvatarPreview();
  updateSidebarAvatar();
}
window.selectAvatarColor = selectAvatarColor;

function selectAvatarEmoji(emoji) {
  selectedAvatarEmoji = emoji;
  localStorage.setItem('jermsky_avatar_emoji', emoji);
  initAvatarOptions();
  applyAvatarPreview();
  updateSidebarAvatar();
}
window.selectAvatarEmoji = selectAvatarEmoji;

function applyAvatarPreview() {
  const preview = document.getElementById('avatarPreview');
  const initial = document.getElementById('avatarInitial');
  if (selectedAvatarEmoji) {
    preview.style.background = 'rgba(255,255,255,0.08)';
    initial.textContent = selectedAvatarEmoji;
    initial.style.fontSize = '32px';
  } else {
    const colorObj = AVATAR_COLORS.find(c => c.key === selectedAvatarColor) || AVATAR_COLORS[0];
    preview.style.background = colorObj.bg;
    initial.textContent = (State.user?.username || 'U')[0].toUpperCase();
    initial.style.fontSize = '26px';
  }
}

function updateSidebarAvatar() {
  const sidebarAvatar = document.getElementById('userAvatar');
  if (!sidebarAvatar) return;
  if (selectedAvatarEmoji) {
    sidebarAvatar.textContent = selectedAvatarEmoji;
    sidebarAvatar.style.background = 'rgba(255,255,255,0.08)';
    sidebarAvatar.style.fontSize = '18px';
  } else {
    const colorObj = AVATAR_COLORS.find(c => c.key === selectedAvatarColor) || AVATAR_COLORS[0];
    sidebarAvatar.style.background = colorObj.bg;
    sidebarAvatar.textContent = (State.user?.username || 'U')[0].toUpperCase();
    sidebarAvatar.style.fontSize = '';
  }
}

// ---- Save profile info ----
async function saveProfileInfo() {
  const username = document.getElementById('pfUsername').value.trim();
  const email    = document.getElementById('pfEmail').value.trim();
  const errEl    = document.getElementById('pfInfoError');
  const btn      = document.getElementById('pfInfoSubmit');

  if (!username || !email) { showPfError('pfInfoError', 'Vui lòng điền đầy đủ thông tin.'); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showPfError('pfInfoError', 'Email không hợp lệ.'); return; }

  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    const data = await apiFetch('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ username, email }),
    });
    // Update local state
    State.user = { ...State.user, username, email };
    localStorage.setItem('jermsky_user', JSON.stringify(State.user));
    // Update sidebar
    document.getElementById('userName').textContent = username;
    updateSidebarAvatar();
    showSuccess('Cập nhật thông tin thành công! ✓');
    hidePfError('pfInfoError');
  } catch (e) {
    showPfError('pfInfoError', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Lưu thông tin';
  }
}
window.saveProfileInfo = saveProfileInfo;

// ---- Save password ----
async function savePassword() {
  const currentPw = document.getElementById('pfCurrentPw').value;
  const newPw     = document.getElementById('pfNewPw').value;
  const confirmPw = document.getElementById('pfConfirmPw').value;
  const btn       = document.getElementById('pfPwSubmit');

  if (!currentPw || !newPw || !confirmPw) { showPfError('pfPwError', 'Vui lòng điền đầy đủ.'); return; }
  if (newPw.length < 6) { showPfError('pfPwError', 'Mật khẩu mới tối thiểu 6 ký tự.'); return; }
  if (newPw !== confirmPw) { showPfError('pfPwError', 'Mật khẩu xác nhận không khớp.'); return; }

  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    await apiFetch('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    ['pfCurrentPw','pfNewPw','pfConfirmPw'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('pwStrengthWrap').style.display = 'none';
    hidePfError('pfPwError');
    showSuccess('Đổi mật khẩu thành công! ✓');
  } catch (e) {
    showPfError('pfPwError', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Đổi mật khẩu';
  }
}
window.savePassword = savePassword;

// ---- Unit & fav city ----
function selectUnit(unit) {
  selectedUnit = unit;
  document.getElementById('pfUnitC').classList.toggle('active', unit === 'metric');
  document.getElementById('pfUnitF').classList.toggle('active', unit === 'imperial');
}
window.selectUnit = selectUnit;

async function saveFavCity() {
  const city = document.getElementById('pfFavCity').value.trim();
  try {
    await apiFetch('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ favoriteCity: city, preferredUnit: selectedUnit }),
    });
    State.user = { ...State.user, favoriteCity: city, preferredUnit: selectedUnit };
    localStorage.setItem('jermsky_user', JSON.stringify(State.user));

    // Apply unit immediately
    if (selectedUnit !== State.unit) {
      State.unit = selectedUnit;
      document.querySelectorAll('.unit-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.unit === selectedUnit);
      });
      if (State.city) fetchByCity(State.city);
    }

    const hint = document.getElementById('pfFavCityHint');
    hint.textContent = city ? `Đã lưu: ${city} — tự động load khi đăng nhập` : 'Đã xóa thành phố yêu thích';
    showSuccess('Đã lưu cài đặt! ✓');
  } catch (e) { showError(e.message); }
}
window.saveFavCity = saveFavCity;

// ---- Toggle password visibility ----
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}
window.togglePw = togglePw;

// ---- Delete all history ----
function confirmDeleteAllHistory() {
  if (!confirm('Xóa toàn bộ lịch sử tìm kiếm của bạn? Không thể hoàn tác!')) return;
  doClearHistory();
  closeProfileModal();
}
window.confirmDeleteAllHistory = confirmDeleteAllHistory;

// ---- Error helpers ----
function showPfError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
function hidePfError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
}

// ---- Apply saved avatar on load ----
document.addEventListener('DOMContentLoaded', () => {
  if (State.user) updateSidebarAvatar();

  // Auto-load favorite city nếu đã đăng nhập
  if (State.user?.favoriteCity) {
    fetchByCity(State.user.favoriteCity);
  }
}, { once: true });