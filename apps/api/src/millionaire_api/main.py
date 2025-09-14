from typing import List, Optional, Iterator
from fastapi import FastAPI, Query, Body, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import logging
from millionaire_api.llm import make_llm_client, LLMClient, LLMError
from pydantic import BaseModel
from millionaire_api.config import env, resolve_llm_settings  # loads .env on import
from openai import AzureOpenAI
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
import requests
import json as _json
import base64 as _b64

LLM_PROVIDER = env("LLM_PROVIDER", "openai")
TTS_MODEL_DEFAULT = env("TTS_MODEL", "gpt-4o-mini-tts")

# Optional: enable debugpy attach when running outside VS Code debugger
if env("API_WAIT_FOR_DEBUGGER") == "1":
    try:
        import debugpy  # type: ignore
        port = int(env("API_DEBUG_PORT", "5678") or "5678")
        debugpy.listen(("0.0.0.0", port))
        print(f"[millionaire_api] Waiting for debugger attach on port {port}...", flush=True)
        debugpy.wait_for_client()
        print("[millionaire_api] Debugger attached.", flush=True)
    except Exception as e:  # pragma: no cover - best-effort debugging aid
        print(f"[millionaire_api] Debug attach failed: {e}", flush=True)

# OpenAPI/Swagger metadata
tags_metadata = [
    {"name": "health", "description": "Service health and configuration."},
    {"name": "catalog", "description": "Static data such as categories."},
    {"name": "questions", "description": "Generate quiz questions via LLM or fallback generator."},
    {"name": "insights", "description": "Short explanations for answers."},
    {"name": "audio", "description": "Text-to-speech generation."},
]

