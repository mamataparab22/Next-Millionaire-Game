from __future__ import annotations

import json
import aiohttp
from typing import Any, Dict, List

from . import LLMClient, LLMError

DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"
# Replace the empty string with your real API key to hardcode it
HARDCODED_GEMINI_API_KEY = "AIzaSyDB-dJpfxL_TumbuOavtn1-lNui339o2JQ"


class GeminiClient(LLMClient):
    def __init__(self, api_key: str, model: str = DEFAULT_GEMINI_MODEL) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        self.api_key = api_key
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def _build_prompt(self, categories: List[str], difficulties: List[str]) -> Dict[str, Any]:
        instructions = (
            "You are generating multiple-choice trivia questions for a 'Who Wants to Be a Millionaire' style game. "
            "Return strictly valid JSON, no markdown. Each question must have 4 choices and exactly one correct index. "
            "Fields: id (string, unique), category (from provided list), difficulty (easy|medium|hard), prompt (string), choices (string[4]), correctIndex (0..3)."
        )
        payload = {
            "categories": categories,
            "difficulties": difficulties,
        }
        return {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                instructions
                                + "\n\nInput:\n"
                                + json.dumps(payload)
                                + "\n\nOutput JSON schema:\n{\n  \"questions\": [ { \"id\": string, \"category\": string, \"difficulty\": string, \"prompt\": string, \"choices\": string[4], \"correctIndex\": number } ]\n}\n"
                                + "Respond with JSON only."
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
            },
        }

    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        body = self._build_prompt(categories, difficulties)
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        async with aiohttp.ClientSession() as session:
            async with session.post(self.endpoint, params=params, headers=headers, json=body, timeout=60) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise LLMError(f"Gemini error: {resp.status} {text}")
                data = await resp.json()
        try:
            candidates = data.get("candidates") or []
            first = candidates[0]
            parts = first.get("content", {}).get("parts", [])
            text = parts[0].get("text") if parts else None
            parsed = json.loads(text or "{}")
            qlist = parsed.get("questions") or []
        except Exception as e:
            raise LLMError(f"Failed to parse Gemini response: {e}")

        out: List[Dict[str, Any]] = []
        for i, q in enumerate(qlist):
            try:
                cid = str(q.get("id") or f"gemini-{i+1}")
                cat = str(q.get("category") or (categories[0] if categories else "General Knowledge"))
                diff = str(q.get("difficulty") or (difficulties[i] if i < len(difficulties) else "easy"))
                prompt = str(q.get("prompt") or "Question")
                choices = list(q.get("choices") or [])
                if len(choices) != 4:
                    base = choices[:4] + ["Option A", "Option B", "Option C", "Option D"]
                    choices = base[:4]
                cidx = int(q.get("correctIndex") or 0)
                if cidx < 0 or cidx > 3:
                    cidx = 0
                out.append(
                    {
                        "id": cid,
                        "category": cat,
                        "difficulty": diff,
                        "prompt": prompt,
                        "choices": choices,
                        "correctIndex": cidx,
                    }
                )
            except Exception:
                continue

        if not out:
            raise LLMError("No valid questions returned by Gemini")
        target = len(difficulties)
        if len(out) > target:
            out = out[:target]
        while len(out) < target:
            last = out[-1]
            dup = dict(last)
            dup["id"] = f"{last['id']}-dup{len(out)+1}"
            dup["difficulty"] = difficulties[len(out)]
            out.append(dup)
        return out
