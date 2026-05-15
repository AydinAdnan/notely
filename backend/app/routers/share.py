from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.models import Note, NoteShare, User
from ..schemas.schemas import ShareRequest
from ..deps import get_current_user

router = APIRouter(tags=["share"])


@router.post("/notes/{note_id}/share", status_code=201)
def share_note(
    note_id: str,
    data: ShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if data.email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot share a note with yourself")

    target = db.query(User).filter(User.email == data.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with that email")

    existing = db.query(NoteShare).filter(
        NoteShare.note_id == note.id,
        NoteShare.shared_with_user_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Note already shared with this user")

    db.add(NoteShare(note_id=note.id, owner_id=current_user.id, shared_with_user_id=target.id))
    db.commit()
    return {"message": "Note shared successfully"}


@router.delete("/notes/{note_id}/share/{user_id}", status_code=204)
def revoke_share(
    note_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    share = db.query(NoteShare).filter(
        NoteShare.note_id == note.id,
        NoteShare.shared_with_user_id == user_id,
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    db.delete(share)
    db.commit()


@router.get("/shared-with-me")
def get_shared_with_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shares = (
        db.query(NoteShare)
        .filter(NoteShare.shared_with_user_id == current_user.id)
        .all()
    )
    return [
        {
            "id": str(s.id),
            "note_id": str(s.note_id),
            "note": {
                "id": str(s.note.id),
                "title": s.note.title,
                "content": s.note.content,
                "color": s.note.color,
                "is_pinned": s.note.is_pinned,
                "user_id": str(s.note.user_id),
                "created_at": s.note.created_at.isoformat(),
                "updated_at": s.note.updated_at.isoformat(),
                "public_token": s.note.public_link.token if s.note.public_link else None,
            },
            "owner": {
                "id": str(s.owner.id),
                "email": s.owner.email,
                "name": s.owner.name,
            },
            "created_at": s.created_at.isoformat(),
        }
        for s in shares
    ]


@router.get("/notes/{note_id}/shares")
def get_note_shares(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return [
        {
            "id": str(s.id),
            "shared_with": {"id": str(s.shared_with.id), "email": s.shared_with.email, "name": s.shared_with.name},
            "created_at": s.created_at.isoformat(),
        }
        for s in note.shares
    ]