app = FastAPI(
    title="Next Millionaire API",
    version="0.1.0",
    description="API for generating Millionaire-style questions using OpenAI or Anthropic, with a deterministic fallback.",
    openapi_tags=tags_metadata,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("millionaire_api")
logging.basicConfig(level=env("LOG_LEVEL", "INFO"))

llm: Optional[LLMClient] = None
try:
    # Provider-specific configuration is resolved inside the LLM factory; env vars may override
    llm = make_llm_client(LLM_PROVIDER)
    if llm:
        logger.info("LLM provider initialized: %s", LLM_PROVIDER)
    else:
        logger.error("LLM provider not configured; API will return errors for question generation")
except Exception as e:
    logger.exception("Failed to initialize LLM provider: %s", e)
    llm = None

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


class LLMStatus(BaseModel):
    provider: Optional[str]
    enabled: bool


class HealthResponse(BaseModel):
    ok: bool
    llm: LLMStatus


class CategoriesResponse(BaseModel):
    categories: List[str]


@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Health check")
async def health() -> HealthResponse:
    return HealthResponse(ok=True, llm=LLMStatus(provider=LLM_PROVIDER or None, enabled=bool(llm)))

@app.get("/categories", response_model=CategoriesResponse, tags=["catalog"], summary="List categories")
async def categories() -> CategoriesResponse:
    return CategoriesResponse(categories=CATEGORIES)


@app.post(

    "/questions",
    response_model=QuestionsResponse,
    tags=["questions"],
    summary="Generate questions (POST)",
)
async def questions(
    req: QuestionsRequest = Body(
        ...,
        examples={
            "simple": {
                "summary": "3 questions, any category",
                "value": {"count": 3},
            },
            "withCategories": {
                "summary": "Limit to Science and History",
                "value": {"count": 5, "categories": ["Science", "History"]},
            },
        },
    )
) -> QuestionsResponse:
    picked = [c for c in (req.categories or []) if c in CATEGORIES]
    pool = picked if picked else CATEGORIES
    total = max(1, req.count)

    # Difficulty plan per level: 1-5 easy, 6-10 medium, 11-15 hard
    difficulties: List[str] = [
        ("easy" if (i + 1) <= 5 else ("medium" if (i + 1) <= 10 else "hard")) for i in range(total)
    ]

    # Require LLM to be configured; if not, return a structured error
    if llm is None:
        raise HTTPException(status_code=503, detail={
            "code": "LLM_NOT_CONFIGURED",
            "message": "LLM is not configured. Set LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, and LLM_BASE_URL (and LLM_API_VERSION for Azure)."
        })

    # Try LLM when configured; on failure, return structured error without fallback
    if llm is not None:
        try:
            llm_questions = await llm.generate(categories=pool, difficulties=difficulties)
            return QuestionsResponse(questions=[Question(**q) for q in llm_questions])
        except LLMError as e:
            logger.warning("LLMError during generation: %s", e)
            raise HTTPException(status_code=502, detail={
                "code": "LLM_ERROR",
                "message": f"LLM failed to generate questions: {e}",
            })
        except Exception as e:
            logger.exception("Unexpected LLM failure")
            raise HTTPException(status_code=500, detail={
                "code": "LLM_FAILURE",
                "message": "Unexpected LLM failure.",
            })


# Convenience GET endpoint: /questions?count=3&categories=Science&categories=History
@app.get(
    
    "/questions",
    response_model=QuestionsResponse,
    tags=["questions"],
    summary="Generate questions (GET)",
)
async def get_questions(
    count: int = 15,
    categories: Optional[List[str]] = Query(None),
) -> QuestionsResponse:
    # Support comma-separated categories too (e.g., categories=Science,History)
    cats: Optional[List[str]] = None
    if categories:
        flat: List[str] = []
        for c in categories:
            flat.extend([s.strip() for s in str(c).split(",") if s.strip()])
        cats = flat or None
    req = QuestionsRequest(categories=cats, count=count)
    return await questions(req)


def _make_openai_client_for_general() -> tuple[object, str, bool]:
    """Create an AzureOpenAI client for general chat/completions.
    Returns (client, model, is_azure=True). Uses LLM_* envs.
    """
    settings = resolve_llm_settings("openai")
    api_key = settings.get("api_key", "")
    base_url = settings.get("base_url")
    api_version = settings.get("api_version")
    if not api_key or not base_url or not api_version:
        raise HTTPException(status_code=503, detail={
            "code": "LLM_NOT_CONFIGURED",
            "message": "Azure OpenAI is not configured. Set LLM_API_KEY, LLM_BASE_URL, and LLM_API_VERSION.",
        })
    if isinstance(base_url, str) and "api.openai.com" in base_url.lower():
        raise HTTPException(status_code=503, detail={
            "code": "LLM_WRONG_ENDPOINT",
            "message": "Configured endpoint is api.openai.com; expected Azure endpoint like https://<resource>.openai.azure.com.",
        })
    model = str(settings.get("model") or "gpt-4o-mini")
    client = AzureOpenAI(api_key=api_key, api_version=str(api_version), azure_endpoint=base_url)
    return client, model, True


# ---------- Explanations ----------

class ExplainRequest(BaseModel):
    prompt: str
    choices: List[str]
    correctIndex: int
    userIndex: Optional[int] = None
    style: Optional[str] = None  # e.g., "concise", "kid-friendly"

class ExplainResponse(BaseModel):
    explanation: str


@app.post("/explain", tags=["insights"], response_model=ExplainResponse, summary="Explain the correct answer concisely")
async def explain(req: ExplainRequest) -> ExplainResponse:
    if not req.prompt or len(req.choices) < 2:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": "prompt and >=2 choices required"})
    try:
        client, model, _ = _make_openai_client_for_general()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail={"code": "LLM_INIT_FAILED", "message": str(e)})

    system = (
        "You are a helpful quiz host. In 1–2 short sentences, explain why the correct answer is right. "
        "Avoid spoilers for future questions, keep it upbeat and concise."
    )
    style_hint = (req.style or "concise").strip()
    user_parts = [
        f"Question: {req.prompt}",
        "Choices:",
    ]
    for i, c in enumerate(req.choices):
        letter = chr(65 + i)
        user_parts.append(f"{letter}) {c}")
    user_parts.append(f"Correct index: {req.correctIndex}")
    if req.userIndex is not None:
        user_parts.append(f"User chose index: {req.userIndex}")
    user_parts.append(f"Style: {style_hint}")
    user_msg = "\n".join(user_parts)

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.6,
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            raise RuntimeError("Empty explanation")
        return ExplainResponse(explanation=text)
    except Exception as e:
        logger.exception("Explanation generation failed")
        raise HTTPException(status_code=502, detail={"code": "LLM_ERROR", "message": str(e)})


# ---------- Text-to-Speech (TTS) ----------

class TtsRequest(BaseModel):
    input: str
    voice: Optional[str] = "nova"
    speed: Optional[float] = None
    stream: Optional[bool] = False
    model: Optional[str] = None


def _tts_upstream_settings() -> tuple[str, str, Optional[str]]:
    base_url = env("LLM_BASE_URL") or ""
    api_key = env("LLM_API_KEY") or ""
    # Prefer TTS_API_VERSION if provided, otherwise fall back to LLM_API_VERSION
    api_version = env("TTS_API_VERSION") or env("LLM_API_VERSION")
    if not base_url or not api_key:
        raise HTTPException(status_code=503, detail={
            "code": "TTS_NOT_CONFIGURED",
            "message": "Set LLM_BASE_URL and LLM_API_KEY (and TTS_MODEL).",
        })
    return base_url.rstrip("/"), api_key, (api_version or None)


