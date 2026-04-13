import { PROGRAM_START, ADMIN_CODE } from './config.js';
import {
  ZONES, MISSIONS, CATEGORIES, DAILY_HABITS, WEEKLY_CHALLENGES, BONUS_CHALLENGES,
  EXTRA_CREDIT, BONUS_TASKS, ALL_HABITS,
  getHabitById, getZoneById, getWeekNumber, getWeekStart,
} from './data.js';
import * as db from './db.js';
// ── HELPERS ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
  const today = todayISO();
  const yesterday = prevDay(today);
  const d = new Date(dateStr + 'T12:00:00');
  const full = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (dateStr === today)     return { day: 'Today',     full };
  if (dateStr === yesterday) return { day: 'Yesterday', full };
  return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), full };
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function calcStreak(entries) {
  const dailyDates = [...new Set(
    entries.filter(e => e.type === 'daily').map(e => e.date)
  )].sort().reverse();
  if (!dailyDates.length) return 0;
  const today = todayISO();
  const yesterday = prevDay(today);
  if (dailyDates[0] !== today && dailyDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dailyDates.length; i++) {
    if (dailyDates[i] === prevDay(dailyDates[i - 1])) streak++;
    else break;
  }
  return streak;
}

function calcTotalPoints(entries) {
  return entries.reduce((sum, e) => sum + (e.points || 0), 0);
}

function calcCategoryPoints(entries) {
  const result = {};
  for (const cat of Object.keys(CATEGORIES)) {
    result[cat] = entries.filter(e => e.category === cat).reduce((s, e) => s + e.points, 0);
  }
  return result;
}

// ── STATE ─────────────────────────────────────────────────────────────────────

const state = {
  user: null,
  allUsers: [],
  myEntries: [],
  allEntries: [],
  currentView: 'home',
  logDate: todayISO(),
  logSelections: {},
  logSelectionsDate: null,
  adminTaps: 0,
  homeFilter: null,
  homeCollapsed: { extra: true, bonus: true },
  lbDistrict: 'all',
  lbView: 'people',
  lbRevealTaps: 0,
  lbRevealed: false,
  lbRevealTimer: null,
  zoneActive: {},
  customHabits: [],   // loaded from DB, merged with static EXTRA_CREDIT / BONUS_TASKS
};

// Helpers that merge static + custom habits
function allExtraCredit() { return [...EXTRA_CREDIT, ...state.customHabits.filter(h => h.type === 'extra')]; }
function allBonusTasks()   { return [...BONUS_TASKS,  ...state.customHabits.filter(h => h.type === 'repeat')]; }
function findHabit(id)     { return getHabitById(id) || state.customHabits.find(h => h.id === id); }

// ── THEME / COLOR PREFS ───────────────────────────────────────────────────────

const DEFAULT_THEME = {
  bg:        '#07070e',
  card:      '#13132a',
  spiritual: '#f59e0b',
  physical:  '#10b981',
  social:    '#60a5fa',
  emotional: '#a855f7',
};

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('mp_theme') || '{}');
    return { ...DEFAULT_THEME, ...saved };
  } catch { return { ...DEFAULT_THEME }; }
}

function applyTheme(prefs) {
  const root = document.documentElement;
  root.style.setProperty('--bg',   prefs.bg);
  root.style.setProperty('--card', prefs.card);
  // Derive surface/border from card hue (slightly lighter)
  root.style.setProperty('--surface', prefs.card);
  root.style.setProperty('--border',  prefs.card + 'cc');
  root.style.setProperty('--color-spiritual', prefs.spiritual);
  root.style.setProperty('--color-physical',  prefs.physical);
  root.style.setProperty('--color-social',    prefs.social);
  root.style.setProperty('--color-emotional', prefs.emotional);
  // Sync live CATEGORIES so all inline renders pick up new colors
  CATEGORIES.spiritual.color = prefs.spiritual;
  CATEGORIES.physical.color  = prefs.physical;
  CATEGORIES.social.color    = prefs.social;
  CATEGORIES.emotional.color = prefs.emotional;
}

function saveTheme(prefs) {
  localStorage.setItem('mp_theme', JSON.stringify(prefs));
}

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
  // Apply saved theme immediately so colors are right from first render
  applyTheme(loadTheme());
  try {
    // Fetch zone active status early so onboarding + leaderboard can filter
    try {
      const zones = await db.getZonesWithStatus();
      zones.forEach(z => { state.zoneActive[z.id] = z.active !== false; });
    } catch (_) {
      // Fall back: treat all zones as active if fetch fails
      ZONES.forEach(z => { state.zoneActive[z.id] = true; });
    }

    // Load admin-created custom habits
    try { state.customHabits = await db.getCustomHabits(); } catch (_) {}

    const fromLocal   = localStorage.getItem('mp_user');
    const fromSession = sessionStorage.getItem('mp_user');
    const saved       = fromLocal || fromSession;
    if (saved) {
      const parsed = JSON.parse(saved);
      const users = await db.getAllUsers();
      state.allUsers = users;
      const found = users.find(u => u.id === parsed.id);
      if (found) {
        await loginUser(found, !!fromLocal);
        return;
      }
    }
    await loadOnboarding();
  } catch (err) {
    if (err.message === 'CONFIG_MISSING') {
      showConfigError();
    } else {
      console.error(err);
      if (!state.user) await loadOnboarding();
    }
  }
}

function showConfigError() {
  document.getElementById('loading-screen').innerHTML = `
    <div class="config-error">
      <div style="font-size:3rem;margin-bottom:1rem">⚙️</div>
      <h2>Setup Required</h2>
      <p>Add your Supabase credentials to <code>js/config.js</code> to get started.</p>
      <div class="config-steps">
        1. Create a free project at <strong>supabase.com</strong><br>
        2. Run <strong>schema.sql</strong> in the SQL editor<br>
        3. Paste your URL + anon key into config.js
      </div>
    </div>
  `;
}

async function loadOnboarding() {
  if (!state.allUsers.length) {
    try {
      state.allUsers = await db.getAllUsers();
    } catch (err) {
      state.loadError = err.message;
    }
  }
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('onboarding').classList.remove('hidden');
  renderOnboarding();
}

async function loginUser(user, remember = true) {
  state.user = user;
  const saved = { id: user.id, name: user.name, zone_id: user.zone_id };
  if (remember) {
    localStorage.setItem('mp_user', JSON.stringify(saved));
  } else {
    sessionStorage.setItem('mp_user', JSON.stringify(saved));
    localStorage.removeItem('mp_user');
  }
  [state.myEntries, state.allEntries] = await Promise.all([
    db.getEntriesForUser(user.id),
    db.getAllEntries(),
  ]);
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  if (user.district_role) {
    document.getElementById('nav-district-btn').classList.remove('hidden');
  }
  updateHeader();
  navigate('home');
  setupRealtime();
}

