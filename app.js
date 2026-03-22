// ══════════════════════════════════════════
//  SMART HABIT TRACKER – app.js
// ══════════════════════════════════════════

const CATEGORIES = {
  health:     { label: 'Zdrowie',    icon: '💪', color: '#10b981' },
  mind:       { label: 'Umysł',      icon: '🧠', color: '#a855f7' },
  sleep:      { label: 'Sen',        icon: '😴', color: '#6366f1' },
  nutrition:  { label: 'Dieta',      icon: '🥗', color: '#22c55e' },
  fitness:    { label: 'Sport',      icon: '🏃', color: '#f97316' },
  social:     { label: 'Relacje',    icon: '🤝', color: '#06b6d4' },
  learning:   { label: 'Nauka',      icon: '📚', color: '#eab308' },
  creativity: { label: 'Kreatywność',icon: '🎨', color: '#ec4899' },
  finance:    { label: 'Finanse',    icon: '💰', color: '#84cc16' },
};

const FREQUENCIES = {
  daily:      { label: 'Codziennie', icon: '📅' },
  weekdays:   { label: 'Dni robocze',icon: '🗓' },
  '3x-week':  { label: '3x/tydzień', icon: '📆' },
  weekly:     { label: 'Tygodniowo', icon: '🗃' },
};

const BADGES = [
  { id: 'first',   name: 'Pionier',     icon: '🚀', desc: 'Pierwszy nawyk',     check: s => s.totalHabits >= 1 },
  { id: 'week',    name: 'Tygodnik',    icon: '🔥', desc: '7-dniowy streak',    check: s => s.maxStreak >= 7 },
  { id: 'month',   name: 'Mistrz',      icon: '👑', desc: '30-dniowy streak',   check: s => s.maxStreak >= 30 },
  { id: 'ten',     name: 'Kolekcjoner', icon: '💎', desc: '10 nawyków',         check: s => s.totalHabits >= 10 },
  { id: 'hundred', name: 'Centurion',   icon: '⚡', desc: '100 wykonań',        check: s => s.totalCheckins >= 100 },
  { id: 'perfect', name: 'Perfekcja',   icon: '✨', desc: 'Idealny tydzień',    check: s => s.perfectWeeks >= 1 },
];

// ── STATE ──
let state = {
  habits: [],
  checkins: {},     // { "habitId_YYYY-MM-DD": true }
  theme: 'dark',
  notifications: false,
  xp: 0,
  level: 1,
  earnedBadges: [],
  calendarMonth: null,
  calendarYear: null,
  selectedHabit: null,
  selectedCategory: 'health',
  selectedFrequency: 'daily',
};

// ── PERSISTENCE ──
function save() {
  localStorage.setItem('habitTracker_v3', JSON.stringify(state));
}
function load() {
  const raw = localStorage.getItem('habitTracker_v3');
  if (raw) {
    const loaded = JSON.parse(raw);
    state = { ...state, ...loaded };
  }
  if (!state.calendarMonth) {
    const now = new Date();
    state.calendarMonth = now.getMonth();
    state.calendarYear = now.getFullYear();
  }
}

