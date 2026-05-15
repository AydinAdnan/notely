from __future__ import annotations
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    bio: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


# ── Notes ─────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = "Untitled Note"
    content: str = ""
    color: str = "bg-neu-yellow"
    is_pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None


class NoteOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    color: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    public_token: Optional[str] = None

    model_config = {"from_attributes": True}


class NoteListOut(BaseModel):
    notes: List[NoteOut]
    total: int
    page: int
    page_size: int


# ── Shares ────────────────────────────────────────────────────────────────────

class ShareRequest(BaseModel):
    email: EmailStr


class SharedNoteItem(BaseModel):
    id: str
    note_id: str
    note: dict
    owner: dict
    created_at: str


# ── Public links ──────────────────────────────────────────────────────────────

class PublicLinkOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    token: str
    view_count: int
    expires_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── AI rewrite ────────────────────────────────────────────────────────────────

class AIRewriteRequest(BaseModel):
    text: str
    mode: str
    model: str = "meta/llama-3.1-8b-instruct"


class AIRewriteResponse(BaseModel):
    result: str


# ── Versions ──────────────────────────────────────────────────────────────────

class NoteVersionOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
