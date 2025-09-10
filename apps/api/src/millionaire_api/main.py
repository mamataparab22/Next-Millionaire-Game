from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Next Millionaire API")

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
    return {"ok": True}

@app.get("/categories")
async def categories():
    return {"categories": CATEGORIES}


@app.post("/questions", response_model=QuestionsResponse)
async def questions(req: QuestionsRequest) -> QuestionsResponse:
    picked = [c for c in (req.categories or []) if c in CATEGORIES]
    pool = picked if picked else CATEGORIES

    def mk(i: int, difficulty: str) -> Question:
        return Question(
            id=f"api-{difficulty}-{i+1}",
            category=pool[(i + len(difficulty)) % (len(pool) or 1)] if pool else "General Knowledge",
            difficulty=difficulty,
            prompt=f"Generated {difficulty} question #{i+1}",
            choices=["A", "B", "C", "D"],
            correctIndex=0,
        )

    out: List[Question] = []
    total = max(1, req.count)
    for i in range(total):
        level = i + 1
        diff = "easy" if level <= 5 else ("medium" if level <= 10 else "hard")
        out.append(mk(i, diff))

    return QuestionsResponse(questions=out)
