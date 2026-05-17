# Deployment

See `README.md` for the step-by-step guide.

## Environments

| Environment | Backend | Frontend |
|-------------|---------|----------|
| Local dev | Docker Compose | `npm run dev` (localhost:3000) |
| Staging | Render (free) | Vercel Preview |
| Production | Render (free) | Vercel Production |

## Free-tier stack (recommended)

| Service | Provider | Free limits |
|---------|----------|-------------|
| Django web service | [Render](https://render.com) | 750 hrs/month; sleeps after 15 min inactivity (~30s cold start) |
| PostgreSQL | [Neon](https://neon.tech) | 0.5 GB storage, scales to zero — no 90-day expiry |
| Redis | [Upstash](https://upstash.com) | 10 000 commands/day, 256 MB — enough for Celery + caching |
| Frontend | [Vercel](https://vercel.com) | Unlimited hobby deploys |

> **Cold starts:** Render's free web service spins down after 15 min of no traffic.
> The first request after sleeping takes ~30 s. Acceptable for development/staging;
> upgrade to a paid instance ($7/month) for production if you need instant responses.

## Render (backend)

### 1. Provision the database — Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project named `chms`.
2. Copy the **Connection string** (starts with `postgres://...`). You will use this as `DATABASE_URL`.

### 2. Provision Redis — Upstash

1. Sign up at [upstash.com](https://upstash.com) → **Create database** → choose a region.
2. Copy the **Redis URL** (starts with `rediss://...`). You will use this as `REDIS_URL`.

### 3. Deploy on Render

1. Sign up at [render.com](https://render.com) → **New → Web Service**.
2. Connect your GitHub repo (`AfriyieRichie/ChMS`).
3. Set **Root Directory** to `backend`.
4. Render detects the `Dockerfile` automatically.
5. Set these environment variables in the Render dashboard:

   | Variable | Value |
   |----------|-------|
   | `DJANGO_SECRET_KEY` | a strong random key |
   | `DJANGO_DEBUG` | `False` |
   | `DJANGO_ALLOWED_HOSTS` | `your-app.onrender.com` |
   | `DATABASE_URL` | paste from Neon |
   | `REDIS_URL` | paste from Upstash |
   | `CORS_ALLOWED_ORIGINS` | your Vercel production URL (e.g. `https://chms.vercel.app`) |
   | `DJANGO_SETTINGS_MODULE` | `chms.settings.production` |

6. After the first deploy succeeds, open the Render **Shell** tab and run:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

### 4. Celery worker (optional — needed for background jobs)

Add a second Render service (**Background Worker** type), same repo/root directory, same env vars, with the start command:

```
celery -A chms worker -l info
```

## Vercel (frontend)

1. Import `AfriyieRichie/ChMS` into Vercel.
2. Set the **Root Directory** to `web`.
3. Add environment variables:

   | Variable | Scope | Value |
   |----------|-------|-------|
   | `NEXT_PUBLIC_API_URL` | Production | `https://your-app.onrender.com/api/v1` |
   | `NEXT_PUBLIC_API_URL` | Preview | same Render URL (or a separate staging service) |

4. Auto-deploys on push to `main` (production) and every PR (preview).

## CORS for Vercel previews

The backend regex `^https://.*\.vercel\.app$` covers all preview URLs automatically. No per-PR config needed.
