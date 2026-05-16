import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request

from ..supabase_client import supabase
from ..schemas.schemas import PublicLinkOut
from ..deps import get_current_user
from ..limiter import limiter

router = APIRouter(tags=["public"])


@router.post("/notes/{note_id}/generate-link", response_model=PublicLinkOut)
def generate_public_link(note_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")

    existing = supabase.table("note_public_links").select("*").eq("note_id", note_id).limit(1).execute()
    if existing.data:
        return existing.data[0]

    result = supabase.table("note_public_links").insert({
        "note_id": note_id,
        "token": secrets.token_urlsafe(32),
    }).execute()
    return result.data[0]


@router.delete("/notes/{note_id}/generate-link", status_code=204)
def delete_public_link(note_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")
    supabase.table("note_public_links").delete().eq("note_id", note_id).execute()


@router.get("/share/{token}")
@limiter.limit("60/minute")
def get_public_note(request: Request, token: str):
    if len(token) > 100:
        raise HTTPException(status_code=400, detail="Invalid token")

    result = supabase.table("note_public_links").select("*").eq("token", token).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found or link is invalid")

    link = result.data[0]
    if link.get("expires_at"):
        if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This link has expired")

    note_res = supabase.table("notes").select("title, content, created_at").eq("id", link["note_id"]).limit(1).execute()
    if not note_res.data:
        raise HTTPException(status_code=404, detail="Note not found")

    new_count = (link.get("view_count") or 0) + 1
    supabase.table("note_public_links").update({"view_count": new_count}).eq("id", link["id"]).execute()

    note = note_res.data[0]
    return {
        "title": note["title"],
        "content": note["content"],
        "view_count": new_count,
        "created_at": note["created_at"],
    }