def _tts_stream_iter(resp: requests.Response) -> Iterator[bytes]:
    try:
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                data = _json.loads(line.decode("utf-8"))
            except Exception:
                continue
            t = data.get("type")
            if t == "speech.audio.delta":
                chunk = data.get("audio")
                if not chunk:
                    continue
                try:
                    buf = _b64.b64decode(chunk)
                except Exception:
                    continue
                if buf:
                    yield buf
            elif t == "speech.audio.done":
                break
    except Exception:
        # On streaming error, just stop iteration to close the connection gracefully
        return


@app.post("/tts", tags=["audio"], summary="Synthesize speech (mp3)")
async def tts(req: TtsRequest):
    if not req.input or not req.input.strip():
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": "input is required"})

    base_url, api_key, api_version = _tts_upstream_settings()
    model = (req.model or TTS_MODEL_DEFAULT or "gpt-4o-mini-tts").strip()
    is_azure = "openai.azure.com" in base_url.lower()
    if is_azure:
        if not api_version:
            raise HTTPException(status_code=503, detail={
                "code": "TTS_NOT_CONFIGURED",
                "message": "Azure OpenAI TTS requires TTS_API_VERSION (or LLM_API_VERSION).",
            })
        # Azure audio.speech endpoints. Prefer deployment-scoped; fallback to global if API expects explicit model.
        # - Deployment endpoint: /openai/deployments/{deployment}/audio/speech
        # - Global endpoint (requires body.model): /openai/audio/speech
        url_deploy = f"{base_url}/openai/deployments/{model}/audio/speech?api-version={api_version}"
        url_global = f"{base_url}/openai/audio/speech?api-version={api_version}"
        url = url_deploy
        voice = (req.voice or "alloy")
        if voice.lower() == "nova":
            voice = "alloy"
        payload: dict = {"model": model, "input": req.input, "voice": voice, "format": "mp3"}
        headers = {"api-key": api_key, "Accept": "audio/mpeg"}
    else:
        # Legacy/other upstream server implementing /api/v1/speak/{model}
        url = f"{base_url}/api/v1/speak/{model}"
        payload: dict = {"input": req.input}
        if req.voice:
            payload["voice"] = req.voice
        if req.speed is not None:
            payload["speed"] = req.speed
        headers = {"x-api-key": api_key}

    # Streaming path
    if req.stream:
        # Azure audio.speech: stream the binary audio body; legacy backends may emit JSON chunk events
        try:
            upstream = requests.post(url=url, json={**payload, "stream": True} if not is_azure else payload, headers=headers, stream=True, timeout=60)
            upstream.raise_for_status()
        except requests.RequestException as e:
            # Retry Azure with more compatible options
            if is_azure and hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 400:
                # If upstream complains about missing 'model', try the global endpoint which requires it
                try_global_first = False
                try:
                    err_text = e.response.text or ""
                    if ("Missing required parameter" in err_text) and ("model" in err_text):
                        try_global_first = True
                except Exception:
                    pass
                if try_global_first:
                    try:
                        upstream = requests.post(url=url_global, json=payload, headers=headers, stream=True, timeout=60)
                        upstream.raise_for_status()
                        media_type = upstream.headers.get("Content-Type", "audio/mpeg")
                        return StreamingResponse(upstream.iter_content(chunk_size=65536), media_type=media_type or "audio/mpeg", background=BackgroundTask(upstream.close))
                    except requests.RequestException:
                        # continue with wav/no-format attempts on global endpoint
                        url = url_global
                try:
                    headers_wav = {**headers, "Accept": "audio/wav"}
                    payload_wav = {**payload, "format": "wav", "model": model}
                    upstream = requests.post(url=url, json=payload_wav, headers=headers_wav, stream=True, timeout=60)
                    upstream.raise_for_status()
                except requests.RequestException as e2:
                    if hasattr(e2, "response") and e2.response is not None and getattr(e2.response, "status_code", None) == 400:
                        try:
                            headers_any = {**headers, "Accept": "*/*"}
                            payload_nf = {k: v for k, v in payload.items() if k != "format"}
                            payload_nf["model"] = model
                            upstream = requests.post(url=url, json=payload_nf, headers=headers_any, stream=True, timeout=60)
                            upstream.raise_for_status()
                        except requests.RequestException as e3:
                            msg = str(e3)
                            try:
                                if hasattr(e3, "response") and e3.response is not None:
                                    msg = f"{e3} :: {e3.response.text}"
                            except Exception:
                                pass
                            raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})
                    else:
                        msg = str(e2)
                        try:
                            if hasattr(e2, "response") and e2.response is not None:
                                msg = f"{e2} :: {e2.response.text}"
                        except Exception:
                            pass
                        raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})
            else:
                msg = str(e)
                try:
                    if hasattr(e, "response") and e.response is not None:
                        msg = f"{e} :: {e.response.text}"
                except Exception:
                    pass
                raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})
        if is_azure:
            media_type = upstream.headers.get("Content-Type", "audio/mpeg")
            return StreamingResponse(upstream.iter_content(chunk_size=65536), media_type=media_type or "audio/mpeg", background=BackgroundTask(upstream.close))
        gen = _tts_stream_iter(upstream)
        return StreamingResponse(gen, media_type="audio/mpeg", background=BackgroundTask(upstream.close))

    # Non-streaming path: return mp3 bytes
    try:
        r = requests.post(url=url, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
    except requests.RequestException as e:
        # Retry Azure with wav if mp3 not accepted; then try without 'format'
        if is_azure and hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 400:
            # If missing model, first try the global endpoint
            try_global_first = False
            try:
                err_text = e.response.text or ""
                if ("Missing required parameter" in err_text) and ("model" in err_text):
                    try_global_first = True
            except Exception:
                pass
            if try_global_first:
                try:
                    # url_global is only defined for Azure branch; recompute here
                    url_global = f"{base_url}/openai/audio/speech?api-version={api_version}"
                    r = requests.post(url=url_global, json=payload, headers=headers, timeout=60)
                    r.raise_for_status()
                    content_type = r.headers.get("Content-Type", "audio/mpeg")
                    return Response(content=r.content, media_type=content_type or "audio/mpeg")
                except requests.RequestException:
                    url = url_global
            try:
                headers_wav = {**headers, "Accept": "audio/wav"}
                payload_wav = {**payload, "format": "wav", "model": model}
                r = requests.post(url=url, json=payload_wav, headers=headers_wav, timeout=60)
                r.raise_for_status()
            except requests.RequestException as e2:
                if hasattr(e2, "response") and e2.response is not None and getattr(e2.response, "status_code", None) == 400:
                    try:
                        headers_any = {**headers, "Accept": "*/*"}
                        payload_nf = {k: v for k, v in payload.items() if k != "format"}
                        payload_nf["model"] = model
                        r = requests.post(url=url, json=payload_nf, headers=headers_any, timeout=60)
                        r.raise_for_status()
                    except requests.RequestException as e3:
                        msg = str(e3)
                        try:
                            if hasattr(e3, "response") and e3.response is not None:
                                msg = f"{e3} :: {e3.response.text}"
                        except Exception:
                            pass
                        raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})
                else:
                    msg = str(e2)
                    try:
                        if hasattr(e2, "response") and e2.response is not None:
                            msg = f"{e2} :: {e2.response.text}"
                    except Exception:
                        pass
                    raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})
        else:
            msg = str(e)
            try:
                if hasattr(e, "response") and e.response is not None:
                    msg = f"{e} :: {e.response.text}"
            except Exception:
                pass
            raise HTTPException(status_code=502, detail={"code": "TTS_UPSTREAM_ERROR", "message": msg})

    content_type = r.headers.get("Content-Type", "audio/mpeg")
    return Response(content=r.content, media_type=content_type or "audio/mpeg")


