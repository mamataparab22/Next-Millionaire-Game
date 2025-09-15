from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import asyncio
from openai import AzureOpenAI

from . import LLMClient, LLMError

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
HARDCODED_OPENAI_API_KEY: Optional[str] = None


class OpenAIClient(LLMClient):
    def __init__(self, *, api_key: str, model: str = DEFAULT_OPENAI_MODEL, base_url: Optional[str] = None, api_version: Optional[str] = None):
        endpoint = (base_url or "").strip()
        api_key_final = (api_key or "").strip()
        if not endpoint:
            raise ValueError("Azure OpenAI endpoint not configured: set LLM_BASE_URL")
        if not api_key_final:
            raise ValueError("Azure OpenAI API key not configured: set LLM_API_KEY")
        if not api_version:
            raise ValueError("Azure OpenAI API version not configured: set LLM_API_VERSION")
        low = endpoint.lower()
        if "api.openai.com" in low:
            raise ValueError("Configured endpoint is api.openai.com; expected Azure OpenAI endpoint like https://<resource>.openai.azure.com")
        self.client = AzureOpenAI(
            api_key=api_key_final,
            api_version=api_version,
            azure_endpoint=endpoint,
        )
        # For Azure, 'model' is the deployment name
        self.model = model

    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        prompt = _build_prompt(categories, difficulties)

        def _call_sync() -> str:
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=1,
                )
                return (resp.choices[0].message.content or "")
            except Exception as e1:
                raise

        attempts, delay = 0, 0.8
        while True:
            try:
                raw = await asyncio.to_thread(_call_sync)
                break
            except Exception as e:
                msg = str(e)
                if any(code in msg for code in ["429", "500", "502", "503", "504"]):
                    attempts += 1
                    if attempts >= 3:
                        raise LLMError(f"Azure OpenAI error after retries: {msg}")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise LLMError(f"Azure OpenAI error: {msg}")

        return _parse_questions(raw, provider_tag="azure", categories=categories, difficulties=difficulties)


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
        "Example: {\"questions\": [{\"id\": \"q1\", \"category\": \"Science\", \"difficulty\": \"easy\", \"prompt\": \"What is H2O?\", \"choices\": [\"Water\", \"Oxygen\", \"Hydrogen\", \"Helium\"], \"correctIndex\": 0}]}\n"
        "Return only JSON."
    )


def _parse_questions(raw_text: str, *, provider_tag: str, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
    try:
        # Some models may wrap in code fences
        text = raw_text.strip()
        if text.startswith("```"):
            text = text.strip("`\n ")
            # drop potential leading language identifier
            if "\n" in text:
                text = text.split("\n", 1)[1]
        data = json.loads(text)
        items = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(items, list):
            raise ValueError("questions array missing")
    except Exception as e:
        raise LLMError(f"Failed to parse Azure OpenAI JSON: {e} :: {raw_text[:500]}")

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
        except Exception as e:  # pragma: no cover - robust against partial bad items
            # Skip bad item; continue with others
            continue

    if not out:
        raise LLMError("Azure OpenAI returned no valid questions after parsing")
    # Trim or pad to requested size if needed
    want = len(difficulties)
    return out[:want]
