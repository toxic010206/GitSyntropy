# GitSyntropy Monorepo

This repository is structured for iterative backend + frontend delivery.

## Structure

- `apps/backend` - FastAPI service
- `apps/frontend` - Astro + React frontend
- `design.md` - unified UI governance and drift control
- `docs` - iteration and operational notes

## Local setup

### Backend

1. `cd apps/backend`
2. `python -m venv .venv`
3. `.venv\\Scripts\\activate`
4. `pip install -e .[dev]`
5. `uvicorn app.main:app --reload --port 8000`

### Frontend

1. `cd apps/frontend`
2. `npm install`
3. `npm run dev`

Frontend expects backend at `http://localhost:8000` by default.