// ── UTILITIES ──
function today() {
  return new Date().toISOString().slice(0, 10);
}
function dateKey(habitId, date) {
  return `${habitId}_${date}`;
}
function isDone(habitId, date = today()) {
  return !!state.checkins[dateKey(habitId, date)];
}
function getDateRange(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
function calcStreak(habitId) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (state.checkins[dateKey(habitId, key)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // allow today to be unchecked
      if (key === today() && streak === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}
function calcCompletion(habitId, days = 7) {
  const dates = getDateRange(days);
  const done = dates.filter(d => isDone(habitId, d)).length;
  return Math.round((done / days) * 100);
}
function totalCheckins() {
  return Object.keys(state.checkins).length;
}
function maxStreakAll() {
  return Math.max(0, ...state.habits.map(h => calcStreak(h.id)));
}
function perfectWeeks() {
  if (!state.habits.length) return 0;
  let count = 0;
  const dates = getDateRange(7);
  const allDone = dates.every(d =>
    state.habits.every(h => isDone(h.id, d))
  );
  if (allDone) count++;
  return count;
}
function computeXP() {
  const tc = totalCheckins();
  const ms = maxStreakAll();
  const hc = state.habits.length;
  return tc * 10 + ms * 5 + hc * 20;
}
function computeLevel(xp) {
  return Math.floor(xp / 200) + 1;
}
function xpForNextLevel(level) {
  return level * 200;
}

// ── BADGE CHECK ──
function checkBadges() {
  const stats = {
    totalHabits: state.habits.length,
    maxStreak: maxStreakAll(),
    totalCheckins: totalCheckins(),
    perfectWeeks: perfectWeeks(),
  };
  let newBadge = false;
  BADGES.forEach(b => {
    if (!state.earnedBadges.includes(b.id) && b.check(stats)) {
      state.earnedBadges.push(b.id);
      newBadge = b;
    }
  });
  if (newBadge) {
    showToast(`🏆 Zdobyto odznakę: ${newBadge.name}!`);
    confetti();
  }
}

// ── XP UPDATE ──
function updateXP() {
  const xp = computeXP();
  state.xp = xp;
  const lvl = computeLevel(xp);
  if (lvl > state.level) {
    state.level = lvl;
    showToast(`⚡ Level Up! Jesteś na poziomie ${lvl}!`);
    confetti();
  } else {
    state.level = lvl;
  }
}

// ── CONFETTI ──
function confetti() {
  const colors = ['#7c3aed','#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = '0';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (1 + Math.random()) + 's';
      el.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }, i * 30);
  }
}

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ══════════════════
//  RENDER FUNCTIONS
// ══════════════════

// ── TODAY TAB ──
function renderToday() {
  const container = document.getElementById('today-habits');
  if (!state.habits.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">✨</span>
        <p>Brak nawyków. Dodaj pierwszy<br>klikając przycisk poniżej!</p>
      </div>`;
    return;
  }

  const todayStr = today();
  const sorted = [...state.habits].sort((a, b) => {
    const ad = isDone(a.id) ? 1 : 0;
    const bd = isDone(b.id) ? 1 : 0;
    return ad - bd;
  });

  container.innerHTML = sorted.map(h => {
    const done = isDone(h.id, todayStr);
    const streak = calcStreak(h.id);
    const cat = CATEGORIES[h.category] || CATEGORIES.health;
    return `
      <div class="habit-item ${done ? 'done' : ''}" onclick="toggleToday('${h.id}')" id="habit-item-${h.id}">
        <div class="habit-icon" style="background:${cat.color}22">${cat.icon}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            ${cat.label} · ${FREQUENCIES[h.frequency]?.label || 'Codziennie'}
            ${streak > 1 ? `<span class="streak-badge" style="margin-left:6px">🔥 ${streak}</span>` : ''}
          </div>
        </div>
        <div class="habit-check" id="check-${h.id}">${done ? '✓' : ''}</div>
      </div>`;
  }).join('');

  // Quick progress
  const done = state.habits.filter(h => isDone(h.id, todayStr)).length;
  const pct = state.habits.length ? Math.round(done / state.habits.length * 100) : 0;
  document.getElementById('today-progress-bar').style.width = pct + '%';
  document.getElementById('today-progress-label').textContent = `${done}/${state.habits.length} ukończonych · ${pct}%`;
}

function toggleToday(id) {
  const key = dateKey(id, today());
  if (state.checkins[key]) {
    delete state.checkins[key];
  } else {
    state.checkins[key] = true;
    updateXP();
    checkBadges();
    // animate
    const el = document.getElementById(`check-${id}`);
    if (el) el.classList.add('check-pop');
    setTimeout(() => el?.classList.remove('check-pop'), 300);
  }
  save();
  renderToday();
  renderDashboard();
}

// ── ADD HABIT TAB ──
function renderAddForm() {
  // category buttons
  const catGrid = document.getElementById('cat-grid');
  catGrid.innerHTML = Object.entries(CATEGORIES).map(([key, c]) => `
    <div class="cat-btn ${state.selectedCategory === key ? 'active' : ''}" onclick="selectCategory('${key}')">
      <span>${c.icon}</span>${c.label}
    </div>`).join('');

  // frequency
  const freqGrid = document.getElementById('freq-grid');
  freqGrid.innerHTML = Object.entries(FREQUENCIES).map(([key, f]) => `
    <div class="freq-btn ${state.selectedFrequency === key ? 'active' : ''}" onclick="selectFrequency('${key}')">
      ${f.icon} ${f.label}
    </div>`).join('');
}

function selectCategory(key) {
  state.selectedCategory = key;
  renderAddForm();
}
function selectFrequency(key) {
  state.selectedFrequency = key;
  renderAddForm();
}

function addHabit() {
  const nameEl = document.getElementById('habit-name-input');
  const name = nameEl.value.trim();
  if (!name) { showToast('⚠️ Podaj nazwę nawyku!'); return; }

  const habit = {
    id: Date.now().toString(),
    name,
    category: state.selectedCategory,
    frequency: state.selectedFrequency,
    createdAt: today(),
  };
  state.habits.push(habit);
  nameEl.value = '';
  save();
  updateXP();
  checkBadges();
  showToast('✅ Nawyk dodany!');
  switchTab('today');
  renderToday();
  renderDashboard();
  renderHabitList();
}

// ── DASHBOARD TAB ──
function renderDashboard() {
  updateXP();

  // stats
  const todayDone = state.habits.filter(h => isDone(h.id)).length;
  const ms = maxStreakAll();
  const total = totalCheckins();
  const completion7 = state.habits.length
    ? Math.round(state.habits.reduce((a, h) => a + calcCompletion(h.id, 7), 0) / state.habits.length)
    : 0;

  document.getElementById('stat-today').textContent = todayDone;
  document.getElementById('stat-streak').textContent = ms;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-week').textContent = completion7 + '%';

  // XP / level
  const xp = state.xp;
  const lvl = state.level;
  const xpNeeded = xpForNextLevel(lvl);
  const xpInLevel = xp - (lvl - 1) * 200;
  const pct = Math.min(100, Math.round(xpInLevel / 200 * 100));
  document.getElementById('level-label').textContent = `Level ${lvl}`;
  document.getElementById('level-xp').textContent = `${xpInLevel} / 200 XP`;
  document.getElementById('level-fill').style.width = pct + '%';

  // weekly chart
  renderWeekChart();

  // per-habit bars
  renderHabitBars();

  // badges
  renderBadges();
}

function renderWeekChart() {
  const days = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Monday=0

  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const dayName = days[(d.getDay() + 6) % 7];
    const count = state.habits.filter(h => isDone(h.id, dStr)).length;
    const pct = state.habits.length ? (count / state.habits.length * 100) : 0;
    const isTodayCol = i === 0;
    html += `
      <div class="week-bar-wrap ${isTodayCol ? 'today-col' : ''}" style="position:relative">
        <div class="week-bar" style="height:${Math.max(4, pct * 0.5)}px"></div>
        <span class="week-bar-label" style="position:static;font-size:0.6rem;color:var(--text3);margin-top:4px">${dayName}</span>
      </div>`;
  }
  document.getElementById('week-chart').innerHTML = html;
}

function renderHabitBars() {
  const el = document.getElementById('habit-bars');
  if (!state.habits.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:0.82rem">Brak nawyków</p>';
    return;
  }
  el.innerHTML = state.habits.map(h => {
    const pct = calcCompletion(h.id, 7);
    const cat = CATEGORIES[h.category] || CATEGORIES.health;
    const color = cat.color;
    return `
      <div class="chart-bar-container">
        <div class="chart-bar-label">
          <span>${cat.icon} ${h.name}</span>
          <span style="color:${color};font-weight:600">${pct}%</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}99)"></div>
        </div>
      </div>`;
  }).join('');
}

function renderBadges() {
  const el = document.getElementById('badges-container');
  el.innerHTML = BADGES.map(b => {
    const earned = state.earnedBadges.includes(b.id);
    return `
      <div class="badge ${earned ? 'earned' : 'locked'}" title="${b.desc}">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
      </div>`;
  }).join('');
}

// ── CALENDAR TAB ──
function renderCalendar() {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  const now = new Date();
  const monthNames = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  document.getElementById('cal-month-label').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';
  for (let i = 0; i < offset; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today();
    const isFuture = new Date(dateStr) > now && !isToday;

    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (isFuture) cls += ' future';

    if (!isFuture && state.habits.length) {
      const done = state.habits.filter(h => isDone(h.id, dateStr)).length;
      if (done === state.habits.length && done > 0) cls += ' done';
      else if (done > 0) cls += ' partial';
    }

    html += `<div class="${cls}" onclick="showDayDetail('${dateStr}')">${d}</div>`;
  }

  document.getElementById('cal-grid-body').innerHTML = html;

  // Habit calendar detail
  renderHabitCalendarSelect();
}

function calPrev() {
  state.calendarMonth--;
  if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
  save();
  renderCalendar();
}
function calNext() {
  state.calendarMonth++;
  if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
  const now = new Date();
  if (state.calendarYear > now.getFullYear() || (state.calendarYear === now.getFullYear() && state.calendarMonth > now.getMonth())) {
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
  }
  save();
  renderCalendar();
}

function showDayDetail(dateStr) {
  if (!state.habits.length) return;
  const parts = dateStr.split('-');
  const label = `${parts[2]}.${parts[1]}.${parts[0]}`;
  let html = `<strong style="font-size:0.9rem;color:var(--text2)">${label}</strong><div style="margin-top:10px">`;
  state.habits.forEach(h => {
    const done = isDone(h.id, dateStr);
    const cat = CATEGORIES[h.category] || CATEGORIES.health;
    html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span>${cat.icon}</span>
      <span style="flex:1;font-size:0.85rem">${h.name}</span>
      <span style="color:${done ? 'var(--green)' : 'var(--text3)'}">${done ? '✓' : '–'}</span>
    </div>`;
  });
  html += '</div>';
  document.getElementById('day-detail-content').innerHTML = html;
  document.getElementById('day-modal').classList.add('open');
}
function closeDayModal() {
  document.getElementById('day-modal').classList.remove('open');
}

