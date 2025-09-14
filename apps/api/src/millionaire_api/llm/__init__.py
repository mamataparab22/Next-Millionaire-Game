from __future__ import annotations

from typing import Any, Dict, List, Optional
from millionaire_api.config import env, resolve_llm_settings


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
    if provider in ("openai", "gpt", "oai", "azure", "azure-openai", "azureopenai"):
        from .openai import OpenAIClient, HARDCODED_OPENAI_API_KEY

        # Always resolve via the OpenAI path; resolve_llm_settings will include
        # api_version when the base URL is an Azure endpoint (not api.openai.com).
        settings = resolve_llm_settings(
            "openai",
            api_key=HARDCODED_OPENAI_API_KEY or llm_api_key,
            model=llm_model,
            base_url=llm_base_url,
        )
        return OpenAIClient(
            api_key=settings.get("api_key", ""),
            model=str(settings.get("model") or "gpt-4o-mini"),
            base_url=settings.get("base_url"),
            api_version=settings.get("api_version"),
        )
    if provider in ("anthropic", "claude"):
        from .anthropic import AnthropicClient, HARDCODED_ANTHROPIC_API_KEY

        settings = resolve_llm_settings(
            provider,
            api_key=HARDCODED_ANTHROPIC_API_KEY or llm_api_key,
            model=llm_model,
        )
        return AnthropicClient(api_key=settings.get("api_key", ""), model=str(settings.get("model") or "claude-3-5-sonnet-latest"))
    raise ValueError(f"Unknown LLM provider: {provider}")
