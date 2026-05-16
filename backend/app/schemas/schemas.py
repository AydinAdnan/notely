from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
import uuid


# ── Workspaces ────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class WorkspaceOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    created_at: datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field("", max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    bio: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)


# ── Notes ─────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = Field("Untitled Note", max_length=500)
    content: str = Field("", max_length=1_000_000)
    color: str = "bg-neu-yellow"
    is_pinned: bool = False
    workspace_id: Optional[str] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, max_length=1_000_000)
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
    workspace_id: Optional[uuid.UUID] = None


class NoteListOut(BaseModel):
    notes: List[NoteOut]
    total: int
    page: int
    page_size: int


# ── Shares ────────────────────────────────────────────────────────────────────

class ShareRequest(BaseModel):
    # Accept both field names: "email" (frontend) and "share_with_email" (test spec)
    email: Optional[EmailStr] = None
    share_with_email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def resolve_email(self) -> "ShareRequest":
        resolved = self.email or self.share_with_email
        if not resolved:
            raise ValueError("email or share_with_email is required")
        self.email = resolved
        return self


# ── Public links ──────────────────────────────────────────────────────────────

class PublicLinkOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    token: str
    view_count: int
    expires_at: Optional[datetime] = None
    created_at: datetime


# ── AI rewrite ────────────────────────────────────────────────────────────────

class AIRewriteRequest(BaseModel):
    text: str = Field(..., max_length=20_000)
    mode: str = Field(..., max_length=50)
    model: str = Field("meta/llama-3.1-8b-instruct", max_length=100)

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be blank")
        return v


class AIRewriteResponse(BaseModel):
    result: str


# ── Versions ──────────────────────────────────────────────────────────────────

class NoteVersionOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    title: str
    content: str
    created_at: datetime
