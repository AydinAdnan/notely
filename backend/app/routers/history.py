from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from ..supabase_client import supabase
from ..schemas.schemas import NoteVersionOut
from ..deps import get_current_user

router = APIRouter(tags=["history"])


@router.get("/notes/{note_id}/history", response_model=List[NoteVersionOut])
def get_history(note_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")

    result = supabase.table("note_versions").select("*").eq("note_id", note_id).order("created_at", desc=True).execute()
    return result.data or []


@router.post("/notes/{note_id}/restore/{version_id}")
def restore_version(note_id: str, version_id: str, current_user: dict = Depends(get_current_user)):
    note_res = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note_res.data:
        raise HTTPException(status_code=404, detail="Note not found")
    note = note_res.data[0]

    version_res = supabase.table("note_versions").select("*").eq("id", version_id).eq("note_id", note_id).limit(1).execute()
    if not version_res.data:
        raise HTTPException(status_code=404, detail="Version not found")
    version = version_res.data[0]

    # Snapshot current state before restoring
    supabase.table("note_versions").insert({"note_id": note_id, "title": note["title"], "content": note["content"]}).execute()

    # Restore
    updated_at = datetime.now(timezone.utc).isoformat()
    supabase.table("notes").update({"title": version["title"], "content": version["content"], "updated_at": updated_at}).eq("id", note_id).execute()

    updated = supabase.table("notes").select("*, note_public_links(token)").eq("id", note_id).limit(1).execute()
    n = updated.data[0]
    links = n.get("note_public_links") or []
    return {
        "id": n["id"],
        "user_id": n["user_id"],
        "title": n["title"],
        "content": n["content"],
        "color": n["color"],
        "is_pinned": n["is_pinned"],
        "created_at": n["created_at"],
        "updated_at": n["updated_at"],
        "public_token": links[0]["token"] if links else None,
    }
