# Millionaire API (Python / FastAPI)

Local development:

- Ensure Python 3.10+
- From apps/api:

```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
api-dev
```

This starts FastAPI on http://localhost:5177 with reload.

Endpoints:
- GET /health -> { ok: true }
- GET /categories -> { categories: string[] }
- POST /questions { categories?: string[], count?: number } -> { questions: Question[] }
