# Runbook

## Iteration order

1. Core skeleton and mock vertical flow
2. Auth contract
3. GitHub sync MVP
4. Assessment flow
5. Compatibility engine
6. LangGraph-style orchestration and streaming
7. Synthesis output page

## Backend endpoints included

- `GET /api/v1/health`
- `POST /api/v1/analysis/mock`
- `GET /api/v1/auth/github/start`
- `GET /api/v1/auth/github/callback`
- `POST /api/v1/auth/login`
- `POST /api/v1/github/sync`
- `GET /api/v1/assessment/questions`
- `POST /api/v1/assessment/submit`
- `POST /api/v1/compatibility/run`
- `POST /api/v1/orchestrator/run`
- `GET /api/v1/insights/synthesis`
- `WS /ws/analysis/{run_id}`

## Frontend routes included

- `/`
- `/auth`
- `/dashboard`
- `/assessment`
- `/workspace`
- `/insights`
