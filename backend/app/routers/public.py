import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.models import Note, NotePublicLink
from ..schemas.schemas import PublicLinkOut
from ..deps import get_current_user
from ..models.models import User

router = APIRouter(tags=["public"])


@router.post("/notes/{note_id}/generate-link", response_model=PublicLinkOut)
def generate_public_link(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.public_link:
        return note.public_link
    link = NotePublicLink(note_id=note.id, token=secrets.token_urlsafe(8))
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/notes/{note_id}/generate-link", status_code=204)
def delete_public_link(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.public_link:
        db.delete(note.public_link)
        db.commit()


@router.get("/share/{token}")
def get_public_note(token: str, db: Session = Depends(get_db)):
    link = db.query(NotePublicLink).filter(NotePublicLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Note not found or link is invalid")
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This link has expired")
    link.view_count += 1
    db.commit()
    return {
        "title": link.note.title,
        "content": link.note.content,
        "view_count": link.view_count,
        "created_at": link.note.created_at.isoformat(),
    }
