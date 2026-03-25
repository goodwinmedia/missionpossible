import { PROGRAM_START, ADMIN_CODE } from './config.js';
import {
  ZONES, MISSIONS, CATEGORIES, DAILY_HABITS, WEEKLY_CHALLENGES, BONUS_CHALLENGES, ALL_HABITS,
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
  lbTab: 'zones',
  logDate: todayISO(),
  logSelections: {},
  logSelectionsDate: null,
  adminTaps: 0,
};

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
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
      await loadOnboarding();
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
  updateHeader();
  navigate('home');
  setupRealtime();
}

function setupRealtime() {
  db.subscribeToEntries(async () => {
    state.allEntries = await db.getAllEntries();
    if (state.currentView === 'leaderboard') renderLeaderboard();
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
    filterPicker.innerHTML = ZONES.map(z => `
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

  // Zone picker
  const zonePicker = document.getElementById('zone-picker');
  zonePicker.innerHTML = ZONES.map(z =>
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

  const titles = { home: 'Today', log: 'Log Activity', leaderboard: 'Battle Zones', profile: 'My Profile', admin: '🔐 Admin' };
  document.getElementById('header-view-title').textContent = titles[view] || '';

  const hideChrome = view === 'admin';
  document.getElementById('app-header').style.display = hideChrome ? 'none' : 'flex';
  document.getElementById('bottom-nav').style.display  = hideChrome ? 'none' : 'flex';

  switch (view) {
    case 'home':        renderHome();        break;
    case 'log':         renderLog();         break;
    case 'leaderboard': renderLeaderboard(); break;
    case 'profile':     renderProfile();     break;
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

  document.getElementById('greeting-text').textContent = `${greeting()}, ${firstName}! 🔥`;
  document.getElementById('today-date-label').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  renderRings(completedIds, today);
  renderChallengeStrip(completedIds, week);
  renderHomeHabits(completedIds, today);
}

function renderRings(completedIds, date) {
  const container = document.getElementById('rings-grid');
  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const habits = DAILY_HABITS.filter(h => h.category === key);
    const done = habits.filter(h => completedIds.has(h.id)).length;
    const total = habits.length;
    const pct = total ? done / total : 0;
    const r = 34;
    const circ = 2 * Math.PI * r;
    const dash = (pct * circ).toFixed(2);

    return `
      <div class="ring-card">
        <div class="ring-wrapper">
          <svg class="ring-svg" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="${cat.color}22" stroke-width="5.5"/>
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="${cat.color}" stroke-width="5.5"
              stroke-dasharray="${dash} ${circ.toFixed(2)}" stroke-linecap="round"
              transform="rotate(-90 40 40)" style="transition:stroke-dasharray .6s ease"/>
          </svg>
          <i data-lucide="${cat.icon}" class="ring-icon" style="color:${cat.color}"></i>
        </div>
        <div class="ring-label">${cat.label}</div>
        <div class="ring-progress" style="color:${cat.color}">${done}/${total}</div>
      </div>`;
  }).join('');

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
  const items = [...WEEKLY_CHALLENGES, ...(bonus ? [bonus] : [])];

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
  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
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

    return `
      <div class="cat-group">
        <div class="cat-header" style="color:${cat.color}"><i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}</div>
        ${rows}
      </div>`;
  }).join('');

  container.querySelectorAll('.habit-row.tappable').forEach(row => {
    row.addEventListener('click', () => toggleHabit(row.dataset.habitId, row.dataset.date));
  });
  if (window.lucide) lucide.createIcons();
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

  // Initialize selections when date changes
  if (state.logSelectionsDate !== date) {
    state.logSelectionsDate = date;
    state.logSelections = {};
    const habits = [...DAILY_HABITS, ...WEEKLY_CHALLENGES, ...BONUS_CHALLENGES.filter(b => b.week === week)];
    habits.forEach(h => {
      if (h.type === 'daily') {
        state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id && e.date === date);
      } else {
        state.logSelections[h.id] = state.myEntries.some(e => e.habit_id === h.id && getWeekStart(e.date) === weekStart);
      }
    });
  }

  const container = document.getElementById('log-habits-container');
  const bonus = BONUS_CHALLENGES.find(b => b.week === week);

  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const daily   = DAILY_HABITS.filter(h => h.category === key);
    const weekly  = WEEKLY_CHALLENGES.find(h => h.category === key);
    const bonusH  = bonus?.category === key ? bonus : null;

    const renderRow = (h, tag = null) => {
      const sel = !!state.logSelections[h.id];
      return `
        <div class="log-row ${sel ? 'selected' : ''}" data-habit-id="${h.id}" style="--cc:${cat.color}">
          <div class="log-check ${sel ? 'checked' : ''}" style="${sel ? `background:${cat.color}` : `border-color:${cat.color}`}">
            ${sel ? '✓' : ''}
          </div>
          <div class="log-info">
            <span class="log-label">${h.label}</span>
            ${tag ? `<span class="log-tag ${h.type}">${tag}</span>` : ''}
          </div>
          <span class="log-pts" style="color:${cat.color}">+${h.points}</span>
        </div>`;
    };

    const rows = [
      ...daily.map(h => renderRow(h)),
      weekly  ? renderRow(weekly,  'Weekly · 5pts') : '',
      bonusH  ? renderRow(bonusH, `Week ${bonusH.week} Bonus · 10pts`) : '',
    ].join('');

    return `
      <div class="log-cat-group">
        <div class="log-cat-header" style="color:${cat.color};border-color:${cat.color}22">
          <i data-lucide="${cat.icon}" class="icon-sm"></i>${cat.label}
        </div>
        ${rows}
      </div>`;
  }).join('');

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
    .reduce((sum, [id]) => sum + (getHabitById(id)?.points || 0), 0);
  document.getElementById('log-pts-count').textContent = `${pts} pts selected`;
}

async function submitLog() {
  const date     = state.logDate;
  const week     = getWeekNumber(date, PROGRAM_START);
  const weekStart = getWeekStart(date);
  const toAdd = [], toDeleteIds = [];

  const habitsForDate = [
    ...DAILY_HABITS,
    ...WEEKLY_CHALLENGES,
    ...BONUS_CHALLENGES.filter(b => b.week === week),
  ];

  habitsForDate.forEach(h => {
    const selected = !!state.logSelections[h.id];
    let existing;
    if (h.type === 'daily') {
      existing = state.myEntries.find(e => e.habit_id === h.id && e.date === date);
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
  renderZoneLeaderboard();
  renderPeopleLeaderboard();
}

function aggregateData() {
  const userPoints = {};
  state.allEntries.forEach(e => {
    userPoints[e.user_id] = (userPoints[e.user_id] || 0) + e.points;
  });

  const people = state.allUsers.map(u => ({
    ...u,
    zone: ZONES.find(z => z.id === u.zone_id),
    points: userPoints[u.id] || 0,
    isMe: u.id === state.user?.id,
  })).sort((a, b) => b.points - a.points);

  const zones = ZONES.map(z => {
    const members = people.filter(p => p.zone_id === z.id);
    return { ...z, members, total: members.reduce((s, p) => s + p.points, 0) };
  }).sort((a, b) => b.total - a.total);

  return { people, zones };
}

function renderZoneLeaderboard() {
  const { zones } = aggregateData();
  const max = Math.max(...zones.map(z => z.total), 1);

  document.getElementById('lb-zones').innerHTML = zones.map((z, i) => `
    <div class="lb-zone-card ${i === 0 ? 'first-place' : ''}">
      <div class="lb-zone-row">
        <div class="lb-rank ${i === 0 ? 'rank-gold' : ''}">${i + 1}</div>
        <div class="lb-zone-name" style="color:${z.color}">${z.name}</div>
        <div class="lb-zone-pts">${z.total}<span>pts</span></div>
      </div>
      <div class="lb-bar-track">
        <div class="lb-bar-fill" style="width:${(z.total / max * 100).toFixed(1)}%;background:${z.color}"></div>
      </div>
      <div class="lb-zone-meta">${z.members.length} member${z.members.length !== 1 ? 's' : ''}</div>
    </div>`).join('');
}

function renderPeopleLeaderboard() {
  const { people } = aggregateData();
  const medalColors = ['#f59e0b', '#94a3b8', '#cd7c54'];

  document.getElementById('lb-people').innerHTML = people.map((p, i) => `
    <div class="lb-person-row ${p.isMe ? 'is-me' : ''}">
      <span class="lb-medal" ${i < 3 ? `style="color:${medalColors[i]}"` : ''}>${i < 3 ? i + 1 : `#${i + 1}`}</span>
      <div class="lb-avatar" style="background:${p.zone?.color || '#6b7280'}">${getInitials(p.name)}</div>
      <div class="lb-person-info">
        <div class="lb-person-name">${p.name}${p.isMe ? ' <span class="you-tag">you</span>' : ''}</div>
        <div class="lb-person-zone" style="color:${p.zone?.color || '#94a3b8'}">${p.zone?.name || ''}</div>
      </div>
      <div class="lb-person-pts">${p.points}<span>pts</span></div>
    </div>`).join('');
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
  document.getElementById('stat-rank').textContent      = rank ? `#${rank}` : '#–';

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
    const [users, entries] = await Promise.all([db.getAllUsers(), db.getAllEntries()]);
    state.allUsers  = users;
    state.allEntries = entries;
    const userPts = {};
    entries.forEach(e => { userPts[e.user_id] = (userPts[e.user_id] || 0) + e.points; });

    container.innerHTML = `
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

      <div class="admin-export">
        <button class="btn-secondary" id="btn-export">Export JSON</button>
      </div>`;

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

    document.getElementById('btn-export')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ users, entries }, null, 2)], { type: 'application/json' });
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

