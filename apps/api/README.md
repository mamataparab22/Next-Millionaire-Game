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

## 🤖 Optional: Google Gemini integration

The API can generate questions using Google Gemini when environment variables are set. On any provider error, it falls back to a built-in deterministic generator.

Windows PowerShell:

```powershell
$env:LLM_PROVIDER = 'gemini'
$env:GEMINI_API_KEY = '<your key>'
# optional (default: gemini-1.5-flash)
$env:GEMINI_MODEL = 'gemini-1.5-flash'

api-dev
```

Health check shows status:

```
GET /health -> { ok: true, llm: { provider: "gemini", enabled: true } }
```
