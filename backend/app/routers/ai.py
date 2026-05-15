from fastapi import APIRouter, Depends, HTTPException
from ..schemas.schemas import AIRewriteRequest, AIRewriteResponse
from ..deps import get_current_user
from ..models.models import User
from ..config import settings

router = APIRouter(prefix="/ai", tags=["ai"])

SYSTEM_PROMPTS = {
    "improve": "You are a writing assistant. Improve the writing quality of the given text while preserving its meaning. Return only the improved text with no explanation or preamble.",
    "simplify": "You are a writing assistant. Simplify the given text to make it clearer and easier to understand. Return only the simplified text.",
    "expand": "You are a writing assistant. Expand the given text with more detail and examples. Return only the expanded text.",
    "bullets": "You are a writing assistant. Convert the given text into a concise bullet-point list. Return only the bullet points.",
    "beginner": "You are a writing assistant. Rewrite the given text so a complete beginner can understand it. Return only the rewritten text.",
    "professional": "You are a writing assistant. Rewrite the given text in a polished, professional tone. Return only the rewritten text.",
    "grammar": "You are a writing assistant. Fix all grammar and spelling errors in the given text. Return only the corrected text.",
}


@router.post("/rewrite", response_model=AIRewriteResponse)
async def rewrite_text(
    data: AIRewriteRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="AI service is not configured. Set NVIDIA_API_KEY.")

    system_prompt = SYSTEM_PROMPTS.get(data.mode, SYSTEM_PROMPTS["improve"])

    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY,
        )
        completion = client.chat.completions.create(
            model=data.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.text},
            ],
            max_tokens=2048,
            temperature=0.7,
        )
        return AIRewriteResponse(result=completion.choices[0].message.content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI error: {exc}")