@app.get("/tts/debug", tags=["audio"], summary="Debug TTS configuration")
async def tts_debug():
    base_url, api_key, api_version = _tts_upstream_settings()
    is_azure = "openai.azure.com" in (base_url.lower() if base_url else "")
    model = (env("TTS_MODEL") or TTS_MODEL_DEFAULT or "gpt-4o-mini-tts").strip()
    voice = ("alloy")
    url_deploy = (
        f"{base_url}/openai/deployments/{model}/audio/speech?api-version={api_version}"
        if is_azure and api_version else None
    )
    url_global = (
        f"{base_url}/openai/audio/speech?api-version={api_version}"
        if is_azure and api_version else None
    )
    masked_key = (api_key[:4] + "…" + api_key[-4:]) if api_key and len(api_key) > 8 else (api_key or "")
    return {
        "isAzure": is_azure,
        "baseUrl": base_url,
        "apiVersion": api_version,
        "deployment": model,
        "voice": voice,
        "accept": "audio/mpeg",
        "url": url_deploy or url_global or (f"{base_url}/api/v1/speak/{model}" if not is_azure else ""),
        "urls": {"deploy": url_deploy, "global": url_global},
        "apiKey": masked_key,
    }


@app.get("/__routes", tags=["health"], summary="List registered routes")
async def list_routes():
    try:
        paths = []
        for r in app.router.routes:
            try:
                paths.append(getattr(r, "path", str(r)))
            except Exception:
                continue
        return {"count": len(paths), "paths": sorted(paths)}
    except Exception as e:
        return {"error": str(e)}
