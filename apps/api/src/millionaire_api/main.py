from typing import List, Optional
from fastapi import FastAPI, Query, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from millionaire_api.llm import make_llm_client, LLMClient, LLMError
from pydantic import BaseModel
from millionaire_api.config import env  # loads .env on import

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
