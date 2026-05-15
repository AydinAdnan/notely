import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.models import Note, NoteVersion
from ..schemas.schemas import NoteCreate, NoteUpdate, NoteOut, NoteListOut
from ..deps import get_current_user
from ..models.models import User

router = APIRouter(prefix="/notes", tags=["notes"])

COLORS = ["bg-neu-yellow", "bg-neu-pink", "bg-neu-cyan", "bg-neu-green", "bg-neu-purple"]
MAX_VERSIONS = 50


def _serialize(note: Note) -> dict:
    return {
        "id": note.id,
        "user_id": note.user_id,
        "title": note.title,
        "content": note.content,
        "color": note.color,
        "is_pinned": note.is_pinned,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "public_token": note.public_link.token if note.public_link else None,
    }


@router.post("", response_model=NoteOut, status_code=201)
def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = Note(
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        color=data.color if data.color else random.choice(COLORS),
        is_pinned=data.is_pinned,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _serialize(note)


@router.get("", response_model=NoteListOut)
def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Note).filter(Note.user_id == current_user.id)
    total = q.count()
    notes = (
        q.order_by(Note.is_pinned.desc(), Note.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return NoteListOut(
        notes=[_serialize(n) for n in notes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _serialize(note)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Snapshot before content changes
    if data.content is not None and data.content != note.content:
        db.add(NoteVersion(note_id=note.id, title=note.title, content=note.content))
        # Prune old versions
        old = (
            db.query(NoteVersion)
            .filter(NoteVersion.note_id == note.id)
            .order_by(NoteVersion.created_at.desc())
            .offset(MAX_VERSIONS)
            .all()
        )
        for v in old:
            db.delete(v)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return _serialize(note)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
