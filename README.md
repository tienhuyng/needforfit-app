# Fithub App

Gym Management & Coaching Platform — Phase 1 POC (Auth)

## Structure

```
fitHub/
├── backend/     Express + TypeScript + Prisma + JWT + bcrypt
└── frontend/    React + Vite + Tailwind + Shadcn UI + React Hook Form + Zod
```

## Quick Start

### New machine (Mac / Windows)

```bash
git clone https://github.com/tienhuyng/fithub-app.git
cd fithub-app

# Install backend + frontend dependencies
npm run setup

# First time on a NEW machine only — temp/ is not in git
npm run clone:template

# Backend env (first time only)
cp backend/.env.example backend/.env   # Mac / Linux
# copy backend\.env.example backend\.env   # Windows CMD
# Copy-Item backend\.env.example backend\.env   # Windows PowerShell

cd backend
npm run prisma:generate
npx prisma db push    # create tables (PostgreSQL must be running)
```

### Vercel template reference (`temp/`)

The Vercel admin template is **not committed** (see `.gitignore`). On a **new machine** (MacBook, PC công ty), run once:

```bash
npm run clone:template
```

On a machine that **already has** `temp/vercel-template/`, skip this — only re-run when you want to refresh the reference for Phase 2+.

| Path | Contents |
|------|----------|
| `temp/vercel-template/components/ui/` | Shadcn primitives (Table, Sheet, Badge, …) |
| `temp/vercel-template/app/` | Page layout examples (dashboard, login) |

Extract → adapt for Vite SPA (remove Next.js imports) → place in `frontend/src/components/ui/`.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run dev        # http://localhost:3001
npm test           # Jest tests
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest tests
```

## Auth Features

### Backend API (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with email, password, role |
| POST | `/login` | Login and receive JWT |
| POST | `/forgot-password` | Request password reset link |
| POST | `/reset-password` | Reset password with token |

All endpoints support i18n via `Accept-Language` header (vi, en, zh, ja, es).

### Frontend Screens

- `/login` — AUTH-001
- `/register` — AUTH-002
- `/forgot-password` — AUTH-003
- `/reset-password?token=...&email=...` — AUTH-004

## Tech Stack

See `06_CODE_GENERATION_INPUT_PACKAGE.md` for full specifications.

### Frontend UI (locked)

**Design system:** [Shadcn UI](https://ui.shadcn.com) extracted from the [Vercel admin template](https://github.com/vercel/nextjs-postgres-nextauth-tailwindcss-template).

```
frontend/src/
├── components/ui/        # Shadcn primitives (Button, Input, Card, Label, …)
├── components/template/  # Thin wrappers for forms (loading, label+error)
├── components/pt/        # PT-specific layouts (Sidebar, Table, …) — upcoming
└── components/trainee/   # Mobile-first overrides — upcoming
```

- **PT screens:** use Shadcn components as-is (desktop-first dashboard style).
- **Trainee screens:** same primitives, override sizing/spacing for mobile.
- **Do not** add new custom Tailwind-only base components; extend Shadcn instead.
- New components: extract from Vercel template → adapt for Vite SPA (remove Next.js deps).
