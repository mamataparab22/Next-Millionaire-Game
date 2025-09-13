from typing import List, Optional
from fastapi import FastAPI, Query, Body, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import logging
from millionaire_api.llm import make_llm_client, LLMClient, LLMError
from pydantic import BaseModel
from millionaire_api.config import env, resolve_llm_settings  # loads .env on import
from openai import OpenAI, AzureOpenAI
import json as _json
from urllib import request as _urlreq
from urllib import error as _urlerr

LLM_PROVIDER = env("LLM_PROVIDER", "openai")

# Optional: enable debugpy attach when running outside VS Code debugger
if env("API_WAIT_FOR_DEBUGGER") == "1":
    try:
        import debugpy  # type: ignore
        port = int(env("API_DEBUG_PORT", "5678") or "5678")
        debugpy.listen(("0.0.0.0", port))
        print(f"[millionaire_api] Waiting for debugger attach on port {port}...", flush=True)
        debugpy.wait_for_client()
        print("[millionaire_api] Debugger attached.", flush=True)
    except Exception as e:  # pragma: no cover - best-effort debugging aid
        print(f"[millionaire_api] Debug attach failed: {e}", flush=True)

# OpenAPI/Swagger metadata
tags_metadata = [
    {"name": "health", "description": "Service health and configuration."},
    {"name": "catalog", "description": "Static data such as categories."},
    {"name": "questions", "description": "Generate quiz questions via LLM or fallback generator."},
    {"name": "audio", "description": "Text-to-speech for host narration."},
    {"name": "insights", "description": "Short explanations for answers."},
]