function showZonePicker() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>Change Zone</h3>
      <div class="zone-picker" id="zone-picker-modal">
        ${ZONES.map(z => `
          <button class="zone-chip ${z.id === state.user.zone_id ? 'active' : ''}"
            data-zone-id="${z.id}" style="--zone-color:${z.color}">${z.name}</button>`).join('')}
      </div>
      <button class="btn-secondary" id="modal-cancel">Cancel</button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('.zone-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const zoneId = parseInt(btn.dataset.zoneId);
        await db.updateUserZone(state.user.id, zoneId);
        state.user.zone_id = zoneId;
        const savedUser = JSON.stringify(state.user);
        if (localStorage.getItem('mp_user'))   localStorage.setItem('mp_user', savedUser);
        else                                    sessionStorage.setItem('mp_user', savedUser);
        overlay.remove();
        renderProfile();
        showToast('Zone updated!', 'success');
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

  document.getElementById('tab-zones').addEventListener('click', () => {
    document.getElementById('tab-zones').classList.add('active');
    document.getElementById('tab-people').classList.remove('active');
    document.getElementById('lb-zones').classList.remove('hidden');
    document.getElementById('lb-people').classList.add('hidden');
  });

  document.getElementById('tab-people').addEventListener('click', () => {
    document.getElementById('tab-people').classList.add('active');
    document.getElementById('tab-zones').classList.remove('active');
    document.getElementById('lb-people').classList.remove('hidden');
    document.getElementById('lb-zones').classList.add('hidden');
  });

  document.getElementById('btn-edit-name').addEventListener('click', showNameEditor);
  document.getElementById('btn-change-zone').addEventListener('click', showZonePicker);

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
