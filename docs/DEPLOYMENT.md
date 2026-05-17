# Deployment

See `README.md` for the step-by-step guide.

## Environments

| Environment | Backend | Frontend |
|-------------|---------|----------|
| Local dev | Docker Compose | `npm run dev` (localhost:3000) |
| Staging | Railway (separate service) | Vercel Preview |
| Production | Railway | Vercel Production |

## Railway (backend)

1. Connect GitHub repo; set root directory to `backend/`.
2. Railway detects the `Dockerfile` and builds automatically.
3. Add Postgres and Redis plugins — connection URLs are injected automatically.
4. Set env vars: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DJANGO_SETTINGS_MODULE=chms.settings.production`.
5. After first deploy: run `python manage.py migrate` and `python manage.py createsuperuser` from the Railway shell.

## Vercel (frontend)

1. Import repo; set root directory to `web/`.
2. Set `NEXT_PUBLIC_API_URL` per environment scope.
3. Auto-deploys on push to `main` (production) and any PR (preview).

## CORS for Vercel previews

The backend regex `^https://.*\.vercel\.app$` covers all preview URLs. No per-PR config needed.

## Celery workers

On Railway, add a second service pointing to the same repo/Dockerfile with the start command:
```
celery -A chms worker -l info
```
This service shares the same env vars (same Redis URL as broker).