app = FastAPI(
    title="Next Millionaire API",
    version="0.1.0",
    description="API for generating Millionaire-style questions using OpenAI or Anthropic, with a deterministic fallback.",
    openapi_tags=tags_metadata,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("millionaire_api")
logging.basicConfig(level=env("LOG_LEVEL", "INFO"))

llm: Optional[LLMClient] = None
try:
    # Provider-specific configuration is resolved inside the LLM factory; env vars may override
    llm = make_llm_client(LLM_PROVIDER)
    if llm:
        logger.info("LLM provider initialized: %s", LLM_PROVIDER)
    else:
        logger.error("LLM provider not configured; API will return errors for question generation")
except Exception as e:
    logger.exception("Failed to initialize LLM provider: %s", e)
    llm = None

CATEGORIES = [
    "General Knowledge",
    "Science",
    "Geography",
    "Movies",
    "Sports",
    "History",
    "Music",
    "Technology",
    "Physics",
    "Literature",
    "Mathematics",
    "Chemistry",
    "World History",
]


class QuestionsRequest(BaseModel):
    categories: Optional[List[str]] = None
    count: int = 15


class Question(BaseModel):
    id: str
    category: str
    difficulty: str
    prompt: str
    choices: List[str]
    correctIndex: int


class QuestionsResponse(BaseModel):
    questions: List[Question]


class LLMStatus(BaseModel):
    provider: Optional[str]
    enabled: bool


class HealthResponse(BaseModel):
    ok: bool
    llm: LLMStatus


class CategoriesResponse(BaseModel):
    categories: List[str]


@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Health check")
async def health() -> HealthResponse:
    return HealthResponse(ok=True, llm=LLMStatus(provider=LLM_PROVIDER or None, enabled=bool(llm)))

@app.get("/categories", response_model=CategoriesResponse, tags=["catalog"], summary="List categories")
async def categories() -> CategoriesResponse:
    return CategoriesResponse(categories=CATEGORIES)


@app.post(
    
    "/questions",
    response_model=QuestionsResponse,
    tags=["questions"],
    summary="Generate questions (POST)",
)
async def questions(
    req: QuestionsRequest = Body(
        ...,
        examples={
            "simple": {
                "summary": "3 questions, any category",
                "value": {"count": 3},
            },
            "withCategories": {
                "summary": "Limit to Science and History",
                "value": {"count": 5, "categories": ["Science", "History"]},
            },
        },
    )
) -> QuestionsResponse:
    picked = [c for c in (req.categories or []) if c in CATEGORIES]
    pool = picked if picked else CATEGORIES
    total = max(1, req.count)

    # Difficulty plan per level: 1-5 easy, 6-10 medium, 11-15 hard
    difficulties: List[str] = [
        ("easy" if (i + 1) <= 5 else ("medium" if (i + 1) <= 10 else "hard")) for i in range(total)
    ]

    # Require LLM to be configured; if not, return a structured error
    if llm is None:
        raise HTTPException(status_code=503, detail={
            "code": "LLM_NOT_CONFIGURED",
            "message": "LLM is not configured. Set LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, and LLM_BASE_URL (and LLM_API_VERSION for Azure)."
        })

    # Try LLM when configured; on failure, return structured error without fallback
    if llm is not None:
        try:
            llm_questions = await llm.generate(categories=pool, difficulties=difficulties)
            return QuestionsResponse(questions=[Question(**q) for q in llm_questions])
        except LLMError as e:
            logger.warning("LLMError during generation: %s", e)
            raise HTTPException(status_code=502, detail={
                "code": "LLM_ERROR",
                "message": f"LLM failed to generate questions: {e}",
            })
        except Exception as e:
            logger.exception("Unexpected LLM failure")
            raise HTTPException(status_code=500, detail={
                "code": "LLM_FAILURE",
                "message": "Unexpected LLM failure.",
            })


# Convenience GET endpoint: /questions?count=3&categories=Science&categories=History
@app.get(
    
    "/questions",
    response_model=QuestionsResponse,
    tags=["questions"],
    summary="Generate questions (GET)",
)
async def get_questions(
    count: int = 15,
    categories: Optional[List[str]] = Query(None),
) -> QuestionsResponse:
    # Support comma-separated categories too (e.g., categories=Science,History)
    cats: Optional[List[str]] = None
    if categories:
        flat: List[str] = []
        for c in categories:
            flat.extend([s.strip() for s in str(c).split(",") if s.strip()])
        cats = flat or None
    req = QuestionsRequest(categories=cats, count=count)
    return await questions(req)


# ---------- TTS (Text-to-Speech) ----------

class TtsRequest(BaseModel):
    text: str
    voice: Optional[str] = None  # e.g., "alloy", "verse", "aria"
    format: Optional[str] = None  # e.g., "mp3", "wav", "aac"
    model: Optional[str] = None   # override default model if desired


def _make_openai_client_for_general() -> tuple[object, str, bool]:
    """Create an OpenAI or AzureOpenAI client for general chat/completions.
    Returns (client, model, is_azure). Uses LLM_* envs.
    """
    provider = (LLM_PROVIDER or "openai").lower()
    settings = resolve_llm_settings(provider)
    api_key = settings.get("api_key", "")
    if not api_key:
        raise HTTPException(status_code=503, detail={
            "code": "LLM_NOT_CONFIGURED",
            "message": "LLM is not configured. Set LLM_API_KEY and LLM_BASE_URL (and LLM_API_VERSION for Azure).",
        })
    base_url = settings.get("base_url")
    model = str(settings.get("model") or "gpt-4o-mini")
    api_version = settings.get("api_version")
    if api_version:
        client = AzureOpenAI(api_key=api_key, api_version=str(api_version), azure_endpoint=base_url)
        return client, model, True
    client = OpenAI(api_key=api_key, base_url=base_url)
    return client, model, False


def _make_openai_client_for_tts() -> tuple[object, bool]:
    """Create an OpenAI client for TTS using TTS_* overrides if provided.
    Returns (client, is_azure).
    """
    # Use the same key as LLM; allow base URL override
    tts_api_key = env("LLM_API_KEY") or ""
    tts_base_url = env("TTS_BASE_URL") or env("LLM_BASE_URL")
    if not tts_api_key:
        raise HTTPException(status_code=503, detail={
            "code": "TTS_NOT_CONFIGURED",
            "message": "TTS is not configured. Set LLM_API_KEY along with TTS_BASE_URL or LLM_BASE_URL.",
        })
    # If the generic env suggests Azure (api version set), we still block TTS Azure path
    if env("LLM_API_VERSION"):
        return AzureOpenAI(api_key=tts_api_key, api_version=str(env("LLM_API_VERSION")), azure_endpoint=tts_base_url), True
    return OpenAI(api_key=tts_api_key, base_url=tts_base_url), False


@app.post("/tts", tags=["audio"], summary="Synthesize speech from text", response_class=Response)
async def tts(req: TtsRequest) -> Response:
    """Return audio bytes (mp3 by default) synthesized from provided text.
    Implements the "Example Request (Basic)" using LLM_BASE_URL as BASE_URL.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": "text is required"})

    # Guard: Azure-style envs are not supported for TTS in this route
    if env("LLM_API_VERSION"):
        raise HTTPException(status_code=501, detail={
            "code": "TTS_NOT_SUPPORTED",
            "message": "Azure-style API version detected; this TTS route supports only standard BASE_URL.",
        })

    api_key = env("LLM_API_KEY") or ""
    base_url = (env("LLM_BASE_URL") or "").rstrip("/")
    if not api_key or not base_url:
        raise HTTPException(status_code=503, detail={
            "code": "TTS_NOT_CONFIGURED",
            "message": "Set LLM_BASE_URL and LLM_API_KEY to enable TTS.",
        })

    # Defaults
    model = (req.model or env("TTS_MODEL") or "gpt-4o-mini-tts").strip()
    voice = (req.voice or env("TTS_VOICE") or "alloy").strip()
    out_format = (req.format or env("TTS_FORMAT") or "mp3").strip().lower()
    if out_format not in ("mp3", "wav", "flac", "ogg", "aac"):
        raise HTTPException(status_code=400, detail={"code": "UNSUPPORTED_FORMAT", "message": f"Unsupported audio format: {out_format}"})

    url = f"{base_url}/v1/audio/speech"
    payload = {
        "model": model,
        "voice": voice,
        "input": req.text,
        "format": out_format,
    }
    data_bytes = _json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "*/*",
    }

    try:
        req_obj = _urlreq.Request(url, data=data_bytes, headers=headers, method="POST")
        with _urlreq.urlopen(req_obj, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
            body = resp.read()
    except _urlerr.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            err_body = str(e)
        logger.warning("TTS HTTP error %s: %s", e.code, err_body[:500])
        raise HTTPException(status_code=502, detail={"code": "TTS_ERROR", "message": err_body[:500]})
    except Exception as e:
        logger.exception("TTS request failed")
        raise HTTPException(status_code=502, detail={"code": "TTS_ERROR", "message": str(e)})

    # Normalize media type by requested format if server returned generic content-type
    media_map = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "flac": "audio/flac",
        "ogg": "audio/ogg",
        "aac": "audio/aac",
    }
    media_type = media_map.get(out_format, content_type or "application/octet-stream")
    return Response(content=body, media_type=media_type)


# ---------- Explanations ----------

class ExplainRequest(BaseModel):
    prompt: str
    choices: List[str]
    correctIndex: int
    userIndex: Optional[int] = None
    style: Optional[str] = None  # e.g., "concise", "kid-friendly"

class ExplainResponse(BaseModel):
    explanation: str


@app.post("/explain", tags=["insights"], response_model=ExplainResponse, summary="Explain the correct answer concisely")
async def explain(req: ExplainRequest) -> ExplainResponse:
    if not req.prompt or len(req.choices) < 2:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": "prompt and >=2 choices required"})
    try:
        client, model, _ = _make_openai_client_for_general()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail={"code": "LLM_INIT_FAILED", "message": str(e)})

    system = (
        "You are a helpful quiz host. In 1–2 short sentences, explain why the correct answer is right. "
        "Avoid spoilers for future questions, keep it upbeat and concise."
    )
    style_hint = (req.style or "concise").strip()
    user_parts = [
        f"Question: {req.prompt}",
        "Choices:",
    ]
    for i, c in enumerate(req.choices):
        letter = chr(65 + i)
        user_parts.append(f"{letter}) {c}")
    user_parts.append(f"Correct index: {req.correctIndex}")
    if req.userIndex is not None:
        user_parts.append(f"User chose index: {req.userIndex}")
    user_parts.append(f"Style: {style_hint}")
    user_msg = "\n".join(user_parts)

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.6,
            max_tokens=160,
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            raise RuntimeError("Empty explanation")
        return ExplainResponse(explanation=text)
    except Exception as e:
        logger.exception("Explanation generation failed")
        raise HTTPException(status_code=502, detail={"code": "LLM_ERROR", "message": str(e)})
