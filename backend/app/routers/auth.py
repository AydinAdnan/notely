from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext

from ..supabase_client import supabase
from ..schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate
from ..config import settings
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _user_out(u: dict) -> UserOut:
    return UserOut(id=u["id"], email=u["email"], name=u.get("name", ""), bio=u.get("bio", ""), created_at=u["created_at"])


@router.post("/register", response_model=Token, status_code=201)
def register(data: UserRegister):
    existing = supabase.table("users").select("id").eq("email", data.email).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    result = supabase.table("users").insert({
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "name": data.name or data.email.split("@")[0],
        "bio": "",
    }).execute()

    user = result.data[0]
    return Token(access_token=create_token(user["id"]), user=_user_out(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin):
    result = supabase.table("users").select("*").eq("email", data.email).limit(1).execute()
    user = result.data[0] if result.data else None
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_token(user["id"]), user=_user_out(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return _user_out(current_user)


@router.patch("/me", response_model=UserOut)
def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    updates = data.model_dump(exclude_unset=True)
    result = supabase.table("users").update(updates).eq("id", current_user["id"]).execute()
    return _user_out(result.data[0])