function setupRealtime() {
  db.subscribeToEntries(async () => {
    state.allEntries = await db.getAllEntries();
    if (state.user) {
      state.myEntries = await db.getEntriesForUser(state.user.id);
    }
    if (state.currentView === 'leaderboard') renderLeaderboard();
    if (state.currentView === 'home') renderHome();
    if (state.currentView === 'profile') renderProfile();
    updateHeader();
  });
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────

function renderOnboarding() {
  const filterPicker  = document.getElementById('filter-zone-picker');
  const userListWrap  = document.getElementById('user-list-wrap');
  const list          = document.getElementById('existing-users-list');

  // Render class filter chips
  if (state.loadError) {
    filterPicker.innerHTML = `
      <div class="load-error">
        <p>⚠️ Couldn't connect to database</p>
        <code>${state.loadError}</code>
        <button class="btn-retry" id="btn-retry">Retry</button>
      </div>`;
    userListWrap.classList.add('hidden');
    document.getElementById('btn-retry')?.addEventListener('click', async () => {
      state.loadError = null;
      document.getElementById('loading-screen').classList.remove('hidden');
      document.getElementById('onboarding').classList.add('hidden');
      await loadOnboarding();
    });
  } else {
    filterPicker.innerHTML = ZONES.filter(z => state.zoneActive[z.id] !== false).map(z => `
      <button class="fzone-chip" data-zone-id="${z.id}" style="--zone-color:${z.color}">
        ${z.name}
      </button>`).join('');

    filterPicker.querySelectorAll('.fzone-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        filterPicker.querySelectorAll('.fzone-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showUsersForZone(parseInt(btn.dataset.zoneId));
      });
    });
  }

  function showUsersForZone(zoneId) {
    const zone     = ZONES.find(z => z.id === zoneId);
    const filtered = state.allUsers.filter(u => u.zone_id === zoneId);
    userListWrap.classList.remove('hidden');

    if (!filtered.length) {
      list.innerHTML = `<p class="no-users-msg">No one in ${zone?.name} yet.</p>`;
      return;
    }

    list.innerHTML = filtered.map(u => {
      const missionFlag = u.mission ? u.mission.split(' ')[0] : '🌍';
      return `
        <button class="user-chip" data-id="${u.id}" style="border-color:${zone?.color || '#6b7280'}44">
          <span class="user-chip-avatar" style="background:${zone?.color || '#6b7280'}">${getInitials(u.name)}</span>
          <div class="user-chip-info">
            <span class="user-chip-name">${u.name}</span>
            <span class="user-chip-zone" style="color:${zone?.color || '#94a3b8'}">${zone?.name || ''}</span>
          </div>
          <span class="user-chip-mission">${missionFlag}</span>
        </button>`;
    }).join('');

    list.querySelectorAll('.user-chip').forEach(btn => {
      btn.addEventListener('click', async () => {
        const user = state.allUsers.find(u => u.id === btn.dataset.id);
        if (user) {
          const remember = document.getElementById('chk-remember')?.checked !== false;
          document.getElementById('loading-screen').classList.remove('hidden');
          await loginUser(user, remember);
        }
      });
    });
  }

  // Zone picker — only show active zones
  const zonePicker = document.getElementById('zone-picker');
  zonePicker.innerHTML = ZONES.filter(z => state.zoneActive[z.id] !== false).map(z =>
    `<button class="zone-chip" data-zone-id="${z.id}" style="--zone-color:${z.color}">${z.name}</button>`
  ).join('');

  let selectedZoneId = null;
  let selectedMission = null;

  zonePicker.querySelectorAll('.zone-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      zonePicker.querySelectorAll('.zone-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedZoneId = parseInt(btn.dataset.zoneId);
      checkJoinReady();
    });
  });

  // Mission picker
  const missionPicker = document.getElementById('mission-picker');
  missionPicker.innerHTML = MISSIONS.map((m, i) =>
    `<button class="mission-chip" data-mission="${m.flag} ${m.name}" data-idx="${i}">
      <span class="mflag">${m.flag}</span>
      <span class="mname">${m.name}</span>
    </button>`
  ).join('');

  missionPicker.querySelectorAll('.mission-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      missionPicker.querySelectorAll('.mission-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMission = btn.dataset.mission;
      checkJoinReady();
    });
  });

  const nameInput = document.getElementById('input-name');
  nameInput.addEventListener('input', checkJoinReady);

  function checkJoinReady() {
    document.getElementById('btn-join').disabled = !nameInput.value.trim() || !selectedZoneId || !selectedMission;
  }

  document.getElementById('btn-new-user').addEventListener('click', () => {
    document.getElementById('step-select').classList.add('hidden');
    document.getElementById('step-new-user').classList.remove('hidden');
    nameInput.focus();
  });

  document.getElementById('btn-back-select').addEventListener('click', () => {
    document.getElementById('step-new-user').classList.add('hidden');
    document.getElementById('step-select').classList.remove('hidden');
  });

  document.getElementById('btn-join').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name || !selectedZoneId) return;

    const duplicate = state.allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      showToast('That name is taken — pick yours from the list!', 'error');
      return;
    }

    document.getElementById('loading-screen').classList.remove('hidden');
    try {
      const user = await db.createUser(name, selectedZoneId, selectedMission);
      state.allUsers.push(user);
      await loginUser(user);
    } catch (e) {
      document.getElementById('loading-screen').classList.add('hidden');
      const msg = e?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        showToast('That name is already taken!', 'error');
      } else {
        showToast(`Error: ${msg || 'Could not create account'}`, 'error');
      }
    }
  });
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function navigate(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === view)
  );

  const hideChrome = view === 'admin';
  document.getElementById('app-header').style.display = hideChrome ? 'none' : 'flex';
  document.getElementById('bottom-nav').style.display  = hideChrome ? 'none' : 'flex';

  switch (view) {
    case 'home':
      state.homeCollapsed = { extra: true, bonus: true };
      renderHome();
      break;
    case 'log':         renderLog();         break;
    case 'leaderboard': renderLeaderboard(); break;
    case 'profile':     renderProfile();     break;
    case 'district':    renderDistrict();    break;
    case 'admin':       renderAdmin();       break;
  }
}

// ── HEADER ────────────────────────────────────────────────────────────────────

