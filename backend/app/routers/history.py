from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.models import Note, NoteVersion
from ..schemas.schemas import NoteVersionOut, NoteOut
from ..deps import get_current_user
from ..models.models import User

router = APIRouter(tags=["history"])


@router.get("/notes/{note_id}/history", response_model=List[NoteVersionOut])
def get_history(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return (
        db.query(NoteVersion)
        .filter(NoteVersion.note_id == note_id)
        .order_by(NoteVersion.created_at.desc())
        .all()
    )


@router.post("/notes/{note_id}/restore/{version_id}")
def restore_version(
    note_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    version = db.query(NoteVersion).filter(
        NoteVersion.id == version_id, NoteVersion.note_id == note_id
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Snapshot current state before overwriting
    db.add(NoteVersion(note_id=note.id, title=note.title, content=note.content))

    note.title = version.title
    note.content = version.content
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)

    return {
        "id": str(note.id),
        "user_id": str(note.user_id),
        "title": note.title,
        "content": note.content,
        "color": note.color,
        "is_pinned": note.is_pinned,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
        "public_token": note.public_link.token if note.public_link else None,
    }