function renderHabitCalendarSelect() {
  const el = document.getElementById('habit-calendar-select');
  if (!state.habits.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<label class="form-label">Streak nawyku</label>` +
    state.habits.map(h => {
      const streak = calcStreak(h.id);
      const comp = calcCompletion(h.id, 30);
      const cat = CATEGORIES[h.category] || CATEGORIES.health;
      return `
        <div class="habit-item" style="cursor:default">
          <div class="habit-icon" style="background:${cat.color}22">${cat.icon}</div>
          <div class="habit-info">
            <div class="habit-name">${h.name}</div>
            <div class="habit-meta">30 dni: ${comp}% · Streak: 🔥${streak}</div>
          </div>
        </div>`;
    }).join('');
}

// ── HABIT LIST ──
function renderHabitList() {
  const el = document.getElementById('habits-list-manage');
  if (!state.habits.length) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>Brak nawyków do zarządzania</p></div>`;
    return;
  }
  el.innerHTML = state.habits.map(h => {
    const cat = CATEGORIES[h.category] || CATEGORIES.health;
    const streak = calcStreak(h.id);
    const comp = calcCompletion(h.id, 7);
    return `
      <div class="card fade-in">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="habit-icon" style="background:${cat.color}22;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem">${cat.icon}</div>
          <div style="flex:1;min-width:0">
            <div class="card-title">${h.name}</div>
            <div style="font-size:0.75rem;color:var(--text3)">${cat.label} · ${FREQUENCIES[h.frequency]?.label} · 🔥${streak}</div>
          </div>
          <button class="btn btn-danger" onclick="deleteHabit('${h.id}')">🗑</button>
        </div>
        <div style="margin-top:12px">
          <div class="chart-bar-label" style="font-size:0.72rem;margin-bottom:4px">
            <span>7-dniowa skuteczność</span><span style="color:${cat.color}">${comp}%</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${comp}%;background:${cat.color}"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function deleteHabit(id) {
  if (!confirm('Usunąć ten nawyk?')) return;
  state.habits = state.habits.filter(h => h.id !== id);
  // clean checkins
  Object.keys(state.checkins).forEach(k => { if (k.startsWith(id + '_')) delete state.checkins[k]; });
  save();
  renderHabitList();
  renderToday();
  renderDashboard();
}

// ── AI FEEDBACK ──
async function analyzeWeek() {
  const btn = document.getElementById('ai-btn');
  const container = document.getElementById('ai-result');

  if (!state.habits.length) {
    showToast('⚠️ Dodaj najpierw nawyki!');
    return;
  }

  btn.disabled = true;
  container.innerHTML = `
    <div class="ai-loading">
      <div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>
      <span>Analizuję Twój tydzień…</span>
    </div>`;

  // Build summary
  const today7 = getDateRange(7);
  const summary = state.habits.map(h => {
    const done = today7.filter(d => isDone(h.id, d)).length;
    const streak = calcStreak(h.id);
    const cat = CATEGORIES[h.category] || CATEGORIES.health;
    return `- "${h.name}" (${cat.label}): ${done}/7 dni, streak: ${streak}`;
  }).join('\n');

  const prompt = `Jesteś coachem nawyków. Przeanalizuj dane z ostatnich 7 dni i daj krótki, motywujący feedback po polsku.

Dane nawyków:
${summary}

Odpowiedz w formacie JSON z polami:
{
  "swietne": "co idzie świetnie (1-2 zdania)",
  "poprawic": "co poprawić (1-2 zdania)",
  "sugestia": "konkretna sugestia optymalizacji (1-2 zdania)",
  "motywacja": "krótkie zdanie motywacyjne"
}
Odpowiedz TYLKO JSON, bez markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '';
    let feedback;
    try {
      feedback = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      feedback = {
        swietne: 'Świetna robota z budowaniem nawyków!',
        poprawic: 'Staraj się być konsekwentny każdego dnia.',
        sugestia: 'Ustaw stałą porę na każdy nawyk.',
        motywacja: 'Każdy dzień to nowa szansa! 💪'
      };
    }

    container.innerHTML = `
      <div class="ai-bubble fade-in">
        <div class="ai-bubble-header"><div class="ai-icon">✨</div>Co idzie świetnie</div>
        <p>${feedback.swietne}</p>
      </div>
      <div class="ai-bubble fade-in">
        <div class="ai-bubble-header"><div class="ai-icon">🎯</div>Co poprawić</div>
        <p>${feedback.poprawic}</p>
      </div>
      <div class="ai-bubble fade-in">
        <div class="ai-bubble-header"><div class="ai-icon">💡</div>Sugestia optymalizacji</div>
        <p>${feedback.sugestia}</p>
      </div>
      <div class="ai-bubble fade-in" style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.1));border-color:rgba(245,158,11,0.2)">
        <div class="ai-bubble-header" style="color:var(--yellow)"><div class="ai-icon" style="background:linear-gradient(135deg,var(--yellow),var(--orange))">⚡</div>Motywacja</div>
        <p style="color:var(--yellow)">${feedback.motywacja}</p>
      </div>`;

  } catch (err) {
    container.innerHTML = `
      <div class="ai-bubble">
        <div class="ai-bubble-header"><div class="ai-icon">⚠️</div>Błąd połączenia</div>
        <p>Nie udało się połączyć z AI. Sprawdź połączenie internetowe i spróbuj ponownie.</p>
      </div>`;
  }

  btn.disabled = false;
}

// ── NOTIFICATIONS ──
async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('⚠️ Przeglądarka nie wspiera powiadomień');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    state.notifications = true;
    save();
    renderNotifications();
    scheduleNotifications();
    showToast('🔔 Powiadomienia włączone!');
  } else {
    showToast('❌ Odmowa uprawnień');
  }
}