function updateHeader() {
  if (!state.user) return;
  document.getElementById('streak-count').textContent = calcStreak(state.myEntries);
  document.getElementById('total-points').textContent  = calcTotalPoints(state.myEntries);
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────

function renderHome() {
  const today = todayISO();
  const completedIds = new Set(state.myEntries.filter(e => e.date === today).map(e => e.habit_id));
  const week = getWeekNumber(today, PROGRAM_START);
  const firstName = state.user.name.split(' ')[0];

  document.getElementById('greeting-text').textContent = `${greeting()}, ${firstName}!`;
  document.getElementById('today-date-label').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  renderRings(completedIds, today);
  renderChallengeStrip(completedIds, week);
  renderHomeHabits(completedIds, today);
  renderExtraCreditHome();
}

function renderRings(completedIds, date) {
  const container = document.getElementById('rings-grid');
  const today = todayISO();
  const r = 27, circ = 2 * Math.PI * r;

  // 4 category tiles — ring fill = today's daily completion; label = total pts all time
  const catTiles = Object.entries(CATEGORIES).map(([key, cat]) => {
    const habits  = DAILY_HABITS.filter(h => h.category === key);
    const done    = habits.filter(h => completedIds.has(h.id)).length;
    const total   = habits.length;
    const pct     = total ? done / total : 0;
    const dash    = (pct * circ).toFixed(2);
    const totalPts = state.myEntries
      .filter(e => e.category === key)
      .reduce((s, e) => s + e.points, 0);
    const active  = state.homeFilter === key;

    return `
      <div class="ring-card ${active ? 'active' : ''}" data-filter="${key}" style="${active ? `--ring-active:${cat.color}` : ''}">
        <div class="ring-wrapper">
          <svg class="ring-svg" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="${r}" fill="none" stroke="${cat.color}22" stroke-width="5.5"/>
            <circle cx="32" cy="32" r="${r}" fill="none" stroke="${cat.color}" stroke-width="5.5"
              stroke-dasharray="${dash} ${circ.toFixed(2)}" stroke-linecap="round"
              transform="rotate(-90 32 32)" style="transition:stroke-dasharray .6s ease"/>
          </svg>
          <i data-lucide="${cat.icon}" class="ring-icon" style="color:${cat.color}"></i>
        </div>
        <div class="ring-label">${cat.label}</div>
        <div class="ring-progress" style="color:${cat.color}">${done}/${total}</div>
      </div>`;
  }).join('');

  // Extra Credit tile
  const ecDone   = allExtraCredit().filter(h => state.myEntries.some(e => e.habit_id === h.id)).length;
  const ecTotal  = allExtraCredit().length;
  const ecPct    = ecTotal ? ecDone / ecTotal : 0;
  const ecDash   = (ecPct * circ).toFixed(2);
  const ecActive = state.homeFilter === 'extra';

  const ecTile = `
    <div class="ring-card ${ecActive ? 'active' : ''}" data-filter="extra" style="${ecActive ? '--ring-active:#f59e0b' : ''}">
      <div class="ring-wrapper">
        <svg class="ring-svg" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="#f59e0b22" stroke-width="5.5"/>
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="#f59e0b" stroke-width="5.5"
            stroke-dasharray="${ecDash} ${circ.toFixed(2)}" stroke-linecap="round"
            transform="rotate(-90 32 32)" style="transition:stroke-dasharray .6s ease"/>
        </svg>
        <i data-lucide="star" class="ring-icon" style="color:#f59e0b"></i>
      </div>
      <div class="ring-label">Extra Credit</div>
      <div class="ring-progress" style="color:#f59e0b">${ecDone}/${ecTotal}</div>
    </div>`;

  // Bonus Tasks tile
  const btDoneToday = allBonusTasks().filter(h => state.myEntries.some(e => e.habit_id === h.id && e.date === today)).length;
  const btTotal     = allBonusTasks().length;
  const btPct       = btTotal ? btDoneToday / btTotal : 0;
  const btDash      = (btPct * circ).toFixed(2);
  const btActive    = state.homeFilter === 'bonus';

  const btTile = `
    <div class="ring-card ${btActive ? 'active' : ''}" data-filter="bonus" style="${btActive ? '--ring-active:#10b981' : ''}">
      <div class="ring-wrapper">
        <svg class="ring-svg" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="#10b98122" stroke-width="5.5"/>
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="#10b981" stroke-width="5.5"
            stroke-dasharray="${btDash} ${circ.toFixed(2)}" stroke-linecap="round"
            transform="rotate(-90 32 32)" style="transition:stroke-dasharray .6s ease"/>
        </svg>
        <i data-lucide="repeat" class="ring-icon" style="color:#10b981"></i>
      </div>
      <div class="ring-label">Bonus Tasks</div>
      <div class="ring-progress" style="color:#10b981">${btDoneToday}/${btTotal} today</div>
    </div>`;

  container.innerHTML = catTiles + ecTile + btTile;

  container.querySelectorAll('.ring-card').forEach(card => {
    card.addEventListener('click', () => {
      const f = card.dataset.filter;
      state.homeFilter = state.homeFilter === f ? null : f;
      renderHome();
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderChallengeStrip(completedIds, week) {
  const strip = document.getElementById('challenge-strip');
  const weekStart = getWeekStart(todayISO());
  const weeklyDone = new Set(
    state.myEntries.filter(e => e.type === 'weekly' && getWeekStart(e.date) === weekStart).map(e => e.habit_id)
  );
  const bonusDone = new Set(
    state.myEntries.filter(e => e.type === 'bonus' && getWeekStart(e.date) === weekStart).map(e => e.habit_id)
  );

  const bonus = BONUS_CHALLENGES.find(b => b.week === week);
  const isSunday = new Date().getDay() === 0;
  const items = [...WEEKLY_CHALLENGES.filter(h => !h.sundayOnly || isSunday), ...(bonus ? [bonus] : [])];

  const pills = items.map(h => {
    const cat = CATEGORIES[h.category];
    const done = h.type === 'weekly' ? weeklyDone.has(h.id) : bonusDone.has(h.id);
    return `
      <div class="challenge-pill ${done ? 'done' : ''}" style="--cc:${cat.color}">
        <i data-lucide="${cat.icon}" class="cpill-icon" style="color:${cat.color}"></i>
        <span class="cpill-pts">${h.points}pt</span>
        ${done ? '<span class="cpill-check">✓</span>' : ''}
      </div>`;
  }).join('');

  strip.innerHTML = `
    <div class="strip-label">Week ${week} Challenges</div>
    <div class="strip-pills">${pills}</div>`;
  if (window.lucide) lucide.createIcons();
}

function renderHomeHabits(completedIds, today) {
  const container = document.getElementById('today-habits-list');
  const f = state.homeFilter;

  // Hide the daily habits list when filtering to extra/bonus only
  if (f === 'extra' || f === 'bonus') {
    container.innerHTML = '';
    return;
  }

  const categoriesToShow = f
    ? Object.entries(CATEGORIES).filter(([key]) => key === f)
    : Object.entries(CATEGORIES);

  const sections = categoriesToShow.map(([key, cat]) => {
    const habits = DAILY_HABITS.filter(h => h.category === key);
    const rows = habits.map(h => {
      const done = completedIds.has(h.id);
      return `
        <div class="habit-row tappable ${done ? 'done' : ''}" data-habit-id="${h.id}" data-date="${today}" style="--cc:${cat.color}">
          <div class="habit-check ${done ? 'checked' : ''}" style="${done ? `background:${cat.color}` : `border-color:${cat.color}`}">
            ${done ? '✓' : ''}
          </div>
          <span class="habit-label">${h.label}</span>
          <span class="habit-pts" style="color:${cat.color}">+1</span>
        </div>`;
    }).join('');

    // When a single category is selected, also show related extra/bonus items
    let extraRows = '';
    if (f) {
      const ecItems = allExtraCredit().filter(h => h.category === key);
      const btItems = allBonusTasks().filter(h => h.category === key);

      if (ecItems.length) {
        extraRows += ecItems.map(h => {
          const done    = state.myEntries.some(e => e.habit_id === h.id);
          const hcat    = CATEGORIES[h.category];
          return `
            <div class="habit-row tappable special-habit ${done ? 'done' : ''}" data-habit-id="${h.id}" style="--cc:#f59e0b">
              <div class="habit-check ${done ? 'checked' : ''}" style="${done ? 'background:#f59e0b' : 'border-color:#f59e0b'}">
                ${done ? '✓' : ''}
              </div>
              <span class="habit-label" style="flex:1;min-width:0">${h.label}</span>
              <span class="habit-pts" style="color:#f59e0b">+${h.points}</span>
            </div>`;
        }).join('');
      }

      if (btItems.length) {
        extraRows += btItems.map(h => {
          const timesLogged = state.myEntries.filter(e => e.habit_id === h.id).length;
          const doneToday   = state.myEntries.some(e => e.habit_id === h.id && e.date === today);
          const hcat        = CATEGORIES[h.category];
          return `
            <div class="habit-row tappable special-habit ${doneToday ? 'done' : ''}" data-habit-id="${h.id}" style="--cc:#10b981">
              <div class="habit-check ${doneToday ? 'checked' : ''}" style="${doneToday ? 'background:#10b981' : 'border-color:#10b981'}">
                ${doneToday ? '✓' : ''}
              </div>
              <div style="flex:1;min-width:0">
                <span class="habit-label">${h.label}</span>
                <div style="display:flex;gap:.4rem;align-items:center;margin-top:2px">
                  <span class="log-tag repeat" style="display:inline">Repeatable${timesLogged > 0 ? ` · ×${timesLogged} total` : ''}</span>
                </div>
              </div>
              <span class="habit-pts" style="color:#10b981">+${h.points}</span>
            </div>`;
        }).join('');
      }

      if (extraRows) {
        extraRows = `<div class="cat-sub-header" style="color:${cat.color}"><i data-lucide="zap" class="icon-sm"></i>Extra & Bonus</div>` + extraRows;
      }
    }

    return `
      <div class="cat-group">
        <div class="cat-header" style="color:${cat.color}"><i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}</div>
        ${rows}
        ${extraRows}
      </div>`;
  }).join('');

  container.innerHTML = sections;

  container.querySelectorAll('.habit-row.tappable:not(.special-habit)').forEach(row => {
    row.addEventListener('click', () => toggleHabit(row.dataset.habitId, row.dataset.date));
  });
  container.querySelectorAll('.special-habit').forEach(row => {
    row.addEventListener('click', () => toggleSpecialHabit(row.dataset.habitId));
  });
  if (window.lucide) lucide.createIcons();
}

function renderExtraCreditHome() {
  const container = document.getElementById('extra-credit-home');
  if (!container) return;

  const f     = state.homeFilter;
  const today = todayISO();

  const showExtra = !f || f === 'extra';
  const showBonus = !f || f === 'bonus';

  if (!showExtra && !showBonus) {
    container.innerHTML = '';
    return;
  }

  const ecEarned    = allExtraCredit().filter(h => state.myEntries.some(e => e.habit_id === h.id));
  const ecTotalPts  = allExtraCredit().reduce((s, h) => s + h.points, 0);
  const ecEarnedPts = ecEarned.reduce((s, h) => s + h.points, 0);

  const btTodayPts = allBonusTasks().reduce((s, h) => {
    const doneToday = state.myEntries.some(e => e.habit_id === h.id && e.date === today);
    return s + (doneToday ? h.points : 0);
  }, 0);

  // Helper: render a single special-habit row
  function ecRow(h, done, cat, extraTag = '') {
    return `
      <div class="habit-row tappable special-habit ${done ? 'done' : ''}" data-habit-id="${h.id}" style="--cc:${cat.color}">
        <div class="habit-check ${done ? 'checked' : ''}" style="${done ? `background:${cat.color}` : `border-color:${cat.color}`}">${done ? '✓' : ''}</div>
        <div style="flex:1;min-width:0">
          <span class="habit-label">${h.label}</span>
          ${extraTag ? `<div style="display:flex;gap:.4rem;align-items:center;margin-top:2px;flex-wrap:wrap">${extraTag}</div>` : ''}
        </div>
        <span class="habit-pts" style="color:${cat.color}">${done ? '✓' : `+${h.points}`}</span>
      </div>`;
  }

  // ── Extra Credit: grouped by category ────────────────────────────────────────
  let ecBody = '';
  if (showExtra) {
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const items = allExtraCredit().filter(h => h.category === key);
      if (!items.length) return;
      ecBody += `<div class="cat-group" style="margin-bottom:.5rem">
        <div class="cat-header" style="color:${cat.color}">
          <i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}
        </div>
        ${items.map(h => {
          const done = state.myEntries.some(e => e.habit_id === h.id);
          return ecRow(h, done, cat);
        }).join('')}
      </div>`;
    });
  }

  // ── Bonus Tasks: grouped by category ─────────────────────────────────────────
  let btBody = '';
  if (showBonus) {
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const items = allBonusTasks().filter(h => h.category === key);
      if (!items.length) return;
      btBody += `<div class="cat-group" style="margin-bottom:.5rem">
        <div class="cat-header" style="color:${cat.color}">
          <i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}
        </div>
        ${items.map(h => {
          const timesLogged = state.myEntries.filter(e => e.habit_id === h.id).length;
          const doneToday   = state.myEntries.some(e => e.habit_id === h.id && e.date === today);
          const tag = `<span class="log-tag repeat" style="display:inline">Repeatable${timesLogged > 0 ? ` · ×${timesLogged} total` : ''}</span>`;
          return ecRow(h, doneToday, cat, tag);
        }).join('')}
      </div>`;
    });
  }

  const ecCollapsed = state.homeCollapsed.extra;
  const btCollapsed = state.homeCollapsed.bonus;

  const ecSection = showExtra ? `
    <div class="section-head collapsible-head" style="margin-top:1.25rem" data-section="extra">
      <span class="section-title">
        <i data-lucide="star" class="icon-sm" style="color:#f59e0b;margin-right:4px"></i>Extra Credit
        <i data-lucide="${ecCollapsed ? 'chevron-down' : 'chevron-up'}" class="collapse-chevron"></i>
      </span>
      <span class="section-tap-hint">${ecEarnedPts} / ${ecTotalPts} pts</span>
    </div>
    <div class="ec-collapse-body ${ecCollapsed ? 'collapsed' : ''}">${ecBody}</div>` : '';

  const btSection = showBonus ? `
    <div class="section-head collapsible-head" style="margin-top:1.25rem" data-section="bonus">
      <span class="section-title">
        <i data-lucide="repeat" class="icon-sm" style="color:#10b981;margin-right:4px"></i>Bonus Tasks
        <i data-lucide="${btCollapsed ? 'chevron-down' : 'chevron-up'}" class="collapse-chevron"></i>
      </span>
      <span class="section-tap-hint">${btTodayPts} pts earned today</span>
    </div>
    <div class="ec-collapse-body ${btCollapsed ? 'collapsed' : ''}">${btBody}</div>` : '';

  container.innerHTML = ecSection + btSection;

  // Collapse toggle
  container.querySelectorAll('.collapsible-head').forEach(head => {
    head.addEventListener('click', () => {
      const sec = head.dataset.section;
      state.homeCollapsed[sec] = !state.homeCollapsed[sec];
      renderExtraCreditHome();
      if (window.lucide) lucide.createIcons();
    });
  });

  container.querySelectorAll('.special-habit').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      toggleSpecialHabit(row.dataset.habitId);
    });
  });
  if (window.lucide) lucide.createIcons();
}

