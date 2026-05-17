# Church Management System (ChMS) — Project Specification

> **For Claude Code:** This document is the source of truth for the project. Read it fully before writing any code. When the user gives you ambiguous instructions later, refer back to this spec. If something here conflicts with a user instruction, ask the user which to follow rather than guessing.

---

## 1. Project Overview

Build a **multi-branch Church Management System (ChMS)** for a church network with multiple physical branches (campuses) under a central headquarters. The system must let HQ administrators see consolidated data across all branches, while branch-level staff only see their own branch's data.

### Primary users
- **Network/HQ admin** — sees all branches, manages global settings, runs cross-branch reports
- **Branch pastor / branch admin** — manages their branch only
- **Finance team** — branch-scoped finance access (no pastoral notes)
- **Small group / cell leader** — sees only their group's members
- **Member** — sees their own profile, gives, registers for events (mobile app primarily)

### Phased scope
Build in this order. Do not start a later phase until the earlier one is functional and reviewed by the user.

- **Phase 1 (MVP):** Auth, Users, Roles & Permissions, Branches, Members, Households, Attendance
- **Phase 2:** Finance — Tithes, Offerings, Pledges, Designated Funds, Receipts, Reports *(payment gateway integration deferred — model the data and admin entry forms, but skip MoMo/card integrations for now)*
- **Phase 3:** Events & Service Planning, Small Groups / Cells, Discipleship tracking
- **Phase 4:** Communications module *(deferred — model templates and audiences, but skip SMS/email provider integration for now)*
- **Phase 5:** Member-facing mobile app polish, push notifications, offline support

### Explicitly out of scope right now
- SMS provider integration (Hubtel, mNotify, Twilio) — design the abstraction layer, leave the adapter unimplemented
- Payment gateway integration (Paystack, Hubtel, MoMo direct) — design the abstraction layer, leave the adapter unimplemented
- Email provider integration — same approach
- Livestreaming / sermon media hosting
- Accounting export to external systems (QuickBooks etc.)

Build placeholder interfaces for the deferred integrations so plugging them in later is a small, contained change.

---

## 2. Tech Stack (fixed — do not substitute without asking)

### Backend
- **Python 3.12+**
- **Django 5.x** + **Django REST Framework**
- **PostgreSQL 16+**
- **Redis** (caching, Celery broker)
- **Celery** (background jobs — attendance rollups, report generation, future SMS/email queuing)
- **django-environ** for env vars
- **djangorestframework-simplejwt** for JWT auth
- **django-cors-headers** configured for Vercel preview URLs
- **drf-spectacular** for OpenAPI/Swagger docs
- **django-guardian** OR a custom RBAC layer (decide in Phase 1 — see Permissions section)

### Web frontend
- **Next.js 15+ (App Router)**
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui** components
- **TanStack Query** for server state
- **Zustand** for client state (only where needed)
- **react-hook-form** + **Zod** for forms and validation
- **axios** with interceptors for auth refresh

### Mobile (Phase 5)
- **React Native** with **Expo (SDK 51+)**
- Share types/API client with web where reasonable
- **expo-router** for navigation
- **expo-secure-store** for token storage

### Infra & deployment
- **Frontend (Next.js):** Vercel — main branch → production, PR previews automatic
- **Backend (Django):** Railway or Render (recommend Railway for simpler Postgres + Redis bundling). Document both options in `README.md`. Start with Railway in setup instructions.
- **Database:** Managed Postgres from the same provider as backend
- **Local dev:** Docker Compose (postgres + redis + backend + frontend); document `make` targets