function scheduleNotifications() {
  if (!state.notifications || !state.habits.length) return;
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0); // 20:00
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;
  setTimeout(() => {
    const undone = state.habits.filter(h => !isDone(h.id));
    if (undone.length > 0) {
      new Notification('⚡ Smart Habit Tracker', {
        body: `Masz ${undone.length} nawyków do wykonania dziś!`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="%237c3aed"/><text x="50%" y="55%" font-size="36" text-anchor="middle" dominant-baseline="middle">⚡</text></svg>'
      });
    }
    scheduleNotifications();
  }, delay);
}

function renderNotifications() {
  const statusEl = document.getElementById('notif-status');
  const toggle = document.getElementById('notif-toggle');
  if (state.notifications && Notification.permission === 'granted') {
    statusEl.textContent = 'Włączone';
    statusEl.style.color = 'var(--green)';
    toggle.classList.add('on');
  } else {
    statusEl.textContent = 'Wyłączone';
    statusEl.style.color = 'var(--text3)';
    toggle.classList.remove('on');
  }
}

function toggleNotifications() {
  if (!state.notifications) {
    requestNotifications();
  } else {
    state.notifications = false;
    save();
    renderNotifications();
    showToast('🔕 Powiadomienia wyłączone');
  }
}

// ── THEME ──
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme === 'light' ? 'light' : '');
  document.getElementById('theme-btn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  save();
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`section-${tab}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add('active');

  if (tab === 'today') renderToday();
  if (tab === 'add') renderAddForm();
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'calendar') renderCalendar();
  if (tab === 'habits') renderHabitList();
}

// ── PWA INSTALL ──
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-banner').classList.add('show');
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    document.getElementById('install-banner').classList.remove('show');
  });
}

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// ── INIT ──
function init() {
  load();

  // Theme
  if (state.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('theme-btn').textContent = '🌙';
  }

  // Render initial
  renderToday();
  renderDashboard();
  renderNotifications();

  // Restart notifications if enabled
  if (state.notifications && Notification.permission === 'granted') {
    scheduleNotifications();
  }

  switchTab('today');
}

document.addEventListener('DOMContentLoaded', init);
