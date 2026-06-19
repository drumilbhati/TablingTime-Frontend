# TablingTime — Frontend

A university timetable scheduling and room management system built with React, TypeScript, and Vite.

## What it does

TablingTime is an admin-facing web app for managing a university's course schedule. It lets administrators build and maintain a conflict-free timetable, manage room assignments, handle student and faculty enrolments, and give professors a way to submit scheduling preferences.

Key capabilities:

- **Timetable viewer** — browse the full schedule by course, download as CSV
- **Manual scheduler** — drag-and-drop style interface to assign courses to time slots and rooms, with live conflict detection (student clashes, professor clashes, room double-booking)
- **AI-assisted scheduling** — trigger auto-scheduling with configurable conflict-override flags
- **Partial timetable upload** — seed the scheduler with an existing timetable via CSV
- **Room management** — see which rooms are vacant or occupied at any given slot
- **Enrolment management** — bulk-enrol students and faculty into courses via CSV or individually
- **Professor preferences** — let faculty submit preferred days, times, and courses; admins can review and clear preferences
- **Courses by school** — browse course listings grouped by school/department
- **Role-based access** — Google OAuth login; admin-only routes are protected, regular users can only view the timetable

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Auth | Google OAuth (`@react-oauth/google`) |
| UI primitives | Radix UI, shadcn/ui, Lucide icons |
| Notifications | Sonner |

## Prerequisites

- Node.js 20+
- A running TablingTime backend (default: `https://tablingtime-backend.onrender.com`)
- A Google OAuth client ID

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # or create .env manually
```

`.env`:
```
VITE_API_BASE_URL=https://tablingtime-backend.onrender.com
```

Replace the URL with your backend's address if self-hosting.

```bash
# 3. Start development server
npm run dev
# → http://localhost:5173
```

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
├── pages/
│   ├── TimetablePage.tsx         # Public timetable view
│   ├── ManualScheduler.tsx       # Admin scheduler with conflict detection
│   ├── EnrolmentPage.tsx         # Student/faculty enrolment management
│   ├── ProfessorPreferences.tsx  # Faculty scheduling preferences
│   ├── CoursesBySchool.tsx       # Course browser by department
│   ├── VacantRooms.tsx           # Room vacancy lookup
│   ├── OccupiedRooms.tsx         # Room occupancy view
│   └── Login.tsx
├── components/                   # Reusable UI components
├── context/                      # React context (Auth, Courses, Scheduling, Notifications)
├── services/
│   └── schedulingService.ts      # API calls for all scheduling operations
└── lib/                          # Utilities (colors, labels, slot helpers)
```

## CSV formats

Sample files are in `public/sample-csv/`. Key formats:

**Courses** (`courses-sample.csv`)
```
courseId,credits,courseSchool,courseType,numberOfSections
CS101,3,SEAS,CORE,2
```

**Rooms** (`rooms-sample.csv`)
```
roomNumber,building,type,capacity
101,Academic Block,Lecture,60
```

**Students** (`students-sample.csv`)
```
studentId,courseId,semester
student001,CS101,Fall 2025
```

**Faculty** (`faculty-sample.csv`)
```
professorId,courseId,semester
prof001,CS101,Fall 2025
```

**Partial timetable** (`partial-timetable-schedule-sample.csv`)
```
courseId,credits,faculty,room,building,day,startTime,endTime
CS101,3,prof001,101,Academic Block,Monday,09:00,10:30
```

## Deployment

### Vercel

The repo includes a `vercel.json` that proxies `/api/*` and `/auth/*` to the backend. Deploy directly to Vercel; no extra config needed beyond setting `VITE_API_BASE_URL` in Vercel's environment variables.

### Azure (CI/CD)

The `.github/workflows/deploy.yml` pipeline builds the app and deploys the `dist/` bundle to an Azure VM via SCP, then restarts the backend service that serves the static files. Required GitHub secrets:

| Secret | Description |
|---|---|
| `AZURE_VM_IP` | Public IP of the Azure VM |
| `AZURE_SSH_KEY` | SSH private key for `azureuser` |

## Authentication

Login is via Google OAuth. The `clientId` is set in `src/App.tsx`. Admin users get access to all routes; non-admin users are redirected to the public timetable view.
