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
      <div class="fc-rain">${pop>0?'💧 '+pop+'%':''}</div>`;
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