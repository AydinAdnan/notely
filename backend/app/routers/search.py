from fastapi import APIRouter, Depends, Query, HTTPException

from ..supabase_client import supabase
from ..deps import get_current_user
from ..utils import extract_public_token

router = APIRouter(prefix="/search", tags=["search"])


def _escape_like(q: str) -> str:
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("")
def search_notes(
    q: str = Query(..., min_length=1, max_length=200),
    current_user: dict = Depends(get_current_user),
):
    q = q.strip()
    if not q:
        raise HTTPException(status_code=422, detail="Search query must not be blank")

    safe_q = _escape_like(q)
    result = (
        supabase.table("notes")
        .select("*, note_public_links(token)")
        .eq("user_id", current_user["id"])
        .or_(f"title.ilike.%{safe_q}%,content.ilike.%{safe_q}%")
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
    )
    results = []
    for n in (result.data or []):
        results.append({
            "id": n["id"],
            "title": n["title"],
            "content": n["content"],
            "color": n["color"],
            "is_pinned": n["is_pinned"],
            "user_id": n["user_id"],
            "created_at": n["created_at"],
            "updated_at": n["updated_at"],
            "public_token": extract_public_token(n.get("note_public_links")),
            "workspace_id": n.get("workspace_id"),
            "title_match": q.lower() in (n["title"] or "").lower(),
        })
    return {"results": results, "total": len(results), "query": q}
