# Mission Possible — Battle of the Zones

A mobile-first habit tracker for a 4-week youth program. Built to feel like Duolingo meets Apple Fitness — fast, gamified, and zero-clunky.

## Tech Stack

| Layer      | Choice         | Why                                          |
|------------|----------------|----------------------------------------------|
| Hosting    | Netlify        | Free, instant deploy from GitHub             |
| Database   | Supabase       | Free tier, real-time, no backend code needed |
| Frontend   | Vanilla JS     | No build step, ES modules, fast              |
| Fonts      | Syne + Inter   | Bold modern headings, clean body             |

---

## Setup (15 minutes)

### 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it "Mission Possible", choose a region close to you
3. Wait ~2 min for provisioning

### 2 — Run the Schema

1. In Supabase → **SQL Editor** → **New Query**
2. Paste the full contents of `schema.sql`
3. Click **Run**

You should see 5 zones seeded automatically.

### 3 — Add Your Credentials

Open `js/config.js` and replace the placeholder values:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';      // Project Settings → API
export const SUPABASE_ANON_KEY = 'eyJ...';                   // Project Settings → API → anon/public
export const PROGRAM_START = '2026-03-24';                   // Monday your program starts
export const ADMIN_CODE = 'change-me';                       // Your admin passcode
```

### 4 — Deploy to Netlify

**Option A — Drag & Drop (fastest)**
1. Zip your project folder
2. Go to [netlify.com](https://netlify.com) → drag the zip onto the dashboard

**Option B — GitHub (recommended)**
1. Push to a GitHub repo
2. Netlify → **Add new site** → **Import from Git** → connect repo → Deploy

No build command needed. Publish directory: `.` (root)

---

## Customizing

### Rename Zones
Edit the `insert` block in `schema.sql` (re-run in SQL Editor if needed), and update `ZONES` in `js/data.js`.

### Change Program Duration
Adjust `getWeekNumber()` in `js/data.js` — currently returns 1–4. Change the `Math.min(..., 4)` to support more weeks.

### Add Habits
Add entries to `DAILY_HABITS`, `WEEKLY_CHALLENGES`, or `BONUS_CHALLENGES` in `js/data.js`. IDs must be unique strings.

---

## Admin Panel

Tap your **profile avatar 5 times** → enter passcode (set in `config.js`).

Admin panel lets you:
- Change any user's zone
- Delete users (cascades to their entries)
- Delete individual entries
- Export all data as JSON

---

## Program Structure

| Type            | Points | Details                               |
|-----------------|--------|---------------------------------------|
| Daily Habits    | 1 pt   | 9 habits across 4 categories/day      |
| Weekly Challenges| 5 pts | 1 per category, completable any day this week |
| Bonus Challenge | 10 pts | 1 per week, rotates by category       |

**Max possible points per week:**
- Daily: 9 pts/day × 7 days = 63 pts
- Weekly challenges: 4 × 5 = 20 pts
- Bonus: 10 pts
- **Total per week: 93 pts · Grand total over 4 weeks: 372 pts**

---

## Gamification Ideas (Next Level)

- **Streak Freezes** — earn 1 freeze per 7-day streak; burns automatically on a missed day
- **Zone Boosts** — leader gets a 1.1× multiplier for week 3 to keep it competitive
- **Badges** — "First Blood" (first entry), "Perfect Week", "Combo Master" (all 9 daily in one day)
- **Testimonial Wall** — let users post a short win after completing a challenge
- **Push Notifications** — use Netlify Functions + Web Push API to send evening reminders
- **End-of-Week Recap** — auto-calculate and display each person's best week

---

## File Structure

```
/
├── index.html          App shell + all view markup
├── styles.css          All styling (dark, gamified)
├── netlify.toml        Netlify deploy config
├── schema.sql          Supabase DB setup — run once
├── README.md           This file
└── js/
    ├── config.js       ← YOU FILL THIS IN
    ├── data.js         Habits, zones, categories (static)
    ├── db.js           Supabase client + all DB operations
    └── app.js          App state, routing, all UI logic
```
