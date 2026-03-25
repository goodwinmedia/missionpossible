// ============================================================
// STATIC DATA — Zones, Categories, Habits, Missions
// ============================================================

export const ZONES = [
  { id: 1, name: 'Deacons',       color: '#3b82f6' },
  { id: 2, name: 'Teachers',      color: '#10b981' },
  { id: 3, name: 'Priests',       color: '#7c3aed' },
  { id: 4, name: 'YW Class 1',    color: '#ec4899' },
  { id: 5, name: 'YW Class 2',    color: '#f43f5e' },
  { id: 6, name: 'YW Class 3',    color: '#a855f7' },
  { id: 7, name: 'Adult Leaders', color: '#6b7280' },
];

export const MISSIONS = [
  { flag: '🇧🇷', name: 'Brazil São Paulo'     },
  { flag: '🇯🇵', name: 'Japan Tokyo'          },
  { flag: '🇫🇷', name: 'France Paris'         },
  { flag: '🇮🇹', name: 'Italy Rome'           },
  { flag: '🇲🇽', name: 'Mexico City'          },
  { flag: '🇦🇺', name: 'Australia Sydney'     },
  { flag: '🇬🇧', name: 'England London'       },
  { flag: '🇩🇪', name: 'Germany Frankfurt'    },
  { flag: '🇵🇭', name: 'Philippines Manila'   },
  { flag: '🇰🇷', name: 'Korea Seoul'          },
  { flag: '🇿🇦', name: 'South Africa'         },
  { flag: '🇦🇷', name: 'Argentina'            },
  { flag: '🇨🇱', name: 'Chile Santiago'       },
  { flag: '🇵🇪', name: 'Peru Lima'            },
  { flag: '🇪🇸', name: 'Spain Madrid'         },
  { flag: '🇵🇹', name: 'Portugal Lisbon'      },
  { flag: '🇳🇿', name: 'New Zealand'          },
  { flag: '🇨🇦', name: 'Canada Vancouver'     },
  { flag: '🇺🇸', name: 'California LA'        },
  { flag: '🇺🇸', name: 'New York City'        },
  { flag: '🇮🇩', name: 'Indonesia'            },
  { flag: '🇬🇭', name: 'Ghana Accra'          },
  { flag: '🇺🇦', name: 'Ukraine Kyiv'         },
  { flag: '🇷🇴', name: 'Romania'              },
  { flag: '🇵🇱', name: 'Poland Warsaw'        },
  { flag: '🇮🇳', name: 'India New Delhi'      },
  { flag: '🇹🇼', name: 'Taiwan Taipei'        },
  { flag: '🇳🇬', name: 'Nigeria Lagos'        },
  { flag: '🇨🇳', name: 'Hong Kong'            },
  { flag: '🇷🇺', name: 'Russia Moscow'        },
];

export const CATEGORIES = {
  spiritual: { label: 'Spiritual', emoji: '✨', icon: 'sun',      color: '#f59e0b' },
  physical:  { label: 'Physical',  emoji: '💪', icon: 'activity', color: '#10b981' },
  social:    { label: 'Social',    emoji: '🤝', icon: 'users',    color: '#60a5fa' },
  emotional: { label: 'Emotional', emoji: '🧠', icon: 'heart',    color: '#a855f7' },
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
  { id: 'w1', category: 'spiritual', label: 'Attend Church (both hours)',                            points: 5, type: 'weekly' },
  { id: 'w2', category: 'physical',  label: 'Do own laundry OR help cook/clean 2 meals',             points: 5, type: 'weekly' },
  { id: 'w3', category: 'social',    label: 'Open doors, smile & intentionally say "hi" all week',  points: 5, type: 'weekly' },
  { id: 'w4', category: 'emotional', label: 'Mindset Reset — any 3 days this week',                  points: 5, type: 'weekly' },
];

export const BONUS_CHALLENGES = [
  { id: 'b1', week: 1, category: 'spiritual', label: 'Attend the temple for a Baptism session',            points: 10, type: 'bonus' },
  { id: 'b2', week: 2, category: 'physical',  label: 'Missionary Training Circuit (45 min) OR 8K steps',  points: 10, type: 'bonus' },
  { id: 'b3', week: 3, category: 'social',    label: "Find the One — invite someone new to lunch",         points: 10, type: 'bonus' },
  { id: 'b4', week: 4, category: 'emotional', label: 'Fearless Week — bear testimony & journal it',        points: 10, type: 'bonus' },
];

export const ALL_HABITS = [...DAILY_HABITS, ...WEEKLY_CHALLENGES, ...BONUS_CHALLENGES];

export function getHabitById(id) {
  return ALL_HABITS.find(h => h.id === id);
}

export function getZoneById(id) {
  return ZONES.find(z => z.id === id);
}

export function getWeekNumber(dateStr, startStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const s = new Date(startStr + 'T12:00:00');
  const days = Math.floor((d - s) / 86400000);
  if (days < 0) return 1;
  return Math.min(Math.floor(days / 7) + 1, 4);
}

export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
