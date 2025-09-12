from __future__ import annotations

import os
from typing import Any, Dict, List, Optional


class LLMError(Exception):
    pass


class LLMClient:
    async def generate(self, *, categories: List[str], difficulties: List[str]) -> List[Dict[str, Any]]:
        raise NotImplementedError


def make_llm_client(
    provider: str,
    *,
    gemini_api_key: Optional[str] = None,
    gemini_model: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    openai_model: Optional[str] = None,
    openai_base_url: Optional[str] = None,
) -> Optional[LLMClient]:
    provider = (provider or "").strip().lower()
    if provider in ("", "none"):
        return None
    if provider == "gemini":
        from .gemini import GeminiClient, HARDCODED_GEMINI_API_KEY, DEFAULT_GEMINI_MODEL

        final_key = HARDCODED_GEMINI_API_KEY or (gemini_api_key or os.getenv("GEMINI_API_KEY", ""))
        final_model = (gemini_model or os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL)
        return GeminiClient(api_key=final_key, model=final_model)
    if provider in ("openai", "gpt", "oai"):
        from .openai import OpenAIClient, DEFAULT_OPENAI_MODEL

        final_key = openai_api_key or os.getenv("OPENAI_API_KEY", "")
        final_model = openai_model or os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
        base_url = openai_base_url or os.getenv("OPENAI_BASE_URL")
        return OpenAIClient(api_key=final_key, model=final_model, base_url=base_url)
    raise ValueError(f"Unknown LLM provider: {provider}")
