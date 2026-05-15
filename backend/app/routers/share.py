from fastapi import APIRouter, Depends, HTTPException

from ..supabase_client import supabase
from ..schemas.schemas import ShareRequest
from ..deps import get_current_user

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
    shares = supabase.table("note_shares").select("*").eq("shared_with_user_id", current_user["id"]).execute()
    result = []
    for s in (shares.data or []):
        note_res = supabase.table("notes").select("*, note_public_links(token)").eq("id", s["note_id"]).limit(1).execute()
        owner_res = supabase.table("users").select("id, email, name").eq("id", s["owner_id"]).limit(1).execute()
        if not note_res.data:
            continue
        note = note_res.data[0]
        links = note.get("note_public_links") or []
        result.append({
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
                "public_token": links[0]["token"] if links else None,
            },
            "owner": owner_res.data[0] if owner_res.data else {},
            "created_at": s["created_at"],
        })
    return result


@router.get("/notes/{note_id}/shares")
def get_note_shares(note_id: str, current_user: dict = Depends(get_current_user)):
    note = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="Note not found")

    shares = supabase.table("note_shares").select("*").eq("note_id", note_id).execute()
    result = []
    for s in (shares.data or []):
        user_res = supabase.table("users").select("id, email, name").eq("id", s["shared_with_user_id"]).limit(1).execute()
        result.append({
            "id": s["id"],
            "shared_with": user_res.data[0] if user_res.data else {},
            "created_at": s["created_at"],
        })
    return result
