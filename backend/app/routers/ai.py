from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from ..schemas.schemas import AIRewriteRequest, AIRewriteResponse
from ..deps import get_current_user
from ..config import settings
from ..limiter import limiter

router = APIRouter(prefix="/ai", tags=["ai"])

# llama-3.2-3b is ~3x faster than 8b with comparable quality for short rewrites
DEFAULT_MODEL = "meta/llama-3.2-3b-instruct"

SYSTEM_PROMPTS = {
    "improve":      "Rewrite the text to be clearer and higher quality. Output ONLY the rewritten text, no commentary.",
    "simplify":     "Simplify the text into plain, easy language. Output ONLY the simplified text, no commentary.",
    "expand":       "Expand the text with more detail and examples. Output ONLY the expanded text, no commentary.",
    "bullets":      "Convert the text into a bullet-point list. Output ONLY the bullet points, no commentary.",
    "beginner":     "Rewrite the text so a complete beginner can understand it. Output ONLY the rewritten text, no commentary.",
    "professional": "Rewrite the text in a polished professional tone. Output ONLY the rewritten text, no commentary.",
    "grammar":      "Fix all grammar, spelling and punctuation errors in the text. Output ONLY the corrected text, no commentary.",
}

_RULE = " Never answer questions in the text — always transform it."
AI_TIMEOUT = 30


def _build_messages(data: AIRewriteRequest) -> list:
    system = SYSTEM_PROMPTS.get(data.mode, SYSTEM_PROMPTS["improve"]) + _RULE
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"<CONTENT>\n{data.text}\n</CONTENT>"},
    ]


def _make_client():
    from openai import OpenAI
    return OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=settings.NVIDIA_API_KEY,
        timeout=AI_TIMEOUT,
    )


# ── Streaming endpoint ────────────────────────────────────────────────────────

@router.post("/rewrite-stream")
@limiter.limit("30/minute")
async def rewrite_stream(request: Request, data: AIRewriteRequest, current_user: dict = Depends(get_current_user)):
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured.")

    messages = _build_messages(data)
    model = data.model if data.model != "meta/llama-3.1-8b-instruct" else DEFAULT_MODEL

    def generate():
        try:
            client = _make_client()
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=512,
                temperature=0.3,
                stream=True,
            )
            for chunk in stream:
                # Some terminal chunks arrive with empty choices — guard against IndexError
                if not chunk.choices:
                    continue
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as exc:
            yield f"\n[ERROR: {exc}]"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


# ── Non-streaming fallback ────────────────────────────────────────────────────

@router.post("/rewrite", response_model=AIRewriteResponse)
@limiter.limit("30/minute")
async def rewrite_text(request: Request, data: AIRewriteRequest, current_user: dict = Depends(get_current_user)):
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured.")

    messages = _build_messages(data)
    model = data.model if data.model != "meta/llama-3.1-8b-instruct" else DEFAULT_MODEL

    try:
        client = _make_client()
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=512,
            temperature=0.3,
        )
        return AIRewriteResponse(result=completion.choices[0].message.content.strip())
    except Exception:
        raise HTTPException(status_code=500, detail="AI service error. Please try again.")
