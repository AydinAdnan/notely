from fastapi import APIRouter, Depends, Query

from ..supabase_client import supabase
from ..deps import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search_notes(q: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("notes")
        .select("*, note_public_links(token)")
        .eq("user_id", current_user["id"])
        .or_(f"title.ilike.%{q}%,content.ilike.%{q}%")
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
    )
    results = []
    for n in (result.data or []):
        links = n.get("note_public_links") or []
        results.append({
            "id": n["id"],
            "title": n["title"],
            "content": n["content"],
            "color": n["color"],
            "is_pinned": n["is_pinned"],
            "user_id": n["user_id"],
            "created_at": n["created_at"],
            "updated_at": n["updated_at"],
            "public_token": links[0]["token"] if links else None,
            "workspace_id": n.get("workspace_id"),
            "title_match": q.lower() in (n["title"] or "").lower(),
        })
    return {"results": results, "total": len(results), "query": q}
