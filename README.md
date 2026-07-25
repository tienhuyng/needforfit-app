# Fithub App

Gym Management & Coaching Platform — Phase 1 POC (Auth)

## Structure

```
fitHub/
├── backend/     Express + TypeScript + Prisma + JWT + bcrypt
└── frontend/    React + Vite + Tailwind + Shadcn UI + React Hook Form + Zod
```

## Quick Start

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
