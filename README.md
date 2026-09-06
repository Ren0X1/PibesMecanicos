# 🔧 Pibes Mecánicos

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black) ![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white) ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-222222?style=flat-square&logo=githubpages&logoColor=white)

> The lads' garage — a web app to keep track of your vehicles' maintenance together with your mates.

**Never miss a service, an MOT or an oil change again.** Responsive web app (installable as a PWA on iPhone and Android) to log and follow the maintenance of cars and bikes: services, MOT/ITV, fuel-ups with real consumption, expenses, spare parts, pending jobs and a lot more. Built for a group of friends who share what they know about their vehicles. 🚗🏍️

---

## ✨ Features

### 🚗 Vehicles
- Cars and bikes, with fuel type and transmission.
- Current mileage and mileage history.
- Maintenance items filtered by vehicle and fuel type (no spark plugs on a diesel, glow plugs only on diesel, chain and sprocket kit only on bikes, and so on).
- Over 18 maintenance types with intervals by mileage **and** by months. You can log by mileage only, by date only, or both.
- Spare parts with part number and a link to buy them.
- **MOT / ITV** with the result (pass / advisory / fail), defects, expiry date and warnings before it runs out.
- **Fuel-ups** with per-tank consumption, driving mode (city / mixed / motorway) and average consumption.
- **Expenses** with monthly and per-category charts, plus cost per kilometre.
- **To-do list** per vehicle with priority (low / medium / high).

### 📊 Overview
- Aggregated stats across all your vehicles: total spend, maintenance, fuel, total kilometres.
- Expense table per vehicle with cost/km.
- Monthly spending charts and distribution per vehicle.

### 🔔 Reminders and notifications
- Personal reminders with a date and an optional vehicle (insurance, MOTs, purchases…).
- Notification centre with overdue and upcoming maintenance, MOTs about to expire, reminders and group invites. Updates instantly.

### 👥 Groups
- Users **request** a group; an admin approves it.
- Whoever created it becomes the **group admin** and can **invite** others.
- Invited people **choose** whether to join.
- Group chat and a read-only viewer for the members' vehicles.

### 🔧 Workshops
- Shared directory of garages with rating, speciality and phone number.
- Direct **call** and **WhatsApp** buttons.

### 🛡️ Admin panel
- User management split into **administrators** and **users**.
- Create, edit (name, username, role) and delete users.
- **Reset a PIN** directly, or force a PIN change.
- Approve / reject group requests.
- Global stats with charts.

### 📄 Export
- Polished **PDF** with a cover page, KPIs, general status and detailed sections.
- Styled **Excel** (one sheet per section, colours, totals, number formats).

### 🎨 Other
- **Dark** theme (default) and **light** theme, with a toggle.
- Spanish UI, dates in DD/MM/YYYY.
- Login with username + PIN and progressive lockout after failed attempts.
- **Mobile-first** design with bottom navigation on phones.

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Icons | lucide-react |
| Charts | recharts |
| PDF | jspdf + jspdf-autotable |
| Excel | exceljs |
| Database | Supabase (PostgreSQL) |
| Hosting | GitHub Pages (auto-deployed with GitHub Actions) |

---

## 🚀 Getting started

### 1. Database (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of `supabase/schema-completo.sql`. It is idempotent: it creates every table, index, policy and permission, along with a default admin user (`admin` / `1234`).
3. In **Project Settings → API**, copy the `URL` and the `anon key`.

### 2. Environment variables
On GitHub, go to **Settings → Secrets and variables → Actions** and create:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For local development, create a `.env` file in the root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Local development
```bash
npm install
npm run dev
```

### 4. Deployment
Every push to the `master` branch deploys automatically to GitHub Pages through the workflow in `.github/workflows/`.

---

## 🗄️ Database migrations

`supabase/schema-completo.sql` holds the complete, up-to-date schema. For incremental changes on an existing database there are individual migrations inside `supabase/` that you can run in the SQL Editor.

> ℹ️ **Supabase note (Oct 2026):** from 30/10/2026 Supabase no longer exposes new tables to the API automatically. The schema already includes the explicit `GRANT`s and default privileges needed, so tables you create stay reachable. If in doubt, run `supabase/migration-grants.sql`.

---

## 🔐 Default access

- **User:** `admin`
- **PIN:** `1234`

> ⚠️ Change the admin PIN the first time you log in.

---

## 📁 Project layout

```
src/
  App.jsx                 # View routing, theme, PIN change
  lib/
    supabase.js           # Every database function
    theme.js              # Reactive dark/light theme
    constants.js          # Maintenance types, date helpers
    pdfExport.js          # PDF export
    excelExport.js        # Excel export
    useIsMobile.js        # Responsive hook
  components/
    Login.jsx             # Login + lockout on failed attempts
    Nav.jsx               # Navigation (top on desktop, bottom on mobile)
    Dashboard.jsx         # Vehicle list
    CarDetail.jsx         # Vehicle detail with tabs
    UserStats.jsx         # Global overview
    Reminders.jsx         # Personal reminders
    Groups.jsx            # Groups, invites and chat
    Workshops.jsx         # Garage directory
    AdminPanel.jsx        # Admin panel
    NotificationCenter.jsx# Notification centre
    ...
supabase/
  schema-completo.sql     # Full schema (run this first)
  migration-*.sql         # Incremental migrations
```

---

Made with 🔧 and 🍺 for los pibes.
