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

    notes = supabase.table("notes").select("id").eq("workspace_id", workspace_id).eq("user_id", current_user["id"]).execute()
    shared_count = 0
    for note in (notes.data or []):
        existing = supabase.table("note_shares").select("id").eq("note_id", note["id"]).eq("shared_with_user_id", target_id).limit(1).execute()
        if not existing.data:
            supabase.table("note_shares").insert({
                "note_id": note["id"],
                "owner_id": current_user["id"],
                "shared_with_user_id": target_id,
            }).execute()
            shared_count += 1

    return {"message": f"Shared {shared_count} note(s) with {data.email}"}
