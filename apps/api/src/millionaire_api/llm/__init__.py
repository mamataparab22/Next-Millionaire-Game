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
    llm_api_key: Optional[str] = None,
    llm_model: Optional[str] = None,
    llm_base_url: Optional[str] = None
) -> Optional[LLMClient]:
    provider = (provider or "").strip().lower()
    if provider in ("", "none"):
        return None
    if provider in ("openai", "gpt", "oai"):
        from .openai import OpenAIClient, DEFAULT_OPENAI_MODEL, HARDCODED_OPENAI_API_KEY

        final_key = HARDCODED_OPENAI_API_KEY or (llm_api_key or os.getenv("OPENAI_API_KEY", ""))
        final_model = llm_model or os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
        base_url = llm_base_url or os.getenv("OPENAI_BASE_URL")
        return OpenAIClient(api_key=final_key, model=final_model, base_url=base_url)
    if provider in ("anthropic", "claude"):
        from .anthropic import AnthropicClient, DEFAULT_ANTHROPIC_MODEL, HARDCODED_ANTHROPIC_API_KEY

        final_key = HARDCODED_ANTHROPIC_API_KEY or (llm_api_key or os.getenv("ANTHROPIC_API_KEY", ""))
        final_model = llm_model or os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)
        return AnthropicClient(api_key=final_key, model=final_model)
    raise ValueError(f"Unknown LLM provider: {provider}")
