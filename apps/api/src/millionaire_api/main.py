from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from .llm import make_llm_client, LLMClient, LLMError
from pydantic import BaseModel

app = FastAPI(title="Next Millionaire API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("millionaire_api")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

# LLM provider selection via env; defaults to Gemini for backwards compatibility
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").strip().lower()

llm: Optional[LLMClient] = None
try:
    # Provider-specific configuration is resolved inside the LLM factory
    llm = make_llm_client(LLM_PROVIDER)
    if llm:
        logger.info("LLM provider initialized: %s", LLM_PROVIDER)
    else:
        logger.info("LLM provider not configured; using built-in generator")
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


@app.get("/health")
async def health():
    return {
        "ok": True,
        "llm": {
            "provider": LLM_PROVIDER or None,
            "enabled": bool(llm),
        },
    }

@app.get("/categories")
async def categories():
    return {"categories": CATEGORIES}


@app.post("/questions", response_model=QuestionsResponse)
async def questions(req: QuestionsRequest) -> QuestionsResponse:
    picked = [c for c in (req.categories or []) if c in CATEGORIES]
    pool = picked if picked else CATEGORIES
    total = max(1, req.count)

    # Difficulty plan per level: 1-5 easy, 6-10 medium, 11-15 hard
    difficulties: List[str] = [
        ("easy" if (i + 1) <= 5 else ("medium" if (i + 1) <= 10 else "hard")) for i in range(total)
    ]

    # Try LLM if configured
    if llm is not None:
        try:
            llm_questions = await llm.generate(categories=pool, difficulties=difficulties)
            # Coerce into Pydantic models
            return QuestionsResponse(questions=[Question(**q) for q in llm_questions])
        except LLMError as e:
            logger.warning("LLMError, falling back to built-in generator: %s", e)
        except Exception:
            logger.exception("Unexpected LLM failure; falling back to built-in generator")

    # Built-in deterministic generator as fallback
    def mk(i: int, difficulty: str) -> Question:
        return Question(
            id=f"api-{difficulty}-{i+1}",
            category=pool[(i + len(difficulty)) % (len(pool) or 1)] if pool else "General Knowledge",
            difficulty=difficulty,
            prompt=f"Generated {difficulty} question #{i+1}",
            choices=["A", "B", "C", "D"],
            correctIndex=0,
        )

    out: List[Question] = [mk(i, difficulties[i]) for i in range(total)]
    return QuestionsResponse(questions=out)
