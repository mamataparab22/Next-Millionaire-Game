from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import asyncio
import anthropic

from . import LLMClient, LLMError

DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest"
HARDCODED_ANTHROPIC_API_KEY: Optional[str] = None


class AnthropicClient(LLMClient):
    def __init__(self, *, api_key: str, model: str = DEFAULT_ANTHROPIC_MODEL):
        self.api_key = (api_key or "").strip()
        self.model = model

    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        if not self.api_key:
            raise LLMError("ANTHROPIC_API_KEY not configured")

        prompt = _build_prompt(categories, difficulties)

        client = anthropic.Anthropic(api_key=self.api_key)

        def _call_sync() -> str:
            resp = client.messages.create(
                model=self.model,
                max_tokens=1200,
                temperature=0.7,
                system=_SYSTEM_PROMPT,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": prompt}],
            )
            try:
                # resp.content is a list of content blocks; text in .text
                return "".join(b.text for b in resp.content if getattr(b, "type", "text") == "text")
            except Exception as e:  # pragma: no cover
                raise LLMError(f"Anthropic response parse error: {e}")

        attempts, delay = 0, 0.8
        while True:
            try:
                text = await asyncio.to_thread(_call_sync)
                break
            except Exception as e:
                msg = str(e)
                if any(code in msg for code in ["429", "500", "502", "503", "504"]):
                    attempts += 1
                    if attempts >= 3:
                        raise LLMError(f"Anthropic error after retries: {msg}")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise LLMError(f"Anthropic error: {msg}")

        return _parse_questions(text, provider_tag="anthropic", categories=categories, difficulties=difficulties)


_SYSTEM_PROMPT = (
    "You are a question generator for a Who Wants to Be a Millionaire style quiz. "
    "Return strictly and only valid JSON matching the schema explained below."
)


def _build_prompt(categories: List[str], difficulties: List[str]) -> str:
    cat_str = ", ".join(categories) if categories else "General Knowledge"
    count = len(difficulties)
    return (
        "Generate questions for the following requirements.\n"
        f"- Number of questions: {count}\n"
        f"- Allowed categories: {cat_str}\n"
        f"- Difficulties in order: {', '.join(difficulties)}\n\n"
        "Rules:\n"
        "- Each question must have exactly 4 choices.\n"
        "- correctIndex is the 0-based index of the correct choice.\n"
        "- category must be one from the allowed list.\n"
        "- Keep prompts short and clear; no explanations.\n\n"
        "Output JSON object with a single field 'questions' that is an array of objects with keys: "
        "id (string), category (string), difficulty (string), prompt (string), choices (string[4]), correctIndex (number).\n"
        "Return only JSON."
    )


def _parse_questions(raw_text: str, *, provider_tag: str, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
    try:
        text = raw_text.strip()
        if text.startswith("```"):
            text = text.strip("`\n ")
            if "\n" in text:
                text = text.split("\n", 1)[1]
        data = json.loads(text)
        items = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(items, list):
            raise ValueError("questions array missing")
    except Exception as e:
        raise LLMError(f"Failed to parse Anthropic JSON: {e} :: {raw_text[:500]}")

    out: List[Dict[str, Any]] = []
    for i, q in enumerate(items):
        try:
            choices = list(q.get("choices", []))
            if len(choices) != 4:
                raise ValueError("must have exactly 4 choices")
            idx = int(q.get("correctIndex", 0))
            if idx < 0 or idx > 3:
                raise ValueError("correctIndex out of range")
            cat = q.get("category") or (categories[i % max(1, len(categories))] if categories else "General Knowledge")
            diff = q.get("difficulty") or (difficulties[i] if i < len(difficulties) else difficulties[-1] if difficulties else "easy")
            out.append(
                {
                    "id": str(q.get("id") or f"llm-{provider_tag}-{i+1}"),
                    "category": str(cat),
                    "difficulty": str(diff),
                    "prompt": str(q.get("prompt") or q.get("question") or ""),
                    "choices": [str(c) for c in choices],
                    "correctIndex": idx,
                }
            )
        except Exception:
            continue

    if not out:
        raise LLMError("Anthropic returned no valid questions after parsing")
    want = len(difficulties)
    return out[:want]
