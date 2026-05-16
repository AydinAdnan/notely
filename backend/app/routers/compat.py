"""
Root-level endpoints that match the automated test spec:
  POST /register, POST /login, GET /about
These coexist with the frontend-facing /auth/* endpoints.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from jose import jwt
from passlib.context import CryptContext

from ..config import settings
from ..schemas.schemas import UserLogin, UserRegister
from ..supabase_client import supabase

router = APIRouter(tags=["compat"])

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


def _make_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


@router.post("/register", status_code=201)
def register(data: UserRegister):
    existing = (
        supabase.table("users").select("id").eq("email", data.email).limit(1).execute()
    )
    if existing.data:
        return JSONResponse(
            status_code=400, content={"message": "Email already registered"}
        )

    result = (
        supabase.table("users")
        .insert(
            {
                "email": data.email,
                "password_hash": pwd_context.hash(data.password),
                "name": data.name or data.email.split("@")[0],
                "bio": "",
            }
        )
        .execute()
    )

    user = result.data[0]
    return JSONResponse(
        status_code=201,
        content={
            "message": "User registered successfully",
            "access_token": _make_token(user["id"]),
        },
    )


@router.post("/login")
def login(data: UserLogin):
    result = (
        supabase.table("users").select("*").eq("email", data.email).limit(1).execute()
    )
    user = result.data[0] if result.data else None
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        return JSONResponse(
            status_code=401,
            content={"message": "Invalid email or password"},
        )
    return {"access_token": _make_token(user["id"])}


@router.get("/about")
def about():
    return {
        "name": "Aydin Adnan",
        "email": "aydinadnan545@gmail.com",
        "my features": {
            "Workspaces": (
                "Users can create multiple named workspaces to organise their notes. "
                "Selected because flat note lists become difficult to manage over time, while workspaces provide better organization without adding unnecessary complexity."
            ),
            "AI Rewrite": (
                "Selected text (or the whole note) can be rewritten via NVIDIA API in seven different modes: "
                "improve, simplify, expand, bullets, beginner, professional, grammar. "
                "Streaming delivery makes it feel near-instant. "
                "Chosen because AI writing assistance dramatically reduces editing time."
            ),
            "Note Sharing": (
                "Notes or entire workspaces can be shared with another registered user by email. "
                "Shared users can read the note via GET /notes/{id}. "
                "Chosen because collaboration is essential for a modern notes app."
            ),
            "Public Links": (
                "A shareable public URL with a cryptographically secure token can be generated per note. "
                "Supports expiry dates and tracks view count. "
                "Chosen to allow read-only sharing without requiring an account."
            ),
            "Version History": (
                "Every content change snapshots the previous version (up to 50 per note). "
                "Versions can be previewed and restored. "
                "Chosen because accidental overwrites are common and hard to recover from otherwise."
            ),
        },
    }
