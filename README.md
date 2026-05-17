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

## Deployment

### Railway (backend) + Vercel (frontend)

#### Backend on Railway

1. Create a new Railway project.
2. Add a **PostgreSQL** plugin — Railway provisions the database automatically.
3. Add a **Redis** plugin.
4. Connect your GitHub repo and set the **Root Directory** to `backend/`.
5. Set these environment variables in Railway's dashboard:

   | Variable | Value |
   |----------|-------|
   | `DJANGO_SECRET_KEY` | a strong random key |
   | `DJANGO_DEBUG` | `False` |
   | `DJANGO_ALLOWED_HOSTS` | `your-app.railway.app` |
   | `DATABASE_URL` | auto-filled by Railway Postgres plugin |
   | `REDIS_URL` | auto-filled by Railway Redis plugin |
   | `CORS_ALLOWED_ORIGINS` | your Vercel production URL |
   | `DJANGO_SETTINGS_MODULE` | `chms.settings.production` |

6. Railway detects the `Dockerfile` automatically and builds it.
7. After the first deploy, run the initial migration via the Railway shell:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

#### Frontend on Vercel

1. Import the GitHub repo into Vercel.
2. Set the **Root Directory** to `web/`.
3. Add environment variables:

   | Variable | Scope |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` (production) | `https://your-app.railway.app/api/v1` |
   | `NEXT_PUBLIC_API_URL` (preview) | `https://your-staging-app.railway.app/api/v1` |

4. Vercel auto-deploys on every push to `main` (production) and every PR (preview).

#### Pointing a Vercel preview at a Railway backend

Vercel preview URLs follow the pattern `https://<project>-<hash>.vercel.app`. The backend's `CORS_ALLOWED_ORIGIN_REGEXES` already includes `^https://.*\.vercel\.app$`, so **no extra CORS config is needed** for previews.

For the API URL, set `NEXT_PUBLIC_API_URL` in Vercel's **Preview** environment to your Railway staging backend URL. Each preview deploy picks this up automatically.

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
