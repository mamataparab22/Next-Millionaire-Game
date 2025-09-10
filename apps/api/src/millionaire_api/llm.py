from __future__ import annotations

import os
import json
import asyncio
import aiohttp
from typing import Any, Dict, List, Optional, TypedDict


class LLMError(Exception):
    pass


class LLMClient:
    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        raise NotImplementedError


class GeminiClient(LLMClient):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash") -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        self.api_key = api_key
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def _build_prompt(self, categories: List[str], difficulties: List[str]) -> Dict[str, Any]:
        # We request structured JSON for a list of questions matching our schema
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
        # Parse response; expect JSON in candidates[0].content.parts[0].text
        try:
            candidates = data.get("candidates") or []
            first = candidates[0]
            parts = first.get("content", {}).get("parts", [])
            text = parts[0].get("text") if parts else None
            parsed = json.loads(text or "{}")
            qlist = parsed.get("questions") or []
        except Exception as e:
            raise LLMError(f"Failed to parse Gemini response: {e}")

        # Coerce minimal validation and fallbacks
        out: List[Dict[str, Any]] = []
        for i, q in enumerate(qlist):
            try:
                cid = str(q.get("id") or f"gemini-{i+1}")
                cat = str(q.get("category") or (categories[0] if categories else "General Knowledge"))
                diff = str(q.get("difficulty") or (difficulties[i] if i < len(difficulties) else "easy"))
                prompt = str(q.get("prompt") or "Question")
                choices = list(q.get("choices") or [])
                if len(choices) != 4:
                    # pad/trim to 4 choices
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
            except Exception as e:
                # Skip malformed items
                continue

        if not out:
            raise LLMError("No valid questions returned by Gemini")
        # Ensure we match requested count (truncate or pad by repeating last)
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


def make_llm_client(provider: str, *, gemini_api_key: Optional[str] = None, gemini_model: Optional[str] = None) -> Optional[LLMClient]:
    provider = (provider or "").strip().lower()
    if provider in ("", "none"):
        return None
    if provider == "gemini":
        return GeminiClient(api_key=gemini_api_key or "", model=gemini_model or "gemini-1.5-flash")
    raise ValueError(f"Unknown LLM provider: {provider}")
