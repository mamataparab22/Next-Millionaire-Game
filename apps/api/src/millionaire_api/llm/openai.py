from __future__ import annotations

import json
import aiohttp
from typing import Any, Dict, List, Optional
import secrets

from . import LLMClient, LLMError

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
# Replace the empty string with your real API key to hardcode it
HARDCODED_OPENAI_API_KEY = ""


class OpenAIClient(LLMClient):
    def __init__(self, api_key: str, model: str = DEFAULT_OPENAI_MODEL, base_url: Optional[str] = None) -> None:
        if not api_key:
            raise ValueError("OPENAI_API_KEY is required")
        self.api_key = api_key
        self.model = model
        self.base_url = (base_url or "https://api.openai.com").rstrip("/")
        self.endpoint = f"{self.base_url}/v1/chat/completions"

    def _build_prompt(self, categories: List[str], difficulties: List[str]) -> Dict[str, Any]:
        # Add a nonce to encourage variety across calls
        nonce = secrets.token_hex(8)
        instructions = (
            "You are generating multiple-choice trivia questions for a 'Who Wants to Be a Millionaire' style game. "
            "Return strictly valid JSON, no markdown. Each question must have 4 choices and exactly one correct index. "
            "Fields: id (string, unique), category (from provided list), difficulty (easy|medium|hard), prompt (string), choices (string[4]), correctIndex (0..3)."
        )
        payload = {"categories": categories, "difficulties": difficulties, "nonce": nonce}
        user = (
            instructions
            + " Always produce a fresh, non-repetitive set of questions when the nonce changes."
            + "\n\nInput:\n"
            + json.dumps(payload)
            + "\n\nOutput JSON schema:\n{\n  \"questions\": [ { \"id\": string, \"category\": string, \"difficulty\": string, \"prompt\": string, \"choices\": string[4], \"correctIndex\": number } ]\n}\n"
            + "Respond with JSON only."
        )
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that outputs only JSON."},
                {"role": "user", "content": user},
            ],
            "temperature": 0.9,
            "response_format": {"type": "json_object"},
        }

    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        body = self._build_prompt(categories, difficulties)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.endpoint, headers=headers, json=body, timeout=60) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise LLMError(f"OpenAI error: {resp.status} {text}")
                data = await resp.json()

        try:
            choice0 = (data.get("choices") or [])[0]
            message = (choice0 or {}).get("message", {})
            content = message.get("content")
            parsed = json.loads(content or "{}")
            qlist = parsed.get("questions") or []
        except Exception as e:
            raise LLMError(f"Failed to parse OpenAI response: {e}")

        out: List[Dict[str, Any]] = []
        for i, q in enumerate(qlist):
            try:
                cid = str(q.get("id") or f"openai-{i+1}")
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
            raise LLMError("No valid questions returned by OpenAI")
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