// Toggle extra-credit (one-time) or bonus-task (repeatable) directly from home view
async function toggleSpecialHabit(habitId) {
  const habit = findHabit(habitId);
  if (!habit) return;
  const today = todayISO();

  const wasCompleted = habit.type === 'extra'
    ? state.myEntries.some(e => e.habit_id === habitId)
    : state.myEntries.some(e => e.habit_id === habitId && e.date === today);

  const deleteDate = habit.type === 'extra'
    ? state.myEntries.find(e => e.habit_id === habitId)?.date
    : today;

  // Optimistic update — mirrors toggleHabit exactly
  if (wasCompleted) {
    state.myEntries = habit.type === 'extra'
      ? state.myEntries.filter(e => e.habit_id !== habitId)
      : state.myEntries.filter(e => !(e.habit_id === habitId && e.date === today));
  } else {
    state.myEntries.push({ habit_id: habitId, date: today, category: habit.category, points: habit.points, type: habit.type, user_id: state.user.id });
  }
  updateHeader();
  renderHome();

  try {
    if (wasCompleted) {
      await db.deleteEntry(state.user.id, habitId, deleteDate);
    } else {
      await db.addEntry({ user_id: state.user.id, habit_id: habitId, category: habit.category, points: habit.points, type: habit.type, date: today });
    }
    // Refresh state silently — no re-render needed (optimistic already correct)
    state.myEntries = await db.getEntriesForUser(state.user.id);
    state.allEntries = await db.getAllEntries();
    updateHeader();
  } catch (err) {
    console.error('toggleSpecialHabit error:', err);
    // Revert optimistic update
    state.myEntries = await db.getEntriesForUser(state.user.id).catch(() => state.myEntries);
    updateHeader();
    renderHome();
    showToast('Save failed', 'error');
  }
}

async function toggleHabit(habitId, date) {
  const habit = getHabitById(habitId);
  const wasCompleted = state.myEntries.some(e => e.habit_id === habitId && e.date === date);

  // Optimistic update
  if (wasCompleted) {
    state.myEntries = state.myEntries.filter(e => !(e.habit_id === habitId && e.date === date));
  } else {
    state.myEntries.push({ habit_id: habitId, date, category: habit.category, points: habit.points, type: habit.type, user_id: state.user.id });
  }
  state.logSelectionsDate = null;
  updateHeader();
  renderHome();

  try {
    if (wasCompleted) {
      await db.deleteEntry(state.user.id, habitId, date);
    } else {
      await db.addEntry({ user_id: state.user.id, habit_id: habitId, category: habit.category, points: habit.points, type: habit.type, date });
    }
    state.myEntries = await db.getEntriesForUser(state.user.id);
    state.allEntries = await db.getAllEntries();
    updateHeader();
  } catch (_) {
    // Revert
    state.myEntries = await db.getEntriesForUser(state.user.id);
    updateHeader();
    renderHome();
    showToast('Save failed — check connection', 'error');
  }
}

// ── LOG VIEW ──────────────────────────────────────────────────────────────────

function renderLog() {
  if (state.logDate > todayISO()) state.logDate = todayISO();
  updateLogDateDisplay();
  renderLogHabits();
}

function updateLogDateDisplay() {
  const { day, full } = formatDisplayDate(state.logDate);
  document.getElementById('log-date-day').textContent  = day;
  document.getElementById('log-date-full').textContent = full;
  const atToday = state.logDate >= todayISO();
  document.getElementById('date-next').disabled = atToday;
  document.getElementById('date-next').style.opacity = atToday ? '0.3' : '1';
}

