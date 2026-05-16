from fastapi import APIRouter, Depends, HTTPException
from ..supabase_client import supabase
from ..schemas.schemas import WorkspaceCreate, WorkspaceOut, WorkspaceUpdate, ShareRequest
from ..deps import get_current_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(current_user: dict = Depends(get_current_user)):
    result = supabase.table("workspaces").select("*").eq("user_id", current_user["id"]).order("created_at").execute()
    return result.data


@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(data: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    result = supabase.table("workspaces").insert({
        "user_id": current_user["id"],
        "name": data.name,
    }).execute()
    return result.data[0]


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(workspace_id: str, data: WorkspaceUpdate, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    updates = data.model_dump(exclude_unset=True)
    result = supabase.table("workspaces").update(updates).eq("id", workspace_id).execute()
    return result.data[0]


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    supabase.table("workspaces").delete().eq("id", workspace_id).execute()


@router.post("/{workspace_id}/share", status_code=201)
def share_workspace(workspace_id: str, data: ShareRequest, current_user: dict = Depends(get_current_user)):
    ws = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not ws.data:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if data.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    target = supabase.table("users").select("id, email").eq("email", data.email).limit(1).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="No user found with that email")
    target_id = target.data[0]["id"]

    # Get all notes in the workspace
    notes = supabase.table("notes").select("id").eq("workspace_id", workspace_id).eq("user_id", current_user["id"]).execute()
    note_ids = [n["id"] for n in (notes.data or [])]

    if not note_ids:
        return {"message": f"No notes in this workspace to share"}

    # Fetch already-shared note IDs in one query (was one query per note)
    existing = supabase.table("note_shares").select("note_id").in_("note_id", note_ids).eq("shared_with_user_id", target_id).execute()
    already_shared = {s["note_id"] for s in (existing.data or [])}

    # Batch insert all new shares in a single query
    inserts = [
        {"note_id": nid, "owner_id": current_user["id"], "shared_with_user_id": target_id}
        for nid in note_ids
        if nid not in already_shared
    ]

    if inserts:
        supabase.table("note_shares").insert(inserts).execute()

    shared_count = len(inserts)
    return {"message": f"Shared {shared_count} note(s) with {data.email}"}
