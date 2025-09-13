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

## 🤖 Default: OpenAI integration

By default the API uses OpenAI (or OpenAI-compatible) providers. Set your key and optionally override the model or base URL.

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY = '<your key>'
# optional
$env:OPENAI_MODEL = 'gpt-4o-mini'
$env:OPENAI_BASE_URL = 'https://api.openai.com'

api-dev
```

Health check shows status:

```
GET /health -> { ok: true, llm: { provider: "openai", enabled: true } }
```



## 🤖 Optional: OpenAI (or compatible) integration

You can switch the provider to OpenAI. The API uses the Chat Completions endpoint and requests JSON output.

Windows PowerShell:

```powershell
$env:LLM_PROVIDER = 'openai'
$env:OPENAI_API_KEY = '<your key>'
# optional (default: gpt-4o-mini)
$env:OPENAI_MODEL = 'gpt-4o-mini'
# optional: for OpenAI-compatible servers (e.g. Azure/OpenRouter/local server)
$env:OPENAI_BASE_URL = 'https://api.openai.com'

api-dev
```

Health check shows status:

```
GET /health -> { ok: true, llm: { provider: "openai", enabled: true } }
```

## 🤖 Optional: Anthropic (Claude) integration

Switch to Anthropic's Claude models by setting the provider and your API key. The service requests JSON output and validates it before returning results. On any error, it falls back to the built-in generator.

Windows PowerShell:

```powershell
$env:LLM_PROVIDER = 'anthropic'
$env:ANTHROPIC_API_KEY = '<your key>'
# optional (default: claude-3-5-sonnet-latest)
$env:ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest'

api-dev
```

Health check shows status:

```
GET /health -> { ok: true, llm: { provider: "anthropic", enabled: true } }
```
