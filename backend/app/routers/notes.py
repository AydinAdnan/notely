import random
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..supabase_client import supabase
from ..schemas.schemas import NoteCreate, NoteUpdate, NoteOut, NoteListOut
from ..deps import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

COLORS = ["bg-neu-yellow", "bg-neu-pink", "bg-neu-cyan", "bg-neu-green", "bg-neu-purple"]
MAX_VERSIONS = 50


def _serialize(n: dict) -> dict:
    links = n.get("note_public_links") or []
    token = (links[0]["token"] if isinstance(links, list) and links else None)
    return {
        "id": n["id"],
        "user_id": n["user_id"],
        "title": n["title"],
        "content": n["content"],
        "color": n["color"],
        "is_pinned": n["is_pinned"],
        "created_at": n["created_at"],
        "updated_at": n["updated_at"],
        "public_token": token,
        "workspace_id": n.get("workspace_id"),
    }


@router.post("", response_model=NoteOut, status_code=201)
def create_note(data: NoteCreate, current_user: dict = Depends(get_current_user)):
    insert_data = {
        "user_id": current_user["id"],
        "title": data.title,
        "content": data.content,
        "color": data.color or random.choice(COLORS),
        "is_pinned": data.is_pinned,
    }
    if data.workspace_id:
        insert_data["workspace_id"] = data.workspace_id
    result = supabase.table("notes").insert(insert_data).execute()
    note = result.data[0]
    note["note_public_links"] = []
    return _serialize(note)


@router.get("", response_model=NoteListOut)
def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    workspace_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    q = supabase.table("notes").select("*, note_public_links(token)").eq("user_id", current_user["id"])
    if workspace_id:
        q = q.eq("workspace_id", workspace_id)
    result = q.order("is_pinned", desc=True).order("updated_at", desc=True).range(offset, offset + page_size - 1).execute()
    count_q = supabase.table("notes").select("id", count="exact").eq("user_id", current_user["id"])
    if workspace_id:
        count_q = count_q.eq("workspace_id", workspace_id)
    total = (count_q.execute().count or 0)
    return NoteListOut(notes=[_serialize(n) for n in result.data], total=total, page=page, page_size=page_size)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("notes").select("*, note_public_links(token)").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found")
    return _serialize(result.data[0])


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: str, data: NoteUpdate, current_user: dict = Depends(get_current_user)):
    current = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Note not found")
    note = current.data[0]

    updates = data.model_dump(exclude_unset=True)

    # Snapshot before content changes
    if "content" in updates and updates["content"] != note["content"]:
        supabase.table("note_versions").insert({
            "note_id": note_id,
            "title": note["title"],
            "content": note["content"],
        }).execute()
        # Prune old versions beyond limit
        old = supabase.table("note_versions").select("id").eq("note_id", note_id).order("created_at", desc=True).range(MAX_VERSIONS, MAX_VERSIONS + 999).execute()
        for v in (old.data or []):
            supabase.table("note_versions").delete().eq("id", v["id"]).execute()

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("notes").update(updates).eq("id", note_id).eq("user_id", current_user["id"]).execute()

    # Re-fetch with public link
    updated = supabase.table("notes").select("*, note_public_links(token)").eq("id", note_id).limit(1).execute()
    return _serialize(updated.data[0])


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Note not found")
    supabase.table("notes").delete().eq("id", note_id).execute()