### Repo structure (monorepo)
```
/
├── backend/                 # Django project
│   ├── chms/                # Django settings package
│   ├── apps/
│   │   ├── accounts/        # users, auth, roles
│   │   ├── branches/        # branches, branch membership
│   │   ├── members/         # members, households
│   │   ├── attendance/
│   │   ├── finance/         # giving, funds, pledges
│   │   ├── events/
│   │   ├── groups/          # small groups
│   │   ├── communications/  # templates, audiences (no provider yet)
│   │   └── core/            # shared utils, base models, permissions
│   ├── manage.py
│   ├── pyproject.toml
│   └── Dockerfile
├── web/                     # Next.js
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── mobile/                  # Expo (Phase 5 — create empty placeholder now)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PERMISSIONS.md
│   └── DEPLOYMENT.md
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 3. Multi-Branch Architecture (critical — get this right in Phase 1)

**Model:** Single database, shared schema, `branch_id` foreign key on every branch-scoped table. One Django project, one Postgres database, one deploy. HQ users get a special `is_network_admin` flag that bypasses branch scoping.

### Rules (enforce everywhere)
1. Every branch-scoped model inherits from `BranchScopedModel` (abstract base with `branch = ForeignKey(Branch, ...)` and a manager that auto-filters by the current user's branch).
2. Every DRF view uses a `BranchScopedViewSet` base that injects branch filtering into querysets and serializer validation.
3. Network admins (`is_network_admin=True`) bypass the filter and can pass `?branch=<id>` or `?branch=all` to scope reports.
4. A member can belong to **multiple branches** over time (people move, transfer). Model this as a join table `BranchMembership` with `joined_at`, `left_at`, `is_primary`. Never put `branch_id` directly on `Member`.
5. Use Postgres **row-level security (RLS)** as defense-in-depth. Application code is the primary enforcement; RLS is the safety net. Document the RLS policies in `docs/PERMISSIONS.md`.

### Branch model (minimum fields)
- `name`, `slug`, `code` (short code like "ACC01")
- `address`, `city`, `region`, `country` (default Ghana)
- `phone`, `email`
- `timezone` (default `Africa/Accra`)
- `currency` (default `GHS`)
- `is_active`
- `parent_branch` (nullable, for sub-branches under a regional HQ — keep simple, just one level of nesting)

---

## 4. Permissions & RBAC

Use a **role + scope** model. Don't hardcode permission checks against role names; check capabilities.

### Roles (seed these as fixtures)
- `network_admin` — all caps, all branches
- `branch_admin` — all branch-scoped caps for their branch
- `pastor` — pastoral caps (members, notes, attendance), no finance
- `finance` — finance caps for their branch only
- `group_leader` — limited member view (their group only)
- `member` — self-service only

### Capabilities (examples)
`members.view`, `members.create`, `members.edit_pastoral_notes`, `finance.view_giving`, `finance.record_giving`, `finance.view_reports`, `attendance.record`, `events.create`, etc.

### Implementation
- Create an `RBAC` app with `Role`, `Capability`, `RoleCapability`, `UserRoleAssignment` (user × role × branch).
- A user can hold different roles in different branches (e.g., `pastor` at Branch A, `member` at Branch B).
- Write a `has_capability(user, capability, branch=None)` helper used by every permission class.
- Custom DRF permission class `HasCapability("members.view")` that reads the requested branch from the request and checks scope.
- Sensitive fields (pastoral notes, counseling records) require a separate `members.view_sensitive` capability. Filter these fields out of serializers when the user lacks the cap.

---

## 5. Data Model (high-level — flesh out in `docs/DATA_MODEL.md`)

### Phase 1
- `User` (custom user model — **set this up in the very first migration**, never use the default)
  - email (login), phone, full_name, password, is_active, is_network_admin, last_login_branch
- `Branch` (see §3)
- `Role`, `Capability`, `RoleCapability`, `UserRoleAssignment`
- `Household` — groups members under one family unit (head_of_household, address, phone, branch_id via primary member)
- `Member` — extends `User` OR separate model linked to User if member has login (decide: I recommend separate `Member` model with optional `user` FK, since most members won't have logins on day one)
  - first_name, middle_name, last_name, gender, date_of_birth, marital_status, occupation, phone, email, address, photo, household, membership_status (visitor/regular/member/inactive), date_joined, baptism_date, baptism_status, notes, sensitive_notes
- `BranchMembership` — Member × Branch with joined_at, left_at, is_primary, transfer_reason
- `AttendanceEvent` — service or meeting where attendance was taken (date, branch, service_type, expected_count)
- `AttendanceRecord` — Member × AttendanceEvent (present, late, notes) + headcount fallback for unnamed visitors

### Phase 2 (Finance)
- `Fund` — branch-scoped (e.g., "General", "Building", "Missions", "Welfare") with `is_designated`
- `GivingCategory` — Tithe, Offering, Pledge Payment, Seed, Thanksgiving, etc.
- `Pledge` — Member, amount, fund, start_date, end_date, frequency, status
- `Contribution` — Member (nullable for anonymous cash), branch, fund, category, amount, currency, given_at, recorded_by, payment_method (cash/cheque/bank_transfer/mobile_money/card — store as enum even though we're not integrating providers yet), reference, pledge (nullable), receipt_number, notes
- `Receipt` — auto-generated, branch-prefixed sequential number, PDF generation deferred-but-stubbed
- `FinancialPeriod` — branch, year, month, locked_at (once locked, no edits)

Design Contribution as **append-only**. Corrections happen via reversal entries (negative amounts linked to the original), never updates. Treasurers need an audit trail.

### Phase 3
- `Event`, `EventRegistration`, `EventVolunteer`
- `ServicePlan` — date, branch, order of service items, assigned worship team
- `Group` (cell/small group) — leader, branch, meeting_day, meeting_location
- `GroupMembership` — Member × Group
- `DiscipleshipPath` — defined steps (e.g., "New Believers → Foundations → Membership Class → Baptism → Leadership")
- `MemberDiscipleshipProgress`

### Phase 4 (stubs only)
- `MessageTemplate`, `Audience` (saved member queries), `MessageCampaign` (status, scheduled_at, sent_at), `MessageLog`
- Abstract `MessageProvider` interface with no real implementations — just a `ConsoleProvider` that prints to logs for dev

---

## 6. API Conventions

- **Base URL:** `/api/v1/`
- **Auth:** JWT (access 15min, refresh 7 days). Refresh rotation enabled. Tokens carry `user_id` and `default_branch_id`.
- **Branch scoping in requests:** clients send `X-Branch-Id` header. Server validates user has access to that branch. If header omitted and user is single-branch, infer; if network admin, return 400 demanding explicit branch (except for cross-branch report endpoints).
- **Response format:** DRF default. Use `drf-spectacular` to keep OpenAPI schema generated at `/api/schema/` and Swagger UI at `/api/docs/`.
- **Pagination:** cursor-based for large lists (members, contributions). Page size default 25, max 100.
- **Errors:** consistent shape `{ "detail": "...", "code": "...", "field_errors": {...} }`.
- **Filtering:** `django-filter` on every list endpoint. Document filter params in OpenAPI.
- **Soft delete:** every model gets `deleted_at` (nullable). Default manager excludes soft-deleted. Provide `all_objects` manager for admin. No hard deletes except via Django admin by superusers.
- **Audit log:** every write to Member, Contribution, Pledge, UserRoleAssignment goes to an `AuditLog` table (actor, action, object, before/after JSON, timestamp, ip).

---

## 7. Frontend Conventions (Next.js)

- App Router, server components by default, `"use client"` only when needed (forms, interactive widgets).
- Auth: HTTP-only cookies for refresh tokens, access token in memory. Middleware redirects unauthenticated users.
- Layout: protected `/dashboard/*` routes behind auth, public `/login`, `/reset-password`.
- Branch switcher in the top nav — network admins see "All branches" + each branch; branch users see only theirs (locked).
- shadcn/ui for all UI primitives. Don't hand-roll modals, dropdowns, etc.
- Forms: react-hook-form + Zod schemas that mirror backend serializer validation. Share Zod schemas in a `lib/schemas/` folder so they're reusable.
- Data fetching: TanStack Query everywhere; never `useEffect(fetch)`.
- API client: single `lib/api.ts` axios instance with auth interceptors. Generate TypeScript types from OpenAPI schema (`openapi-typescript`) and check the generated file into the repo.
- Theme: light + dark mode from day one (shadcn supports this natively).
- Accessibility: every interactive element keyboard-reachable; respect `prefers-reduced-motion`; semantic HTML.

---

## 8. Environment & Configuration

### Backend `.env` (document in `backend/.env.example`)
```
DJANGO_SECRET_KEY=
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://...
REDIS_URL=redis://...
CORS_ALLOWED_ORIGINS=http://localhost:3000
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$
JWT_ACCESS_LIFETIME_MINUTES=15
JWT_REFRESH_LIFETIME_DAYS=7
DEFAULT_TIMEZONE=Africa/Accra
DEFAULT_CURRENCY=GHS
# Deferred — leave blank
SMS_PROVIDER=console
EMAIL_PROVIDER=console
PAYMENT_PROVIDER=console
```

### Frontend `.env.local` (document in `web/.env.example`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Church Management System
```

For Vercel: set `NEXT_PUBLIC_API_URL` per environment (Preview → staging backend URL, Production → prod backend URL).

### CORS for Vercel previews
Backend must allow:
- `http://localhost:3000` (local dev)
- The fixed production domain
- The regex `^https://.*\.vercel\.app$` for all preview URLs

---

## 9. Testing

- **Backend:** pytest + pytest-django. Aim for >80% coverage on apps/finance and apps/accounts (the high-risk areas). Factory Boy for fixtures. Every permission rule must have a test that proves a wrong-branch / wrong-role user is denied.
- **Frontend:** Vitest for units, Playwright for critical user flows (login, record attendance, record a contribution, run a report). Don't over-invest in component tests for shadcn primitives.
- **CI:** GitHub Actions running backend tests, frontend tests, lint, typecheck on every PR. Fail the build on lint/type errors.

---

## 10. Security baseline (non-negotiable)

- Passwords: Django default Argon2 hasher
- Rate limiting on `/auth/login` and `/auth/password-reset` (django-ratelimit)
- HTTPS-only in production (`SECURE_SSL_REDIRECT=True`, HSTS)
- Sensitive fields encrypted at rest: `Member.sensitive_notes`, anything tagged pastoral/counseling. Use `django-cryptography` or pgcrypto.
- All write endpoints require auth. All read endpoints scoped by branch. No exceptions.
- Audit log every privileged action (role assignment, finance write, member sensitive-note edit).
- Ghana's Data Protection Act applies. Document in `docs/PRIVACY.md` what data we store, why, retention period, and how a member can request deletion.

---

## 11. How to work with me (Claude Code instructions)

When the user asks you to build something, follow this loop:

1. **Restate the task** in one or two sentences. If anything in the spec is ambiguous for this task, ask before coding.
2. **Show a plan** — files you'll touch, models you'll add, migrations needed. Wait for "go" on non-trivial changes.
3. **Implement in small commits.** One logical change per commit. Conventional commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
4. **Write tests alongside the code**, not after. For every new model, at least one creation test and one permission test. For every endpoint, a happy path test and a forbidden-access test.
5. **Run the tests and lint** before declaring done. If they fail, fix them; don't ask the user to.
6. **Update the relevant doc** in `/docs` if architecture, data model, or permissions changed.
7. **Stop and ask** at phase boundaries. Don't roll from Phase 1 into Phase 2 on your own.

### House rules
- **Migrations:** every model change → migration in the same commit. Never leave the project with un-migrated changes. Name migrations descriptively (`0007_add_pledge_frequency.py`).
- **Don't invent features** that aren't in this spec. If you think something is needed, propose it first.
- **Don't install new dependencies** without flagging them. List the package, why it's needed, and the alternative considered.
- **Don't refactor existing code while adding new code** unless the user asked. Open a separate task for refactors.
- **Strings, dates, money:** money is `Decimal`, never float. Dates store timezone-aware. Currencies use ISO codes. Never assume USD — default is GHS.
- **Internationalisation:** wrap all user-facing strings in `gettext_lazy` on the backend and use `next-intl` on the frontend, even though we're launching in English. Don't bake in translations yet; just keep the door open.
- **Comments:** explain *why*, not *what*. Self-documenting code preferred. No commented-out code committed.
- **Secrets:** never commit `.env`. `.env.example` only. If you spot a secret in a diff, stop and warn the user.

### Definition of done for a feature
- [ ] Models + migrations
- [ ] Serializers with validation matching frontend Zod schemas
- [ ] Permission class enforcing branch scope and capability
- [ ] DRF viewset with filtering, pagination, OpenAPI docs
- [ ] Tests (happy path + permission denial + edge case)
- [ ] Frontend page/component using TanStack Query + react-hook-form
- [ ] Loading / error / empty states designed (not just "Loading...")
- [ ] Updated `docs/DATA_MODEL.md` if schema changed
- [ ] Lint + typecheck + tests pass
- [ ] Manual smoke test by the user

---

## 12. First task

Once the user gives the go-ahead:

1. Initialise the monorepo structure described in §2.
2. Set up `backend/` with Django, the custom User model, Postgres connection via `DATABASE_URL`, DRF, JWT auth, drf-spectacular, CORS, and a health check endpoint at `/api/v1/health/`.
3. Set up `web/` with Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui initialised), a `/login` page (UI only, not wired yet), and a `/dashboard` placeholder behind a fake auth check.
4. Set up `docker-compose.yml` for postgres + redis + backend, and a `Makefile` with `make up`, `make migrate`, `make test`, `make seed`.
5. Write the initial `README.md` with setup instructions for both local dev and a Vercel + Railway deployment.
6. Commit and stop. Show the user how to run it locally and how to point a Vercel preview at a Railway-hosted backend.

Then wait for the user to confirm before moving to the RBAC + Branches + Members work that completes Phase 1.

---

*End of spec. Refer back to this file whenever you're unsure.*
