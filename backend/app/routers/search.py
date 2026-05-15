from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models.models import Note
from ..deps import get_current_user
from ..models.models import User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search_notes(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notes = (
        db.query(Note)
        .filter(
            Note.user_id == current_user.id,
            or_(
                Note.title.ilike(f"%{q}%"),
                Note.content.ilike(f"%{q}%"),
            ),
        )
        .order_by(Note.updated_at.desc())
        .limit(20)
        .all()
    )
    results = [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "color": n.color,
            "is_pinned": n.is_pinned,
            "user_id": str(n.user_id),
            "created_at": n.created_at.isoformat(),
            "updated_at": n.updated_at.isoformat(),
            "public_token": n.public_link.token if n.public_link else None,
            "title_match": q.lower() in n.title.lower(),
        }
        for n in notes
    ]
    return {"results": results, "total": len(results), "query": q}