function renderLogHabits() {
  const date = state.logDate;
  const week = getWeekNumber(date, PROGRAM_START);
  const weekStart = getWeekStart(date);
  const isSunday = new Date(date + 'T12:00:00').getDay() === 0;

  // Initialize selections when date changes
  if (state.logSelectionsDate !== date) {
    state.logSelectionsDate = date;
    state.logSelections = {};
    const habits = [...DAILY_HABITS, ...WEEKLY_CHALLENGES, ...BONUS_CHALLENGES.filter(b => b.week === week)];
    habits.forEach(h => {
      if (h.sundayOnly && !isSunday) return; // skip non-Sunday habits on other days
      if (h.type === 'daily') {
        state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id && e.date === date);
      } else {
        state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id && getWeekStart(e.date) === weekStart);
      }
    });
    // Extra credit: one-time, not date/week bound
    allExtraCredit().forEach(h => {
      state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id);
    });
    // Bonus tasks: repeatable, tracked per date
    allBonusTasks().forEach(h => {
      state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id && e.date === date);
    });
  }

  const container = document.getElementById('log-habits-container');
  const bonus = BONUS_CHALLENGES.find(b => b.week === week);

  const mainHtml = Object.entries(CATEGORIES).map(([key, cat]) => {
    const daily   = DAILY_HABITS.filter(h => h.category === key);
    const weekly  = WEEKLY_CHALLENGES.find(h => h.category === key);
    const bonusH  = bonus?.category === key ? bonus : null;
    const ecItems = allExtraCredit().filter(h => h.category === key);
    const btItems = allBonusTasks().filter(h => h.category === key);

    const renderRow = (h, tag = null, color = cat.color) => {
      const sel = !!state.logSelections[h.id];
      return `
        <div class="log-row ${sel ? 'selected' : ''}" data-habit-id="${h.id}" style="--cc:${color}">
          <div class="log-check ${sel ? 'checked' : ''}" style="${sel ? `background:${color}` : `border-color:${color}`}">
            ${sel ? '✓' : ''}
          </div>
          <div class="log-info">
            <span class="log-label">${h.label}</span>
            ${tag ? `<span class="log-tag ${h.type}">${tag}</span>` : ''}
          </div>
          <span class="log-pts" style="color:${color}">+${h.points}</span>
        </div>`;
    };

    const rows = [
      ...daily.map(h => renderRow(h)),
      weekly && !(weekly.sundayOnly && !isSunday) ? renderRow(weekly, 'Weekly · 5pts') : '',
      bonusH ? renderRow(bonusH, `Week ${bonusH.week} Bonus · 10pts`) : '',
      ...ecItems.map(h => renderRow(h, `One-time · ${h.points}pts`, '#f59e0b')),
      ...btItems.map(h => renderRow(h, `Repeatable · ${h.points}pts`, '#10b981')),
    ].join('');

    return `
      <div class="log-cat-group">
        <div class="log-cat-header" style="color:${cat.color};border-color:${cat.color}22">
          <i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}
        </div>
        ${rows}
      </div>`;
  }).join('');

  container.innerHTML = mainHtml;

  container.querySelectorAll('.log-row').forEach(row => {
    row.addEventListener('click', () => {
      state.logSelections[row.dataset.habitId] = !state.logSelections[row.dataset.habitId];
      renderLogHabits();
    });
  });

  updateLogPointsPreview();
  if (window.lucide) lucide.createIcons();
}

function updateLogPointsPreview() {
  const pts = Object.entries(state.logSelections)
    .filter(([, sel]) => sel)
    .reduce((sum, [id]) => sum + (findHabit(id)?.points || 0), 0);
  document.getElementById('log-pts-count').textContent = `${pts} pts selected`;
}

async function submitLog() {
  const date     = state.logDate;
  const week     = getWeekNumber(date, PROGRAM_START);
  const weekStart = getWeekStart(date);
  const toAdd = [], toDeleteIds = [];

  const isSunday = new Date(date + 'T12:00:00').getDay() === 0;
  const habitsForDate = [
    ...DAILY_HABITS,
    ...WEEKLY_CHALLENGES.filter(h => !h.sundayOnly || isSunday),
    ...BONUS_CHALLENGES.filter(b => b.week === week),
    ...allExtraCredit(),
    ...allBonusTasks(),
  ];

  habitsForDate.forEach(h => {
    const selected = !!state.logSelections[h.id];
    let existing;
    if (h.type === 'daily' || h.type === 'repeat') {
      existing = state.myEntries.find(e => e.habit_id === h.id && e.date === date);
    } else if (h.type === 'extra') {
      existing = state.myEntries.find(e => e.habit_id === h.id);
    } else {
      existing = state.myEntries.find(e => e.habit_id === h.id && getWeekStart(e.date) === weekStart);
    }

    if (selected && !existing) {
      toAdd.push({ user_id: state.user.id, habit_id: h.id, category: h.category, points: h.points, type: h.type, date });
    } else if (!selected && existing?.id) {
      toDeleteIds.push(existing.id);
    }
  });

  if (!toAdd.length && !toDeleteIds.length) {
    showToast('Nothing to save', 'info');
    return;
  }

  const btn = document.getElementById('btn-submit-log');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (toAdd.length)       await db.batchUpsertEntries(toAdd);
    if (toDeleteIds.length) await db.deleteEntriesByIds(toDeleteIds);

    [state.myEntries, state.allEntries] = await Promise.all([
      db.getEntriesForUser(state.user.id),
      db.getAllEntries(),
    ]);
    state.logSelectionsDate = null;
    updateHeader();

    const earned = toAdd.reduce((s, e) => s + e.points, 0);
    showToast(earned > 0 ? `Saved! +${earned} points 🔥` : 'Updated!', 'success');

    btn.textContent = '✓ Saved!';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Save Progress ✓';
      btn.style.background = '';
      navigate('home');
    }, 1200);
  } catch (_) {
    btn.disabled = false;
    btn.textContent = 'Save Progress ✓';
    showToast('Save failed. Try again.', 'error');
  }
}

// ── LEADERBOARD VIEW ──────────────────────────────────────────────────────────

function renderLeaderboard() {
  const peopleEl    = document.getElementById('lb-people');
  const districtsEl = document.getElementById('lb-districts');

  // View tabs
  document.querySelectorAll('#lb-view-tabs .lb-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lbview === state.lbView);
    btn.onclick = () => { state.lbView = btn.dataset.lbview; renderLeaderboard(); };
  });

  if (state.lbView === 'people') {
    peopleEl.style.display    = '';
    districtsEl.style.display = 'none';
    renderPeopleLeaderboard();
  } else {
    peopleEl.style.display    = 'none';
    districtsEl.style.display = '';
    renderDistrictLeaderboard();
  }
}

function aggregateData() {
  const userPoints = {};
  state.allEntries.forEach(e => {
    userPoints[e.user_id] = (userPoints[e.user_id] || 0) + e.points;
  });

  const people = state.allUsers
    .filter(u => state.zoneActive[u.zone_id] !== false)
    .map(u => ({
      ...u,
      zone: ZONES.find(z => z.id === u.zone_id),
      points: userPoints[u.id] || 0,
      isMe: u.id === state.user?.id,
    }))
    .sort((a, b) => b.points - a.points);

  return { people };
}

// Returns an array of competition ranks (1,1,3,4…) for a sorted-by-points array
function tiedRanks(items, getPoints) {
  const ranks = [];
  let rank = 1;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && getPoints(items[i]) < getPoints(items[i - 1])) rank = i + 1;
    ranks.push(rank);
  }
  return ranks;
}

function renderDistrictLeaderboard() {
  const userPoints = {};
  state.allEntries.forEach(e => {
    userPoints[e.user_id] = (userPoints[e.user_id] || 0) + e.points;
  });

  const medalColors = ['#f59e0b', '#94a3b8', '#cd7c54'];

  // Named districts from user data
  const districtNames = [...new Set(
    state.allUsers.filter(u => u.district).map(u => u.district)
  )].sort();

  const groups = districtNames.map(name => {
    const members = state.allUsers.filter(u => u.district === name);
    const points  = members.reduce((s, u) => s + (userPoints[u.id] || 0), 0);
    const hasMe   = members.some(u => u.id === state.user?.id);
    const dl      = members.find(m => m.district_role === 'leader');
    const stl     = members.find(m => m.district_role === 'stl');
    return { name, members, points, hasMe, dl, stl, isAdult: false };
  });

  // Virtual "Adult Leaders" group — anyone in zone 7
  const adultMembers = state.allUsers.filter(u => u.zone_id === 7);
  if (adultMembers.length) {
    const points = adultMembers.reduce((s, u) => s + (userPoints[u.id] || 0), 0);
    const hasMe  = adultMembers.some(u => u.id === state.user?.id);
    groups.push({ name: 'Adult Leaders', members: adultMembers, points, hasMe, dl: null, stl: null, isAdult: true });
  }

  groups.sort((a, b) => b.points - a.points);
  const ranks = tiedRanks(groups, d => d.points);

  document.getElementById('lb-districts').innerHTML = groups.map((d, i) => {
    const r = ranks[i];
    const accentColor = d.isAdult ? '#6b7280' : 'var(--accent)';
    return `
    <div class="lb-person-row ${d.hasMe ? 'is-me' : ''}">
      <span class="lb-medal" ${r <= 3 ? `style="color:${medalColors[r - 1]}"` : ''}>${r}</span>
      <div class="lb-avatar" style="background:${accentColor}">${r}</div>
      <div class="lb-person-info">
        <div class="lb-person-name">${d.name}${d.hasMe ? ' <span class="you-tag">you</span>' : ''}</div>
        <div class="lb-person-zone" style="color:var(--dim)">
          ${d.members.length} members
          ${d.dl  ? ` · <span style="color:#f59e0b">DL: ${d.dl.name.split(' ')[0]}</span>` : ''}
          ${d.stl ? ` · <span style="color:#a78bfa">STL: ${d.stl.name.split(' ')[0]}</span>` : ''}
        </div>
      </div>
      <div class="lb-person-pts">${d.points}<span>pts</span></div>
    </div>`;
  }).join('');
}

