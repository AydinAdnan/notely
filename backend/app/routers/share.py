from fastapi import APIRouter, Depends, HTTPException

from ..supabase_client import supabase
from ..schemas.schemas import ShareRequest
from ..deps import get_current_user
from ..utils import extract_public_token

router = APIRouter(tags=["share"])


@router.post("/notes/{note_id}/share", status_code=201)
def share_note(note_id: str, data: ShareRequest, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")

    if data.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot share a note with yourself")

    target = supabase.table("users").select("id, email").eq("email", data.email).limit(1).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="No user found with that email")
    target_id = target.data[0]["id"]

    # Unique constraint (note_id, shared_with_user_id) handles duplicate prevention at DB level,
    # but we return a friendly error rather than letting the DB raise.
    existing = supabase.table("note_shares").select("id").eq("note_id", note_id).eq("shared_with_user_id", target_id).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Note already shared with this user")

    supabase.table("note_shares").insert({
        "note_id": note_id,
        "owner_id": current_user["id"],
        "shared_with_user_id": target_id,
    }).execute()
    return {"message": "Note shared successfully"}


@router.delete("/notes/{note_id}/share/{user_id}", status_code=204)
def revoke_share(note_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")
    supabase.table("note_shares").delete().eq("note_id", note_id).eq("shared_with_user_id", user_id).execute()


@router.get("/shared-with-me")
def get_shared_with_me(current_user: dict = Depends(get_current_user)):
    # Single query — PostgREST joins note + owner in one HTTP call (was 2n+1 calls)
    result = supabase.table("note_shares").select(
        "id, note_id, created_at, "
        "note:notes!note_id(id, title, content, color, is_pinned, user_id, created_at, updated_at, note_public_links(token)), "
        "owner:users!owner_id(id, email, name)"
    ).eq("shared_with_user_id", current_user["id"]).execute()

    shares = []
    for s in (result.data or []):
        note = s.get("note")
        if not note:
            continue
        shares.append({
            "id": s["id"],
            "note_id": s["note_id"],
            "note": {
                "id": note["id"],
                "title": note["title"],
                "content": note["content"],
                "color": note["color"],
                "is_pinned": note["is_pinned"],
                "user_id": note["user_id"],
                "created_at": note["created_at"],
                "updated_at": note["updated_at"],
                "public_token": extract_public_token(note.get("note_public_links")),
            },
            "owner": s.get("owner") or {},
            "created_at": s["created_at"],
        })
    return shares


@router.get("/notes/{note_id}/shares")
def get_note_shares(note_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")

    # Single query — joins shared_with user inline (was n+1 calls)
    result = supabase.table("note_shares").select(
        "id, created_at, shared_with:users!shared_with_user_id(id, email, name)"
    ).eq("note_id", note_id).execute()

    return [
        {
            "id": s["id"],
            "shared_with": s.get("shared_with") or {},
            "created_at": s["created_at"],
        }
        for s in (result.data or [])
    ]
