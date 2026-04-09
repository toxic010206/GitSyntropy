# GitSyntropy Backend

## Run locally

1. `python -m venv .venv`
2. `.venv\\Scripts\\activate`
3. `pip install -e .[dev]`
4. `uvicorn app.main:app --reload --port 8000`

## Test

- `pytest`

## API root

- `http://localhost:8000/api/v1/health`
