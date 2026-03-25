// ============================================================
// STATIC DATA — Zones, Categories, Habits
// ============================================================

export const ZONES = [
  { id: 1, name: 'Zone Alpha',    color: '#f97316' },
  { id: 2, name: 'Zone Beta',     color: '#8b5cf6' },
  { id: 3, name: 'Zone Delta',    color: '#22d3ee' },
  { id: 4, name: 'Zone Omega',    color: '#ec4899' },
  { id: 5, name: 'Adult Leaders', color: '#6b7280' },
];

export const CATEGORIES = {
  spiritual: { label: 'Spiritual', emoji: '✨', color: '#f59e0b' },
  physical:  { label: 'Physical',  emoji: '💪', color: '#10b981' },
  social:    { label: 'Social',    emoji: '🤝', color: '#60a5fa' },
  emotional: { label: 'Emotional', emoji: '🧠', color: '#a855f7' },
};

export const DAILY_HABITS = [
  { id: 'd1', category: 'spiritual', label: 'Morning prayer',                    points: 1, type: 'daily' },
  { id: 'd2', category: 'spiritual', label: 'Personal scripture study',           points: 1, type: 'daily' },
  { id: 'd3', category: 'spiritual', label: 'Evening prayer',                     points: 1, type: 'daily' },
  { id: 'd4', category: 'physical',  label: '30 minutes of movement',             points: 1, type: 'daily' },
  { id: 'd5', category: 'physical',  label: 'Be on time to school',               points: 1, type: 'daily' },
  { id: 'd6', category: 'social',    label: 'Say hi to 5 new people',             points: 1, type: 'daily' },
  { id: 'd7', category: 'social',    label: 'Be fully present (limit phone)',      points: 1, type: 'daily' },
  { id: 'd8', category: 'emotional', label: "Write 3 things you're grateful for", points: 1, type: 'daily' },
  { id: 'd9', category: 'emotional', label: 'Limit social media use',             points: 1, type: 'daily' },
];

export const WEEKLY_CHALLENGES = [
  { id: 'w1', category: 'spiritual', label: 'Attend Church (both hours)',                             points: 5, type: 'weekly' },
  { id: 'w2', category: 'physical',  label: 'Do own laundry OR help cook/clean 2 meals',              points: 5, type: 'weekly' },
  { id: 'w3', category: 'social',    label: 'Open doors, smile & intentionally say "hi" all week',   points: 5, type: 'weekly' },
  { id: 'w4', category: 'emotional', label: 'Mindset Reset — any 3 days this week',                   points: 5, type: 'weekly' },
];

export const BONUS_CHALLENGES = [
  { id: 'b1', week: 1, category: 'spiritual', label: 'Attend the temple for a Baptism session',             points: 10, type: 'bonus' },
  { id: 'b2', week: 2, category: 'physical',  label: 'Missionary Training Circuit (45 min) OR 8K steps',   points: 10, type: 'bonus' },
  { id: 'b3', week: 3, category: 'social',    label: "Find the One — invite someone new to lunch",          points: 10, type: 'bonus' },
  { id: 'b4', week: 4, category: 'emotional', label: 'Fearless Week — bear testimony & journal it',         points: 10, type: 'bonus' },
];

export const ALL_HABITS = [...DAILY_HABITS, ...WEEKLY_CHALLENGES, ...BONUS_CHALLENGES];

export function getHabitById(id) {
  return ALL_HABITS.find(h => h.id === id);
}

export function getZoneById(id) {
  return ZONES.find(z => z.id === id);
}

// Returns week number (1–4) for a given date relative to the program start
export function getWeekNumber(dateStr, startStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const s = new Date(startStr + 'T12:00:00');
  const days = Math.floor((d - s) / 86400000);
  if (days < 0) return 1;
  return Math.min(Math.floor(days / 7) + 1, 4);
}

// Returns the ISO date string of the Monday of the week containing dateStr
export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
