import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    shared_notes = relationship("NoteShare", foreign_keys="NoteShare.owner_id", back_populates="owner")
    received_shares = relationship("NoteShare", foreign_keys="NoteShare.shared_with_user_id", back_populates="shared_with")


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, default="Untitled Note")
    content = Column(Text, nullable=False, default="")
    color = Column(String, nullable=False, default="bg-neu-yellow")
    is_pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    owner = relationship("User", back_populates="notes")
    shares = relationship("NoteShare", back_populates="note", cascade="all, delete-orphan")
    public_link = relationship("NotePublicLink", back_populates="note", uselist=False, cascade="all, delete-orphan")
    versions = relationship("NoteVersion", back_populates="note", cascade="all, delete-orphan")


class NoteShare(Base):
    __tablename__ = "note_shares"
    __table_args__ = (UniqueConstraint("note_id", "shared_with_user_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    note = relationship("Note", back_populates="shares")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="shared_notes")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id], back_populates="received_shares")


class NotePublicLink(Base):
    __tablename__ = "note_public_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, unique=True)
    token = Column(String, unique=True, nullable=False, index=True)
    view_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    note = relationship("Note", back_populates="public_link")


class NoteVersion(Base):
    __tablename__ = "note_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    note = relationship("Note", back_populates="versions")