function renderPeopleLeaderboard() {
  const { people } = aggregateData();
  const medalColors = ['#f59e0b', '#94a3b8', '#cd7c54'];
  const ranks = tiedRanks(people, p => p.points);
  const revealed = state.lbRevealed;

  document.getElementById('lb-people').innerHTML = people.map((p, i) => {
    const r = ranks[i];
    const medal = r <= 3 ? `style="color:${medalColors[r - 1]}"` : '';
    if (p.isMe || revealed) {
      return `
      <div class="lb-person-row ${p.isMe ? 'is-me' : ''}">
        <span class="lb-medal" ${medal}>${r}</span>
        <div class="lb-avatar" style="background:${p.zone?.color || '#6b7280'}">${getInitials(p.name)}</div>
        <div class="lb-person-info">
          <div class="lb-person-name">${p.name}${p.isMe ? ' <span class="you-tag">you</span>' : ''}</div>
          <div class="lb-person-zone" style="color:${p.zone?.color || '#94a3b8'}">${p.zone?.name || ''}</div>
        </div>
        <div class="lb-person-pts">${p.points}<span>pts</span></div>
      </div>`;
    }
    return `
      <div class="lb-person-row lb-blurred">
        <span class="lb-medal" ${medal}>${r}</span>
        <div class="lb-avatar lb-avatar-blur"></div>
        <div class="lb-person-info">
          <div class="lb-person-name lb-name-blur">${p.name}</div>
          <div class="lb-person-zone lb-zone-blur">${p.zone?.name || '&nbsp;'}</div>
        </div>
        <div class="lb-person-pts">${p.points}<span>pts</span></div>
      </div>`;
  }).join('');

  // Easter egg: tap 10 times anywhere on the list to reveal for 30s
  const container = document.getElementById('lb-people');
  if (!container.dataset.eggBound) {
    container.dataset.eggBound = '1';
    container.addEventListener('click', () => {
      if (state.lbRevealed) return;
      state.lbRevealTaps = (state.lbRevealTaps || 0) + 1;
      if (state.lbRevealTaps >= 10) {
        state.lbRevealTaps = 0;
        state.lbRevealed = true;
        renderPeopleLeaderboard();
        showToast('🔍 Names revealed for 30s', 'success');
        if (state.lbRevealTimer) clearTimeout(state.lbRevealTimer);
        state.lbRevealTimer = setTimeout(() => {
          state.lbRevealed = false;
          state.lbRevealTimer = null;
          renderPeopleLeaderboard();
        }, 30000);
      }
    });
  }
}

// ── DISTRICT VIEW ─────────────────────────────────────────────────────────────

