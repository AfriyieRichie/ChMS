# Church Management System (ChMS)

A multi-branch church management platform for church networks with multiple campuses.

**Backend:** Django 5 · DRF · PostgreSQL 16 · Redis · Celery  
**Frontend:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui  
**Mobile:** React Native + Expo (Phase 5)

---

## Quick start (local dev)

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker Desktop | 4.x |
| Node.js | 20 LTS |
| npm | 10+ |

You do **not** need Python installed locally — the backend runs entirely inside Docker.

### 1. Clone and configure

```bash
git clone <your-repo-url> chms
cd chms
```

Copy and edit the backend env file:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — the default values work for local Docker dev as-is.
# Only change DJANGO_SECRET_KEY to a real random value.
```

Generate a secret key:

```bash
# If you have Python locally:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Or use any 50-character random string.
```

### 2. Start services

```bash
make up        # starts postgres, redis, backend (detached)
make migrate   # runs all Django migrations
make seed      # loads initial fixture data (roles, capabilities)
```

The API is now at **http://localhost:8000**

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health/` | Health check — no auth required |
| `POST /api/v1/auth/token/` | Obtain JWT tokens |
| `POST /api/v1/auth/token/refresh/` | Refresh access token |
| `GET /api/docs/` | Swagger UI |
| `GET /api/schema/` | Raw OpenAPI schema |

### 3. Start the frontend

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

The web app is at **http://localhost:3000**

### 4. Create the first admin user

```bash
make createsuperuser
# Follow the prompts: enter email, full_name, password
```

### 5. Useful make targets

```bash
make test            # run pytest suite
make lint            # run ruff linter
make makemigrations  # generate migrations after model changes
make logs            # tail backend container logs
make shell           # Django shell inside container
make down            # stop all containers
```

---

## Deployment (100% free tier)

| Service | Provider | What it costs |
|---------|----------|--------------|
| Django API | [Render](https://render.com) | Free — sleeps after 15 min inactivity |
| PostgreSQL | [Neon](https://neon.tech) | Free — 0.5 GB, no expiry |
| Redis | [Upstash](https://upstash.com) | Free — 10k commands/day |
| Frontend | [Vercel](https://vercel.com) | Free hobby plan |

> The Render free service has a ~30 s cold-start when it wakes up after sleeping.
> That's fine for dev/staging. See `docs/DEPLOYMENT.md` for upgrade options.

### Step 1 — Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech) → create project `chms`.
2. Copy the **Connection string** → you'll paste it as `DATABASE_URL` in Render.

### Step 2 — Upstash (Redis)

1. Sign up at [upstash.com](https://upstash.com) → **Create database** → pick a region.
2. Copy the **Redis URL** → you'll paste it as `REDIS_URL` in Render.

### Step 3 — Render (Django backend)

1. Sign up at [render.com](https://render.com) → **New → Web Service**.
2. Connect `AfriyieRichie/ChMS`; set **Root Directory** to `backend`.
3. Render auto-detects the `Dockerfile`.
4. Add these environment variables:

   | Variable | Value |
   |----------|-------|
   | `DJANGO_SECRET_KEY` | any 50-char random string |
   | `DJANGO_DEBUG` | `False` |
   | `DJANGO_ALLOWED_HOSTS` | `your-app.onrender.com` |
   | `DATABASE_URL` | paste from Neon |
   | `REDIS_URL` | paste from Upstash |
   | `CORS_ALLOWED_ORIGINS` | your Vercel production URL |
   | `DJANGO_SETTINGS_MODULE` | `chms.settings.production` |

5. After the first deploy, open Render's **Shell** tab:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

### Step 4 — Vercel (Next.js frontend)

1. Import `AfriyieRichie/ChMS` into Vercel; set **Root Directory** to `web`.
2. Add environment variables:

   | Variable | Scope | Value |
   |----------|-------|-------|
   | `NEXT_PUBLIC_API_URL` | Production | `https://your-app.onrender.com/api/v1` |
   | `NEXT_PUBLIC_API_URL` | Preview | same Render URL |

3. Vercel auto-deploys on push to `main` and on every PR.

### Pointing Vercel previews at Render

No extra config needed — the backend already allows `^https://.*\.vercel\.app$`, so every preview URL is covered automatically.

---

## Project structure

```
/
├── backend/                 # Django project
│   ├── chms/                # Settings, urls, wsgi/asgi
│   ├── apps/
│   │   ├── core/            # Abstract base models, health check, exception handler
│   │   ├── accounts/        # Custom User model, JWT auth
│   │   ├── branches/        # Branch model (Phase 1)
│   │   ├── members/         # Members, Households (Phase 1)
│   │   ├── attendance/      # Attendance events & records (Phase 1)
│   │   ├── finance/         # Giving, funds, pledges (Phase 2)
│   │   ├── events/          # Events & service planning (Phase 3)
│   │   ├── groups/          # Small groups / cells (Phase 3)
│   │   └── communications/  # Message templates, audiences (Phase 4 stub)
│   ├── manage.py
│   ├── pyproject.toml
│   └── Dockerfile
├── web/                     # Next.js 15 frontend
├── mobile/                  # Expo (Phase 5 placeholder)
├── docs/                    # Architecture, data model, permissions, deployment
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Development workflow

1. Model change → edit `apps/<app>/models.py` → `make makemigrations` → `make migrate`
2. New endpoint → add viewset + serializer + URLs → update OpenAPI by visiting `/api/docs/`
3. Tests → `make test` (must pass before PR)
4. Lint → `make lint` (enforced in CI)

See `docs/ARCHITECTURE.md` for deeper architectural decisions.
