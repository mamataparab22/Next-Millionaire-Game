from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv


# Load environment from .env files as early as possible.
# Load order (later overrides earlier):
# 1) .env
# 2) .env.local
_PKG_DIR = Path(__file__).resolve().parent
_SRC_DIR = _PKG_DIR.parent
_APP_DIR = _SRC_DIR.parent  # apps/api


def _load_env_files() -> None:
    # Base .env
    base_env = _APP_DIR / ".env"
    if base_env.exists():
        load_dotenv(base_env, override=False)

    # Local overrides
    local_env = _APP_DIR / ".env.local"
    if local_env.exists():
        load_dotenv(local_env, override=True)


# Perform load at import
_load_env_files()


def env(key: str, default: Optional[str] = None) -> Optional[str]:
    """Read an environment value populated via .env files (or process env)."""
    return os.environ.get(key, default)


def resolve_llm_settings(
    provider: str,
    *,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Resolve LLM settings using only generic LLM_* variables (no provider-specific envs).

    Precedence (highest to lowest):
    - Explicit args (api_key/model/base_url)
    - Generic: LLM_API_KEY, LLM_MODEL, LLM_BASE_URL, LLM_API_VERSION
    """
    p = (provider or "").strip().lower()

    g_api_key = api_key or env("LLM_API_KEY")
    g_model = model or env("LLM_MODEL")
    g_base = base_url or env("LLM_BASE_URL")
    # Only use API version when explicitly provided (needed for Azure OpenAI).
    # For standard OpenAI, leave this unset so the SDK does not use Azure mode.
    g_version = env("LLM_API_VERSION")

    if p in ("openai", "gpt", "oai"):
        out: Dict[str, Any] = {
            "api_key": (g_api_key or ""),
            "model": (g_model or "gpt-4o-mini"),
            "base_url": g_base,
        }
        # Only include api_version when explicitly set (Azure OpenAI)
        if g_version:
            out["api_version"] = g_version
        return out

    if p in ("anthropic", "claude"):
        return {
            "api_key": (g_api_key or ""),
            "model": (g_model or "claude-3-5-sonnet-latest"),
        }

    return {"api_key": g_api_key or "", "model": g_model, "base_url": g_base}


__all__ = ["env", "resolve_llm_settings"]