function renderDistrict() {
  const container = document.getElementById('district-view-content');
  if (!container || !state.user.district) return;

  const userPtsMap = {};
  state.allEntries.forEach(e => {
    userPtsMap[e.user_id] = (userPtsMap[e.user_id] || 0) + e.points;
  });

  const members = state.allUsers
    .filter(u => u.district === state.user.district)
    .map(u => ({ ...u, pts: userPtsMap[u.id] || 0 }))
    .sort((a, b) => b.pts - a.pts);

  const zone  = ZONES.find(z => z.id === state.user.zone_id);
  const dl    = members.find(m => m.district_role === 'leader');
  const stl   = members.find(m => m.district_role === 'stl');

  container.innerHTML = `
    <div class="district-header">
      <h2 class="district-title">${state.user.district}</h2>
      <div class="district-leaders">
        ${dl  ? `<span class="district-leader-pill leader"><i data-lucide="star" style="width:11px;height:11px;margin-right:3px"></i>${dl.name}</span>` : ''}
        ${stl ? `<span class="district-leader-pill stl"><i data-lucide="star" style="width:11px;height:11px;margin-right:3px"></i>${stl.name}</span>` : ''}
      </div>
    </div>

    <div class="district-list">
      ${members.map((m, i) => {
        const isSelf    = m.id === state.user.id;
        const mFlag     = m.mission ? m.mission.split(' ')[0] : '🌍';
        const mName     = m.mission ? m.mission.split(' ').slice(1).join(' ') : 'Unassigned';
        const mZone     = ZONES.find(z => z.id === m.zone_id);
        const initials  = m.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
        const roleLabel = m.district_role === 'leader' ? ' · DL' : m.district_role === 'stl' ? ' · STL' : '';
        return `
          <div class="district-member-row ${isSelf ? 'self' : ''}">
            <span class="dm-rank">${i + 1}</span>
            <div class="dm-avatar" style="background:${mZone?.color || '#6b7280'}">${initials}</div>
            <div class="dm-info">
              <span class="dm-name">${m.name}${roleLabel ? `<span class="dm-role">${roleLabel}</span>` : ''}</span>
              <span class="dm-mission">${mFlag} ${mName}</span>
              ${m.companion ? `<span class="dm-companion"><i data-lucide="users" style="width:10px;height:10px;margin-right:2px;vertical-align:middle"></i>${m.companion}</span>` : ''}
            </div>
            <span class="dm-pts">${m.pts}<span class="dm-pts-lbl"> pts</span></span>
          </div>`;
      }).join('')}
    </div>`;

  if (window.lucide) lucide.createIcons();
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────────────

function renderProfile() {
  if (!state.user) return;
  const zone     = ZONES.find(z => z.id === state.user.zone_id);
  const streak   = calcStreak(state.myEntries);
  const total    = calcTotalPoints(state.myEntries);
  const catPts   = calcCategoryPoints(state.myEntries);
  const userPts  = {};
  state.allEntries.forEach(e => { userPts[e.user_id] = (userPts[e.user_id] || 0) + e.points; });
  const rank = Object.entries(userPts).sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === state.user.id) + 1;

  const avatar = document.getElementById('profile-avatar');
  avatar.textContent = getInitials(state.user.name);
  avatar.style.background = zone?.color || '#6b7280';

  document.getElementById('profile-name').textContent = state.user.name;

  // Mission display
  const missionFlag = state.user.mission ? state.user.mission.split(' ')[0] : '🌍';
  const missionName = state.user.mission ? state.user.mission.split(' ').slice(1).join(' ') : 'No Mission';
  let missionEl = document.getElementById('profile-mission');
  if (!missionEl) {
    missionEl = document.createElement('div');
    missionEl.id = 'profile-mission';
    missionEl.className = 'profile-mission';
    document.getElementById('profile-name').after(missionEl);
  }
  missionEl.innerHTML = `<span class="pm-flag">${missionFlag}</span><span class="pm-name">${missionName} Mission</span>`;

  const badge = document.getElementById('profile-zone-badge');
  badge.textContent = zone?.name || 'No Zone';
  badge.style.cssText = `background:${zone?.color || '#6b7280'}18;color:${zone?.color || '#94a3b8'};border-color:${zone?.color || '#6b7280'}44`;

  document.getElementById('stat-total-pts').textContent = total;
  document.getElementById('stat-streak').textContent    = streak;
  document.getElementById('stat-rank').textContent      = rank ? `${rank}` : '–';

  const maxCat = Math.max(...Object.values(catPts), 1);
  document.getElementById('breakdown-bars').innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <div class="breakdown-row">
      <div class="bd-label"><span><i data-lucide="${cat.icon}" class="icon-sm" style="color:${cat.color}"></i>${cat.label}</span><span style="color:${cat.color}">${catPts[key]} pts</span></div>
      <div class="bd-track"><div class="bd-fill" style="width:${(catPts[key] / maxCat * 100).toFixed(1)}%;background:${cat.color}"></div></div>
    </div>`).join('');

  const week      = getWeekNumber(todayISO(), PROGRAM_START);
  const weekStart = getWeekStart(todayISO());
  const weekItems = [...WEEKLY_CHALLENGES, BONUS_CHALLENGES.find(b => b.week === week)].filter(Boolean);

  document.getElementById('weekly-progress-grid').innerHTML = weekItems.map(h => {
    const cat  = CATEGORIES[h.category];
    const done = state.myEntries.some(e => e.habit_id === h.id && getWeekStart(e.date) === weekStart);
    return `
      <div class="weekly-chip ${done ? 'done' : ''}" style="--cc:${cat.color}">
        <i data-lucide="${cat.icon}" class="wc-icon" style="color:${cat.color}"></i>
        <span class="wc-pts">+${h.points}</span>
        ${done ? '<span class="wc-check">✓</span>' : ''}
      </div>`;
  }).join('');

  // Admin — tap avatar 5 times
  avatar.onclick = () => {
    state.adminTaps = (state.adminTaps || 0) + 1;
    if (state.adminTaps >= 5) { state.adminTaps = 0; promptAdmin(); }
  };

  // ── Companion card ─────────────────────────────────────────
  let companionCard = document.getElementById('profile-companion-card');
  if (state.user.companion) {
    const compUser   = state.allUsers.find(u => u.name === state.user.companion);
    const compMission = compUser?.mission || '';
    const compFlag   = compMission ? compMission.split(' ')[0] : '🌍';
    const compName_  = compMission ? compMission.split(' ').slice(1).join(' ') : '';
    if (!companionCard) {
      companionCard = document.createElement('div');
      companionCard.id = 'profile-companion-card';
      companionCard.className = 'profile-card companion-card';
      document.getElementById('weekly-progress-grid').closest('.profile-card').after(companionCard);
    }
    companionCard.innerHTML = `
      <h3 class="card-label">My Companion</h3>
      <div class="companion-name">${state.user.companion}</div>
      ${compName_ ? `<div class="companion-mission">${compFlag} ${compName_}</div>` : ''}`;
  } else if (companionCard) {
    companionCard.remove();
  }

  // ── District info card ─────────────────────────────────────
  let districtCard = document.getElementById('profile-district-card');
  if (state.user.district) {
    const dl  = state.allUsers.find(u => u.district === state.user.district && u.district_role === 'leader');
    const stl = state.allUsers.find(u => u.district === state.user.district && u.district_role === 'stl');
    if (!districtCard) {
      districtCard = document.createElement('div');
      districtCard.id = 'profile-district-card';
      districtCard.className = 'profile-card';
      (companionCard || document.getElementById('weekly-progress-grid').closest('.profile-card')).after(districtCard);
    }
    districtCard.innerHTML = `
      <h3 class="card-label">My District</h3>
      <div class="district-info-row"><span class="di-label">District</span><span class="di-val">${state.user.district}</span></div>
      ${dl  ? `<div class="district-info-row"><span class="di-label">District Leader</span><span class="di-val">${dl.name}</span></div>` : ''}
      ${stl ? `<div class="district-info-row"><span class="di-label">Sister Training Leader</span><span class="di-val">${stl.name}</span></div>` : ''}
      ${state.user.district_role ? `<div class="district-role-badge">${state.user.district_role === 'leader' ? '⭐ District Leader' : '⭐ Sister Training Leader'}</div>` : ''}`;
  } else if (districtCard) {
    districtCard.remove();
  }

  // ── Customize colors ──────────────────────────────────────
  const custToggle = document.getElementById('btn-customize-toggle');
  const custBody   = document.getElementById('customize-body');
  custToggle.addEventListener('click', () => {
    custBody.classList.toggle('hidden');
    custToggle.querySelector('.cust-chevron').style.transform =
      custBody.classList.contains('hidden') ? '' : 'rotate(180deg)';
  });

  const theme = loadTheme();
  const custItems = [
    { key: 'bg',        label: 'Background',  icon: 'moon'     },
    { key: 'card',      label: 'Cards',       icon: 'layers'   },
    { key: 'spiritual', label: 'Spiritual',   icon: 'sun'      },
    { key: 'physical',  label: 'Physical',    icon: 'activity' },
    { key: 'social',    label: 'Social',      icon: 'users'    },
    { key: 'emotional', label: 'Emotional',   icon: 'heart'    },
  ];

  document.getElementById('cust-grid').innerHTML = custItems.map(item => `
    <div class="cust-row">
      <i data-lucide="${item.icon}" class="icon-sm cust-icon"></i>
      <span class="cust-label">${item.label}</span>
      <label class="cust-swatch-wrap">
        <span class="cust-swatch" style="background:${theme[item.key]}"></span>
        <input type="color" class="cust-color-input" data-key="${item.key}" value="${theme[item.key]}">
      </label>
    </div>`).join('');

  document.getElementById('cust-grid').querySelectorAll('.cust-color-input').forEach(input => {
    const swatch = input.previousElementSibling;
    input.addEventListener('input', () => {
      swatch.style.background = input.value;
      const current = loadTheme();
      current[input.dataset.key] = input.value;
      saveTheme(current);
      applyTheme(current);
      // Re-render current view so colors apply immediately
      const v = state.currentView;
      if (v === 'home') renderHome();
      else if (v === 'log') renderLogHabits();
      else if (v === 'leaderboard') renderLeaderboard();
    });
  });

  document.getElementById('btn-cust-reset').addEventListener('click', () => {
    saveTheme(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
    renderProfile(); // re-render to reset swatches
    showToast('Colors reset!', 'success');
  });

  if (window.lucide) lucide.createIcons();
}

function promptAdmin() {
  const code = prompt('Enter admin code:');
  if (code === ADMIN_CODE) navigate('admin');
  else if (code !== null) showToast('Wrong code', 'error');
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────

async function renderAdmin() {
  const container = document.getElementById('admin-content');
  container.innerHTML = '<div class="admin-loading">Loading…</div>';

  try {
    const [users, entries, zones] = await Promise.all([
      db.getAllUsers(), db.getAllEntries(), db.getZonesWithStatus(),
    ]);
    state.allUsers   = users;
    state.allEntries = entries;
    zones.forEach(z => { state.zoneActive[z.id] = z.active !== false; });

    const userPts = {};
    entries.forEach(e => { userPts[e.user_id] = (userPts[e.user_id] || 0) + e.points; });

    container.innerHTML = `
      <div class="admin-section">
        <h3>Classes</h3>
        <p class="admin-section-hint">Toggle a class to show/hide it in sign-up and the leaderboard.</p>
        <div class="admin-zone-toggles">
          ${zones.map(z => `
            <div class="admin-zone-toggle-row">
              <span class="azt-dot" style="background:${z.color}"></span>
              <span class="azt-name">${z.name}</span>
              <label class="toggle-switch">
                <input type="checkbox" class="zone-toggle-cb" data-zone-id="${z.id}" ${z.active !== false ? 'checked' : ''}>
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>`).join('')}
        </div>
      </div>

      <div class="admin-section">
        <h3>Users (${users.length})</h3>
        ${users.map(u => {
          const zone = ZONES.find(z => z.id === u.zone_id);
          return `
            <div class="admin-user-row">
              <div class="admin-avatar" style="background:${zone?.color || '#6b7280'}">${getInitials(u.name)}</div>
              <div class="admin-user-info">
                <strong>${u.name}</strong>
                <span style="color:${zone?.color || '#94a3b8'}">${zone?.name || '?'}</span>
              </div>
              <div class="admin-pts">${userPts[u.id] || 0} pts</div>
              <select class="admin-zone-sel" data-uid="${u.id}">
                ${ZONES.map(z => `<option value="${z.id}" ${z.id === u.zone_id ? 'selected' : ''}>${z.name}</option>`).join('')}
              </select>
              <button class="btn-del-user" data-uid="${u.id}"><i data-lucide="trash-2" style="width:14px;height:14px;pointer-events:none"></i></button>
            </div>`;
        }).join('')}
      </div>

      <div class="admin-section">
        <h3>Recent Entries (${entries.length} total)</h3>
        ${entries.slice(0, 60).map(e => {
          const user  = users.find(u => u.id === e.user_id);
          const habit = getHabitById(e.habit_id);
          return `
            <div class="admin-entry-row">
              <span class="ae-user">${user?.name || '?'}</span>
              <span class="ae-date">${e.date}</span>
              <span class="ae-habit">${habit?.label || e.habit_id}</span>
              <span class="ae-pts">+${e.points}</span>
              <button class="btn-del-entry" data-eid="${e.id}">✕</button>
            </div>`;
        }).join('')}
      </div>

      <div class="admin-section">
        <h3>Custom Challenges</h3>
        <p class="admin-section-hint">Add extra credit (one-time) or bonus tasks (repeatable daily) that appear in each user's Log tab.</p>
        <form id="custom-habit-form" class="custom-habit-form">
          <input type="text" id="ch-label" placeholder="Challenge label…" required class="ch-input">
          <div class="ch-row">
            <select id="ch-category" class="ch-select">
              <option value="spiritual">Spiritual</option>
              <option value="physical">Physical</option>
              <option value="social">Social</option>
              <option value="emotional">Emotional</option>
            </select>
            <select id="ch-type" class="ch-select">
              <option value="extra">Extra Credit (one-time)</option>
              <option value="repeat">Bonus Task (repeatable)</option>
            </select>
          </div>
          <div class="ch-row ch-bottom-row">
            <label class="ch-pts-label">Pts
              <input type="number" id="ch-points" value="5" min="1" max="50" class="ch-pts-input">
            </label>
            <button type="submit" class="ch-add-btn">+ Add Challenge</button>
          </div>
        </form>
        <div id="custom-habits-list">
          ${state.customHabits.length === 0 ? '<p class="admin-section-hint" style="text-align:center;padding:.5rem">No custom challenges yet.</p>' : ''}
          ${state.customHabits.map(h => `
            <div class="admin-entry-row">
              <span class="ae-user">${CATEGORIES[h.category]?.label || h.category}</span>
              <span class="ae-habit">${h.label}</span>
              <span class="ae-pts">${h.type === 'extra' ? 'one-time' : 'repeat'} · ${h.points}pts</span>
              <button class="btn-del-custom" data-cid="${h.id}">✕</button>
            </div>`).join('')}
        </div>
      </div>

      <div class="admin-export">
        <button class="btn-secondary" id="btn-export">Export JSON</button>
      </div>`;

    container.querySelectorAll('.zone-toggle-cb').forEach(cb => {
      cb.addEventListener('change', async () => {
        const id = parseInt(cb.dataset.zoneId);
        const active = cb.checked;
        try {
          await db.setZoneActive(id, active);
          state.zoneActive[id] = active;
          showToast(`${ZONES.find(z => z.id === id)?.name} ${active ? 'enabled' : 'disabled'}`, 'success');
        } catch (_) {
          cb.checked = !active; // revert on error
          showToast('Update failed', 'error');
        }
      });
    });

    container.querySelectorAll('.admin-zone-sel').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await db.updateUserZone(sel.dataset.uid, parseInt(sel.value));
          state.allUsers = await db.getAllUsers();
          if (state.user?.id === sel.dataset.uid) {
            state.user.zone_id = parseInt(sel.value);
            localStorage.setItem('mp_user', JSON.stringify(state.user));
          }
          showToast('Zone updated!', 'success');
        } catch (_) { showToast('Update failed', 'error'); }
      });
    });

    container.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = state.allUsers.find(x => x.id === btn.dataset.uid);
        if (!confirm(`Delete ${u?.name}? This removes all their data.`)) return;
        try {
          await db.adminDeleteUser(btn.dataset.uid);
          showToast('User deleted', 'success');
          renderAdmin();
        } catch (_) { showToast('Delete failed', 'error'); }
      });
    });

    container.querySelectorAll('.btn-del-entry').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await db.adminDeleteEntry(btn.dataset.eid);
          state.allEntries = state.allEntries.filter(e => e.id !== btn.dataset.eid);
          showToast('Entry removed', 'success');
          renderAdmin();
        } catch (_) { showToast('Delete failed', 'error'); }
      });
    });

    document.getElementById('custom-habit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = document.getElementById('ch-label').value.trim();
      const category = document.getElementById('ch-category').value;
      const type = document.getElementById('ch-type').value;
      const points = parseInt(document.getElementById('ch-points').value) || 5;
      if (!label) return;
      const habit = { id: `c${Date.now()}`, label, category, type, points, active: true };
      try {
        await db.addCustomHabit(habit);
        state.customHabits = await db.getCustomHabits();
        showToast('Challenge added!', 'success');
        renderAdmin();
      } catch (_) { showToast('Failed to add', 'error'); }
    });

    container.querySelectorAll('.btn-del-custom').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await db.deleteCustomHabit(btn.dataset.cid);
          state.customHabits = await db.getCustomHabits();
          showToast('Removed', 'success');
          renderAdmin();
        } catch (_) { showToast('Failed to remove', 'error'); }
      });
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {      const blob = new Blob([JSON.stringify({ users, entries }, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `mission-possible-${todayISO()}.json`,
      });
      a.click();
    });

    if (window.lucide) lucide.createIcons();

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444;padding:1rem">Error: ${err.message}</p>`;
  }
}

// ── ZONE PICKER MODAL ─────────────────────────────────────────────────────────

function showNameEditor() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>Edit Name</h3>
      <input id="edit-name-input" class="name-input" type="text"
        value="${state.user.name}" maxlength="40" autocomplete="off" style="margin-bottom:.75rem">
      <div style="display:flex;gap:.5rem">
        <button class="btn-primary" id="modal-save-name" style="margin:0;flex:1">Save</button>
        <button class="btn-secondary" id="modal-cancel-name" style="flex:0 0 auto;padding:.9rem 1rem">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#edit-name-input');
  input.focus();
  input.select();

  overlay.querySelector('#modal-cancel-name').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#modal-save-name').addEventListener('click', async () => {
    const newName = input.value.trim();
    if (!newName) return;
    if (newName === state.user.name) { overlay.remove(); return; }

    const duplicate = state.allUsers.find(u => u.id !== state.user.id && u.name.toLowerCase() === newName.toLowerCase());
    if (duplicate) { showToast('That name is already taken', 'error'); return; }

    try {
      await db.updateUserName(state.user.id, newName);
      state.user.name = newName;
      state.allUsers = state.allUsers.map(u => u.id === state.user.id ? { ...u, name: newName } : u);
      const savedUser = JSON.stringify(state.user);
      if (localStorage.getItem('mp_user'))   localStorage.setItem('mp_user', savedUser);
      else                                    sessionStorage.setItem('mp_user', savedUser);
      overlay.remove();
      renderProfile();
      showToast('Name updated!', 'success');
    } catch (e) {
      showToast(e?.message?.includes('unique') ? 'Name already taken' : 'Update failed', 'error');
    }
  });
}

function showMissionPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>Change Mission</h3>
      <p style="color:var(--dim);font-size:.85rem;margin:-.25rem 0 .75rem">Pick where you'd serve</p>
      <div class="mission-picker" id="mission-picker-modal"></div>
      <button class="btn-secondary" id="modal-cancel-mission" style="margin-top:.75rem">Cancel</button>
    </div>`;

  document.body.appendChild(overlay);

  const current = state.user.mission;
  const picker  = overlay.querySelector('#mission-picker-modal');
  picker.innerHTML = MISSIONS.map((m, i) =>
    `<button class="mission-chip ${current === `${m.flag} ${m.name}` ? 'active' : ''}"
      data-mission="${m.flag} ${m.name}" data-idx="${i}">
      <span class="mflag">${m.flag}</span>
      <span class="mname">${m.name}</span>
    </button>`
  ).join('');

  overlay.querySelector('#modal-cancel-mission').addEventListener('click', () => overlay.remove());

  picker.querySelectorAll('.mission-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mission = btn.dataset.mission;
      try {
        await db.updateUserMission(state.user.id, mission);
        state.user.mission = mission;
        state.allUsers = state.allUsers.map(u => u.id === state.user.id ? { ...u, mission } : u);
        const savedUser = JSON.stringify(state.user);
        if (localStorage.getItem('mp_user'))   localStorage.setItem('mp_user', savedUser);
        else                                    sessionStorage.setItem('mp_user', savedUser);
        overlay.remove();
        renderProfile();
        showToast('Mission updated! 🌍', 'success');
      } catch (_) { showToast('Update failed', 'error'); }
    });
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ── EVENT BINDING ─────────────────────────────────────────────────────────────

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  );

  document.getElementById('date-prev').addEventListener('click', () => {
    state.logDate = prevDay(state.logDate);
    state.logSelectionsDate = null;
    updateLogDateDisplay();
    renderLogHabits();
  });

  document.getElementById('date-next').addEventListener('click', () => {
    if (state.logDate < todayISO()) {
      state.logDate = nextDay(state.logDate);
      state.logSelectionsDate = null;
      updateLogDateDisplay();
      renderLogHabits();
    }
  });

  document.getElementById('btn-submit-log').addEventListener('click', submitLog);

  document.getElementById('btn-edit-name').addEventListener('click', showNameEditor);

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('mp_user');
    sessionStorage.removeItem('mp_user');
    location.reload();
  });

  document.getElementById('btn-exit-admin').addEventListener('click', () => navigate('profile'));
}

// ── BOOT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  if (window.lucide) lucide.createIcons();
  init();
});

window.promptAdmin = promptAdmin;
